use super::oauth::{offline, Tokens};
use super::provider::{BoxFuture, Changes, Error, Provider, Sent, Versioned};
use super::Cloud;
use super::removed::DATE_FORMAT;
use bytes::Bytes;
use chrono::{DateTime, NaiveDate, Utc};
use reqwest::header::{CONTENT_TYPE, RETRY_AFTER};
use reqwest::{Client, RequestBuilder, Response, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeSet;
use std::io::{Read, Write};
use std::sync::Arc;
use std::time::{Duration, SystemTime};

pub const API: &str = "https://api.dropboxapi.com";
pub const CONTENT: &str = "https://content.dropboxapi.com";
/// Files bigger than a chunk go up through an upload session, so an upload cut short resumes.
const CHUNK: u64 = 16 * 1024 * 1024;
const ARG: &str = "Dropbox-API-Arg";
const RESULT: &str = "Dropbox-API-Result";
/// Retired blobs move to `/removed/<YYYY-MM-DD>/<blob>`, dated in UTC.
const REMOVED: &str = "/removed";

/// A 409: the endpoint couldn't do it, and `summary` says why, as in `path/not_found/..`.
struct Refused {
    summary: String,
    error: Value,
}

impl Refused {
    fn is(&self, prefix: &str) -> bool {
        self.summary.starts_with(prefix)
    }
}

impl From<Refused> for Error {
    fn from(refused: Refused) -> Error {
        Error::Failed(format!("Dropbox refused: {}", refused.summary))
    }
}

type Answer = Result<Response, Refused>;

fn done(answer: Answer) -> Result<Response, Error> {
    answer.map_err(Error::from)
}

async fn json(response: Response) -> Result<Value, Error> {
    response.json().await.map_err(|e| Error::Failed(format!("Couldn't read Dropbox's answer: {e}")))
}

fn record_path(id: &str) -> String {
    format!("/{id}.json")
}

fn blob_path(blob: &str) -> String {
    format!("/{blob}")
}

#[derive(Serialize, Deserialize)]
struct Session {
    blob: String,
    size: u64,
    /// Files bigger than a chunk upload through a session. Smaller ones have none.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    id: Option<String>,
}

impl Session {
    fn parse(session: &str) -> Result<Session, Error> {
        serde_json::from_str(session).map_err(|_| Error::Failed(format!("not a Dropbox upload: {session}")))
    }
}

/// An App folder app: Dropbox keeps its files in `Apps/pkhemu`, and every path here is inside it. A record is
/// `/<game>.json`, its `rev` the version, and a blob is `/<blob>`, or `/removed/<YYYY-MM-DD>/<blob>` once retired.
pub struct Dropbox {
    http: Client,
    api: String,
    content: String,
    account: String,
    tokens: Arc<dyn Tokens>,
    chunk: u64,
}

impl Dropbox {
    pub fn new(http: Client, api: &str, content: &str, account: String, tokens: Arc<dyn Tokens>) -> Dropbox {
        let (api, content) = (api.trim_end_matches('/').into(), content.trim_end_matches('/').into());
        Dropbox { http, api, content, account, tokens, chunk: CHUNK }
    }

    #[cfg(test)]
    pub fn uploading(self, chunk: u64) -> Dropbox {
        Dropbox { chunk, ..self }
    }

    async fn call(&self, request: impl Fn(&Client) -> RequestBuilder) -> Result<Answer, Error> {
        let token = self.tokens.token(None).await?;
        let mut response = request(&self.http).bearer_auth(&token).send().await.map_err(offline)?;
        if response.status() == StatusCode::UNAUTHORIZED {
            let token = self.tokens.token(Some(&token)).await?;
            response = request(&self.http).bearer_auth(&token).send().await.map_err(offline)?;
        }
        let status = response.status();
        if status.is_success() {
            return Ok(Ok(response));
        }
        let header =
            response.headers().get(RETRY_AFTER).and_then(|value| value.to_str().ok()?.trim().parse::<u64>().ok());
        let body = response.text().await.unwrap_or_default();
        let error: Value = serde_json::from_str(&body).unwrap_or_default();
        let summary = error["error_summary"].as_str().unwrap_or_default().to_string();
        match status.as_u16() {
            409 if summary.contains("insufficient_space") => Err(Error::Full(Cloud::Dropbox)),
            409 => Ok(Err(Refused { summary, error: error["error"].clone() })),
            429 | 503 => {
                let asked = header.or(error["error"]["retry_after"].as_u64());
                Err(Error::SlowDown(asked.map(Duration::from_secs)))
            }
            500..=599 => Err(Error::SlowDown(None)),
            401 => Err(Error::Account("Sign in to Dropbox again".into())),
            _ => Err(Error::Failed(format!(
                "Dropbox answered {status}: {}",
                if summary.is_empty() { &body } else { &summary }
            ))),
        }
    }

    async fn rpc(&self, endpoint: &str, arg: &Value) -> Result<Answer, Error> {
        self.call(|http| http.post(format!("{}/2/{endpoint}", self.api)).json(arg)).await
    }

    async fn upload_call(&self, endpoint: &str, arg: &Value, body: Bytes) -> Result<Answer, Error> {
        let url = format!("{}/2/{endpoint}", self.content);
        let arg = arg.to_string();
        self.call(|http| {
            http.post(&url).header(ARG, &arg).header(CONTENT_TYPE, "application/octet-stream").body(body.clone())
        })
        .await
    }

    async fn download_call(&self, endpoint: &str, arg: &Value) -> Result<Answer, Error> {
        let (url, arg) = (format!("{}/2/{endpoint}", self.content), arg.to_string());
        self.call(|http| http.post(&url).header(ARG, &arg)).await
    }

    async fn list(&self, cursor: Option<&str>) -> Result<Changes, Error> {
        let mut since = cursor;
        let mut answer = match since {
            Some(cursor) => self.rpc("files/list_folder/continue", &json!({ "cursor": cursor })).await?,
            None => Err(Refused { summary: "reset".into(), error: Value::Null }),
        };
        if answer.as_ref().is_err_and(|refused| refused.is("reset")) {
            since = None;
            answer = self.rpc("files/list_folder", &json!({ "path": "", "include_deleted": true })).await?;
        }
        let mut records = BTreeSet::new();
        let mut response = done(answer)?;
        loop {
            let page = json(response).await?;
            for entry in page["entries"].as_array().into_iter().flatten() {
                let Some(id) = entry["name"].as_str().and_then(|name| name.strip_suffix(".json")) else { continue };
                let changed = match entry[".tag"].as_str() {
                    Some("file") => true,
                    Some("deleted") => since.is_some(),
                    _ => false,
                };
                if changed {
                    records.insert(id.to_string());
                }
            }
            let cursor = page["cursor"].as_str().ok_or("Dropbox sent no cursor")?;
            if page["has_more"] != true {
                return Ok(Changes { records: records.into_iter().collect(), cursor: cursor.into(), complete: since.is_none() });
            }
            response = done(self.rpc("files/list_folder/continue", &json!({ "cursor": cursor })).await?)?;
        }
    }

    async fn read_record_file(&self, id: &str) -> Result<Option<Versioned>, Error> {
        let response = match self.download_call("files/download", &json!({ "path": record_path(id) })).await? {
            Err(refused) if refused.is("path/not_found") => return Ok(None),
            answer => done(answer)?,
        };
        let metadata =
            response.headers().get(RESULT).and_then(|value| serde_json::from_slice::<Value>(value.as_bytes()).ok());
        let version =
            metadata.and_then(|metadata| metadata["rev"].as_str().map(String::from)).ok_or("Dropbox sent no rev")?;
        let json = response.bytes().await.map_err(offline)?.to_vec();
        Ok(Some(Versioned { json, version }))
    }

    async fn write_record_file(&self, id: &str, content: &[u8], expected: Option<&str>) -> Result<String, Error> {
        let mode = match expected {
            Some(rev) => json!({ ".tag": "update", "update": rev }),
            None => json!("add"),
        };
        // Strict, so a write expecting a record another device deleted conflicts too.
        let arg = json!({ "path": record_path(id), "mode": mode, "autorename": false, "mute": true, "strict_conflict": true });
        let response = match self.upload_call("files/upload", &arg, Bytes::copy_from_slice(content)).await? {
            Err(refused) if refused.is("path/conflict") => return Err(Error::Stale),
            answer => done(answer)?,
        };
        Ok(json(response).await?["rev"].as_str().ok_or("Dropbox sent no rev")?.into())
    }

    async fn delete(&self, path: &str) -> Result<(), Error> {
        match self.rpc("files/delete_v2", &json!({ "path": path })).await? {
            Err(refused) if refused.is("path_lookup/not_found") => Ok(()),
            answer => done(answer).map(|_| ()),
        }
    }

    async fn size(&self, path: &str) -> Result<Option<u64>, Error> {
        match self.rpc("files/get_metadata", &json!({ "path": path })).await? {
            Err(refused) if refused.is("path/not_found") => Ok(None),
            answer => Ok(json(done(answer)?).await?["size"].as_u64()),
        }
    }

    async fn start_session(&self, blob: &str, size: u64) -> Result<String, Error> {
        let id = match size > self.chunk {
            true => {
                let started =
                    json(done(self.upload_call("files/upload_session/start", &json!({ "close": false }), Bytes::new()).await?)?)
                        .await?;
                Some(started["session_id"].as_str().ok_or("Dropbox sent no upload session")?.to_string())
            }
            false => None,
        };
        serde_json::to_string(&Session { blob: blob.into(), size, id }).map_err(|e| Error::Failed(e.to_string()))
    }

    async fn session_offset(&self, session: &str) -> Result<Option<u64>, Error> {
        let session = Session::parse(session)?;
        if let Some(id) = &session.id {
            // An empty append at 0 is the only way to ask a session how far it got.
            let arg = json!({ "cursor": { "session_id": id, "offset": 0 }, "close": false });
            match self.upload_call("files/upload_session/append_v2", &arg, Bytes::new()).await? {
                Ok(_) => return Ok(Some(0)),
                Err(refused) if refused.is("incorrect_offset") => return Ok(refused.error["correct_offset"].as_u64()),
                Err(refused) if refused.is("not_found") || refused.is("closed") => {}
                Err(refused) => return Err(refused.into()),
            }
        }
        // The upload may have finished with its answer lost on the way back.
        Ok(match self.size(&blob_path(&session.blob)).await? {
            Some(size) if size == session.size => Some(size),
            _ if session.id.is_some() => None,
            _ => Some(0),
        })
    }

    async fn send_from(
        &self,
        session: &str,
        mut offset: u64,
        from: &mut (dyn Read + Send),
        sent: &Sent<'_>,
    ) -> Result<(), Error> {
        let Session { blob, size, id } = Session::parse(session)?;
        if offset == size && size > 0 {
            return Ok(());
        }
        let commit = json!({ "path": blob_path(&blob), "mode": "overwrite", "autorename": false, "mute": true });
        let read = |from: &mut (dyn Read + Send), length: u64| -> Result<Bytes, Error> {
            let mut bytes = Vec::new();
            from.take(length).read_to_end(&mut bytes).map_err(|e| Error::Failed(e.to_string()))?;
            match bytes.len() as u64 == length {
                true => Ok(bytes.into()),
                false => Err("the file got shorter while it uploaded".into()),
            }
        };
        let Some(id) = id else {
            let bytes = read(from, size)?;
            done(self.upload_call("files/upload", &commit, bytes).await?)?;
            sent(size);
            return Ok(());
        };
        while offset < size {
            let chunk = read(from, self.chunk.min(size - offset))?;
            let cursor = json!({ "session_id": id, "offset": offset });
            offset += chunk.len() as u64;
            let answer = match offset == size {
                true => {
                    let arg = json!({ "cursor": cursor, "commit": commit });
                    self.upload_call("files/upload_session/finish", &arg, chunk).await?
                }
                false => {
                    let arg = json!({ "cursor": cursor, "close": false });
                    self.upload_call("files/upload_session/append_v2", &arg, chunk).await?
                }
            };
            done(answer)?;
            sent(offset);
        }
        Ok(())
    }

    async fn fetch(&self, path: &str) -> Result<Option<Response>, Error> {
        match self.download_call("files/download", &json!({ "path": path })).await? {
            Err(refused) if refused.is("path/not_found") => Ok(None),
            answer => done(answer).map(Some),
        }
    }

    async fn fetch_retired(&self, blob: &str) -> Result<Option<Response>, Error> {
        let mut days = self.removed_days().await?;
        days.sort();
        for day in days.iter().rev() {
            if let Some(response) = self.fetch(&format!("{REMOVED}/{day}/{blob}")).await? {
                return Ok(Some(response));
            }
        }
        Ok(None)
    }

    async fn removed_days(&self) -> Result<Vec<String>, Error> {
        let mut response = match self.rpc("files/list_folder", &json!({ "path": REMOVED })).await? {
            Err(refused) if refused.is("path/not_found") => return Ok(Vec::new()),
            answer => done(answer)?,
        };
        let mut days = Vec::new();
        loop {
            let page = json(response).await?;
            let folders = page["entries"].as_array().into_iter().flatten().filter(|entry| entry[".tag"] == "folder");
            days.extend(folders.filter_map(|entry| entry["name"].as_str().map(String::from)));
            if page["has_more"] != true {
                return Ok(days);
            }
            let cursor = page["cursor"].as_str().ok_or("Dropbox sent no cursor")?;
            response = done(self.rpc("files/list_folder/continue", &json!({ "cursor": cursor })).await?)?;
        }
    }

    async fn retire(&self, blob: &str) -> Result<(), Error> {
        let to = format!("{REMOVED}/{}/{blob}", Utc::now().format(DATE_FORMAT));
        let arg = json!({ "from_path": blob_path(blob), "to_path": to, "autorename": true });
        match self.rpc("files/move_v2", &arg).await? {
            Err(refused) if refused.is("from_lookup/not_found") => Ok(()),
            answer => done(answer).map(|_| ()),
        }
    }

    async fn purge(&self, older_than: Duration) -> Result<(), Error> {
        let cutoff = DateTime::<Utc>::from(SystemTime::now() - older_than).date_naive();
        for day in self.removed_days().await? {
            if NaiveDate::parse_from_str(&day, DATE_FORMAT).is_ok_and(|date| date < cutoff) {
                self.delete(&format!("{REMOVED}/{day}")).await?;
            }
        }
        Ok(())
    }

    async fn download_blob(&self, blob: &str, to: &mut (dyn Write + Send)) -> Result<(), Error> {
        let mut response = match self.fetch(&blob_path(blob)).await? {
            Some(response) => response,
            None => self.fetch_retired(blob).await?.ok_or_else(|| format!("Dropbox has no blob {blob}"))?,
        };
        while let Some(bytes) = response.chunk().await.map_err(offline)? {
            to.write_all(&bytes).map_err(|e| Error::Failed(e.to_string()))?;
        }
        Ok(())
    }
}

impl Provider for Dropbox {
    fn account(&self) -> String {
        self.account.clone()
    }

    fn changes<'a>(&'a self, cursor: Option<&'a str>) -> BoxFuture<'a, Result<Changes, Error>> {
        Box::pin(self.list(cursor))
    }

    fn read_record<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Option<Versioned>, Error>> {
        Box::pin(self.read_record_file(id))
    }

    fn write_record<'a>(
        &'a self,
        id: &'a str,
        json: &'a [u8],
        expected: Option<&'a str>,
    ) -> BoxFuture<'a, Result<String, Error>> {
        Box::pin(self.write_record_file(id, json, expected))
    }

    fn delete_record<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        Box::pin(async move { self.delete(&record_path(id)).await })
    }

    fn start_upload<'a>(&'a self, blob: &'a str, size: u64, _sha1: &'a str) -> BoxFuture<'a, Result<String, Error>> {
        Box::pin(self.start_session(blob, size))
    }

    fn uploaded<'a>(&'a self, session: &'a str) -> BoxFuture<'a, Result<Option<u64>, Error>> {
        Box::pin(self.session_offset(session))
    }

    fn upload<'a>(
        &'a self,
        session: &'a str,
        offset: u64,
        from: &'a mut (dyn Read + Send),
        sent: &'a Sent<'a>,
    ) -> BoxFuture<'a, Result<(), Error>> {
        Box::pin(self.send_from(session, offset, from, sent))
    }

    fn download<'a>(&'a self, blob: &'a str, to: &'a mut (dyn Write + Send)) -> BoxFuture<'a, Result<(), Error>> {
        Box::pin(self.download_blob(blob, to))
    }

    fn delete_blob<'a>(&'a self, blob: &'a str) -> BoxFuture<'a, Result<(), Error>> {
        Box::pin(async move { self.delete(&blob_path(blob)).await })
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
    use super::super::fake_dropbox::{self, FakeDropbox};
    use super::*;
    use std::sync::Mutex;
    use tauri::async_runtime::block_on;

    fn upload(cloud: &FakeDropbox, blob: &str, bytes: &[u8]) {
        let session = block_on(cloud.dropbox.start_upload(blob, bytes.len() as u64, "sha1")).unwrap();
        block_on(cloud.dropbox.upload(&session, 0, &mut &bytes[..], &|_| {})).unwrap();
    }

    fn download(cloud: &FakeDropbox, blob: &str) -> Vec<u8> {
        let mut downloaded = Vec::new();
        block_on(cloud.dropbox.download(blob, &mut downloaded)).unwrap();
        downloaded
    }

    #[test]
    fn keeps_records_and_blobs_as_files_in_the_app_folders_root() {
        let cloud = FakeDropbox::new();

        let first = block_on(cloud.dropbox.write_record("game-1", br#"{"v":1}"#, None)).unwrap();
        let second = block_on(cloud.dropbox.write_record("game-1", br#"{"v":2}"#, Some(&first))).unwrap();
        upload(&cloud, "blob-1", b"save");

        assert_ne!(first, second);
        assert_eq!(
            block_on(cloud.dropbox.read_record("game-1")).unwrap(),
            Some(Versioned { json: br#"{"v":2}"#.to_vec(), version: second })
        );
        assert_eq!(block_on(cloud.dropbox.read_record("game-2")).unwrap(), None);
        assert_eq!(cloud.paths(), ["/blob-1", "/game-1.json"]);
        assert_eq!(download(&cloud, "blob-1"), b"save");
    }

    #[test]
    fn a_write_from_an_old_version_is_stale() {
        let cloud = FakeDropbox::new();
        let first = block_on(cloud.dropbox.write_record("game-1", b"{}", None)).unwrap();
        block_on(cloud.dropbox.write_record("game-1", b"{}", Some(&first))).unwrap();

        assert_eq!(block_on(cloud.dropbox.write_record("game-1", b"{}", Some(&first))), Err(Error::Stale));
        assert_eq!(block_on(cloud.dropbox.write_record("game-1", b"{}", None)), Err(Error::Stale));
        assert_eq!(block_on(cloud.dropbox.write_record("game-2", b"{}", Some(&first))), Err(Error::Stale));
    }

    #[test]
    fn pages_through_changes_with_deletions() {
        let cloud = FakeDropbox::new();
        for game in ["game-1", "game-2", "game-3"] {
            block_on(cloud.dropbox.write_record(game, b"{}", None)).unwrap();
        }
        upload(&cloud, "blob-1", b"x");
        let all = block_on(cloud.dropbox.changes(None)).unwrap();
        for game in ["game-4", "game-5"] {
            block_on(cloud.dropbox.write_record(game, b"{}", None)).unwrap();
        }
        let version = block_on(cloud.dropbox.read_record("game-2")).unwrap().unwrap().version;
        block_on(cloud.dropbox.write_record("game-2", b"{}", Some(&version))).unwrap();
        block_on(cloud.dropbox.delete_record("game-1")).unwrap();
        block_on(cloud.dropbox.delete_blob("blob-1")).unwrap();
        let pages_before =
            cloud.requests().iter().filter(|request| *request == "POST /2/files/list_folder/continue").count();

        let changed = block_on(cloud.dropbox.changes(Some(&all.cursor))).unwrap();
        let again = block_on(cloud.dropbox.changes(Some(&changed.cursor))).unwrap();

        assert_eq!(all.records, ["game-1", "game-2", "game-3"]);
        assert_eq!(changed.records, ["game-1", "game-2", "game-4", "game-5"]);
        assert!(
            cloud.requests().iter().filter(|request| *request == "POST /2/files/list_folder/continue").count()
                - pages_before
                > 2
        );
        assert!(again.records.is_empty());
        assert_eq!(block_on(cloud.dropbox.read_record("game-1")).unwrap(), None);
        assert_eq!(block_on(cloud.dropbox.changes(None)).unwrap().records, ["game-2", "game-3", "game-4", "game-5"]);
        assert!(block_on(cloud.dropbox.write_record("game-1", b"{}", None)).is_ok());
    }

    #[test]
    fn a_cursor_dropbox_reset_lists_everything_again() {
        let cloud = FakeDropbox::new();
        block_on(cloud.dropbox.write_record("game-1", b"{}", None)).unwrap();
        block_on(cloud.dropbox.write_record("game-2", b"{}", None)).unwrap();
        let cursor = block_on(cloud.dropbox.changes(None)).unwrap().cursor;
        block_on(cloud.dropbox.delete_record("game-2")).unwrap();
        cloud.reset_cursors();

        let listed = block_on(cloud.dropbox.changes(Some(&cursor))).unwrap();

        assert_eq!((listed.records.as_slice(), listed.complete), (&["game-1".to_string()][..], true));
        let again = block_on(cloud.dropbox.changes(Some(&listed.cursor))).unwrap();
        assert!(again.records.is_empty() && !again.complete);
    }

    fn sized_like_dropbox() -> FakeDropbox {
        let mut cloud = FakeDropbox::new();
        cloud.dropbox.chunk = CHUNK;
        cloud
    }

    #[test]
    fn uploads_a_file_of_up_to_a_chunk_in_one_request() {
        let cloud = sized_like_dropbox();
        let blob = vec![7; 1_000_000];

        upload(&cloud, "blob-1", &blob);

        assert_eq!(cloud.requests(), ["POST /2/files/upload"]);
        assert_eq!(cloud.blob("blob-1").unwrap(), blob);
    }

    #[test]
    fn uploads_a_bigger_file_through_a_session_so_it_can_resume() {
        let cloud = sized_like_dropbox();
        let blob: Vec<u8> = (0..20_000_000u32).map(|i| (i % 251) as u8).collect();

        upload(&cloud, "blob-1", &blob);

        assert_eq!(
            cloud.requests(),
            [
                "POST /2/files/upload_session/start",
                "POST /2/files/upload_session/append_v2",
                "POST /2/files/upload_session/finish"
            ]
        );
        assert_eq!(cloud.blob("blob-1").unwrap(), blob);
    }

    #[test]
    fn uploads_a_big_file_through_a_session_in_chunks() {
        let cloud = FakeDropbox::new();
        let blob: Vec<u8> = (0..5 * fake_dropbox::CHUNK + 1).map(|i| (i % 251) as u8).collect();

        upload(&cloud, "blob-1", &blob);

        let appends =
            cloud.requests().iter().filter(|request| *request == "POST /2/files/upload_session/append_v2").count();
        assert_eq!(appends, 5);
        assert_eq!(cloud.blob("blob-1").unwrap(), blob);
        assert_eq!(download(&cloud, "blob-1"), blob);
    }

    #[test]
    fn an_upload_session_that_drops_asks_how_far_it_got_and_carries_on() {
        let cloud = FakeDropbox::new();
        let blob: Vec<u8> = (0..1000u32).map(|i| (i % 251) as u8).collect();
        let session = block_on(cloud.dropbox.start_upload("blob-1", 1000, "sha1")).unwrap();
        cloud.drop_upload_after(300);

        assert!(block_on(cloud.dropbox.upload(&session, 0, &mut &blob[..], &|_| {})).is_err());
        let offset = block_on(cloud.dropbox.uploaded(&session)).unwrap().unwrap();
        block_on(cloud.dropbox.upload(&session, offset, &mut &blob[offset as usize..], &|_| {})).unwrap();

        assert_eq!(offset, 300);
        assert_eq!(cloud.uploaded_bytes(), 1000);
        assert_eq!(cloud.blob("blob-1").unwrap(), blob);
        assert_eq!(block_on(cloud.dropbox.uploaded(&session)).unwrap(), Some(1000));
        block_on(cloud.dropbox.upload(&session, 1000, &mut &[][..], &|_| {})).unwrap();
    }

    #[test]
    fn an_upload_session_dropbox_forgot_is_gone() {
        let cloud = FakeDropbox::new();
        let session = r#"{"blob":"blob-1","size":1000,"id":"session-old"}"#;

        assert_eq!(block_on(cloud.dropbox.uploaded(session)), Ok(None));
    }

    #[test]
    fn a_small_upload_that_dropped_starts_again() {
        let cloud = FakeDropbox::new();
        let session = block_on(cloud.dropbox.start_upload("blob-1", 4, "sha1")).unwrap();
        cloud.drop_upload_after(0);

        assert!(block_on(cloud.dropbox.upload(&session, 0, &mut &b"save"[..], &|_| {})).is_err());
        assert_eq!(block_on(cloud.dropbox.uploaded(&session)), Ok(Some(0)));
    }

    #[test]
    fn deletes_a_blob() {
        let cloud = FakeDropbox::new();
        upload(&cloud, "blob-1", b"x");

        block_on(cloud.dropbox.delete_blob("blob-1")).unwrap();
        block_on(cloud.dropbox.delete_blob("blob-1")).unwrap();

        assert!(cloud.paths().is_empty());
    }

    #[test]
    fn slows_down_for_as_long_as_dropbox_asks() {
        let cloud = FakeDropbox::new();
        cloud.fail(1, 429, Some(30));
        assert_eq!(block_on(cloud.dropbox.changes(None)), Err(Error::SlowDown(Some(Duration::from_secs(30)))));
        cloud.fail(1, 503, None);
        assert_eq!(block_on(cloud.dropbox.changes(None)), Err(Error::SlowDown(None)));
        cloud.fill_up();
        assert_eq!(
            block_on(cloud.dropbox.write_record("game-1", b"{}", None)),
            Err(Error::Full(Cloud::Dropbox))
        );
        assert!(block_on(cloud.dropbox.changes(None)).is_ok());
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
    fn asks_for_a_new_token_when_dropbox_refuses_one() {
        let tokens = Arc::new(Expiring { refused: Mutex::default() });
        let cloud = FakeDropbox::with_tokens(tokens.clone());
        cloud.accept_token("fresh");

        block_on(cloud.dropbox.changes(None)).unwrap();

        assert_eq!(*tokens.refused.lock().unwrap(), ["expired"]);
    }
}
