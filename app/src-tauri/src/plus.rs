#[cfg_attr(target_os = "android", path = "plus/android.rs")]
#[cfg_attr(target_os = "ios", path = "plus/ios.rs")]
#[cfg_attr(desktop, path = "plus/desktop.rs")]
pub mod platform;
#[cfg(test)]
pub mod fake;
#[cfg(test)]
mod tests;

use crate::sync::BoxFuture;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Runtime, State};

pub const PRODUCT: &str = "pkhemu_plus";

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Build {
    Unlocked { sideload: bool },
    Store { plus: bool },
}

impl Build {
    pub fn current() -> Build {
        Build::from_keys(env!("PKH_EMU_STORE"), env!("PKH_EMU_PLUS"))
    }

    pub fn from_keys(store: &str, plus: &str) -> Build {
        match store {
            "" => Build::Unlocked { sideload: false },
            "sideload" => Build::Unlocked { sideload: true },
            "play" => Build::Store { plus: true },
            _ => Build::Store { plus: plus == "on" },
        }
    }

    pub fn offers_sync(self) -> bool {
        self != Build::Store { plus: false }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum Status {
    Unlocked { sideload: bool },
    Owned,
    NotOwned { price: String },
    Unavailable,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Bought {
    Purchased,
    Pending,
    Cancelled,
}

pub trait Purchases: Send + Sync {
    /// None when the store is missing or doesn't sell the product.
    fn price<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Option<String>, String>>;
    fn buy<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Bought, String>>;
    /// The products the player owns, or None when this device can't buy from the store.
    fn owned(&self) -> BoxFuture<'_, Result<Option<Vec<String>>, String>>;
}

pub fn store<R: Runtime>(app: &AppHandle<R>, build: Build) -> Option<Arc<dyn Purchases>> {
    match build {
        Build::Store { plus: true } => platform::store(app),
        _ => None,
    }
}

pub type OnChange = Box<dyn Fn(&Status) + Send + Sync>;

pub struct Plus {
    build: Build,
    store: Option<Arc<dyn Purchases>>,
    cache: PathBuf,
    last: Mutex<Option<Status>>,
    on_change: OnChange,
}

impl Plus {
    pub fn new(data_dir: &Path, build: Build, store: Option<Arc<dyn Purchases>>, on_change: OnChange) -> Plus {
        let cache = data_dir.join("plus.json");
        let last = std::fs::read(&cache).ok().and_then(|json| serde_json::from_slice(&json).ok());
        Plus { build, store, cache, last: Mutex::new(last), on_change }
    }

    pub fn cached(&self) -> Option<Status> {
        if let Build::Unlocked { sideload } = self.build {
            return Some(Status::Unlocked { sideload });
        }
        self.last.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    pub fn offers_sync(&self) -> bool {
        self.build.offers_sync()
    }

    pub fn syncs(&self) -> bool {
        self.offers_sync() && matches!(self.cached(), Some(Status::Unlocked { .. } | Status::Owned))
    }

    /// Asking the store also acknowledges any new purchase.
    pub async fn check(&self) -> Status {
        if let Build::Unlocked { sideload } = self.build {
            return Status::Unlocked { sideload };
        }
        let Some(store) = &self.store else { return Status::Unavailable };
        match ask(store.as_ref()).await {
            Ok(status) => self.answered(status),
            Err(e) => {
                eprintln!("checking Plus: {e}");
                self.cached().unwrap_or(Status::Unavailable)
            }
        }
    }

    pub async fn buy(&self) -> Result<Bought, String> {
        if let Build::Unlocked { .. } = self.build {
            return Err("Plus is already unlocked".into());
        }
        let Some(store) = &self.store else { return Err("Plus can't be bought on this device".into()) };
        let bought = store.buy(PRODUCT).await?;
        if bought == Bought::Purchased {
            self.check().await;
        }
        Ok(bought)
    }

    // Play reports itself unavailable while signed out, which shouldn't take away a Plus the player paid for.
    fn answered(&self, status: Status) -> Status {
        let mut last = self.last.lock().unwrap_or_else(|e| e.into_inner());
        let kept = status == Status::Unavailable && *last == Some(Status::Owned);
        if kept || last.as_ref() == Some(&status) {
            return last.clone().unwrap_or(status);
        }
        if let Err(e) = serde_json::to_vec(&status).map(|json| std::fs::write(&self.cache, json)) {
            eprintln!("caching Plus: {e}");
        }
        (self.on_change)(&status);
        *last = Some(status.clone());
        status
    }
}

async fn ask(store: &dyn Purchases) -> Result<Status, String> {
    let Some(owned) = store.owned().await? else { return Ok(Status::Unavailable) };
    if owned.iter().any(|id| id == PRODUCT) {
        return Ok(Status::Owned);
    }
    Ok(match store.price(PRODUCT).await? {
        Some(price) => Status::NotOwned { price },
        None => Status::Unavailable,
    })
}

#[tauri::command]
pub async fn plus_status(plus: State<'_, Arc<Plus>>) -> Result<Status, String> {
    Ok(plus.check().await)
}

#[tauri::command]
pub async fn plus_buy(plus: State<'_, Arc<Plus>>) -> Result<Bought, String> {
    plus.buy().await
}

#[tauri::command]
pub async fn plus_restore(plus: State<'_, Arc<Plus>>) -> Result<Status, String> {
    Ok(plus.check().await)
}
