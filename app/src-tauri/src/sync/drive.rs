use super::oauth::{offline, Tokens};
use super::provider::{BoxFuture, Changes, Error, Provider, Sent, Versioned};
use reqwest::header::{CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE, LOCATION, RANGE};
use reqwest::{Client, RequestBuilder, Response, StatusCode};
use serde_json::{json, Value};
use std::collections::{BTreeSet, HashMap};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const API: &str = "https://www.googleapis.com";
/// Drive takes resumable uploads in multiples of 256 KiB.
pub(super) const CHUNK: u64 = 32 * 256 * 1024;
const PAGE_SIZE: &str = "1000";

fn now_millis() -> u128 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis()
}

fn refusal(status: StatusCode, body: &str) -> Error {
    let error: Value = serde_json::from_str(body).unwrap_or_default();
    let reasons: Vec<&str> =
        error["error"]["errors"].as_array().into_iter().flatten().filter_map(|error| error["reason"].as_str()).collect();
    let said = |reason: &str| reasons.contains(&reason);
    let detailed = |reason: &str| {
        error["error"]["details"].as_array().into_iter().flatten().any(|detail| detail["reason"] == reason)
    };
    match status.as_u16() {
        429 | 500..=599 => Error::SlowDown(None),
        403 if said("rateLimitExceeded") || said("userRateLimitExceeded") => Error::SlowDown(None),
        403 if said("storageQuotaExceeded") => Error::Account("Your Google Drive is full".into()),
        403 if said("insufficientPermissions") || detailed("ACCESS_TOKEN_SCOPE_INSUFFICIENT") => {
            Error::Account("Sign in to Google Drive again".into())
        }
        401 => Error::Account("Sign in to Google Drive again".into()),
        _ => match error["error"]["message"].as_str() {
            Some(message) => Error::Failed(format!("Google Drive answered {status}: {message}")),
            None => Error::Failed(format!("Google Drive answered {status}")),
        },
    }
}

pub async fn check(response: Response) -> Result<Response, Error> {
    let status = response.status();
    if status.is_success() || status == StatusCode::PERMANENT_REDIRECT {
        return Ok(response);
    }
    let body = response.text().await.unwrap_or_default();
    Err(refusal(status, &body))
}

async fn json(response: Response) -> Result<Value, Error> {
    response.json().await.map_err(|e| Error::Failed(format!("Couldn't read Google Drive's answer: {e}")))
}

fn quote(value: &str) -> String {
    value.replace('\\', "\\\\").replace('\'', "\\'")
}

struct Found {
    drive_id: String,
    version: String,
    deleted: bool,
    retired: bool,
}

impl Found {
    fn of(file: &Value) -> Option<Found> {
        Some(Found {
            drive_id: file["id"].as_str()?.into(),
            version: file["version"].as_str().unwrap_or_default().into(),
            deleted: file["appProperties"]["deleted"].is_string(),
            retired: file["appProperties"]["kind"] == "retired",
        })
    }
}

/// Every file sits in the hidden app data folder. A file's `appProperties` say what it is: `kind` is
/// `record`, `blob` or `retired`, `id` is the record's game or the blob's name, and a blob keeps its `sha1`.
/// A retired blob keeps `removedAt`, in ms, too.
pub struct Drive {
    http: Client,
    api: String,
    account: String,
    tokens: Arc<dyn Tokens>,
    files: Mutex<HashMap<String, String>>,
}

impl Drive {
    pub fn new(http: Client, api: &str, account: String, tokens: Arc<dyn Tokens>) -> Drive {
        Drive { http, api: api.trim_end_matches('/').into(), account, tokens, files: Mutex::default() }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{path}", self.api)
    }

    fn file_url(&self, drive_id: &str) -> String {
        self.url(&format!("/drive/v3/files/{drive_id}"))
    }

    fn remember(&self, id: &str, file: &str) {
        self.files.lock().unwrap_or_else(|e| e.into_inner()).insert(id.into(), file.into());
    }

    fn known(&self, id: &str) -> Option<String> {
        self.files.lock().unwrap_or_else(|e| e.into_inner()).get(id).cloned()
    }

    fn forget(&self, id: &str) {
        self.files.lock().unwrap_or_else(|e| e.into_inner()).remove(id);
    }

    async fn send_once(&self, request: &impl Fn(&Client) -> RequestBuilder) -> Result<Response, Error> {
        let token = self.tokens.token(None).await?;
        let response = request(&self.http).bearer_auth(&token).send().await.map_err(offline)?;
        if response.status() != StatusCode::UNAUTHORIZED {
            return Ok(response);
        }
        let token = self.tokens.token(Some(&token)).await?;
        request(&self.http).bearer_auth(&token).send().await.map_err(offline)
    }

    async fn send(&self, request: impl Fn(&Client) -> RequestBuilder) -> Result<Response, Error> {
        check(self.send_once(&request).await?).await
    }

    async fn list(&self, q: &str) -> Result<Vec<Value>, Error> {
        let mut files = Vec::new();
        let mut page: Option<String> = None;
        loop {
            let response = self
                .send(|http| {
                    let request = http.get(self.url("/drive/v3/files")).query(&[
                        ("spaces", "appDataFolder"),
                        ("q", q),
                        ("fields", "nextPageToken,files(id,version,appProperties)"),
                        ("orderBy", "createdTime"),
                        ("pageSize", PAGE_SIZE),
                    ]);
                    match &page {
                        Some(page) => request.query(&[("pageToken", page)]),
                        None => request,
                    }
                })
                .await?;
            let mut listed = json(response).await?;
            files.extend(listed["files"].as_array_mut().map(std::mem::take).unwrap_or_default());
            match listed["nextPageToken"].as_str() {
                Some(next) => page = Some(next.into()),
                None => return Ok(files),
            }
        }
    }

    /// The oldest file for `id`, which every device settles on if two created one at once.
    async fn oldest(&self, id: &str) -> Result<Option<Found>, Error> {
        let files = self.list(&format!("appProperties has {{ key='id' and value='{}' }}", quote(id))).await?;
        Ok(files.first().and_then(Found::of))
    }

    async fn find(&self, id: &str) -> Result<Option<Found>, Error> {
        if let Some(drive_id) = self.known(id) {
            let response =
                self.send_once(&|http| http.get(self.file_url(&drive_id)).query(&[("fields", "id,version,appProperties")])).await?;
            if response.status() != StatusCode::NOT_FOUND {
                return Ok(Found::of(&json(check(response).await?).await?));
            }
            self.forget(id);
        }
        let found = self.oldest(id).await?;
        if let Some(found) = &found {
            self.remember(id, &found.drive_id);
        }
        Ok(found)
    }

    async fn drive_id(&self, id: &str) -> Result<Option<String>, Error> {
        Ok(match self.known(id) {
            Some(drive_id) => Some(drive_id),
            None => self.find(id).await?.map(|found| found.drive_id),
        })
    }

    async fn all_changes(&self, cursor: Option<&str>) -> Result<Changes, Error> {
        let Some(cursor) = cursor else {
            // The token comes first, so a record written during the listing shows up again next time rather than never.
            let start = json(self.send(|http| http.get(self.url("/drive/v3/changes/startPageToken"))).await?).await?;
            let cursor = start["startPageToken"].as_str().ok_or("Google Drive sent no start page token")?.to_string();
            let mut seen = BTreeSet::new();
            let mut records = Vec::new();
            for file in self.list("appProperties has { key='kind' and value='record' }").await? {
                let (Some(id), Some(found)) = (file["appProperties"]["id"].as_str(), Found::of(&file)) else { continue };
                if !seen.insert(id.to_string()) {
                    continue;
                }
                self.remember(id, &found.drive_id);
                if !found.deleted {
                    records.push(id.to_string());
                }
            }
            return Ok(Changes { records, cursor, complete: true });
        };
        let mut records = BTreeSet::new();
        let mut page = cursor.to_string();
        loop {
            let response = self
                .send(|http| {
                    http.get(self.url("/drive/v3/changes")).query(&[
                        ("pageToken", page.as_str()),
                        ("spaces", "appDataFolder"),
                        ("includeRemoved", "true"),
                        ("pageSize", PAGE_SIZE),
                        ("fields", "nextPageToken,newStartPageToken,changes(fileId,removed,file(id,appProperties))"),
                    ])
                })
                .await?;
            let changed = json(response).await?;
            for change in changed["changes"].as_array().into_iter().flatten() {
                let properties = &change["file"]["appProperties"];
                if properties["kind"] != "record" {
                    continue;
                }
                if let (Some(id), Some(file)) = (properties["id"].as_str(), change["fileId"].as_str()) {
                    self.remember(id, file);
                    records.insert(id.to_string());
                }
            }
            if let Some(next) = changed["newStartPageToken"].as_str() {
                return Ok(Changes { records: records.into_iter().collect(), cursor: next.into(), complete: false });
            }
            page = changed["nextPageToken"].as_str().ok_or("Google Drive sent no next page")?.into();
        }
    }

    async fn read_record_file(&self, id: &str) -> Result<Option<Versioned>, Error> {
        let Some(found) = self.find(id).await?.filter(|found| !found.deleted) else { return Ok(None) };
        // The version is read before the content, so a write in between makes ours stale instead of lost.
        let response = self
            .send(|http| http.get(self.file_url(&found.drive_id)).query(&[("alt", "media")]))
            .await?;
        let json = response.bytes().await.map_err(offline)?.to_vec();
        Ok(Some(Versioned { json, version: found.version }))
    }

    async fn write_record_file(&self, id: &str, content: &[u8], expected: Option<&str>) -> Result<String, Error> {
        let found = self.find(id).await?;
        // Drive v3 has no conditional writes, so another device can still slip in between this check and the write.
        if found.as_ref().filter(|found| !found.deleted).map(|found| found.version.as_str()) != expected {
            return Err(Error::Stale);
        }
        let metadata = match &found {
            Some(_) => json!({ "appProperties": { "deleted": null } }),
            None => json!({
                "name": format!("{id}.json"),
                "parents": ["appDataFolder"],
                "mimeType": "application/json",
                "appProperties": { "kind": "record", "id": id },
            }),
        };
        let boundary = uuid::Uuid::new_v4().simple().to_string();
        let mut body = format!("--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{metadata}\r\n--{boundary}\r\nContent-Type: application/json\r\n\r\n").into_bytes();
        body.extend_from_slice(content);
        body.extend_from_slice(format!("\r\n--{boundary}--").as_bytes());
        let query = [("uploadType", "multipart"), ("fields", "id,version")];
        let content_type = format!("multipart/related; boundary={boundary}");
        let response = self
            .send(|http| {
                let request = match &found {
                    Some(found) => http.patch(self.url(&format!("/upload/drive/v3/files/{}", found.drive_id))),
                    None => http.post(self.url("/upload/drive/v3/files")),
                };
                request.query(&query).header(CONTENT_TYPE, &content_type).body(body.clone())
            })
            .await?;
        let written = Found::of(&json(response).await?).ok_or("Google Drive didn't say which file it wrote")?;
        if found.is_none() && self.oldest(id).await?.is_some_and(|oldest| oldest.drive_id != written.drive_id) {
            self.send(|http| http.delete(self.file_url(&written.drive_id))).await?;
            return Err(Error::Stale);
        }
        self.remember(id, &written.drive_id);
        Ok(written.version)
    }

    async fn tombstone(&self, id: &str) -> Result<(), Error> {
        let Some(found) = self.find(id).await?.filter(|found| !found.deleted) else { return Ok(()) };
        // A removed file leaves only its Drive id in the change list, which other devices can't tie to a game.
        let tombstone = json!({ "appProperties": { "deleted": "true" } });
        self.send(|http| http.patch(self.file_url(&found.drive_id)).json(&tombstone)).await?;
        Ok(())
    }

    async fn start_session(&self, blob: &str, size: u64, sha1: &str) -> Result<String, Error> {
        let metadata = json!({
            "name": blob,
            "parents": ["appDataFolder"],
            "appProperties": { "kind": "blob", "id": blob, "sha1": sha1 },
        });
        let response = self
            .send(|http| {
                http.post(self.url("/upload/drive/v3/files"))
                    .query(&[("uploadType", "resumable")])
                    .header("X-Upload-Content-Type", "application/octet-stream")
                    .header("X-Upload-Content-Length", size)
                    .json(&metadata)
            })
            .await?;
        let session = response.headers().get(LOCATION).and_then(|value| value.to_str().ok()).ok_or("Google Drive sent no upload session")?;
        // Asking a session how far it got needs the file's size, which the engine only keeps as part of the session.
        Ok(format!("{size} {session}"))
    }

    async fn session_offset(&self, session: &str) -> Result<Option<u64>, Error> {
        let (size, url) = parse_session(session)?;
        let response = self
            .send_once(&|http| {
                http.put(url)
                    .header(CONTENT_RANGE, format!("bytes */{size}"))
                    .header(CONTENT_LENGTH, 0)
                    .body(Vec::new())
            })
            .await?;
        if matches!(response.status(), StatusCode::NOT_FOUND | StatusCode::GONE) {
            return Ok(None);
        }
        Ok(Some(held(&check(response).await?, size)))
    }

    async fn send_from(&self, session: &str, mut offset: u64, from: &mut (dyn Read + Send), progress: &Sent<'_>) -> Result<(), Error> {
        let (size, url) = parse_session(session)?;
        if size == 0 {
            self.send(|http| {
                http.put(url).header(CONTENT_RANGE, "bytes */0").header(CONTENT_LENGTH, 0).body(Vec::new())
            })
            .await?;
            return Ok(());
        }
        let mut chunk = Vec::new();
        while offset < size {
            chunk.clear();
            from.take(CHUNK.min(size - offset)).read_to_end(&mut chunk).map_err(|e| Error::Failed(e.to_string()))?;
            if chunk.is_empty() {
                return Err("the file got shorter while it uploaded".to_string().into());
            }
            let end = offset + chunk.len() as u64;
            let mut sent = offset;
            while sent < end {
                let part = &chunk[(sent - offset) as usize..];
                let range = format!("bytes {sent}-{}/{size}", end - 1);
                let response = self.send(|http| http.put(url).header(CONTENT_RANGE, &range).body(part.to_vec())).await?;
                let now = held(&response, size);
                if now <= sent {
                    return Err(format!("Google Drive took none of the upload past byte {sent}").into());
                }
                sent = now;
                progress(sent);
            }
            offset = end;
        }
        Ok(())
    }

    async fn download_blob(&self, blob: &str, to: &mut (dyn Write + Send)) -> Result<(), Error> {
        let drive_id = self.drive_id(blob).await?.ok_or_else(|| format!("Google Drive has no blob {blob}"))?;
        let mut response = self.send(|http| http.get(self.file_url(&drive_id)).query(&[("alt", "media")])).await?;
        while let Some(bytes) = response.chunk().await.map_err(offline)? {
            to.write_all(&bytes).map_err(|e| Error::Failed(e.to_string()))?;
        }
        Ok(())
    }

    async fn delete_file(&self, drive_id: &str) -> Result<(), Error> {
        let response = self.send_once(&|http| http.delete(self.file_url(drive_id))).await?;
        if response.status() != StatusCode::NOT_FOUND {
            check(response).await?;
        }
        Ok(())
    }

    async fn delete_blob_file(&self, blob: &str) -> Result<(), Error> {
        let Some(drive_id) = self.drive_id(blob).await? else { return Ok(()) };
        self.delete_file(&drive_id).await?;
        self.forget(blob);
        Ok(())
    }

    async fn retire(&self, blob: &str) -> Result<(), Error> {
        let Some(found) = self.find(blob).await? else { return Ok(()) };
        if found.retired {
            return Ok(());
        }
        // Drive can only list files by a property's exact value, so `kind` changes to find retired blobs by.
        let retired = json!({ "appProperties": { "kind": "retired", "removedAt": now_millis().to_string() } });
        let response = self.send_once(&|http| http.patch(self.file_url(&found.drive_id)).json(&retired)).await?;
        if response.status() != StatusCode::NOT_FOUND {
            check(response).await?;
        }
        Ok(())
    }

    async fn purge(&self, older_than: Duration) -> Result<(), Error> {
        let cutoff = now_millis().saturating_sub(older_than.as_millis());
        for file in self.list("appProperties has { key='kind' and value='retired' }").await? {
            let properties = &file["appProperties"];
            let removed_at = properties["removedAt"].as_str().and_then(|at| at.parse::<u128>().ok());
            let (Some(drive_id), Some(removed_at)) = (file["id"].as_str(), removed_at) else { continue };
            if removed_at < cutoff {
                self.delete_file(drive_id).await?;
                if let Some(blob) = properties["id"].as_str() {
                    self.forget(blob);
                }
            }
        }
        Ok(())
    }
}

fn parse_session(session: &str) -> Result<(u64, &str), Error> {
    session
        .split_once(' ')
        .and_then(|(size, url)| Some((size.parse().ok()?, url)))
        .ok_or_else(|| Error::Failed(format!("not a Google Drive upload session: {session}")))
}

/// How many bytes an upload session holds. A 308 gives the last one in `Range: bytes=0-<last>`, and anything else means all of them.
fn held(response: &Response, size: u64) -> u64 {
    if response.status() != StatusCode::PERMANENT_REDIRECT {
        return size;
    }
    let range = response.headers().get(RANGE).and_then(|value| value.to_str().ok());
    range.and_then(|range| range.rsplit_once('-')).and_then(|(_, last)| last.parse::<u64>().ok()).map_or(0, |last| last + 1)
}

impl Provider for Drive {
    fn account(&self) -> String {
        self.account.clone()
    }

    fn changes<'a>(&'a self, cursor: Option<&'a str>) -> BoxFuture<'a, Result<Changes, Error>> {
        Box::pin(self.all_changes(cursor))
    }

    fn read_record<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Option<Versioned>, Error>> {
        Box::pin(self.read_record_file(id))
    }

    fn write_record<'a>(&'a self, id: &'a str, json: &'a [u8], expected: Option<&'a str>) -> BoxFuture<'a, Result<String, Error>> {
        Box::pin(self.write_record_file(id, json, expected))
    }

    fn delete_record<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        Box::pin(self.tombstone(id))
    }

    fn start_upload<'a>(&'a self, blob: &'a str, size: u64, sha1: &'a str) -> BoxFuture<'a, Result<String, Error>> {
        Box::pin(self.start_session(blob, size, sha1))
    }

    fn uploaded<'a>(&'a self, session: &'a str) -> BoxFuture<'a, Result<Option<u64>, Error>> {
        Box::pin(self.session_offset(session))
    }

    fn upload<'a>(&'a self, session: &'a str, offset: u64, from: &'a mut (dyn Read + Send), sent: &'a Sent<'a>) -> BoxFuture<'a, Result<(), Error>> {
        Box::pin(self.send_from(session, offset, from, sent))
    }

    fn download<'a>(&'a self, blob: &'a str, to: &'a mut (dyn Write + Send)) -> BoxFuture<'a, Result<(), Error>> {
        Box::pin(self.download_blob(blob, to))
    }

    fn delete_blob<'a>(&'a self, blob: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        Box::pin(self.delete_blob_file(blob))
    }

    fn retire_blob<'a>(&'a self, blob: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        Box::pin(self.retire(blob))
    }

    fn purge_retired(&self, older_than: Duration) -> BoxFuture<'_, Result<(), Error>> {
        Box::pin(self.purge(older_than))
    }
}

#[cfg(test)]
mod tests {
    use super::super::fake_drive::{properties, FakeDrive};
    use super::super::oauth::http;
    use super::*;
    use tauri::async_runtime::block_on;

    #[test]
    fn creates_updates_and_reads_a_record_in_the_app_data_folder() {
        let cloud = FakeDrive::new();
        let drive = &cloud.drive;

        let first = block_on(drive.write_record("game-1", br#"{"v":1}"#, None)).unwrap();
        let second = block_on(drive.write_record("game-1", br#"{"v":2}"#, Some(&first))).unwrap();
        let read = block_on(drive.read_record("game-1")).unwrap().unwrap();

        assert_ne!(first, second);
        assert_eq!(read, Versioned { json: br#"{"v":2}"#.to_vec(), version: second });
        assert_eq!(cloud.records(), [json!({ "v": 2 })]);
        assert_eq!(block_on(drive.read_record("game-2")).unwrap(), None);
    }

    #[test]
    fn a_write_from_an_old_version_is_stale() {
        let cloud = FakeDrive::new();
        let first = block_on(cloud.drive.write_record("game-1", b"{}", None)).unwrap();
        block_on(cloud.drive.write_record("game-1", b"{}", Some(&first))).unwrap();

        assert_eq!(block_on(cloud.drive.write_record("game-1", b"{}", Some(&first))), Err(Error::Stale));
        assert_eq!(block_on(cloud.drive.write_record("game-1", b"{}", None)), Err(Error::Stale));
        assert_eq!(block_on(cloud.drive.write_record("game-2", b"{}", Some(&first))), Err(Error::Stale));
    }

    #[test]
    fn a_record_two_devices_create_at_once_settles_on_the_older_file() {
        let cloud = FakeDrive::new();
        cloud.create_first(properties(&[("kind", "record"), ("id", "game-1")]), br#"{"from":"other"}"#);

        assert_eq!(block_on(cloud.drive.write_record("game-1", br#"{"from":"me"}"#, None)), Err(Error::Stale));
        assert_eq!(cloud.records(), [json!({ "from": "other" })]);
        assert_eq!(block_on(cloud.drive.read_record("game-1")).unwrap().unwrap().json, br#"{"from":"other"}"#);
    }

    #[test]
    fn another_device_finds_a_record_by_its_game() {
        let cloud = FakeDrive::new();
        let other = Drive::new(http(), &cloud.url, "player@example.com".into(), Arc::new(super::super::fake_drive::StaticToken));
        let version = block_on(cloud.drive.write_record("game-1", b"{}", None)).unwrap();

        let read = block_on(other.read_record("game-1")).unwrap().unwrap();

        assert_eq!(read.version, version);
        assert_eq!(block_on(other.write_record("game-1", br#"{"v":2}"#, Some(&version))).map(|_| ()), Ok(()));
    }

    #[test]
    fn pages_through_changes_and_keeps_the_new_start_page_token() {
        let cloud = FakeDrive::new();
        for game in ["game-1", "game-2", "game-3"] {
            block_on(cloud.drive.write_record(game, b"{}", None)).unwrap();
        }
        let all = block_on(cloud.drive.changes(None)).unwrap();
        for game in ["game-4", "game-5", "game-2"] {
            let version = block_on(cloud.drive.read_record(game)).unwrap().map(|record| record.version);
            block_on(cloud.drive.write_record(game, b"{}", version.as_deref())).unwrap();
        }
        block_on(cloud.drive.upload(&block_on(cloud.drive.start_upload("blob-2", 1, "x")).unwrap(), 0, &mut &b"x"[..], &|_| {})).unwrap();
        let pages_before = cloud.requests().iter().filter(|request| *request == "GET /drive/v3/changes").count();

        let changed = block_on(cloud.drive.changes(Some(&all.cursor))).unwrap();
        let again = block_on(cloud.drive.changes(Some(&changed.cursor))).unwrap();

        assert_eq!(all.records, ["game-1", "game-2", "game-3"]);
        assert_eq!(changed.records, ["game-2", "game-4", "game-5"]);
        assert!(cloud.requests().iter().filter(|request| *request == "GET /drive/v3/changes").count() - pages_before > 2);
        assert!(again.records.is_empty());
        assert_eq!(again.cursor, changed.cursor);
    }

    #[test]
    fn a_deleted_record_reads_as_gone_and_shows_up_as_a_change() {
        let cloud = FakeDrive::new();
        block_on(cloud.drive.write_record("game-1", b"{}", None)).unwrap();
        block_on(cloud.drive.write_record("game-2", b"{}", None)).unwrap();
        let cursor = block_on(cloud.drive.changes(None)).unwrap().cursor;

        block_on(cloud.drive.delete_record("game-1")).unwrap();

        assert_eq!(block_on(cloud.drive.read_record("game-1")).unwrap(), None);
        assert_eq!(block_on(cloud.drive.changes(Some(&cursor))).unwrap().records, ["game-1"]);
        assert_eq!(block_on(cloud.drive.changes(None)).unwrap().records, ["game-2"]);
        assert!(block_on(cloud.drive.write_record("game-1", b"{}", None)).is_ok());
    }

    #[test]
    fn a_resumable_upload_cut_off_partway_asks_how_far_it_got_and_carries_on() {
        let cloud = FakeDrive::new();
        let blob: Vec<u8> = (0..1000u32).map(|i| (i % 251) as u8).collect();
        let session = block_on(cloud.drive.start_upload("blob-1", 1000, "cafe")).unwrap();
        cloud.drop_upload_after(300);

        assert!(block_on(cloud.drive.upload(&session, 0, &mut &blob[..], &|_| {})).is_err());
        let offset = block_on(cloud.drive.uploaded(&session)).unwrap().unwrap();
        block_on(cloud.drive.upload(&session, offset, &mut &blob[offset as usize..], &|_| {})).unwrap();

        assert_eq!(offset, 300);
        assert_eq!(cloud.uploaded_bytes(), 1000);
        assert_eq!(cloud.blobs(), [(properties(&[("kind", "blob"), ("id", "blob-1"), ("sha1", "cafe")]), blob.clone())]);
        let mut downloaded = Vec::new();
        block_on(cloud.drive.download("blob-1", &mut downloaded)).unwrap();
        assert_eq!(downloaded, blob);
        assert_eq!(block_on(cloud.drive.uploaded(&session)).unwrap(), Some(1000));
    }

    #[test]
    fn uploads_an_empty_blob() {
        let cloud = FakeDrive::new();
        let session = block_on(cloud.drive.start_upload("blob-1", 0, "x")).unwrap();

        block_on(cloud.drive.upload(&session, 0, &mut &b""[..], &|_| {})).unwrap();

        assert_eq!(cloud.blobs(), [(properties(&[("kind", "blob"), ("id", "blob-1"), ("sha1", "x")]), Vec::new())]);
    }

    #[test]
    fn sends_again_what_drive_didnt_take() {
        let cloud = FakeDrive::new();
        let blob = vec![7u8; 500];
        let session = block_on(cloud.drive.start_upload("blob-1", 500, "x")).unwrap();
        cloud.take_at_most(200);

        block_on(cloud.drive.upload(&session, 0, &mut &blob[..], &|_| {})).unwrap();

        assert_eq!(cloud.blobs()[0].1, blob);
    }

    #[test]
    fn uploads_a_large_blob_in_chunks() {
        let cloud = FakeDrive::new();
        let blob: Vec<u8> = (0..CHUNK as usize + 1000).map(|i| (i % 253) as u8).collect();
        let session = block_on(cloud.drive.start_upload("blob-1", blob.len() as u64, "x")).unwrap();

        block_on(cloud.drive.upload(&session, 0, &mut &blob[..], &|_| {})).unwrap();

        assert_eq!(cloud.requests().iter().filter(|request| *request == "PUT /upload/drive/v3/files").count(), 2);
        assert_eq!(cloud.blobs()[0].1, blob);
    }

    #[test]
    fn an_upload_session_that_expired_is_gone() {
        let cloud = FakeDrive::new();

        assert_eq!(block_on(cloud.drive.uploaded(&format!("10 {}/upload/drive/v3/files?upload_id=old", cloud.url))), Ok(None));
    }

    #[test]
    fn deletes_a_blob() {
        let cloud = FakeDrive::new();
        let session = block_on(cloud.drive.start_upload("blob-1", 1, "x")).unwrap();
        block_on(cloud.drive.upload(&session, 0, &mut &b"x"[..], &|_| {})).unwrap();

        block_on(cloud.drive.delete_blob("blob-1")).unwrap();
        block_on(cloud.drive.delete_blob("blob-1")).unwrap();

        assert!(cloud.blobs().is_empty());
    }

    #[test]
    fn asks_to_slow_down_on_429_5xx_and_rate_limits() {
        let cloud = FakeDrive::new();
        for (status, reason) in [(429, None), (503, None), (500, None), (403, Some("rateLimitExceeded")), (403, Some("userRateLimitExceeded"))] {
            cloud.fail(1, status, reason);
            assert_eq!(block_on(cloud.drive.changes(None)), Err(Error::SlowDown(None)), "{status} {reason:?}");
        }
        cloud.fail(1, 403, Some("storageQuotaExceeded"));
        assert_eq!(block_on(cloud.drive.changes(None)), Err(Error::Account("Your Google Drive is full".into())));
        assert!(block_on(cloud.drive.changes(None)).is_ok());
    }

    #[test]
    fn a_token_without_drive_access_asks_to_sign_in_again() {
        let cloud = FakeDrive::new();
        cloud.fail(1, 403, Some("insufficientPermissions"));
        assert_eq!(block_on(cloud.drive.changes(None)), Err(Error::Account("Sign in to Google Drive again".into())));

        let details = json!({ "error": { "code": 403, "message": "Request had insufficient authentication scopes.",
            "details": [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": "ACCESS_TOKEN_SCOPE_INSUFFICIENT" }] } });
        assert_eq!(
            refusal(StatusCode::FORBIDDEN, &details.to_string()),
            Error::Account("Sign in to Google Drive again".into())
        );
    }

    #[test]
    fn an_answer_that_isnt_json_names_only_the_status() {
        let cloud = FakeDrive::new();
        cloud.fail_with_html(400);

        assert_eq!(
            block_on(cloud.drive.changes(None)),
            Err(Error::Failed("Google Drive answered 400 Bad Request".into()))
        );
    }

    struct Expiring {
        refused: Mutex<Vec<String>>,
    }

    impl Tokens for Expiring {
        fn token<'a>(&'a self, refused: Option<&'a str>) -> BoxFuture<'a, Result<String, Error>> {
            let mut known = self.refused.lock().unwrap();
            known.extend(refused.map(String::from));
            Box::pin(std::future::ready(Ok(if known.is_empty() { "expired" } else { "fresh" }.to_string())))
        }
    }

    #[test]
    fn asks_for_a_new_token_when_drive_refuses_one() {
        let tokens = Arc::new(Expiring { refused: Mutex::default() });
        let cloud = FakeDrive::with_tokens(tokens.clone());
        cloud.accept_token("fresh");

        block_on(cloud.drive.changes(None)).unwrap();

        assert_eq!(*tokens.refused.lock().unwrap(), ["expired"]);
    }

    #[test]
    fn a_token_drive_refuses_even_fresh_asks_to_sign_in_again() {
        let cloud = FakeDrive::new();
        cloud.fail(2, 401, None);

        assert_eq!(block_on(cloud.drive.changes(None)), Err(Error::Account("Sign in to Google Drive again".into())));
    }
}
