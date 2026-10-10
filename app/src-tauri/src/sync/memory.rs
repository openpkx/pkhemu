use super::provider::{BoxFuture, Changes, Error, Provider, Sent, Versioned};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::io::{Read, Write};
use std::sync::{Mutex, MutexGuard};
use std::time::{Duration, SystemTime};

struct Upload {
    blob: String,
    size: u64,
    received: Vec<u8>,
}

#[derive(Default)]
struct Cloud {
    records: BTreeMap<String, (Vec<u8>, String)>,
    changed: Vec<String>,
    blobs: HashMap<String, Vec<u8>>,
    retired: HashMap<String, SystemTime>,
    uploads: HashMap<String, Upload>,
    versions: u64,
    drop_after: Option<u64>,
    drop_download_after: Option<u64>,
    slow_downs: usize,
    asked_wait: Option<Duration>,
    uploaded_bytes: u64,
    record_writes: usize,
    offline: bool,
    full: bool,
}

#[derive(Default)]
pub struct Memory {
    cloud: Mutex<Cloud>,
}

impl Memory {
    fn cloud(&self) -> MutexGuard<'_, Cloud> {
        self.cloud.lock().unwrap()
    }

    pub fn drop_upload_after(&self, bytes: u64) {
        self.cloud().drop_after = Some(bytes);
    }

    pub fn drop_download_after(&self, bytes: u64) {
        self.cloud().drop_download_after = Some(bytes);
    }

    pub fn blobs(&self) -> Vec<Vec<u8>> {
        let cloud = self.cloud();
        let live = cloud.blobs.iter().filter(|(blob, _)| !cloud.retired.contains_key(*blob));
        live.map(|(_, bytes)| bytes.clone()).collect()
    }

    pub fn retired(&self) -> Vec<Vec<u8>> {
        let cloud = self.cloud();
        cloud.retired.keys().filter_map(|blob| cloud.blobs.get(blob).cloned()).collect()
    }

    pub fn retired_days_ago(&self, blob: &str, days: u64) {
        self.cloud().retired.insert(blob.into(), SystemTime::now() - Duration::from_secs(days * 24 * 60 * 60));
    }

    pub fn slow_down(&self, times: usize) {
        self.cloud().slow_downs = times;
    }

    pub fn slow_down_for(&self, times: usize, wait: Duration) {
        let mut cloud = self.cloud();
        cloud.slow_downs = times;
        cloud.asked_wait = Some(wait);
    }

    pub fn offline(&self, offline: bool) {
        self.cloud().offline = offline;
    }

    pub fn full(&self, full: bool) {
        self.cloud().full = full;
    }

    pub fn uploaded_bytes(&self) -> u64 {
        self.cloud().uploaded_bytes
    }

    pub fn record_writes(&self) -> usize {
        self.cloud().record_writes
    }

    pub fn records(&self) -> Vec<serde_json::Value> {
        self.cloud().records.values().map(|(json, _)| serde_json::from_slice(json).unwrap()).collect()
    }

    fn call(&self) -> Result<MutexGuard<'_, Cloud>, Error> {
        let mut cloud = self.cloud();
        if cloud.offline {
            return Err(Error::Offline);
        }
        if cloud.slow_downs > 0 {
            cloud.slow_downs -= 1;
            return Err(Error::SlowDown(cloud.asked_wait));
        }
        Ok(cloud)
    }
}

fn ready<'a, T: Send + 'a>(result: T) -> BoxFuture<'a, T> {
    Box::pin(std::future::ready(result))
}

impl Provider for Memory {
    fn account(&self) -> String {
        "player@example.com".into()
    }

    fn changes<'a>(&'a self, cursor: Option<&'a str>) -> BoxFuture<'a, Result<Changes, Error>> {
        ready(self.call().map(|cloud| {
            let records = match cursor.and_then(|cursor| cursor.parse::<usize>().ok()) {
                Some(from) => cloud.changed[from.min(cloud.changed.len())..].iter().cloned().collect::<BTreeSet<_>>().into_iter().collect(),
                None => cloud.records.keys().cloned().collect(),
            };
            Changes { records, cursor: cloud.changed.len().to_string(), complete: cursor.is_none() }
        }))
    }

    fn read_record<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Option<Versioned>, Error>> {
        ready(self.call().map(|cloud| {
            cloud.records.get(id).map(|(json, version)| Versioned { json: json.clone(), version: version.clone() })
        }))
    }

    fn write_record<'a>(&'a self, id: &'a str, json: &'a [u8], expected: Option<&'a str>) -> BoxFuture<'a, Result<String, Error>> {
        ready(self.call().and_then(|mut cloud| {
            if cloud.records.get(id).map(|(_, version)| version.as_str()) != expected {
                return Err(Error::Stale);
            }
            cloud.versions += 1;
            let version = cloud.versions.to_string();
            cloud.records.insert(id.into(), (json.to_vec(), version.clone()));
            cloud.changed.push(id.into());
            cloud.record_writes += 1;
            Ok(version)
        }))
    }

    fn delete_record<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        ready(self.call().map(|mut cloud| {
            cloud.records.remove(id);
            cloud.changed.push(id.into());
        }))
    }

    fn start_upload<'a>(&'a self, blob: &'a str, size: u64, _: &'a str) -> BoxFuture<'a, Result<String, Error>> {
        ready(self.call().and_then(|mut cloud| {
            if cloud.full {
                return Err(Error::Account("Your cloud is full".into()));
            }
            let session = format!("session-{blob}");
            cloud.uploads.insert(session.clone(), Upload { blob: blob.into(), size, received: Vec::new() });
            Ok(session)
        }))
    }

    fn uploaded<'a>(&'a self, session: &'a str) -> BoxFuture<'a, Result<Option<u64>, Error>> {
        ready(self.call().map(|cloud| cloud.uploads.get(session).map(|upload| upload.received.len() as u64)))
    }

    fn upload<'a>(&'a self, session: &'a str, offset: u64, from: &'a mut (dyn Read + Send), sent: &'a Sent<'a>) -> BoxFuture<'a, Result<(), Error>> {
        ready(self.call().and_then(|mut cloud| {
            let cloud = &mut *cloud;
            let upload = cloud.uploads.get_mut(session).ok_or(Error::Failed("no such upload".into()))?;
            if upload.received.len() as u64 != offset {
                return Err(Error::Failed(format!("the upload is at {}, not {offset}", upload.received.len())));
            }
            let mut bytes = Vec::new();
            from.read_to_end(&mut bytes).map_err(|e| Error::Failed(e.to_string()))?;
            if let Some(limit) = cloud.drop_after.take() {
                let sent = bytes.len().min(limit as usize);
                upload.received.extend_from_slice(&bytes[..sent]);
                cloud.uploaded_bytes += sent as u64;
                return Err(Error::Failed("the connection dropped".into()));
            }
            upload.received.extend_from_slice(&bytes);
            cloud.uploaded_bytes += bytes.len() as u64;
            if upload.received.len() as u64 != upload.size {
                return Err(Error::Failed(format!("sent {} of {} bytes", upload.received.len(), upload.size)));
            }
            cloud.blobs.insert(upload.blob.clone(), upload.received.clone());
            sent(upload.size);
            Ok(())
        }))
    }

    fn download<'a>(&'a self, blob: &'a str, to: &'a mut (dyn Write + Send)) -> BoxFuture<'a, Result<(), Error>> {
        ready(self.call().and_then(|mut cloud| {
            let bytes = cloud.blobs.get(blob).ok_or_else(|| Error::Failed(format!("no blob {blob}")))?.clone();
            if let Some(limit) = cloud.drop_download_after.take() {
                to.write_all(&bytes[..bytes.len().min(limit as usize)]).map_err(|e| Error::Failed(e.to_string()))?;
                return Err(Error::Failed("the connection dropped".into()));
            }
            to.write_all(&bytes).map_err(|e| Error::Failed(e.to_string()))
        }))
    }

    fn delete_blob<'a>(&'a self, blob: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        ready(self.call().map(|mut cloud| {
            cloud.blobs.remove(blob);
            cloud.retired.remove(blob);
        }))
    }

    fn retire_blob<'a>(&'a self, blob: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        ready(self.call().map(|mut cloud| {
            if cloud.blobs.contains_key(blob) && !cloud.retired.contains_key(blob) {
                cloud.retired.insert(blob.into(), SystemTime::now());
            }
        }))
    }

    fn purge_retired(&self, older_than: Duration) -> BoxFuture<'_, Result<(), Error>> {
        ready(self.call().map(|mut cloud| {
            let cutoff = SystemTime::now() - older_than;
            let purged: Vec<String> =
                cloud.retired.iter().filter(|(_, at)| **at < cutoff).map(|(blob, _)| blob.clone()).collect();
            for blob in purged {
                cloud.retired.remove(&blob);
                cloud.blobs.remove(&blob);
            }
        }))
    }
}
