use super::dropbox::Dropbox;
use super::fake_drive::{StaticToken, TOKEN};
use super::fake_http::{Reply, Request, Server};
use super::oauth::{http, Tokens};
use super::removed::DATE_FORMAT;
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, SystemTime};

/// Small enough that the two-device suite's bigger files go through upload sessions.
pub const CHUNK: u64 = 100;

struct File {
    content: Vec<u8>,
    rev: u64,
}

#[derive(Default)]
struct State {
    token: String,
    files: BTreeMap<String, File>,
    changes: Vec<String>,
    sessions: HashMap<String, Vec<u8>>,
    epoch: u64,
    ids: u64,
    revs: u64,
    page_size: usize,
    failures: Vec<(u16, Option<u64>)>,
    drop_after: Option<u64>,
    full: bool,
    uploaded_bytes: u64,
    record_writes: usize,
    requests: Vec<String>,
}

pub struct FakeDropbox {
    state: Arc<Mutex<State>>,
    pub dropbox: Dropbox,
}

impl FakeDropbox {
    pub fn new() -> FakeDropbox {
        FakeDropbox::with_tokens(Arc::new(StaticToken))
    }

    pub fn with_tokens(tokens: Arc<dyn Tokens>) -> FakeDropbox {
        let state = Arc::new(Mutex::new(State { token: TOKEN.into(), page_size: 2, ..State::default() }));
        let server = {
            let state = state.clone();
            Server::start(move |request| handle(&mut state.lock().unwrap(), request))
        };
        let dropbox = FakeDropbox::client(&server.url, tokens);
        FakeDropbox { state, dropbox }
    }

    pub fn client(url: &str, tokens: Arc<dyn Tokens>) -> Dropbox {
        Dropbox::new(http(), url, url, "player@example.com".into(), tokens).uploading(CHUNK)
    }

    fn state(&self) -> MutexGuard<'_, State> {
        self.state.lock().unwrap()
    }

    pub fn accept_token(&self, token: &str) {
        self.state().token = token.into();
    }

    pub fn fail(&self, times: usize, status: u16, retry_after: Option<u64>) {
        self.state().failures.extend(std::iter::repeat_n((status, retry_after), times));
    }

    pub fn slow_down(&self, times: usize) {
        self.fail(times, 429, Some(1))
    }

    /// Takes uploads whole until `bytes` have come in, then drops the connection of the one that would go past.
    pub fn drop_upload_after(&self, bytes: u64) {
        self.state().drop_after = Some(bytes);
    }

    pub fn fill_up(&self) {
        self.state().full = true;
    }

    /// Dropbox resets old cursors now and then, and a reset cursor has to list everything again.
    pub fn reset_cursors(&self) {
        self.state().epoch += 1;
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

    pub fn paths(&self) -> Vec<String> {
        self.state().files.keys().cloned().collect()
    }

    pub fn records(&self) -> Vec<Value> {
        let state = self.state();
        let records = state.files.iter().filter(|(path, _)| path.ends_with(".json"));
        records.map(|(_, file)| serde_json::from_slice(&file.content).unwrap()).collect()
    }

    pub fn blobs(&self) -> Vec<Vec<u8>> {
        let state = self.state();
        let blobs = state.files.iter().filter(|(path, _)| at_root(path) && !path.ends_with(".json"));
        blobs.map(|(_, file)| file.content.clone()).collect()
    }

    pub fn retired(&self) -> Vec<Vec<u8>> {
        let state = self.state();
        let retired = state.files.iter().filter(|(path, _)| path.starts_with("/removed/"));
        retired.map(|(_, file)| file.content.clone()).collect()
    }

    pub fn retired_days_ago(&self, blob: &str, days: u64) {
        let mut state = self.state();
        let retired = |path: &&String| path.starts_with("/removed/") && path.ends_with(&format!("/{blob}"));
        let from = state.files.keys().find(retired).unwrap().clone();
        let day = chrono::DateTime::<chrono::Utc>::from(SystemTime::now() - Duration::from_secs(days * 24 * 60 * 60));
        let file = state.files.remove(&from).unwrap();
        state.files.insert(format!("/removed/{}/{blob}", day.format(DATE_FORMAT)), file);
    }

    pub fn blob(&self, blob: &str) -> Option<Vec<u8>> {
        self.state().files.get(&format!("/{blob}")).map(|file| file.content.clone())
    }
}

fn refused(summary: &str, error: Value) -> Reply {
    Reply::json(409, json!({ "error_summary": format!("{summary}/.."), "error": error }))
}

fn not_found(lookup: &str) -> Reply {
    refused(&format!("{lookup}/not_found"), json!({ ".tag": lookup, lookup: { ".tag": "not_found" } }))
}

fn bad(message: &str) -> Reply {
    Reply::Send { status: 400, headers: Vec::new(), body: format!("Error in call: {message}").into_bytes() }
}

fn name(path: &str) -> &str {
    path.rsplit('/').next().unwrap_or_default()
}

fn at_root(path: &str) -> bool {
    path.rfind('/') == Some(0)
}

fn folder(path: &str) -> Value {
    json!({ ".tag": "folder", "name": name(path), "path_lower": path.to_lowercase() })
}

fn metadata(path: &str, file: &File) -> Value {
    json!({ ".tag": "file", "name": name(path), "path_lower": path.to_lowercase(), "rev": format!("{:09x}", file.rev), "size": file.content.len() })
}

impl State {
    fn write(&mut self, path: &str, content: Vec<u8>) -> Value {
        self.revs += 1;
        self.files.insert(path.into(), File { content, rev: self.revs });
        self.changes.push(path.into());
        metadata(path, &self.files[path])
    }

    /// Whether to drop the connection instead of taking this many bytes.
    fn drops(&mut self, bytes: usize) -> bool {
        let Some(limit) = self.drop_after else { return false };
        if self.uploaded_bytes + bytes as u64 > limit {
            self.drop_after = None;
            return true;
        }
        false
    }

    /// The folders inside `dir`, which in this fake exist only while they hold a file.
    fn folders(&self, dir: &str) -> Vec<String> {
        let inside = self.files.keys().filter_map(|path| path.strip_prefix(&format!("{dir}/"))?.split_once('/'));
        let names: BTreeSet<&str> = inside.map(|(name, _)| name).collect();
        names.into_iter().map(|name| format!("{dir}/{name}")).collect()
    }

    fn page(&self, cursor: &str) -> Option<Reply> {
        let (epoch, rest) = cursor.split_once(':')?;
        if epoch.parse::<u64>().ok()? != self.epoch {
            return Some(refused("reset", json!({ ".tag": "reset" })));
        }
        let (kind, from) = rest.split_once(':')?;
        let (from, dir) = from.split_once(':').unwrap_or((from, ""));
        let from: usize = from.parse().ok()?;
        let (entries, next, more): (Vec<Value>, String, bool) = match kind {
            "list" => {
                let root: Vec<_> = self.files.iter().filter(|(path, _)| at_root(path)).collect();
                let to = (from + self.page_size).min(root.len());
                let entries = root[from..to].iter().map(|(path, file)| metadata(path, file)).collect();
                let more = to < root.len();
                (entries, if more { format!("list:{to}") } else { format!("changes:{}", self.changes.len()) }, more)
            }
            "folder" => {
                let folders = self.folders(dir);
                let to = (from + self.page_size).min(folders.len());
                let entries = folders[from..to].iter().map(|path| folder(path)).collect();
                (entries, format!("folder:{to}:{dir}"), to < folders.len())
            }
            "changes" => {
                let to = (from + self.page_size).min(self.changes.len());
                let entries = self.changes[from.min(to)..to]
                    .iter()
                    .filter(|path| at_root(path))
                    .map(|path| match self.files.get(path) {
                        Some(file) => metadata(path, file),
                        None => json!({ ".tag": "deleted", "name": name(path), "path_lower": path.to_lowercase() }),
                    })
                    .collect();
                (entries, format!("changes:{to}"), to < self.changes.len())
            }
            _ => return None,
        };
        Some(Reply::json(
            200,
            json!({ "entries": entries, "cursor": format!("{}:{next}", self.epoch), "has_more": more }),
        ))
    }
}

fn arg(request: &Request) -> Option<Value> {
    serde_json::from_str(request.header("dropbox-api-arg")?).ok()
}

fn handle(state: &mut State, request: Request) -> Reply {
    state.requests.push(format!("{} {}", request.method, request.path));
    if !state.failures.is_empty() {
        let (status, retry_after) = state.failures.remove(0);
        let reply = Reply::json(
            status,
            json!({ "error_summary": "too_many_requests/..", "error": { "reason": { ".tag": "too_many_requests" }, "retry_after": retry_after } }),
        );
        return match retry_after {
            Some(seconds) => reply.with("Retry-After", seconds.to_string()),
            None => reply,
        };
    }
    if request.header("authorization") != Some(&format!("Bearer {}", state.token)) {
        return Reply::json(
            401,
            json!({ "error_summary": "expired_access_token/..", "error": { ".tag": "expired_access_token" } }),
        );
    }
    if request.method != "POST" {
        return Reply::status(404);
    }
    let content = request.path.starts_with("/2/files/upload") || request.path == "/2/files/download";
    let content_type = request.header("content-type");
    let body = match content {
        true => match arg(&request) {
            Some(arg) => arg,
            None => return bad("no Dropbox-API-Arg"),
        },
        false if content_type != Some("application/json") => return bad("RPC calls take JSON"),
        false => serde_json::from_slice(&request.body).unwrap_or_default(),
    };
    let path = body["path"].as_str().unwrap_or_default().to_string();
    match request.path.as_str() {
        "/2/files/list_folder" if path == "/removed" => match state.folders(&path).is_empty() {
            true => not_found("path"),
            false => state.page(&format!("{}:folder:0:{path}", state.epoch)).unwrap(),
        },
        "/2/files/list_folder" => {
            if path != "" || body["include_deleted"] != true {
                return bad("list the App folder's root with include_deleted");
            }
            state.page(&format!("{}:list:0", state.epoch)).unwrap()
        }
        "/2/files/list_folder/continue" => {
            state.page(body["cursor"].as_str().unwrap_or_default()).unwrap_or_else(|| bad("bad cursor"))
        }
        "/2/files/download" => {
            if content_type.is_some_and(|content_type| !content_type.starts_with("text/plain")) {
                return bad("downloads take no Content-Type");
            }
            match state.files.get(&path) {
                Some(file) => {
                    Reply::bytes(file.content.clone()).with("Dropbox-API-Result", metadata(&path, file).to_string())
                }
                None => not_found("path"),
            }
        }
        "/2/files/get_metadata" => match state.files.get(&path) {
            Some(file) => Reply::json(200, metadata(&path, file)),
            None => not_found("path"),
        },
        "/2/files/delete_v2" => match state.files.remove(&path) {
            Some(_) => {
                state.changes.push(path.clone());
                Reply::json(200, json!({ "metadata": { ".tag": "file", "name": name(&path) } }))
            }
            None => {
                let inside: Vec<String> =
                    state.files.keys().filter(|file| file.starts_with(&format!("{path}/"))).cloned().collect();
                if inside.is_empty() {
                    return not_found("path_lookup");
                }
                for file in inside {
                    state.files.remove(&file);
                }
                Reply::json(200, json!({ "metadata": folder(&path) }))
            }
        },
        "/2/files/move_v2" => {
            let from = body["from_path"].as_str().unwrap_or_default();
            let to = body["to_path"].as_str().unwrap_or_default();
            if !state.files.contains_key(from) {
                return not_found("from_lookup");
            }
            if state.files.contains_key(to) {
                return refused("to/conflict/file", json!({ ".tag": "to", "to": { ".tag": "conflict" } }));
            }
            let file = state.files.remove(from).unwrap();
            state.changes.push(from.into());
            state.revs += 1;
            state.files.insert(to.into(), File { content: file.content, rev: state.revs });
            state.changes.push(to.into());
            Reply::json(200, json!({ "metadata": metadata(to, &state.files[to]) }))
        }
        "/2/files/upload" => {
            if content_type != Some("application/octet-stream") {
                return bad("uploads are application/octet-stream");
            }
            let existing = state.files.get(&path).map(|file| format!("{:09x}", file.rev));
            let allowed = match (&body["mode"], &existing) {
                (mode, None) if mode == "add" => true,
                (mode, _) if mode == "overwrite" => true,
                (mode, Some(rev)) if mode[".tag"] == "update" => mode["update"] == rev.as_str(),
                (mode, None) if mode[".tag"] == "update" => body["strict_conflict"] != true,
                _ => false,
            };
            if body["autorename"] != false {
                return bad("never autorename");
            }
            if !allowed {
                return refused(
                    "path/conflict/file",
                    json!({ ".tag": "path", "reason": { ".tag": "conflict", "conflict": { ".tag": "file" } } }),
                );
            }
            if state.full {
                return refused(
                    "path/insufficient_space",
                    json!({ ".tag": "path", "reason": { ".tag": "insufficient_space" } }),
                );
            }
            if path.ends_with(".json") {
                state.record_writes += 1;
            } else {
                if state.drops(request.body.len()) {
                    return Reply::DropConnection;
                }
                state.uploaded_bytes += request.body.len() as u64;
            }
            Reply::json(200, state.write(&path, request.body))
        }
        "/2/files/upload_session/start" => {
            if state.drops(request.body.len()) {
                return Reply::DropConnection;
            }
            state.uploaded_bytes += request.body.len() as u64;
            state.ids += 1;
            let id = format!("session-{}", state.ids);
            state.sessions.insert(id.clone(), request.body);
            Reply::json(200, json!({ "session_id": id }))
        }
        "/2/files/upload_session/append_v2" | "/2/files/upload_session/finish" => {
            let cursor = &body["cursor"];
            let id = cursor["session_id"].as_str().unwrap_or_default();
            let Some(held) = state.sessions.get(id).map(Vec::len) else {
                return refused("not_found", json!({ ".tag": "not_found" }));
            };
            if cursor["offset"].as_u64() != Some(held as u64) {
                return refused("incorrect_offset", json!({ ".tag": "incorrect_offset", "correct_offset": held }));
            }
            if state.drops(request.body.len()) {
                return Reply::DropConnection;
            }
            state.uploaded_bytes += request.body.len() as u64;
            state.sessions.get_mut(id).unwrap().extend_from_slice(&request.body);
            if request.path.ends_with("append_v2") {
                return Reply::json(200, Value::Null);
            }
            let commit = &body["commit"];
            if commit["mode"] != "overwrite" || commit["autorename"] != false {
                return bad("blobs overwrite and never autorename");
            }
            let content = state.sessions.remove(id).unwrap();
            let path = commit["path"].as_str().unwrap_or_default().to_string();
            Reply::json(200, state.write(&path, content))
        }
        _ => Reply::status(404),
    }
}
