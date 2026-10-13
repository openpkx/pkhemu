#[cfg_attr(target_os = "android", path = "box_art/android.rs")]
#[cfg_attr(target_os = "ios", path = "box_art/ios.rs")]
#[cfg_attr(desktop, path = "box_art/desktop.rs")]
mod platform;

use crate::bytes;
use crate::files::{cache_dir, write_file};
use crate::games_folder::GamesFolder;
use crate::{rom, sync};
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, ImageDecoder, ImageFormat, ImageReader};
use reqwest::{Client, StatusCode};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::Duration;
use tauri::ipc::{Request, Response};
use tauri::{AppHandle, Emitter, Manager, Runtime};

const SYSTEMS: [&str; 5] = ["gb", "gbc", "gba", "nds", "n64"];
const THUMBNAILS: &str = "https://thumbnails.libretro.com/";
const PNG: &str = "box-art.png";
const JPG: &str = "box-art.jpg";
const NONE: &str = "box-art.none";
pub const CHOSEN: [&str; 3] = [PNG, JPG, NONE];
const LONG_EDGE: u32 = 1024;
const MAX_DOWNLOAD: usize = 20 * 1024 * 1024;
const NOT_A_FILE_IMAGE: &str = "That file isn't an image";
const NOT_A_LINK_IMAGE: &str = "That link isn't an image";

fn file(root: &Path, system: &str, name: &str) -> Result<PathBuf, String> {
    let valid = SYSTEMS.contains(&system)
        && !name.is_empty()
        && !name.starts_with('.')
        && !name.chars().any(|c| c.is_control() || r#"/\:*?"<>|"#.contains(c));
    if !valid {
        return Err(format!("{system}/{name}: not a box art name"));
    }
    Ok(root.join(system).join(format!("{name}.png")))
}

fn read(root: &Path, system: &str, name: &str) -> Result<Vec<u8>, String> {
    std::fs::read(file(root, system, name)?).map_err(|e| format!("{system}/{name}: {e}"))
}

fn write(root: &Path, system: &str, name: &str, contents: &[u8]) -> Result<(), String> {
    write_file(&file(root, system, name)?, contents).map_err(|e| format!("{system}/{name}: {e}"))
}

// Header values are ASCII, so names arrive percent-encoded.
fn header<'a>(request: &'a Request<'_>, key: &str) -> Option<std::borrow::Cow<'a, str>> {
    let value = request.headers().get(key).and_then(|value| value.to_str().ok());
    value.and_then(|value| percent_encoding::percent_decode_str(value).decode_utf8().ok())
}

#[tauri::command]
pub async fn box_art_read<R: Runtime>(app: AppHandle<R>, system: String, name: String) -> Result<Response, String> {
    read(&cache_dir(&app, "box-art")?, &system, &name).map(Response::new)
}

#[tauri::command]
pub async fn box_art_write<R: Runtime>(app: AppHandle<R>, request: Request<'_>) -> Result<(), String> {
    let contents = bytes(request.body())?;
    let (Some(system), Some(name)) = (header(&request, "system"), header(&request, "name")) else {
        return Err("name the box art in system and name headers".into());
    };
    write(&cache_dir(&app, "box-art")?, &system, &name, &contents)
}

fn listing_file(root: &Path, system: &str, kind: &str) -> Result<PathBuf, String> {
    if !SYSTEMS.contains(&system) || !["Named_Boxarts", "Named_Titles"].contains(&kind) {
        return Err(format!("{system}/{kind}: not a box art listing"));
    }
    Ok(root.join(system).join(format!("{kind}.json")))
}

fn read_listing(root: &Path, system: &str, kind: &str) -> Result<Option<serde_json::Value>, String> {
    match std::fs::read(listing_file(root, system, kind)?) {
        Ok(contents) => serde_json::from_slice(&contents).map(Some).map_err(|e| format!("{system}/{kind}: {e}")),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("{system}/{kind}: {e}")),
    }
}

fn write_listing(root: &Path, system: &str, kind: &str, listing: &serde_json::Value) -> Result<(), String> {
    write_file(&listing_file(root, system, kind)?, listing.to_string().as_bytes())
        .map_err(|e| format!("{system}/{kind}: {e}"))
}

fn listings_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join("box-art-listings"))
}

#[tauri::command]
pub async fn box_art_listing_read<R: Runtime>(
    app: AppHandle<R>,
    system: String,
    kind: String,
) -> Result<Option<serde_json::Value>, String> {
    read_listing(&listings_dir(&app)?, &system, &kind)
}

#[tauri::command]
pub async fn box_art_listing_write<R: Runtime>(
    app: AppHandle<R>,
    system: String,
    kind: String,
    listing: serde_json::Value,
) -> Result<(), String> {
    write_listing(&listings_dir(&app)?, &system, &kind, &listing)
}

async fn download(http: &Client, url: &str) -> Result<Vec<u8>, String> {
    if !url.starts_with(THUMBNAILS) {
        return Err(format!("{url}: not on {THUMBNAILS}"));
    }
    let response = http.get(url).send().await.map_err(|e| format!("{url}: {e}"))?;
    if response.status() == StatusCode::NOT_FOUND {
        return Ok(Vec::new());
    }
    if !response.status().is_success() {
        return Err(format!("{url}: {}", response.status()));
    }
    response.bytes().await.map(|bytes| bytes.to_vec()).map_err(|e| format!("{url}: {e}"))
}

/// Answers an empty body when the server has no such file.
#[tauri::command]
pub async fn box_art_download(url: String) -> Result<Response, String> {
    static HTTP: OnceLock<Client> = OnceLock::new();
    download(HTTP.get_or_init(crate::sync::http), &url).await.map(Response::new)
}

#[derive(serde::Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum Chosen {
    None,
    Image { url: String },
}

fn shrink(image: DynamicImage) -> DynamicImage {
    if image.width().max(image.height()) <= LONG_EDGE {
        return image;
    }
    image.resize(LONG_EDGE, LONG_EDGE, FilterType::Lanczos3)
}

fn prepare(bytes: &[u8]) -> Option<(&'static str, Vec<u8>)> {
    let format = image::guess_format(bytes).ok()?;
    let mut decoder = ImageReader::with_format(Cursor::new(bytes), format).into_decoder().ok()?;
    let orientation = decoder.orientation().ok()?;
    let mut image = DynamicImage::from_decoder(decoder).ok()?;
    image.apply_orientation(orientation);
    let image = shrink(image);
    let mut contents = Vec::new();
    if format == ImageFormat::Png {
        image.write_to(&mut Cursor::new(&mut contents), ImageFormat::Png).ok()?;
        Some((PNG, contents))
    } else {
        JpegEncoder::new_with_quality(&mut contents, 85).encode_image(&image.to_rgb8()).ok()?;
        Some((JPG, contents))
    }
}

async fn prepared(bytes: Vec<u8>, refusal: &str) -> Result<(&'static str, Vec<u8>), String> {
    let prepared = tauri::async_runtime::spawn_blocking(move || prepare(&bytes)).await.map_err(|e| e.to_string())?;
    prepared.ok_or_else(|| refusal.to_owned())
}

pub fn chosen_path(rom: &str, name: &str) -> String {
    format!("{}/{name}", rom::data_dir(rom))
}

pub fn chosen_paths(rom: &str) -> [String; 3] {
    CHOSEN.map(|name| chosen_path(rom, name))
}

async fn chosen_files<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Vec<&'static str> {
    let entries = folder.read_dir(&rom::data_dir(rom)).await.unwrap_or_default();
    CHOSEN.into_iter().filter(|name| entries.iter().any(|entry| entry.name == *name)).collect()
}

async fn remove_chosen<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str, keep: Option<&str>) -> Result<(), String> {
    for name in chosen_files(folder, rom).await.into_iter().filter(|name| Some(*name) != keep) {
        let path = chosen_path(rom, name);
        folder.remove(rom, &path).await.map_err(|e| format!("{path}: {e}"))?;
    }
    Ok(())
}

pub async fn choose<R: Runtime>(
    folder: &GamesFolder<'_, R>,
    rom: &str,
    name: &str,
    contents: &[u8],
) -> Result<(), String> {
    let path = chosen_path(rom, name);
    folder.write(&path, contents).await.map_err(|e| format!("{path}: {e}"))?;
    remove_chosen(folder, rom, Some(name)).await
}

pub async fn chosen<R: Runtime>(folder: &GamesFolder<'_, R>, rom: &str) -> Result<Option<Chosen>, String> {
    let Some(name) = chosen_files(folder, rom).await.into_iter().next() else {
        return Ok(None);
    };
    if name == NONE {
        return Ok(Some(Chosen::None));
    }
    let path = chosen_path(rom, name);
    let contents = folder.read(&path).await.map_err(|e| format!("{path}: {e}"))?;
    let kind = if name == PNG { "png" } else { "jpeg" };
    Ok(Some(Chosen::Image { url: format!("data:image/{kind};base64,{}", STANDARD.encode(contents)) }))
}

async fn download_image(url: &str) -> Result<Vec<u8>, String> {
    let url = url::Url::parse(url.trim())
        .ok()
        .filter(|url| ["http", "https"].contains(&url.scheme()))
        .ok_or(NOT_A_LINK_IMAGE)?;
    static HTTP: OnceLock<Client> = OnceLock::new();
    let client = HTTP.get_or_init(|| {
        Client::builder()
            .tls_backend_preconfigured(sync::tls())
            .connect_timeout(Duration::from_secs(15))
            .timeout(Duration::from_secs(60))
            .build()
            .expect("the HTTP client builds")
    });
    let unreachable = |e: String| {
        eprintln!("box art: {e}");
        "Couldn't download that link".to_owned()
    };
    let mut response = client.get(url).send().await.map_err(|e| unreachable(e.to_string()))?;
    if !response.status().is_success() {
        return Err(unreachable(response.status().to_string()));
    }
    let too_big = || "That image is over 20MB".to_owned();
    if response.content_length().is_some_and(|length| length > MAX_DOWNLOAD as u64) {
        return Err(too_big());
    }
    let mut body = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|e| unreachable(e.to_string()))? {
        if body.len() + chunk.len() > MAX_DOWNLOAD {
            return Err(too_big());
        }
        body.extend_from_slice(&chunk);
    }
    Ok(body)
}

fn changed<R: Runtime>(app: &AppHandle<R>, rom: &str) {
    let _ = app.emit("box-art-changed", rom);
}

#[tauri::command]
pub async fn box_art_chosen<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    path: String,
) -> Result<Option<Chosen>, String> {
    chosen(&GamesFolder::open(&app, &folder), &path).await
}

#[tauri::command]
pub async fn box_art_choose<R: Runtime>(app: AppHandle<R>, request: Request<'_>) -> Result<(), String> {
    let (Some(folder), Some(path)) = (header(&request, "folder"), header(&request, "path")) else {
        return Err("name the game in folder and path headers".into());
    };
    let (name, contents) = prepared(bytes(request.body())?, NOT_A_FILE_IMAGE).await?;
    choose(&GamesFolder::open(&app, &folder), &path, name, &contents).await?;
    changed(&app, &path);
    Ok(())
}

#[tauri::command]
pub async fn box_art_choose_url<R: Runtime>(
    app: AppHandle<R>,
    folder: String,
    path: String,
    url: String,
) -> Result<(), String> {
    let (name, contents) = prepared(download_image(&url).await?, NOT_A_LINK_IMAGE).await?;
    choose(&GamesFolder::open(&app, &folder), &path, name, &contents).await?;
    changed(&app, &path);
    Ok(())
}

/// Answers false when the player closes the picker without choosing.
#[tauri::command]
pub async fn box_art_choose_file<R: Runtime>(app: AppHandle<R>, folder: String, path: String) -> Result<bool, String> {
    let Some(bytes) = platform::pick_image(&app).await? else {
        return Ok(false);
    };
    let (name, contents) = prepared(bytes, NOT_A_FILE_IMAGE).await?;
    choose(&GamesFolder::open(&app, &folder), &path, name, &contents).await?;
    changed(&app, &path);
    Ok(true)
}

#[tauri::command]
pub async fn box_art_choose_none<R: Runtime>(app: AppHandle<R>, folder: String, path: String) -> Result<(), String> {
    choose(&GamesFolder::open(&app, &folder), &path, NONE, &[]).await?;
    changed(&app, &path);
    Ok(())
}

#[tauri::command]
pub async fn box_art_use_default<R: Runtime>(app: AppHandle<R>, folder: String, path: String) -> Result<(), String> {
    remove_chosen(&GamesFolder::open(&app, &folder), &path, None).await?;
    changed(&app, &path);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::codecs::png::PngEncoder;
    use image::{ExtendedColorType, ImageEncoder, RgbImage};
    use tauri::async_runtime::block_on;

    fn temp_root(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!("pkh-emu-box-art-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        root
    }

    #[test]
    fn reads_back_written_box_art() {
        let root = temp_root("round-trip");
        let name = "Pokémon - Version Rubis (France) [Farfetch'd, _Hack_]";

        write(&root, "gba", name, b"png").unwrap();

        assert_eq!(read(&root, "gba", name).unwrap(), b"png");
        assert!(read(&root, "gb", name).is_err());
    }

    #[test]
    fn keeps_ds_box_art() {
        let root = temp_root("ds");

        write(&root, "nds", "Pokemon - HeartGold Version (USA)", b"png").unwrap();

        assert_eq!(read(&root, "nds", "Pokemon - HeartGold Version (USA)").unwrap(), b"png");
    }

    #[test]
    fn refuses_box_art_outside_the_cache() {
        let root = temp_root("outside");

        for (system, name) in [
            ("gba", "../escape"),
            ("gba", "hacks/Radical Red"),
            ("gba", "hacks\\Radical Red"),
            ("gba", "C:Red"),
            ("gba", ".."),
            ("gba", ""),
            ("..", "Red"),
            ("snes", "Red"),
        ] {
            assert!(write(&root, system, name, b"png").is_err(), "{system}/{name}");
            assert!(read(&root, system, name).is_err(), "{system}/{name}");
        }
    }

    #[test]
    fn reads_back_a_written_listing() {
        let root = temp_root("listing");
        let listing = serde_json::json!({ "fetchedAt": 1, "names": ["Pokemon - Emerald Version (USA, Europe)"] });

        assert_eq!(read_listing(&root, "gba", "Named_Boxarts"), Ok(None));
        write_listing(&root, "gba", "Named_Boxarts", &listing).unwrap();

        assert_eq!(read_listing(&root, "gba", "Named_Boxarts"), Ok(Some(listing)));
        assert_eq!(read_listing(&root, "gba", "Named_Titles"), Ok(None));
    }

    #[test]
    fn refuses_listings_outside_the_folder() {
        let root = temp_root("listing-outside");

        for (system, kind) in
            [("gba", "../escape"), ("gba", "Named_Snaps"), ("..", "Named_Boxarts"), ("snes", "Named_Boxarts")]
        {
            assert!(write_listing(&root, system, kind, &serde_json::json!({})).is_err(), "{system}/{kind}");
            assert!(read_listing(&root, system, kind).is_err(), "{system}/{kind}");
        }
    }

    #[test]
    fn downloads_only_from_libretro_thumbnails() {
        let http = crate::sync::http();

        for url in [
            "https://thumbnails.libretro.com.example.com/x.png",
            "http://thumbnails.libretro.com/x.png",
            "file:///etc/passwd",
        ] {
            let refused = tauri::async_runtime::block_on(download(&http, url));
            assert!(refused.unwrap_err().contains("not on"), "{url}");
        }
    }

    fn encoded(width: u32, height: u32, format: ImageFormat) -> Vec<u8> {
        let image = RgbImage::from_fn(width, height, |x, y| image::Rgb([x as u8, y as u8, 128]));
        let mut bytes = Vec::new();
        match format {
            ImageFormat::Png => PngEncoder::new(&mut bytes).write_image(&image, width, height, ExtendedColorType::Rgb8),
            _ => JpegEncoder::new(&mut bytes).write_image(&image, width, height, ExtendedColorType::Rgb8),
        }
        .unwrap();
        bytes
    }

    fn decoded(bytes: &[u8]) -> (ImageFormat, u32, u32) {
        let image = image::load_from_memory(bytes).unwrap();
        (image::guess_format(bytes).unwrap(), image.width(), image.height())
    }

    #[test]
    fn shrinks_a_large_jpeg_to_a_1024px_long_edge() {
        let (name, contents) = prepare(&encoded(3000, 2000, ImageFormat::Jpeg)).unwrap();

        assert_eq!(name, "box-art.jpg");
        assert_eq!(decoded(&contents), (ImageFormat::Jpeg, 1024, 683));
    }

    #[test]
    fn keeps_a_small_png_as_png_without_upscaling() {
        let (name, contents) = prepare(&encoded(300, 300, ImageFormat::Png)).unwrap();

        assert_eq!(name, "box-art.png");
        assert_eq!(decoded(&contents), (ImageFormat::Png, 300, 300));
    }

    #[test]
    fn turns_a_photo_the_way_its_camera_held_it() {
        let image = RgbImage::new(200, 100);
        let mut bytes = Vec::new();
        let mut encoder = JpegEncoder::new(&mut bytes);
        let rotated_right = b"MM\0\x2a\0\0\0\x08\0\x01\x01\x12\0\x03\0\0\0\x01\0\x06\0\0\0\0\0\0".to_vec();
        encoder.set_exif_metadata(rotated_right).unwrap();
        encoder.write_image(&image, 200, 100, ExtendedColorType::Rgb8).unwrap();

        let (_, contents) = prepare(&bytes).unwrap();

        assert_eq!(decoded(&contents), (ImageFormat::Jpeg, 100, 200));
    }

    #[test]
    fn refuses_bytes_that_are_not_an_image() {
        assert_eq!(prepare(b"<html>Not found</html>"), None);
        assert_eq!(prepare(&encoded(300, 300, ImageFormat::Png)[..64]), None);
    }

    fn temp_folder(name: &str) -> GamesFolder<'static, tauri::Wry> {
        GamesFolder::at(temp_root(name))
    }

    const EMERALD: &str = "gba/Emerald.gba";

    fn files(folder: &GamesFolder<'static, tauri::Wry>) -> Vec<&'static str> {
        block_on(chosen_files(folder, EMERALD))
    }

    #[test]
    fn choosing_box_art_replaces_the_previous_choice() {
        let folder = temp_folder("choose");
        assert_eq!(block_on(chosen(&folder, EMERALD)), Ok(None));

        block_on(choose(&folder, EMERALD, NONE, &[])).unwrap();
        assert_eq!(files(&folder), ["box-art.none"]);
        assert_eq!(block_on(chosen(&folder, EMERALD)), Ok(Some(Chosen::None)));

        block_on(choose(&folder, EMERALD, PNG, b"png")).unwrap();
        assert_eq!(files(&folder), ["box-art.png"]);
        assert_eq!(
            block_on(chosen(&folder, EMERALD)),
            Ok(Some(Chosen::Image { url: "data:image/png;base64,cG5n".into() }))
        );

        block_on(choose(&folder, EMERALD, JPG, b"jpg")).unwrap();
        assert_eq!(files(&folder), ["box-art.jpg"]);
    }

    #[test]
    fn using_the_default_removes_the_choice() {
        let folder = temp_folder("default");
        block_on(choose(&folder, EMERALD, PNG, b"png")).unwrap();

        block_on(remove_chosen(&folder, EMERALD, None)).unwrap();

        assert_eq!(files(&folder), Vec::<&str>::new());
        assert_eq!(block_on(chosen(&folder, EMERALD)), Ok(None));
        assert!(block_on(remove_chosen(&folder, "gba/Ruby.gba", None)).is_ok());
    }

    #[test]
    fn logs_the_replaced_choice_for_sync() {
        let (index, _) = crate::index::temp_index("box-art-deletions");
        let folder = temp_folder("logged").logging_to(index.clone());
        block_on(choose(&folder, EMERALD, NONE, &[])).unwrap();

        block_on(choose(&folder, EMERALD, PNG, b"png")).unwrap();

        let deletions = index.sync_deletions(EMERALD).unwrap();
        assert_eq!(deletions, [("gba/Emerald/box-art.none".to_string(), crate::game_art::sha1_of(b""))]);
    }
}
