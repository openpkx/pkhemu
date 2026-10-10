use super::{Bought, Plus, Purchases};
use crate::sync::BoxFuture;
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use tauri::ipc::Channel;
use tauri::plugin::{Builder, PluginHandle, TauriPlugin};
use tauri::{AppHandle, Manager, Runtime};

struct PlayPlugin<R: Runtime>(Arc<PluginHandle<R>>);

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("purchases")
        .setup(|app, api| {
            let handle = api.register_android_plugin("fyi.openpkx.pkhemu", "PurchasesPlugin")?;
            app.manage(PlayPlugin(Arc::new(handle)));
            Ok(())
        })
        .build()
}

pub fn store<R: Runtime>(app: &AppHandle<R>) -> Option<Arc<dyn Purchases>> {
    let handle = app.try_state::<PlayPlugin<R>>()?.0.clone();
    let app = app.clone();
    let updated = Channel::<Value>::new(move |_| {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            if let Some(plus) = app.try_state::<Arc<Plus>>() {
                plus.check().await;
            }
        });
        Ok(())
    });
    if let Err(e) =
        handle.run_mobile_plugin::<Value>("registerListener", json!({ "event": "updated", "handler": updated }))
    {
        eprintln!("listening for purchases: {e}");
    }
    Some(Arc::new(PlayStore(handle)))
}

struct PlayStore<R: Runtime>(Arc<PluginHandle<R>>);

#[derive(Deserialize)]
struct Products {
    products: Vec<Product>,
}

#[derive(Deserialize)]
struct Product {
    id: String,
    price: String,
}

#[derive(Deserialize)]
struct Answer {
    result: Bought,
}

#[derive(Deserialize)]
struct Owned {
    available: bool,
    #[serde(default)]
    products: Vec<String>,
}

impl<R: Runtime> Purchases for PlayStore<R> {
    fn price<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Option<String>, String>> {
        Box::pin(async move {
            let answer: Products =
                self.0.run_mobile_plugin_async("products", json!({ "ids": [id] })).await.map_err(|e| e.to_string())?;
            Ok(answer.products.into_iter().find(|product| product.id == id).map(|product| product.price))
        })
    }

    fn buy<'a>(&'a self, id: &'a str) -> BoxFuture<'a, Result<Bought, String>> {
        Box::pin(async move {
            let answer: Answer =
                self.0.run_mobile_plugin_async("buy", json!({ "id": id })).await.map_err(|e| e.to_string())?;
            Ok(answer.result)
        })
    }

    fn owned(&self) -> BoxFuture<'_, Result<Option<Vec<String>>, String>> {
        Box::pin(async move {
            let answer: Owned = self.0.run_mobile_plugin_async("owned", ()).await.map_err(|e| e.to_string())?;
            Ok(answer.available.then_some(answer.products))
        })
    }
}
