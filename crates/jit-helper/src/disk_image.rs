use crate::Failure;
use idevice::cryptexd::{self, Cryptex1Assets};
use idevice::mobile_image_mounter::ImageMounter;
use idevice::rsd::RsdHandshake;
use idevice::tcp::handle::AdapterHandle;
use idevice::{IdeviceError, RsdService};
use std::path::{Path, PathBuf};

const IMAGES: &str = "https://raw.githubusercontent.com/doronz88/DeveloperDiskImage/main/PersonalizedImages";
const PERSONALIZED: &str = "Xcode_iOS_DDI_Personalized";
const CRYPTEX: &str = "Xcode_iOS_DDI_Cryptex";

#[derive(Debug, PartialEq)]
enum Kind {
    Personalized,
    // iOS 26.4 installs the disk image as a cryptex.
    Cryptex,
}

pub async fn mount(adapter: &mut AdapterHandle, rsd: &mut RsdHandshake, cache_dir: &Path) -> Result<(), Failure> {
    if let Ok(mut mounter) = ImageMounter::connect_rsd(adapter, rsd).await {
        if let Ok(false) = mounter.query_developer_mode_status().await {
            return Err(Failure::DeveloperModeOff);
        }
    }
    match kind(rsd) {
        Kind::Personalized => mount_personalized(adapter, rsd, cache_dir).await,
        Kind::Cryptex => install_cryptex(adapter, rsd, cache_dir).await,
    }
}

async fn mount_personalized(
    adapter: &mut AdapterHandle,
    rsd: &mut RsdHandshake,
    cache_dir: &Path,
) -> Result<(), Failure> {
    let chip = rsd
        .properties
        .get("UniqueChipID")
        .and_then(|value| value.as_unsigned_integer())
        .ok_or_else(|| Failure::DiskImage("the iPhone didn't say which chip it has".into()))?;
    let [image, trust_cache, manifest] =
        fetch(cache_dir, PERSONALIZED, ["Image.dmg", "Image.dmg.trustcache", "BuildManifest.plist"]).await?;
    let mut mounter = ImageMounter::connect_rsd(adapter, rsd).await.map_err(failed)?;
    mounter.mount_personalized_rsd(adapter, rsd, image, trust_cache, &manifest, None, chip).await.map_err(failed)
}

async fn install_cryptex(adapter: &mut AdapterHandle, rsd: &mut RsdHandshake, cache_dir: &Path) -> Result<(), Failure> {
    if cryptexd::installed_ddi(adapter, rsd).await.map_err(failed)?.is_some() {
        return Ok(());
    }
    let [image, trust_cache, info, root_hash, manifest] = fetch(
        cache_dir,
        CRYPTEX,
        ["Image.dmg", "Image.dmg.trustcache", "Image.dmg.cryptex_info", "Image.dmg.root_hash", "BuildManifest.plist"],
    )
    .await?;
    let manifest: plist::Dictionary = plist::from_bytes(&manifest).map_err(|e| Failure::DiskImage(e.to_string()))?;
    let identity = idevice::tss::select_cryptex_build_identity(&manifest).map_err(failed)?.clone();
    let assets = Cryptex1Assets::from_parts(image, trust_cache, info, root_hash, identity);
    cryptexd::install_ddi(adapter, rsd, &assets).await.map_err(failed)?;
    Ok(())
}

fn kind(rsd: &RsdHandshake) -> Kind {
    let version = rsd.properties.get("OSVersion").and_then(|value| value.as_string()).unwrap_or_default();
    let mut parts = version.split('.').map(|part| part.parse::<u32>().unwrap_or(0));
    let (major, minor) = (parts.next().unwrap_or(0), parts.next().unwrap_or(0));
    if (major, minor) >= (26, 4) {
        Kind::Cryptex
    } else {
        Kind::Personalized
    }
}

fn failed(error: IdeviceError) -> Failure {
    match error {
        IdeviceError::DeveloperModeNotEnabled => Failure::DeveloperModeOff,
        error => Failure::DiskImage(error.to_string()),
    }
}

// A mount lasts until the phone restarts, so the files are kept for next time.
async fn fetch<const N: usize>(cache_dir: &Path, folder: &str, names: [&str; N]) -> Result<[Vec<u8>; N], Failure> {
    let dir = cache_dir.join("DeveloperDiskImage").join(folder);
    std::fs::create_dir_all(&dir).map_err(|e| Failure::DiskImage(e.to_string()))?;
    let mut files = Vec::with_capacity(N);
    for name in names {
        files.push(fetch_one(&dir.join(name), &format!("{IMAGES}/{folder}/{name}")).await?);
    }
    Ok(files.try_into().unwrap_or_else(|_| unreachable!()))
}

async fn fetch_one(path: &PathBuf, url: &str) -> Result<Vec<u8>, Failure> {
    if let Ok(bytes) = std::fs::read(path) {
        return Ok(bytes);
    }
    let response = idevice::http::get(url).await.map_err(|e| Failure::DiskImage(format!("download failed: {e}")))?;
    if response.status != 200 {
        return Err(Failure::DiskImage(format!("download failed with HTTP {}", response.status)));
    }
    let partial = path.with_extension("partial");
    std::fs::write(&partial, &response.body)
        .and_then(|()| std::fs::rename(&partial, path))
        .map_err(|e| Failure::DiskImage(e.to_string()))?;
    Ok(response.body)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn on(version: Option<&str>) -> RsdHandshake {
        let properties =
            version.map(|v| ("OSVersion".to_string(), plist::Value::String(v.into()))).into_iter().collect();
        RsdHandshake { services: HashMap::new(), protocol_version: 2, properties, uuid: String::new() }
    }

    #[test]
    fn mounts_a_personalized_image_before_ios_26_4() {
        assert_eq!(kind(&on(Some("18.6"))), Kind::Personalized);
        assert_eq!(kind(&on(Some("26.3.1"))), Kind::Personalized);
        assert_eq!(kind(&on(None)), Kind::Personalized);
    }

    #[test]
    fn installs_a_cryptex_from_ios_26_4() {
        assert_eq!(kind(&on(Some("26.4"))), Kind::Cryptex);
        assert_eq!(kind(&on(Some("27.0"))), Kind::Cryptex);
    }
}
