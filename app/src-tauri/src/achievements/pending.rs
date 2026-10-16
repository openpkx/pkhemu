use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Unlock {
    pub user: String,
    pub achievement: u32,
    pub hardcore: bool,
    pub hash: String,
    pub unlocked_at: u64,
}

impl Unlock {
    pub fn sent_in(form: &str, now: u64) -> Option<Unlock> {
        let fields: Vec<(String, String)> = url::form_urlencoded::parse(form.as_bytes()).into_owned().collect();
        let field = |name: &str| fields.iter().find(|(key, _)| key == name).map(|(_, value)| value.as_str());
        if field("r") != Some("awardachievement") {
            return None;
        }
        let since: u64 = field("o").and_then(|o| o.parse().ok()).unwrap_or(0);
        Some(Unlock {
            user: field("u")?.into(),
            achievement: field("a")?.parse().ok()?,
            hardcore: field("h") == Some("1"),
            hash: field("m").unwrap_or_default().into(),
            unlocked_at: now.saturating_sub(since),
        })
    }

    fn same(&self, other: &Unlock) -> bool {
        self.user == other.user && self.achievement == other.achievement && self.hardcore == other.hardcore
    }
}

pub struct Pending {
    path: PathBuf,
    lock: Mutex<()>,
}

impl Pending {
    pub fn new(path: PathBuf) -> Pending {
        Pending { path, lock: Mutex::new(()) }
    }

    pub fn of(&self, user: &str) -> Vec<Unlock> {
        let _held = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        self.read().into_iter().filter(|unlock| unlock.user == user).collect()
    }

    pub fn add(&self, unlock: Unlock) {
        let _held = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        let mut unlocks = self.read();
        if !unlocks.iter().any(|kept| kept.same(&unlock)) {
            unlocks.push(unlock);
            self.write(&unlocks);
        }
    }

    pub fn remove(&self, unlock: &Unlock) {
        let _held = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        let mut unlocks = self.read();
        let before = unlocks.len();
        unlocks.retain(|kept| !kept.same(unlock));
        if unlocks.len() != before {
            self.write(&unlocks);
        }
    }

    fn read(&self) -> Vec<Unlock> {
        std::fs::read(&self.path).ok().and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default()
    }

    fn write(&self, unlocks: &[Unlock]) {
        let written = std::fs::write(self.path.with_extension("tmp"), serde_json::to_vec(unlocks).unwrap_or_default())
            .and_then(|()| std::fs::rename(self.path.with_extension("tmp"), &self.path));
        if let Err(e) = written {
            eprintln!("keeping RetroAchievements unlocks to send: {e}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pending(name: &str) -> Pending {
        let path = std::env::temp_dir().join(format!("pkh-emu-pending-{name}-{}.json", std::process::id()));
        let _ = std::fs::remove_file(&path);
        Pending::new(path)
    }

    #[test]
    fn reads_the_unlock_an_award_request_sends() {
        let form = "r=awardachievement&u=Player&t=token&a=5501&h=0&m=abc123&o=30&v=sig";

        let unlock = Unlock::sent_in(form, 1000);

        let expected = Unlock {
            user: "Player".into(),
            achievement: 5501,
            hardcore: false,
            hash: "abc123".into(),
            unlocked_at: 970,
        };
        assert_eq!(unlock, Some(expected));
    }

    #[test]
    fn ignores_other_requests() {
        assert_eq!(Unlock::sent_in("r=ping&u=Player&t=token&g=1", 1000), None);
    }

    #[test]
    fn keeps_each_unlock_once_until_it_is_removed() {
        let pending = pending("once");
        let unlock =
            Unlock { user: "Player".into(), achievement: 1, hardcore: false, hash: "h".into(), unlocked_at: 5 };

        pending.add(unlock.clone());
        pending.add(Unlock { unlocked_at: 9, ..unlock.clone() });
        assert_eq!(pending.of("Player"), [unlock.clone()]);
        assert_eq!(pending.of("Other"), []);

        pending.remove(&unlock);
        assert_eq!(pending.of("Player"), []);
    }

    #[test]
    fn keeps_unlocks_across_restarts() {
        let first = pending("restart");
        let unlock =
            Unlock { user: "Player".into(), achievement: 2, hardcore: false, hash: "h".into(), unlocked_at: 5 };
        first.add(unlock.clone());

        let again = Pending::new(first.path.clone());

        assert_eq!(again.of("Player"), [unlock]);
    }
}
