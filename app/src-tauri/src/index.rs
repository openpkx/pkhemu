use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::collections::HashSet;
use std::path::Path;
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

const MIGRATIONS: &[&str] = &[
    "CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    game TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    frames INTEGER NOT NULL DEFAULT 0,
    fps REAL NOT NULL
);
CREATE INDEX sessions_by_game ON sessions (game, started_at);",
    "CREATE TABLE save_summaries (
    sha256 TEXT PRIMARY KEY,
    summary TEXT NOT NULL
);",
    "CREATE TABLE box_art_misses (
    art TEXT PRIMARY KEY,
    version TEXT NOT NULL
);",
    // Summaries cached before play time, badges and Pokédex counts lack them, so the game page sums those saves up again.
    "DELETE FROM save_summaries;",
    "CREATE TABLE rom_art (
    path TEXT PRIMARY KEY,
    size INTEGER NOT NULL,
    mtime INTEGER NOT NULL,
    sha1 TEXT NOT NULL,
    decoder_version INTEGER NOT NULL,
    status TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX rom_art_by_sha1 ON rom_art (sha1);",
    "CREATE TABLE sync_account (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    account TEXT NOT NULL,
    cursor TEXT,
    last_synced INTEGER
);
CREATE TABLE sync_records (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    record TEXT NOT NULL
);
CREATE TABLE sync_games (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    rom_size INTEGER NOT NULL,
    rom_mtime INTEGER NOT NULL,
    rom_sha1 TEXT NOT NULL
);
CREATE TABLE sync_files (
    game TEXT NOT NULL,
    path TEXT NOT NULL,
    sha1 TEXT NOT NULL,
    blob TEXT NOT NULL,
    PRIMARY KEY (game, path)
);
CREATE TABLE sync_hashes (
    path TEXT PRIMARY KEY,
    size INTEGER NOT NULL,
    mtime INTEGER NOT NULL,
    sha1 TEXT NOT NULL
);
CREATE TABLE sync_uploads (
    game TEXT NOT NULL,
    path TEXT NOT NULL,
    sha1 TEXT NOT NULL,
    blob TEXT NOT NULL,
    session TEXT,
    PRIMARY KEY (game, path)
);
CREATE TABLE sync_conflicts (
    game TEXT NOT NULL,
    file TEXT NOT NULL,
    cloud TEXT NOT NULL,
    PRIMARY KEY (game, file)
);",
    "CREATE TABLE cheat_saves (
    rom TEXT NOT NULL,
    sha1 TEXT NOT NULL,
    PRIMARY KEY (rom, sha1)
);",
    "ALTER TABLE sync_games ADD COLUMN last_synced INTEGER;",
    "CREATE TABLE sync_deletions (
    game TEXT NOT NULL,
    path TEXT NOT NULL,
    sha1 TEXT NOT NULL,
    at INTEGER NOT NULL,
    PRIMARY KEY (game, path)
);",
    "DROP TABLE box_art_misses;",
];

const SYNC_TABLES: [&str; 8] = [
    "sync_account",
    "sync_records",
    "sync_games",
    "sync_files",
    "sync_hashes",
    "sync_uploads",
    "sync_conflicts",
    "sync_deletions",
];

pub struct Index {
    conn: Mutex<Connection>,
}

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PlayHistory {
    pub last_played: Option<i64>,
    pub play_time: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RomArtRow {
    pub path: String,
    pub size: i64,
    pub mtime: i64,
    pub sha1: String,
    pub decoder_version: u32,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SyncedGame {
    pub id: String,
    pub path: String,
    pub rom_size: i64,
    pub rom_mtime: i64,
    pub rom_sha1: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct SyncedFile {
    pub path: String,
    pub sha1: String,
    pub blob: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct FileHash {
    pub size: i64,
    pub mtime: i64,
    pub sha1: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct PendingUpload {
    pub sha1: String,
    pub blob: String,
    pub session: Option<String>,
}

impl Index {
    pub fn open(file: &Path) -> Index {
        let conn = connect(file)
            .or_else(|e| {
                eprintln!("recreating the index at {}: {e}", file.display());
                for suffix in ["", "-wal", "-shm", "-journal"] {
                    let mut sidecar = file.as_os_str().to_owned();
                    sidecar.push(suffix);
                    let _ = std::fs::remove_file(sidecar);
                }
                connect(file)
            })
            .unwrap_or_else(|e| {
                eprintln!("keeping the index in memory: {e}");
                let conn = Connection::open_in_memory().expect("SQLite couldn't open an in-memory database");
                migrate(&conn).expect("SQLite couldn't set up an in-memory database");
                conn
            });
        Index { conn: Mutex::new(conn) }
    }

    fn conn(&self) -> MutexGuard<'_, Connection> {
        self.conn.lock().unwrap_or_else(|e| e.into_inner())
    }

    pub fn start_session(self: &Arc<Self>, game: &str, fps: f64, at: i64) -> Result<Session, String> {
        let conn = self.conn();
        conn.execute(
            "INSERT INTO sessions (game, started_at, fps) VALUES (?1, ?2, ?3)",
            params![game, at, fps],
        )
        .map_err(|e| e.to_string())?;
        Ok(Session { index: self.clone(), id: conn.last_insert_rowid() })
    }

    pub fn play_history(&self, game: &str) -> Result<PlayHistory, String> {
        self.conn()
            .query_row(
                "SELECT MAX(COALESCE(ended_at, started_at)), COALESCE(SUM(frames / fps), 0) FROM sessions WHERE game = ?1",
                [game],
                |row| Ok(PlayHistory { last_played: row.get(0)?, play_time: row.get(1)? }),
            )
            .map_err(|e| e.to_string())
    }

    pub fn save_summary(&self, sha256: &str) -> Result<Option<String>, String> {
        self.conn()
            .query_row("SELECT summary FROM save_summaries WHERE sha256 = ?1", [sha256], |row| row.get(0))
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn keep_save_summary(&self, sha256: &str, summary: &str) -> Result<(), String> {
        self.conn()
            .execute(
                "INSERT OR REPLACE INTO save_summaries (sha256, summary) VALUES (?1, ?2)",
                params![sha256, summary],
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn mark_save_had_cheats(&self, rom: &str, sha1: &str) -> Result<(), String> {
        self.conn()
            .execute("INSERT OR IGNORE INTO cheat_saves (rom, sha1) VALUES (?1, ?2)", [rom, sha1])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn save_had_cheats(&self, rom: &str, sha1: &str) -> Result<bool, String> {
        self.conn()
            .query_row("SELECT 1 FROM cheat_saves WHERE rom = ?1 AND sha1 = ?2", [rom, sha1], |_| Ok(()))
            .optional()
            .map(|found| found.is_some())
            .map_err(|e| e.to_string())
    }

    pub fn rom_art(&self, path: &str) -> Result<Option<RomArtRow>, String> {
        self.conn()
            .query_row(
                "SELECT path, size, mtime, sha1, decoder_version, status FROM rom_art WHERE path = ?1",
                [path],
                |row| {
                    Ok(RomArtRow {
                        path: row.get(0)?,
                        size: row.get(1)?,
                        mtime: row.get(2)?,
                        sha1: row.get(3)?,
                        decoder_version: row.get(4)?,
                        status: row.get(5)?,
                    })
                },
            )
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn keep_rom_art(&self, row: &RomArtRow, at: i64) -> Result<(), String> {
        self.conn()
            .execute(
                "INSERT OR REPLACE INTO rom_art (path, size, mtime, sha1, decoder_version, status, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![row.path, row.size, row.mtime, row.sha1, row.decoder_version, row.status, at],
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn rom_art_status(&self, sha1: &str) -> Result<Option<String>, String> {
        self.conn()
            .query_row("SELECT status FROM rom_art WHERE sha1 = ?1 LIMIT 1", [sha1], |row| row.get(0))
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn mark_rom_art(&self, sha1: &str, status: &str, decoder_version: Option<u32>, at: i64) -> Result<(), String> {
        self.conn()
            .execute(
                "UPDATE rom_art SET status = ?2, decoder_version = COALESCE(?3, decoder_version), updated_at = ?4 WHERE sha1 = ?1",
                params![sha1, status, decoder_version, at],
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn forget_rom_art(&self, path: &str) -> Result<(), String> {
        self.conn().execute("DELETE FROM rom_art WHERE path = ?1", [path]).map(|_| ()).map_err(|e| e.to_string())
    }

    pub fn forget_rom_art_except(&self, paths: &[String]) -> Result<(), String> {
        let mut conn = self.conn();
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        tx.execute_batch("CREATE TEMP TABLE IF NOT EXISTS scanned (path TEXT PRIMARY KEY); DELETE FROM scanned;")
            .map_err(|e| e.to_string())?;
        for path in paths {
            tx.execute("INSERT OR IGNORE INTO scanned (path) VALUES (?1)", [path]).map_err(|e| e.to_string())?;
        }
        tx.execute("DELETE FROM rom_art WHERE path NOT IN (SELECT path FROM scanned)", [])
            .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())
    }

    pub fn rom_art_sha1s(&self) -> Result<HashSet<String>, String> {
        let conn = self.conn();
        let mut query = conn.prepare("SELECT DISTINCT sha1 FROM rom_art").map_err(|e| e.to_string())?;
        let sha1s = query.query_map([], |row| row.get(0)).map_err(|e| e.to_string())?;
        sha1s.collect::<Result<_, _>>().map_err(|e| e.to_string())
    }

    pub fn recently_played(&self, limit: u32) -> Result<Vec<String>, String> {
        let conn = self.conn();
        let mut query = conn
            .prepare("SELECT game FROM sessions GROUP BY game ORDER BY MAX(started_at) DESC, MAX(id) DESC LIMIT ?1")
            .map_err(|e| e.to_string())?;
        let games = query.query_map([limit], |row| row.get(0)).map_err(|e| e.to_string())?;
        games.collect::<Result<_, _>>().map_err(|e| e.to_string())
    }

    /// Forgets everything synced when the account changes, and returns the change cursor.
    pub fn start_sync(&self, account: &str) -> Result<Option<String>, String> {
        let known = self
            .conn()
            .query_row("SELECT account, cursor FROM sync_account WHERE id = 1", [], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
            })
            .optional()
            .map_err(|e| e.to_string())?;
        match known {
            Some((known, cursor)) if known == account => Ok(cursor),
            _ => {
                self.forget_sync()?;
                self.conn()
                    .execute("INSERT INTO sync_account (id, account) VALUES (1, ?1)", [account])
                    .map(|_| None)
                    .map_err(|e| e.to_string())
            }
        }
    }

    pub fn keep_sync_cursor(&self, cursor: &str) -> Result<(), String> {
        self.conn().execute("UPDATE sync_account SET cursor = ?1 WHERE id = 1", [cursor]).map(|_| ()).map_err(|e| e.to_string())
    }

    pub fn keep_last_synced(&self, at: i64) -> Result<(), String> {
        self.conn().execute("UPDATE sync_account SET last_synced = ?1 WHERE id = 1", [at]).map(|_| ()).map_err(|e| e.to_string())
    }

    pub fn last_synced(&self) -> Result<Option<i64>, String> {
        self.conn()
            .query_row("SELECT last_synced FROM sync_account WHERE id = 1", [], |row| row.get(0))
            .optional()
            .map(Option::flatten)
            .map_err(|e| e.to_string())
    }

    pub fn keep_game_last_synced(&self, game: &str, at: i64) -> Result<(), String> {
        self.conn()
            .execute("UPDATE sync_games SET last_synced = ?2 WHERE id = ?1", params![game, at])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn games_last_synced(&self) -> Result<Vec<(String, i64)>, String> {
        let conn = self.conn();
        let mut query = conn
            .prepare("SELECT path, last_synced FROM sync_games WHERE last_synced IS NOT NULL ORDER BY path")
            .map_err(|e| e.to_string())?;
        let games = query.query_map([], |row| Ok((row.get(0)?, row.get(1)?))).map_err(|e| e.to_string())?;
        games.collect::<Result<_, _>>().map_err(|e| e.to_string())
    }

    pub fn forget_sync(&self) -> Result<(), String> {
        let mut conn = self.conn();
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for table in SYNC_TABLES {
            tx.execute(&format!("DELETE FROM {table}"), []).map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())
    }

    #[cfg(test)]
    pub fn sync_tables_with_rows(&self) -> Vec<&'static str> {
        let conn = self.conn();
        SYNC_TABLES
            .into_iter()
            .filter(|table| {
                conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| row.get::<_, i64>(0)).unwrap() > 0
            })
            .collect()
    }

    pub fn sync_records(&self) -> Result<Vec<(String, String, String)>, String> {
        let conn = self.conn();
        let mut query =
            conn.prepare("SELECT id, version, record FROM sync_records ORDER BY id").map_err(|e| e.to_string())?;
        let records =
            query.query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))).map_err(|e| e.to_string())?;
        records.collect::<Result<_, _>>().map_err(|e| e.to_string())
    }

    pub fn sync_record(&self, id: &str) -> Result<Option<(String, String)>, String> {
        self.conn()
            .query_row("SELECT version, record FROM sync_records WHERE id = ?1", [id], |row| Ok((row.get(0)?, row.get(1)?)))
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn keep_sync_record(&self, id: &str, version: &str, record: &str) -> Result<(), String> {
        self.conn()
            .execute("INSERT OR REPLACE INTO sync_records (id, version, record) VALUES (?1, ?2, ?3)", [id, version, record])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn forget_sync_record(&self, id: &str) -> Result<(), String> {
        self.conn().execute("DELETE FROM sync_records WHERE id = ?1", [id]).map(|_| ()).map_err(|e| e.to_string())
    }

    pub fn synced_games(&self) -> Result<Vec<SyncedGame>, String> {
        let conn = self.conn();
        let mut query = conn
            .prepare("SELECT id, path, rom_size, rom_mtime, rom_sha1 FROM sync_games ORDER BY path")
            .map_err(|e| e.to_string())?;
        let games = query
            .query_map([], |row| {
                Ok(SyncedGame {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    rom_size: row.get(2)?,
                    rom_mtime: row.get(3)?,
                    rom_sha1: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;
        games.collect::<Result<_, _>>().map_err(|e| e.to_string())
    }

    pub fn keep_synced_game(&self, game: &SyncedGame) -> Result<(), String> {
        self.conn()
            .execute(
                "INSERT INTO sync_games (id, path, rom_size, rom_mtime, rom_sha1) VALUES (?1, ?2, ?3, ?4, ?5)
                ON CONFLICT (id) DO UPDATE SET path = ?2, rom_size = ?3, rom_mtime = ?4, rom_sha1 = ?5",
                params![game.id, game.path, game.rom_size, game.rom_mtime, game.rom_sha1],
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn synced_files(&self, game: &str) -> Result<Vec<SyncedFile>, String> {
        let conn = self.conn();
        let mut query = conn
            .prepare("SELECT path, sha1, blob FROM sync_files WHERE game = ?1 ORDER BY path")
            .map_err(|e| e.to_string())?;
        let files = query
            .query_map([game], |row| Ok(SyncedFile { path: row.get(0)?, sha1: row.get(1)?, blob: row.get(2)? }))
            .map_err(|e| e.to_string())?;
        files.collect::<Result<_, _>>().map_err(|e| e.to_string())
    }

    pub fn keep_synced_file(&self, game: &str, file: &SyncedFile) -> Result<(), String> {
        self.conn()
            .execute(
                "INSERT OR REPLACE INTO sync_files (game, path, sha1, blob) VALUES (?1, ?2, ?3, ?4)",
                [game, &file.path, &file.sha1, &file.blob],
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn forget_synced_file(&self, game: &str, path: &str) -> Result<(), String> {
        self.conn()
            .execute("DELETE FROM sync_files WHERE game = ?1 AND path = ?2", [game, path])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn file_hash(&self, path: &str) -> Result<Option<FileHash>, String> {
        self.conn()
            .query_row("SELECT size, mtime, sha1 FROM sync_hashes WHERE path = ?1", [path], |row| {
                Ok(FileHash { size: row.get(0)?, mtime: row.get(1)?, sha1: row.get(2)? })
            })
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn keep_file_hash(&self, path: &str, hash: &FileHash) -> Result<(), String> {
        self.conn()
            .execute(
                "INSERT OR REPLACE INTO sync_hashes (path, size, mtime, sha1) VALUES (?1, ?2, ?3, ?4)",
                params![path, hash.size, hash.mtime, hash.sha1],
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn sync_upload(&self, game: &str, path: &str) -> Result<Option<PendingUpload>, String> {
        self.conn()
            .query_row("SELECT sha1, blob, session FROM sync_uploads WHERE game = ?1 AND path = ?2", [game, path], |row| {
                Ok(PendingUpload { sha1: row.get(0)?, blob: row.get(1)?, session: row.get(2)? })
            })
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn keep_sync_upload(&self, game: &str, path: &str, upload: &PendingUpload) -> Result<(), String> {
        self.conn()
            .execute(
                "INSERT OR REPLACE INTO sync_uploads (game, path, sha1, blob, session) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![game, path, upload.sha1, upload.blob, upload.session],
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn forget_sync_upload(&self, game: &str, path: &str) -> Result<(), String> {
        self.conn()
            .execute("DELETE FROM sync_uploads WHERE game = ?1 AND path = ?2", [game, path])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn sync_conflicts(&self, game: &str) -> Result<Vec<(String, String)>, String> {
        let conn = self.conn();
        let mut query = conn
            .prepare("SELECT file, cloud FROM sync_conflicts WHERE game = ?1 ORDER BY file")
            .map_err(|e| e.to_string())?;
        let conflicts = query.query_map([game], |row| Ok((row.get(0)?, row.get(1)?))).map_err(|e| e.to_string())?;
        conflicts.collect::<Result<_, _>>().map_err(|e| e.to_string())
    }

    pub fn keep_sync_conflict(&self, game: &str, file: &str, cloud: &str) -> Result<(), String> {
        self.conn()
            .execute("INSERT OR REPLACE INTO sync_conflicts (game, file, cloud) VALUES (?1, ?2, ?3)", [game, file, cloud])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn forget_sync_conflict(&self, game: &str, file: &str) -> Result<(), String> {
        self.conn()
            .execute("DELETE FROM sync_conflicts WHERE game = ?1 AND file = ?2", [game, file])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn sync_deletions(&self, game: &str) -> Result<Vec<(String, String)>, String> {
        let conn = self.conn();
        let mut query = conn
            .prepare("SELECT path, sha1 FROM sync_deletions WHERE game = ?1 ORDER BY path")
            .map_err(|e| e.to_string())?;
        let deletions = query.query_map([game], |row| Ok((row.get(0)?, row.get(1)?))).map_err(|e| e.to_string())?;
        deletions.collect::<Result<_, _>>().map_err(|e| e.to_string())
    }

    pub fn keep_sync_deletion(&self, game: &str, path: &str, sha1: &str, at: i64) -> Result<(), String> {
        self.conn()
            .execute(
                "INSERT OR REPLACE INTO sync_deletions (game, path, sha1, at) VALUES (?1, ?2, ?3, ?4)",
                params![game, path, sha1, at],
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn move_sync_deletion(&self, game: &str, path: &str, to_game: &str, to_path: &str) -> Result<(), String> {
        self.conn()
            .execute(
                "UPDATE OR REPLACE sync_deletions SET game = ?3, path = ?4 WHERE game = ?1 AND path = ?2",
                [game, path, to_game, to_path],
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn forget_sync_deletion(&self, game: &str, path: &str) -> Result<(), String> {
        self.conn()
            .execute("DELETE FROM sync_deletions WHERE game = ?1 AND path = ?2", [game, path])
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub fn forget_sync_deletions(&self, game: &str) -> Result<(), String> {
        self.conn().execute("DELETE FROM sync_deletions WHERE game = ?1", [game]).map(|_| ()).map_err(|e| e.to_string())
    }

    pub fn forget_synced_game(&self, game: &str) -> Result<(), String> {
        let mut conn = self.conn();
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for table in ["sync_files", "sync_uploads", "sync_conflicts"] {
            tx.execute(&format!("DELETE FROM {table} WHERE game = ?1"), [game]).map_err(|e| e.to_string())?;
        }
        tx.execute("DELETE FROM sync_games WHERE id = ?1", [game]).map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())
    }
}

pub struct Session {
    index: Arc<Index>,
    id: i64,
}

impl Session {
    pub fn record(&self, frames: u64, at: i64) -> Result<(), String> {
        self.index
            .conn()
            .execute(
                "UPDATE sessions SET ended_at = ?1, frames = ?2 WHERE id = ?3",
                params![at, frames as i64, self.id],
            )
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}

fn connect(file: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(file)?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    for (applied, migration) in MIGRATIONS.iter().enumerate().skip(version as usize) {
        conn.execute_batch(&format!("BEGIN; {migration} PRAGMA user_version = {}; COMMIT;", applied + 1))?;
    }
    Ok(())
}

pub fn now() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as i64
}

#[tauri::command]
pub fn play_history(index: State<'_, Arc<Index>>, path: String) -> Result<PlayHistory, String> {
    index.play_history(&path)
}

#[tauri::command]
pub fn recently_played(index: State<'_, Arc<Index>>, limit: u32) -> Result<Vec<String>, String> {
    index.recently_played(limit)
}

#[tauri::command]
pub fn save_summary(index: State<'_, Arc<Index>>, sha256: String) -> Result<Option<serde_json::Value>, String> {
    index.save_summary(&sha256)?.map(|summary| serde_json::from_str(&summary).map_err(|e| e.to_string())).transpose()
}

#[tauri::command]
pub fn keep_save_summary(index: State<'_, Arc<Index>>, sha256: String, summary: serde_json::Value) -> Result<(), String> {
    index.keep_save_summary(&sha256, &summary.to_string())
}

#[tauri::command]
pub fn save_had_cheats(index: State<'_, Arc<Index>>, rom: String, sha1: String) -> Result<bool, String> {
    index.save_had_cheats(&rom, &sha1)
}

#[cfg(test)]
pub fn temp_index(name: &str) -> (Arc<Index>, std::path::PathBuf) {
    let file = std::env::temp_dir().join(format!("pkh-emu-index-{name}-{}.sqlite", std::process::id()));
    let _ = std::fs::remove_file(&file);
    (Arc::new(Index::open(&file)), file)
}

#[cfg(test)]
mod tests {
    use super::*;

    const UNPLAYED: PlayHistory = PlayHistory { last_played: None, play_time: 0.0 };

    #[test]
    fn knows_nothing_of_a_game_never_played() {
        let (index, _) = temp_index("unplayed");

        assert_eq!(index.play_history("gba/Emerald.gba"), Ok(UNPLAYED));
        assert_eq!(index.recently_played(10), Ok(vec![]));
    }

    #[test]
    fn counts_a_game_as_played_from_the_moment_it_starts() {
        let (index, _) = temp_index("started");

        index.start_session("gba/Emerald.gba", 60.0, 1_000).unwrap();

        assert_eq!(
            index.play_history("gba/Emerald.gba"),
            Ok(PlayHistory { last_played: Some(1_000), play_time: 0.0 })
        );
    }

    #[test]
    fn records_the_frames_played_when_a_session_ends() {
        let (index, _) = temp_index("ended");

        index.start_session("gba/Emerald.gba", 60.0, 1_000).unwrap().record(600, 12_000).unwrap();

        assert_eq!(
            index.play_history("gba/Emerald.gba"),
            Ok(PlayHistory { last_played: Some(12_000), play_time: 10.0 })
        );
    }

    #[test]
    fn adds_up_the_play_time_of_every_session() {
        let (index, _) = temp_index("totals");

        index.start_session("gba/Emerald.gba", 60.0, 1_000).unwrap().record(600, 12_000).unwrap();
        index.start_session("gb/Red.gb", 60.0, 13_000).unwrap().record(6_000, 113_000).unwrap();
        index.start_session("gba/Emerald.gba", 50.0, 200_000).unwrap().record(1_500, 230_000).unwrap();

        assert_eq!(
            index.play_history("gba/Emerald.gba"),
            Ok(PlayHistory { last_played: Some(230_000), play_time: 40.0 })
        );
    }

    #[test]
    fn lists_recently_played_games_newest_first() {
        let (index, _) = temp_index("recent");

        for (at, game) in ["gb/Red.gb", "gba/Emerald.gba", "gb/Red.gb", "gbc/Crystal.gbc"].into_iter().enumerate() {
            index.start_session(game, 60.0, at as i64).unwrap();
        }

        assert_eq!(index.recently_played(10), Ok(vec!["gbc/Crystal.gbc".into(), "gb/Red.gb".into(), "gba/Emerald.gba".into()]));
        assert_eq!(index.recently_played(2), Ok(vec!["gbc/Crystal.gbc".into(), "gb/Red.gb".into()]));
    }

    #[test]
    fn keeps_a_save_summary_by_its_hash() {
        let (index, _) = temp_index("summary");

        index.keep_save_summary("abc", r#"{"trainer":"MAY"}"#).unwrap();

        assert_eq!(index.save_summary("abc"), Ok(Some(r#"{"trainer":"MAY"}"#.into())));
        assert_eq!(index.save_summary("def"), Ok(None));
    }

    #[test]
    fn adds_save_summaries_to_an_index_from_before_them() {
        let (_, file) = temp_index("upgrade");
        std::fs::remove_file(&file).unwrap();
        let old = Connection::open(&file).unwrap();
        old.execute_batch(&format!("{} PRAGMA user_version = 1;", MIGRATIONS[0])).unwrap();
        old.execute("INSERT INTO sessions (game, started_at, fps) VALUES ('gb/Red.gb', 1000, 60)", []).unwrap();
        drop(old);

        let index = Index::open(&file);

        index.keep_save_summary("abc", "{}").unwrap();
        assert_eq!(index.save_summary("abc"), Ok(Some("{}".into())));
        assert_eq!(index.play_history("gb/Red.gb"), Ok(PlayHistory { last_played: Some(1_000), play_time: 0.0 }));
    }

    #[test]
    fn forgets_save_summaries_cached_before_game_progress() {
        let (_, file) = temp_index("progress");
        std::fs::remove_file(&file).unwrap();
        let old = Connection::open(&file).unwrap();
        old.execute_batch(&format!("{} {} {} PRAGMA user_version = 3;", MIGRATIONS[0], MIGRATIONS[1], MIGRATIONS[2])).unwrap();
        old.execute("INSERT INTO save_summaries (sha256, summary) VALUES ('abc', '{}')", []).unwrap();
        drop(old);

        let index = Index::open(&file);

        assert_eq!(index.save_summary("abc"), Ok(None));
        index.keep_save_summary("abc", r#"{"progress":{}}"#).unwrap();
        drop(index);
        assert_eq!(Index::open(&file).save_summary("abc"), Ok(Some(r#"{"progress":{}}"#.into())));
    }

    #[test]
    fn remembers_saves_written_with_cheats_per_rom() {
        let (index, _) = temp_index("cheat-saves");

        index.mark_save_had_cheats("gba/Emerald.gba", "abc").unwrap();
        index.mark_save_had_cheats("gba/Emerald.gba", "abc").unwrap();

        assert_eq!(index.save_had_cheats("gba/Emerald.gba", "abc"), Ok(true));
        assert_eq!(index.save_had_cheats("gba/Emerald.gba", "def"), Ok(false));
        assert_eq!(index.save_had_cheats("gba/Ruby.gba", "abc"), Ok(false));
    }

    fn art_row(path: &str, sha1: &str) -> RomArtRow {
        RomArtRow {
            path: path.into(),
            size: 512,
            mtime: 1_000,
            sha1: sha1.into(),
            decoder_version: 0,
            status: "pending".into(),
        }
    }

    #[test]
    fn keeps_a_roms_art_row_by_its_path() {
        let (index, _) = temp_index("rom-art");

        index.keep_rom_art(&art_row("gba/Emerald.gba", "abc"), 1_000).unwrap();

        assert_eq!(index.rom_art("gba/Emerald.gba"), Ok(Some(art_row("gba/Emerald.gba", "abc"))));
        assert_eq!(index.rom_art("gba/Ruby.gba"), Ok(None));
    }

    #[test]
    fn marks_every_copy_of_a_rom_at_once() {
        let (index, _) = temp_index("rom-art-mark");
        index.keep_rom_art(&art_row("gba/Emerald.gba", "abc"), 1_000).unwrap();
        index.keep_rom_art(&art_row("gba/Emerald copy.gba", "abc"), 1_000).unwrap();
        index.keep_rom_art(&art_row("gba/Ruby.gba", "def"), 1_000).unwrap();

        index.mark_rom_art("abc", "unsupported", Some(3), 2_000).unwrap();
        index.mark_rom_art("def", "failed", None, 2_000).unwrap();

        let status = |path| index.rom_art(path).unwrap().map(|row| (row.status, row.decoder_version));
        assert_eq!(index.rom_art_status("abc"), Ok(Some("unsupported".into())));
        assert_eq!(index.rom_art_status("xyz"), Ok(None));
        assert_eq!(status("gba/Emerald.gba"), Some(("unsupported".into(), 3)));
        assert_eq!(status("gba/Emerald copy.gba"), Some(("unsupported".into(), 3)));
        assert_eq!(status("gba/Ruby.gba"), Some(("failed".into(), 0)));
    }

    #[test]
    fn forgets_the_art_rows_of_roms_no_longer_in_the_library() {
        let (index, _) = temp_index("rom-art-forget");
        index.keep_rom_art(&art_row("gba/Emerald.gba", "abc"), 1_000).unwrap();
        index.keep_rom_art(&art_row("gba/Ruby.gba", "def"), 1_000).unwrap();

        index.forget_rom_art_except(&["gba/Ruby.gba".into(), "gb/Red.gb".into()]).unwrap();

        assert_eq!(index.rom_art("gba/Emerald.gba"), Ok(None));
        assert_eq!(index.rom_art_sha1s(), Ok(HashSet::from(["def".into()])));
        index.forget_rom_art_except(&[]).unwrap();
        assert_eq!(index.rom_art_sha1s(), Ok(HashSet::new()));
    }

    #[test]
    fn keeps_play_history_across_launches() {
        let (index, file) = temp_index("reopen");
        index.start_session("gb/Red.gb", 60.0, 1_000).unwrap().record(60, 2_000).unwrap();
        drop(index);

        let reopened = Index::open(&file);

        assert_eq!(reopened.play_history("gb/Red.gb"), Ok(PlayHistory { last_played: Some(2_000), play_time: 1.0 }));
    }

    #[test]
    fn keeps_each_games_last_sync_across_launches_and_rewrites() {
        let (index, file) = temp_index("game-last-synced");
        let game = |path: &str| SyncedGame {
            id: "id-1".into(),
            path: path.into(),
            rom_size: 1,
            rom_mtime: 2,
            rom_sha1: "abc".into(),
        };
        index.keep_synced_game(&game("gba/Emerald.gba")).unwrap();
        index.keep_game_last_synced("id-1", 5_000).unwrap();
        index.keep_synced_game(&game("gba/Hacks/Emerald.gba")).unwrap();
        drop(index);

        let reopened = Index::open(&file);

        assert_eq!(reopened.games_last_synced(), Ok(vec![("gba/Hacks/Emerald.gba".into(), 5_000)]));
    }

    #[test]
    fn a_new_account_forgets_the_deletions_logged_before_it() {
        let (index, _) = temp_index("deletions-account");
        index.start_sync("first").unwrap();
        index.keep_sync_deletion("gba/Emerald.gba", "gba/Emerald.sav", "abc", 1_000).unwrap();
        index.move_sync_deletion("gba/Emerald.gba", "gba/Emerald.sav", "gba/Hack.gba", "gba/Hack.sav").unwrap();
        assert_eq!(index.sync_deletions("gba/Hack.gba"), Ok(vec![("gba/Hack.sav".into(), "abc".into())]));

        index.start_sync("second").unwrap();

        assert_eq!(index.sync_deletions("gba/Hack.gba"), Ok(vec![]));
    }

    #[test]
    fn comes_back_empty_when_the_file_is_deleted() {
        let (index, file) = temp_index("deleted");
        index.start_session("gb/Red.gb", 60.0, 1_000).unwrap();
        drop(index);
        std::fs::remove_file(&file).unwrap();

        let reopened = Index::open(&file);

        assert_eq!(reopened.play_history("gb/Red.gb"), Ok(UNPLAYED));
        assert!(file.exists());
    }

    #[test]
    fn comes_back_empty_when_the_file_is_corrupt() {
        let (_, file) = temp_index("corrupt");
        std::fs::write(&file, b"not a database, just some bytes that SQLite won't recognise").unwrap();

        let reopened = Arc::new(Index::open(&file));

        assert_eq!(reopened.play_history("gb/Red.gb"), Ok(UNPLAYED));
        reopened.start_session("gb/Red.gb", 60.0, 1_000).unwrap();
        assert_eq!(reopened.recently_played(10), Ok(vec!["gb/Red.gb".to_string()]));
    }
}
