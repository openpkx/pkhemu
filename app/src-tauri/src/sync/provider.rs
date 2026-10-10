use std::future::Future;
use std::io::{Read, Write};
use std::pin::Pin;
use std::time::Duration;

pub type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + Send + 'a>>;
pub type Sent<'a> = dyn Fn(u64) + Sync + 'a;

#[derive(Clone, Debug, PartialEq)]
pub enum Error {
    /// The cloud asked to wait, at least as long as it says if it says.
    SlowDown(Option<Duration>),
    /// A record write expected a version the record no longer has.
    Stale,
    /// No connection, so the game's changes wait for one.
    Offline,
    /// On mobile data with Sync on mobile data off, so the game's changes wait for Wi-Fi.
    MobileData,
    /// Every game waits until the player fixes the account, as with an expired sign-in or a full drive.
    Account(String),
    Failed(String),
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            Error::SlowDown(_) => write!(f, "the cloud asked to slow down"),
            Error::Stale => write!(f, "another device changed the game at the same time"),
            Error::Offline => write!(f, "No connection. pkhemu will try again"),
            Error::MobileData => write!(f, "Sync on mobile data is off"),
            Error::Account(reason) | Error::Failed(reason) => write!(f, "{reason}"),
        }
    }
}

impl From<String> for Error {
    fn from(reason: String) -> Error {
        Error::Failed(reason)
    }
}

impl From<&str> for Error {
    fn from(reason: &str) -> Error {
        Error::Failed(reason.into())
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Changes {
    pub records: Vec<String>,
    pub cursor: String,
    /// Every record there is, rather than those changed since the cursor, so a cached record missing from it is gone.
    pub complete: bool,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Versioned {
    pub json: Vec<u8>,
    pub version: String,
}

/// What a cloud must do for sync. Records are small JSON, one per game, and blobs hold the files.
pub trait Provider: Send + Sync {
    /// Who is signed in, so a different account starts sync over.
    fn account(&self) -> String;

    /// The ids of records changed since `cursor`, deleted ones included, or of every record without one.
    fn changes<'a>(&'a self, cursor: Option<&'a str>) -> BoxFuture<'a, Result<Changes, Error>>;

    fn read_record<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Option<Versioned>, Error>>;

    /// Fails with [`Error::Stale`] unless the record is at `expected`, where `None` expects no record.
    fn write_record<'a>(&'a self, id: &'a str, json: &'a [u8], expected: Option<&'a str>) -> BoxFuture<'a, Result<String, Error>>;

    fn delete_record<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<(), Error>>;

    fn start_upload<'a>(&'a self, blob: &'a str, size: u64, sha1: &'a str) -> BoxFuture<'a, Result<String, Error>>;

    /// How many bytes of a session's blob the cloud holds, or `None` once the session has expired.
    fn uploaded<'a>(&'a self, session: &'a str) -> BoxFuture<'a, Result<Option<u64>, Error>>;

    /// Sends the rest of the blob, which `from` reads from `offset` on.
    /// `sent` hears how many bytes the cloud holds after each request.
    fn upload<'a>(&'a self, session: &'a str, offset: u64, from: &'a mut (dyn Read + Send), sent: &'a Sent<'a>) -> BoxFuture<'a, Result<(), Error>>;

    fn download<'a>(&'a self, blob: &'a str, to: &'a mut (dyn Write + Send)) -> BoxFuture<'a, Result<(), Error>>;

    fn delete_blob<'a>(&'a self, blob: &'a str) -> BoxFuture<'a, Result<(), Error>>;

    /// Marks a blob no record uses any more. It still downloads until [`Provider::purge_retired`] deletes it.
    fn retire_blob<'a>(&'a self, blob: &'a str) -> BoxFuture<'a, Result<(), Error>>;

    /// Deletes the blobs retired more than `older_than` ago.
    fn purge_retired(&self, older_than: Duration) -> BoxFuture<'_, Result<(), Error>>;
}
