use super::{Bought, Purchases, PRODUCT};
use crate::sync::BoxFuture;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

pub struct FakeStore {
    price: Option<String>,
    available: bool,
    answers: Bought,
    owned: Mutex<Vec<String>>,
    offline: AtomicBool,
}

impl FakeStore {
    pub fn selling(price: &str) -> FakeStore {
        FakeStore {
            price: Some(price.into()),
            available: true,
            answers: Bought::Purchased,
            owned: Mutex::new(Vec::new()),
            offline: AtomicBool::new(false),
        }
    }

    pub fn missing() -> FakeStore {
        FakeStore { available: false, ..FakeStore::selling("$3.99") }
    }

    pub fn not_selling() -> FakeStore {
        FakeStore { price: None, ..FakeStore::selling("$3.99") }
    }

    pub fn owning(self) -> FakeStore {
        self.owned.lock().unwrap().push(PRODUCT.into());
        self
    }

    pub fn answering(self, answers: Bought) -> FakeStore {
        FakeStore { answers, ..self }
    }

    pub fn offline(self) -> FakeStore {
        self.go_offline(true);
        self
    }

    pub fn go_offline(&self, offline: bool) {
        self.offline.store(offline, Ordering::Relaxed);
    }

    pub fn refund(&self) {
        self.owned.lock().unwrap().clear();
    }

    fn reachable(&self) -> Result<(), String> {
        if self.offline.load(Ordering::Relaxed) {
            return Err("No connection".into());
        }
        Ok(())
    }
}

impl Purchases for FakeStore {
    fn price<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Option<String>, String>> {
        Box::pin(async move {
            self.reachable()?;
            Ok(self.price.clone().filter(|_| self.available && id == PRODUCT))
        })
    }

    fn buy<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Bought, String>> {
        Box::pin(async move {
            self.reachable()?;
            if !self.available {
                return Err("Plus can't be bought on this device".into());
            }
            if self.answers == Bought::Purchased {
                self.owned.lock().unwrap().push(id.into());
            }
            Ok(self.answers)
        })
    }

    fn owned(&self) -> BoxFuture<'_, Result<Option<Vec<String>>, String>> {
        Box::pin(async move {
            self.reachable()?;
            Ok(self.available.then(|| self.owned.lock().unwrap().clone()))
        })
    }
}
