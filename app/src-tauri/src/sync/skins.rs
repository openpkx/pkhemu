use super::{Engine, Error, STALE_RETRIES};
use crate::skins::{self, Skins};
use tauri::Runtime;

const ID: &str = "skins";

pub fn is_skins(id: &str) -> bool {
    id == ID
}

impl<R: Runtime> Engine<'_, R> {
    pub(super) async fn sync_skins(&self) -> Result<(), Error> {
        for _ in 0..STALE_RETRIES {
            let (version, cloud) = match self.index.sync_record(ID)? {
                Some((version, json)) => match serde_json::from_str::<Skins>(&json) {
                    Ok(cloud) => (Some(version), cloud),
                    Err(e) => {
                        eprintln!("record {ID}: {e}");
                        return Ok(());
                    }
                },
                None => (None, Skins::new()),
            };
            let (merged, won) = skins::merge(self.skins, &cloud)?;
            if !won.is_empty() {
                self.events.skins(&won);
            }
            if merged == cloud {
                return Ok(());
            }
            let json = serde_json::to_vec(&merged).map_err(|e| e.to_string())?;
            match self.retry(|| self.provider.write_record(ID, &json, version.as_deref())).await {
                Ok(version) => {
                    let json = String::from_utf8(json).map_err(|e| e.to_string())?;
                    return Ok(self.index.keep_sync_record(ID, &version, &json)?);
                }
                Err(Error::Stale) => {
                    self.fetch(ID).await?;
                }
                Err(e) => return Err(e),
            }
        }
        Err(Error::Stale)
    }
}
