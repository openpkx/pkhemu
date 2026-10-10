use super::drive::Drive;
use super::fake_http::{Reply, Request, Server};
use super::oauth::{http, Tokens};
use super::provider::{BoxFuture, Error};
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashMap};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub const TOKEN: &str = "access-token";

pub struct StaticToken;

impl Tokens for StaticToken {
    fn token<'a>(&'a self, _: Option<&'a str>) -> BoxFuture<'a, Result<String, Error>> {
        Box::pin(std::future::ready(Ok(TOKEN.to_string())))
    }
}

struct File {
    properties: BTreeMap<String, String>,
    content: Vec<u8>,
    version: u64,
}

struct Session {
    properties: BTreeMap<String, String>,
    size: u64,
    received: Vec<u8>,
    file: Option<String>,
}

#[derive(Default)]
struct State {
    url: String,
    token: String,
    files: BTreeMap<String, File>,
    changes: Vec<String>,
    sessions: HashMap<String, Session>,
    ids: u64,
    versions: u64,
    page_size: usize,
    failures: Vec<Reply>,
    drop_after: Option<u64>,
    take_at_most: Option<u64>,
    rival: Option<(BTreeMap<String, String>, Vec<u8>)>,
    uploaded_bytes: u64,
    record_writes: usize,
    requests: Vec<String>,
}

pub struct FakeDrive {
    state: Arc<Mutex<State>>,
    pub url: String,
    pub drive: Drive,
}

impl FakeDrive {
    pub fn new() -> FakeDrive {
        FakeDrive::with_tokens(Arc::new(StaticToken))
    }

    pub fn with_tokens(tokens: Arc<dyn Tokens>) -> FakeDrive {
        let state = Arc::new(Mutex::new(State { token: TOKEN.into(), page_size: 2, ..State::default() }));
        let server = {
            let state = state.clone();
            Server::start(move |request| handle(&mut state.lock().unwrap(), request))
        };
        state.lock().unwrap().url = server.url.clone();
        let drive = Drive::new(http(), &server.url, "player@example.com".into(), tokens);
        FakeDrive { state, url: server.url, drive }
    }

    fn state(&self) -> MutexGuard<'_, State> {
        self.state.lock().unwrap()
    }

    pub fn accept_token(&self, token: &str) {
        self.state().token = token.into();
    }

    pub fn fail(&self, times: usize, status: u16, reason: Option<&str>) {
        let errors = reason.map(|reason| vec![json!({ "reason": reason })]).unwrap_or_default();
        let failure = json!({ "error": { "code": status, "message": "try later", "errors": errors } });
        self.state().failures.extend((0..times).map(|_| Reply::json(status, failure.clone())));
    }

    pub fn fail_with_html(&self, status: u16) {
        self.state().failures.push(html_error(status));
    }

    pub fn slow_down(&self, times: usize) {
        self.fail(times, 429, None)
    }

    pub fn drop_upload_after(&self, bytes: u64) {
        self.state().drop_after = Some(bytes);
    }

    /// Another device creates this file just before the next record is created here.
    pub fn create_first(&self, properties: BTreeMap<String, String>, content: &[u8]) {
        self.state().rival = Some((properties, content.to_vec()));
    }

    pub fn take_at_most(&self, bytes: u64) {
        self.state().take_at_most = Some(bytes);
    }

    pub fn uploaded_bytes(&self) -> u64 {
        self.state().uploaded_bytes
    }

    pub fn record_writes(&self) -> usize {
        self.state().record_writes
    }

    pub fn requests(&self) -> Vec<String> {
        self.state().requests.clone()
    }

    pub fn records(&self) -> Vec<Value> {
        let state = self.state();
        let records = state.files.values().filter(|file| file.properties.get("kind").is_some_and(|kind| kind == "record"));
        records.filter(|file| !file.properties.contains_key("deleted")).map(|file| serde_json::from_slice(&file.content).unwrap()).collect()
    }

    pub fn blobs(&self) -> Vec<(BTreeMap<String, String>, Vec<u8>)> {
        let state = self.state();
        let blobs = state.files.values().filter(|file| file.properties.get("kind").is_some_and(|kind| kind == "blob"));
        blobs.map(|file| (file.properties.clone(), file.content.clone())).collect()
    }

    pub fn retired(&self) -> Vec<Vec<u8>> {
        let state = self.state();
        let retired =
            state.files.values().filter(|file| file.properties.get("kind").is_some_and(|kind| kind == "retired"));
        retired.map(|file| file.content.clone()).collect()
    }

    pub fn retired_days_ago(&self, blob: &str, days: u64) {
        let mut state = self.state();
        let file =
            state.files.values_mut().find(|file| file.properties.get("id").is_some_and(|id| id == blob)).unwrap();
        let at = SystemTime::now() - Duration::from_secs(days * 24 * 60 * 60);
        file.properties.insert("removedAt".into(), at.duration_since(UNIX_EPOCH).unwrap().as_millis().to_string());
    }
}

fn not_found() -> Reply {
    Reply::json(404, json!({ "error": { "code": 404, "message": "File not found" } }))
}

fn html_error(status: u16) -> Reply {
    let body = format!("<!DOCTYPE html><html><body><p><b>{status}.</b> That's an error.</p></body></html>");
    Reply::Send { status, headers: vec![("Content-Type".into(), "text/html".into())], body: body.into_bytes() }
}

fn bad(message: &str) -> Reply {
    Reply::json(400, json!({ "error": { "code": 400, "message": message } }))
}

fn merge(properties: &mut BTreeMap<String, String>, metadata: &Value) {
    for (key, value) in metadata["appProperties"].as_object().into_iter().flatten() {
        match value.as_str() {
            Some(value) => properties.insert(key.clone(), value.into()),
            None => properties.remove(key),
        };
    }
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|window| window == needle)
}

fn multipart(request: &Request) -> Option<(Value, Vec<u8>)> {
    let boundary = request.header("content-type")?.split_once("boundary=")?.1;
    let delimiter = format!("--{boundary}");
    let mut parts = Vec::new();
    let mut rest = &request.body[..];
    while let Some(at) = find(rest, delimiter.as_bytes()) {
        parts.push(&rest[..at]);
        rest = &rest[at + delimiter.len()..];
    }
    let content = |part: &[u8]| {
        let start = find(part, b"\r\n\r\n")? + 4;
        Some(part[start..].strip_suffix(b"\r\n").unwrap_or(&part[start..]).to_vec())
    };
    let metadata = serde_json::from_slice(&content(parts.get(1)?)?).ok()?;
    Some((metadata, content(parts.get(2)?)?))
}

fn meta(id: &str, file: &File) -> Value {
    json!({ "id": id, "version": file.version.to_string(), "appProperties": file.properties })
}

impl State {
    fn next_version(&mut self) -> u64 {
        self.versions += 1;
        self.versions
    }

    fn create(&mut self, properties: BTreeMap<String, String>, content: Vec<u8>) -> String {
        self.ids += 1;
        let id = format!("file-{:06}", self.ids);
        let version = self.next_version();
        self.files.insert(id.clone(), File { properties, content, version });
        self.changes.push(id.clone());
        id
    }

    fn touched(&mut self, id: &str) {
        let version = self.next_version();
        self.files.get_mut(id).unwrap().version = version;
        self.changes.push(id.into());
    }

    fn page<T: Clone>(&self, items: &[T], request: &Request) -> (Vec<T>, Option<usize>) {
        let from: usize = request.param("pageToken").and_then(|token| token.parse().ok()).unwrap_or(0);
        let to = (from + self.page_size).min(items.len());
        (items[from.min(to)..to].to_vec(), (to < items.len()).then_some(to))
    }
}

fn handle(state: &mut State, request: Request) -> Reply {
    state.requests.push(format!("{} {}", request.method, request.path));
    if !state.failures.is_empty() {
        return state.failures.remove(0);
    }
    if request.header("authorization") != Some(&format!("Bearer {}", state.token)) {
        return Reply::json(401, json!({ "error": { "code": 401, "message": "Invalid Credentials" } }));
    }
    let path: Vec<&str> = request.path.trim_start_matches('/').split('/').collect();
    match (request.method.as_str(), &path[..]) {
        ("GET", ["drive", "v3", "changes", "startPageToken"]) => {
            Reply::json(200, json!({ "startPageToken": state.changes.len().to_string() }))
        }
        ("GET", ["drive", "v3", "changes"]) => {
            if request.param("spaces") != Some("appDataFolder") {
                return bad("changes outside appDataFolder");
            }
            let (page, next) = state.page(&state.changes, &request);
            let changes: Vec<Value> = page
                .iter()
                .map(|id| match state.files.get(id) {
                    Some(file) => json!({ "fileId": id, "removed": false, "file": meta(id, file) }),
                    None => json!({ "fileId": id, "removed": true }),
                })
                .collect();
            Reply::json(
                200,
                match next {
                    Some(next) => json!({ "changes": changes, "nextPageToken": next.to_string() }),
                    None => json!({ "changes": changes, "newStartPageToken": state.changes.len().to_string() }),
                },
            )
        }
        ("GET", ["drive", "v3", "files"]) => {
            if request.param("spaces") != Some("appDataFolder") {
                return bad("files outside appDataFolder");
            }
            let q = request.param("q").unwrap_or_default();
            let wanted: Vec<(&str, &str)> = q
                .split("key='")
                .skip(1)
                .filter_map(|rest| {
                    let (key, rest) = rest.split_once('\'')?;
                    let value = rest.split_once("value='")?.1.split_once('\'')?.0;
                    Some((key, value))
                })
                .collect();
            let matching: Vec<Value> = state
                .files
                .iter()
                .filter(|(_, file)| wanted.iter().all(|(key, value)| file.properties.get(*key).is_some_and(|known| known == value)))
                .map(|(id, file)| meta(id, file))
                .collect();
            let (page, next) = state.page(&matching, &request);
            let mut listed = json!({ "files": page });
            if let Some(next) = next {
                listed["nextPageToken"] = next.to_string().into();
            }
            Reply::json(200, listed)
        }
        ("GET", ["drive", "v3", "files", id]) => match state.files.get(*id) {
            Some(file) if request.param("alt") == Some("media") => Reply::bytes(file.content.clone()),
            Some(file) => Reply::json(200, meta(id, file)),
            None => not_found(),
        },
        ("PATCH", ["drive", "v3", "files", id]) => {
            let Some(file) = state.files.get_mut(*id) else { return not_found() };
            merge(&mut file.properties, &serde_json::from_slice(&request.body).unwrap_or_default());
            state.touched(id);
            Reply::json(200, meta(id, &state.files[*id]))
        }
        ("DELETE", ["drive", "v3", "files", id]) => match state.files.remove(*id) {
            Some(_) => {
                state.changes.push(id.to_string());
                Reply::status(204)
            }
            None => not_found(),
        },
        ("POST", ["upload", "drive", "v3", "files"]) if request.param("uploadType") == Some("multipart") => {
            let Some((metadata, content)) = multipart(&request) else { return bad("not multipart") };
            if metadata["parents"] != json!(["appDataFolder"]) {
                return bad("not in appDataFolder");
            }
            if let Some((properties, content)) = state.rival.take() {
                state.create(properties, content);
            }
            let mut properties = BTreeMap::new();
            merge(&mut properties, &metadata);
            state.record_writes += 1;
            let id = state.create(properties, content);
            Reply::json(200, meta(&id, &state.files[&id]))
        }
        ("PATCH", ["upload", "drive", "v3", "files", id]) if request.param("uploadType") == Some("multipart") => {
            let Some((metadata, content)) = multipart(&request) else { return bad("not multipart") };
            let Some(file) = state.files.get_mut(*id) else { return not_found() };
            merge(&mut file.properties, &metadata);
            file.content = content;
            state.record_writes += 1;
            state.touched(id);
            Reply::json(200, meta(id, &state.files[*id]))
        }
        ("POST", ["upload", "drive", "v3", "files"]) if request.param("uploadType") == Some("resumable") => {
            let metadata: Value = serde_json::from_slice(&request.body).unwrap_or_default();
            let Some(size) = request.header("x-upload-content-length").and_then(|size| size.parse().ok()) else {
                return bad("no X-Upload-Content-Length");
            };
            if metadata["parents"] != json!(["appDataFolder"]) {
                return bad("not in appDataFolder");
            }
            let mut properties = BTreeMap::new();
            merge(&mut properties, &metadata);
            state.ids += 1;
            let session = format!("upload-{}", state.ids);
            state.sessions.insert(session.clone(), Session { properties, size, received: Vec::new(), file: None });
            let location = format!("{}/upload/drive/v3/files?uploadType=resumable&upload_id={session}", state.url);
            Reply::status(200).with("Location", location)
        }
        ("PUT", ["upload", "drive", "v3", "files"]) if request.header("content-length").is_none() => html_error(411),
        ("PUT", ["upload", "drive", "v3", "files"]) => upload(state, &request),
        _ => not_found(),
    }
}

fn upload(state: &mut State, request: &Request) -> Reply {
    let Some(id) = request.param("upload_id") else { return not_found() };
    let Some(session) = state.sessions.get(id) else { return not_found() };
    let Some(range) = request.header("content-range").and_then(|range| range.strip_prefix("bytes ")) else { return bad("no Content-Range") };
    let Some((span, size)) = range.split_once('/') else { return bad("bad Content-Range") };
    if size != session.size.to_string() {
        return bad("the size changed");
    }
    if span != "*" {
        let start: u64 = span.split_once('-').and_then(|(start, _)| start.parse().ok()).unwrap_or(u64::MAX);
        if start != session.received.len() as u64 {
            return bad("the upload doesn't carry on where the session is");
        }
        let limit = state.drop_after.take();
        let taken = limit.or(state.take_at_most.take()).map_or(request.body.len(), |limit| request.body.len().min(limit as usize));
        state.uploaded_bytes += taken as u64;
        let session = state.sessions.get_mut(id).unwrap();
        session.received.extend_from_slice(&request.body[..taken]);
        if limit.is_some() {
            return Reply::DropConnection;
        }
    }
    let session = state.sessions.get(id).unwrap();
    if let Some(file) = &session.file {
        return Reply::json(200, json!({ "id": file }));
    }
    if (session.received.len() as u64) < session.size {
        let reply = Reply::status(308);
        return match session.received.len() {
            0 => reply,
            held => reply.with("Range", format!("bytes=0-{}", held - 1)),
        };
    }
    let (properties, content) = (session.properties.clone(), session.received.clone());
    let file = state.create(properties, content);
    state.sessions.get_mut(id).unwrap().file = Some(file.clone());
    Reply::json(200, json!({ "id": file }))
}

pub fn properties(pairs: &[(&str, &str)]) -> BTreeMap<String, String> {
    pairs.iter().map(|(key, value)| (key.to_string(), value.to_string())).collect()
}
