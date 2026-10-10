use super::{millis, Engine, Error, STALE_RETRIES};
use crate::game_art;
use crate::index::SyncedFile;
use crate::kept_copies::{self, StoredCopy};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use tauri::Runtime;

const PREFIX: &str = "kept-copy-";
// Kept copies belong to no game, so their last synced versions sit under this name in the games' table.
const BASES: &str = "kept-copies";

pub fn is_kept(id: &str) -> bool {
    id.starts_with(PREFIX)
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KeptRecord {
    #[serde(flatten)]
    pub copy: StoredCopy,
    pub modified: i64,
}

fn sha1(copy: &StoredCopy) -> String {
    game_art::sha1_of(&serde_json::to_vec(copy).expect("a kept copy serializes"))
}

impl<R: Runtime> Engine<'_, R> {
    pub(super) async fn sync_kept_copies(&self) -> Result<(), Error> {
        let local: BTreeMap<String, (StoredCopy, i64)> = kept_copies::stored(self.kept_copies)?
            .into_iter()
            .map(|(key, copy, modified)| (key, (copy, millis(modified))))
            .collect();
        let bases: BTreeMap<String, String> =
            self.index.synced_files(BASES)?.into_iter().map(|base| (base.path, base.sha1)).collect();
        let cloud =
            self.index.sync_records()?.into_iter().filter_map(|(id, _, _)| id.strip_prefix(PREFIX).map(String::from));
        let keys: BTreeSet<String> = local.keys().cloned().chain(cloud).collect();
        let mut failed = None;
        for key in keys {
            if let Err(e) = self.sync_kept_copy(&key, local.get(&key), bases.get(&key)).await {
                failed.get_or_insert(e);
            }
        }
        failed.map_or(Ok(()), Err)
    }

    async fn sync_kept_copy(
        &self,
        key: &str,
        local: Option<&(StoredCopy, i64)>,
        base: Option<&String>,
    ) -> Result<(), Error> {
        let id = format!("{PREFIX}{key}");
        for _ in 0..STALE_RETRIES {
            let (version, cloud) = match self.index.sync_record(&id)? {
                Some((version, json)) => match serde_json::from_str::<KeptRecord>(&json) {
                    Ok(record) if kept_copies::holds(key, &record.copy) => (Some(version), Some(record)),
                    Ok(record) => {
                        eprintln!("record {id}: names kept copy {}", record.copy.identity_key);
                        return Ok(());
                    }
                    Err(e) => {
                        eprintln!("record {id}: {e}");
                        return Ok(());
                    }
                },
                None => (None, None),
            };
            let local_sha1 = local.map(|(copy, _)| sha1(copy));
            let cloud_sha1 = cloud.as_ref().map(|record| sha1(&record.copy));
            if local_sha1 == cloud_sha1 {
                return match local_sha1 {
                    Some(sha1) if base != Some(&sha1) => self.keep_kept_base(key, &sha1),
                    _ => Ok(()),
                };
            }
            let read = local.map(|(copy, _)| copy);
            let (copy, modified) = match (local, cloud) {
                (Some((copy, modified)), None) => (copy.clone(), *modified),
                (Some((copy, modified)), Some(record)) => match kept_copies::clash(key, copy, &record.copy) {
                    Some(_) if record.copy.ambiguous => return self.download_kept_copy(key, read, record.copy),
                    Some(marker) => (marker, (*modified).max(record.modified)),
                    None if cloud_sha1.as_ref() == base
                        || (local_sha1.as_ref() != base
                            && (copy.generation, *modified) > (record.copy.generation, record.modified)) =>
                    {
                        (copy.clone(), *modified)
                    }
                    None => return self.download_kept_copy(key, read, record.copy),
                },
                (None, Some(record)) => return self.download_kept_copy(key, read, record.copy),
                (None, None) => unreachable!("a copy on neither side matches"),
            };
            let record = KeptRecord { copy: copy.clone(), modified };
            let json = serde_json::to_vec(&record).map_err(|e| e.to_string())?;
            match self.retry(|| self.provider.write_record(&id, &json, version.as_deref())).await {
                Ok(version) => {
                    let json = String::from_utf8(json).map_err(|e| e.to_string())?;
                    self.index.keep_sync_record(&id, &version, &json)?;
                    if read != Some(&copy) {
                        return self.download_kept_copy(key, read, copy);
                    }
                    return self.keep_kept_base(key, &sha1(&copy));
                }
                Err(Error::Stale) => {
                    self.fetch(&id).await?;
                }
                Err(e) => return Err(e),
            }
        }
        Err(Error::Stale)
    }

    fn download_kept_copy(&self, key: &str, read: Option<&StoredCopy>, copy: StoredCopy) -> Result<(), Error> {
        // A copy kept here since this sync read the folder goes up at the next sync instead.
        if kept_copies::read(self.kept_copies, key)?.as_ref() != read {
            return Ok(());
        }
        kept_copies::write(self.kept_copies, key, &copy)?;
        self.keep_kept_base(key, &sha1(&copy))
    }

    fn keep_kept_base(&self, key: &str, sha1: &str) -> Result<(), Error> {
        Ok(self
            .index
            .keep_synced_file(BASES, &SyncedFile { path: key.into(), sha1: sha1.into(), blob: String::new() })?)
    }
}
