use core_cache::{Cache, Key};
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;

#[path = "build/azahar_file_check.rs"]
mod azahar_file_check;

const MELONDS_DS_DEPS: [&str; 11] = [
    "melonDS",
    "libretro-common",
    "embed-binaries",
    "glm",
    "libslirp",
    "pntr",
    "fmt",
    "yamc",
    "span-lite",
    "date",
    "zlib",
];

const SYNC_KEYS: [&str; 3] = ["PKH_EMU_GOOGLE_CLIENT_ID", "PKH_EMU_GOOGLE_CLIENT_SECRET", "PKH_EMU_DROPBOX_APP_KEY"];
const STORE_KEYS: [(&str, &[&str]); 2] =
    [("PKH_EMU_STORE", &["", "play", "appstore", "sideload"]), ("PKH_EMU_PLUS", &["", "on"])];

fn sync_config() {
    // Cargo reruns a build script on every build while a file it watches is missing.
    if !Path::new("sync.env").exists() {
        let keys = SYNC_KEYS.into_iter().chain(STORE_KEYS.map(|(key, _)| key));
        let template: String = keys.map(|key| format!("# {key}=\n")).collect();
        std::fs::write("sync.env", template).unwrap();
    }
    let file = std::fs::read_to_string("sync.env").unwrap();
    let from_file = |key: &str| {
        let lines = file.lines().filter(|line| !line.trim_start().starts_with('#'));
        lines.filter_map(|line| line.split_once('=')).find(|(name, _)| name.trim() == key).map(|(_, value)| value.trim().to_string())
    };
    let value = |key: &str| {
        std::env::var(key).ok().filter(|value| !value.is_empty()).or_else(|| from_file(key)).unwrap_or_default()
    };
    for key in SYNC_KEYS {
        println!("cargo:rustc-env={key}={}", value(key));
        println!("cargo:rerun-if-env-changed={key}");
    }
    for (key, allowed) in STORE_KEYS {
        let value = value(key);
        assert!(allowed.contains(&value.as_str()), "{key} is {value:?}, but it can only be one of {allowed:?}");
        println!("cargo:rustc-env={key}={value}");
        println!("cargo:rerun-if-env-changed={key}");
    }
    println!("cargo:rustc-check-cfg=cfg(sideload)");
    if value("PKH_EMU_STORE") == "sideload" {
        println!("cargo:rustc-cfg=sideload");
    }
    println!("cargo:rerun-if-changed=sync.env");
}

#[derive(Default)]
struct IniEntry {
    md5: String,
    crc: Option<String>,
    reference: Option<String>,
    transfer_pak: Option<bool>,
}

// An entry without its own Transferpak line takes its RefMD5 entry's, as the core does.
fn transfer_pak_crcs() {
    let ini = "../../vendor/mupen64plus-next/mupen64plus-core/data/mupen64plus.ini";
    println!("cargo:rerun-if-changed={ini}");
    let text = std::fs::read_to_string(ini).unwrap_or_else(|e| panic!("{ini}: {e}"));
    let mut entries: Vec<IniEntry> = Vec::new();
    for line in text.lines().map(str::trim) {
        if let Some(md5) = line.strip_prefix('[').and_then(|line| line.strip_suffix(']')) {
            entries.push(IniEntry { md5: md5.to_uppercase(), ..IniEntry::default() });
        } else if let (Some(entry), Some((key, value))) = (entries.last_mut(), line.split_once('=')) {
            match key {
                "CRC" => entry.crc = Some(value.to_owned()),
                "RefMD5" => entry.reference = Some(value.to_uppercase()),
                "Transferpak" => entry.transfer_pak = Some(value == "Yes"),
                _ => {}
            }
        }
    }
    let referenced = |md5: &str| entries.iter().find(|entry| entry.md5 == md5).and_then(|entry| entry.transfer_pak);
    let mut crcs: Vec<String> = entries
        .iter()
        .filter(|entry| entry.transfer_pak.or_else(|| referenced(entry.reference.as_deref()?)).unwrap_or(false))
        .filter_map(|entry| entry.crc.as_deref()?.split_once(' '))
        .map(|(crc1, crc2)| format!("(0x{crc1}, 0x{crc2}),"))
        .collect();
    crcs.sort();
    crcs.dedup();
    let out = Path::new(&std::env::var("OUT_DIR").unwrap()).join("transfer_pak_crcs.rs");
    std::fs::write(out, format!("const CRCS: [(u32, u32); {}] = [{}];\n", crcs.len(), crcs.join(""))).unwrap();
}

const RCHEEVOS: &str = "../../vendor/rcheevos";

// Mupen64Plus-Next has its own md5_init, md5_append and md5_finish, so rcheevos' get a prefix, as does its one other
// unprefixed global.
fn rcheevos() {
    println!("cargo:rerun-if-changed={RCHEEVOS}");
    let src = Path::new(RCHEEVOS).join("src");
    let files = ["rc_client.c", "rc_compat.c", "rc_libretro.c", "rc_util.c", "rc_version.c"]
        .map(|file| src.join(file))
        .into_iter()
        .chain(
            ["rc_api_common.c", "rc_api_info.c", "rc_api_runtime.c", "rc_api_user.c"]
                .map(|file| src.join("rapi").join(file)),
        )
        .chain(
            [
                "alloc.c",
                "condition.c",
                "condset.c",
                "consoleinfo.c",
                "format.c",
                "lboard.c",
                "memref.c",
                "operand.c",
                "rc_validate.c",
                "richpresence.c",
                "runtime.c",
                "runtime_progress.c",
                "trigger.c",
                "value.c",
            ]
            .map(|file| src.join("rcheevos").join(file)),
        )
        .chain(["hash.c", "hash_rom.c", "md5.c"].map(|file| src.join("rhash").join(file)));
    cc::Build::new()
        .include(Path::new(RCHEEVOS).join("include"))
        .include("../../vendor/mgba/src/platform/libretro")
        .files(files)
        .define("RC_HASH_NO_DISC", None)
        .define("RC_HASH_NO_ENCRYPTED", None)
        .define("RC_HASH_NO_ZIP", None)
        .define("md5_init", "rc_md5_init")
        .define("md5_append", "rc_md5_append")
        .define("md5_finish", "rc_md5_finish")
        .define("g_host", "rc_api_g_host")
        .warnings(false)
        .compile("rcheevos");
}

fn main() {
    sync_config();
    transfer_pak_crcs();
    rcheevos();
    dolphin_sys();
    match std::env::var("CARGO_CFG_TARGET_OS").unwrap().as_str() {
        "android" => build_android(),
        "macos" => build_macos(),
        "ios" => build_ios(),
        _ => build_mgba(&mut mgba_config()),
    }
    tauri_build::build()
}

fn build_android() {
    println!("cargo:rerun-if-env-changed=NDK_HOME");
    let ndk = PathBuf::from(std::env::var("NDK_HOME").expect("NDK_HOME"));
    let abi = match target_arch().as_str() {
        "aarch64" => "arm64-v8a",
        "arm" => "armeabi-v7a",
        "x86" => "x86",
        "x86_64" => "x86_64",
        arch => panic!("no Android ABI for {arch}"),
    };
    // Gradle packages everything in jniLibs; Android only installs libraries named lib*.so.
    let jni_libs = Path::new("gen/android/app/src/main/jniLibs").join(abi);
    std::fs::create_dir_all(&jni_libs).unwrap();

    // mGBA only detects bionic's strtof_l through the NDK toolchain file; without it,
    // its fallback strtof_l compiles to a strtof that calls itself.
    build_mgba(use_ndk(&mut mgba_config(), &ndk, abi));

    let jit = abi == "arm64-v8a";
    let library = build_melonds_ds(use_ndk(&mut melonds_ds_config(jit), &ndk, abi), "melondsds_libretro_android.so");
    std::fs::copy(library, jni_libs.join("libmelondsds_libretro.so")).unwrap();

    if abi == "arm64-v8a" {
        let (source, out) = mupen64plus_next();
        let prebuilt = std::fs::read_dir(ndk.join("toolchains/llvm/prebuilt")).unwrap().next().unwrap().unwrap().path();
        let mut build = Command::new(ndk.join("ndk-build"));
        build
            .arg("-C")
            .arg(source.join("libretro/jni"))
            .args(["APP_ABI=arm64-v8a", "GLES3=1"])
            .args(MUPEN64PLUS_NEXT_PLUGINS_OFF)
            // Android.mk hardcodes the linux-x86_64 llvm-strings.
            .arg(format!("STRINGS={}", prebuilt.join("bin/llvm-strings").display()))
            .arg(format!("NDK_OUT={}", out.join("obj").display()))
            .arg(format!("NDK_LIBS_OUT={}", out.join("libs").display()));
        let (unstripped, library) =
            (out.join("obj/local/arm64-v8a/libretro.so"), out.join("libs/arm64-v8a/libretro.so"));
        let mut key = core_key(&format!("{build:?}"));
        key.git_tree(&source);
        cached("mupen64plus-next", key, &[&unstripped, &library], || run(build.arg(jobs())));
        assert_no_angrylion(&prebuilt.join("bin/llvm-nm"), &unstripped);
        std::fs::copy(library, jni_libs.join("libmupen64plus_next_libretro.so")).unwrap();

        let mut azahar = azahar_config();
        use_ndk(&mut azahar, &ndk, abi)
            // From API 23 bionic gives the GNU strerror_r, which Azahar doesn't expect on Android. Upstream builds for 21.
            .define("ANDROID_PLATFORM", "21");
        let library = build_azahar(&mut azahar, "azahar_libretro.so", false);
        // Gradle packages it as it is, and its debug info would add over 200 MB to the APK.
        run(Command::new(prebuilt.join("bin/llvm-strip"))
            .arg("--strip-unneeded")
            .arg(&library)
            .arg("-o")
            .arg(jni_libs.join("libazahar_libretro.so")));

        let mut dolphin = dolphin_config();
        use_ndk(&mut dolphin, &ndk, abi);
        let library = build_dolphin(&mut dolphin, "dolphin_libretro_android.so");
        run(Command::new(prebuilt.join("bin/llvm-strip"))
            .arg("--strip-unneeded")
            .arg(&library)
            .arg("-o")
            .arg(jni_libs.join("libdolphin_libretro.so")));
    }
}

fn build_macos() {
    build_mgba(&mut mgba_config());

    let mut melonds_ds = melonds_ds_config(true);
    // melonDS needs std::filesystem; tauri.conf.json's minimumSystemVersion matches.
    melonds_ds.define("CMAKE_OSX_DEPLOYMENT_TARGET", "10.15");
    let library = build_melonds_ds(&mut melonds_ds, "melondsds_libretro.dylib");
    // tauri.conf.json bundles the cores from here into Contents/Frameworks.
    std::fs::create_dir_all("cores").unwrap();
    std::fs::copy(&library, "cores/melondsds_libretro.dylib").unwrap();
    println!("cargo:rustc-env=PKH_EMU_MELONDS_DS={}", library.display());

    if target_arch() == "aarch64" {
        let library = mupen64plus_next_apple("osx", "mupen64plus_next_libretro.dylib", |build| {
            build.env("MACOSX_DEPLOYMENT_TARGET", "11.0");
        });
        assert_no_angrylion(Path::new("nm"), &library);
        std::fs::copy(&library, "cores/mupen64plus_next_libretro.dylib").unwrap();
        println!("cargo:rustc-env=PKH_EMU_MUPEN64PLUS_NEXT={}", library.display());

        let mut azahar = azahar_config();
        azahar.define("CMAKE_OSX_ARCHITECTURES", "arm64").define("CMAKE_OSX_DEPLOYMENT_TARGET", "11.0");
        let library = build_azahar(&mut azahar, "azahar_libretro.dylib", true);
        std::fs::copy(&library, "cores/azahar_libretro.dylib").unwrap();
        println!("cargo:rustc-env=PKH_EMU_AZAHAR={}", library.display());
        let check = azahar_file_check::library();
        println!("cargo:rustc-env=PKH_EMU_AZAHAR_FILE_CHECK={}", check.display());

        let mut dolphin = dolphin_config();
        dolphin.define("CMAKE_OSX_ARCHITECTURES", "arm64").define("CMAKE_OSX_DEPLOYMENT_TARGET", "11.0");
        let library = build_dolphin(&mut dolphin, "dolphin_libretro.dylib");
        std::fs::copy(&library, "cores/dolphin_libretro.dylib").unwrap();
        println!("cargo:rustc-env=PKH_EMU_DOLPHIN={}", library.display());

        let library = moltenvk(MOLTENVK_MACOS, "MoltenVK/MoltenVK/dynamic/dylib/macOS/libMoltenVK.dylib");
        std::fs::copy(&library, "cores/libMoltenVK.dylib").unwrap();
        println!("cargo:rustc-env=PKH_EMU_MOLTENVK={}", library.display());
    }
}

const MOLTENVK_VERSION: &str = "v1.4.2";
const MOLTENVK_MACOS: (&str, &str) =
    ("MoltenVK-macos.tar", "f95765a6229cb7b915990a2890ce12ebe36a730b021545d3d52ae69ce4c4024e");
// Only the release with every platform has the iOS simulator's framework.
const MOLTENVK_ALL: (&str, &str) =
    ("MoltenVK-all.tar", "562a15a29bc358446a56a4091c5f7e08f604184187c1d34f712148b61ef17276");

// Khronos's release build, cut to arm64 like Azahar.
fn moltenvk((asset, sha256): (&str, &str), inside: &str) -> PathBuf {
    let dir = Path::new(&std::env::var("OUT_DIR").unwrap()).join("moltenvk").join(MOLTENVK_VERSION);
    let library = dir.join(Path::new(inside).file_name().unwrap());
    if !library.is_file() {
        let key = core_key(&format!("{MOLTENVK_VERSION} {asset} {sha256} {inside}"));
        cached("moltenvk", key, &[&library], || download_moltenvk(&dir, asset, sha256, inside));
    }
    library
}

fn download_moltenvk(dir: &Path, asset: &str, sha256: &str, inside: &str) {
    let library = dir.join(Path::new(inside).file_name().unwrap());
    let unpacked = dir.join("unpacked");
    std::fs::create_dir_all(&unpacked).unwrap();
    let tar = dir.join(asset);
    let url = format!("https://github.com/KhronosGroup/MoltenVK/releases/download/{MOLTENVK_VERSION}/{asset}");
    run(Command::new("curl").args(["-fsSL", "--retry", "3", "-o"]).arg(&tar).arg(url));
    let output = Command::new("shasum").args(["-a", "256"]).arg(&tar).output().unwrap();
    let sum = String::from_utf8_lossy(&output.stdout);
    assert!(sum.starts_with(sha256), "{asset} {MOLTENVK_VERSION} has SHA-256 {sum}");
    run(Command::new("tar").arg("-xf").arg(&tar).arg("-C").arg(&unpacked).arg(inside));
    let output = Command::new("lipo").arg("-archs").arg(unpacked.join(inside)).output().unwrap();
    if String::from_utf8_lossy(&output.stdout).split_whitespace().count() > 1 {
        run(Command::new("lipo").arg(unpacked.join(inside)).args(["-thin", "arm64", "-output"]).arg(&library));
    } else {
        std::fs::copy(unpacked.join(inside), &library).unwrap();
    }
    // Khronos ships it unsigned, and arm64 loads only signed code. vtool and install_name_tool keep a linker signature
    // valid, as they do the cores', and bundling signs it again for the app.
    run(Command::new("codesign").args(["--force", "--sign", "-", "-o", "linker-signed"]).arg(&library));
    std::fs::remove_file(&tar).unwrap();
    std::fs::remove_dir_all(&unpacked).unwrap();
}

const IOS_DEPLOYMENT_TARGET: &str = "18.0";

fn build_ios() {
    build_mgba(&mut mgba_config());

    let simulator = std::env::var("TARGET").unwrap().ends_with("-sim") || target_arch() == "x86_64";
    let (platform, sdk, vtool_platform) = match (simulator, target_arch().as_str()) {
        (false, "aarch64") => ("OS64", "iphoneos", "ios"),
        (true, "aarch64") => ("SIMULATORARM64", "iphonesimulator", "iossim"),
        (true, "x86_64") => ("SIMULATOR64", "iphonesimulator", "iossim"),
        (_, arch) => panic!("no iOS platform for {arch}"),
    };
    let mut melonds_ds = melonds_ds_config(false);
    melonds_ds
        .define(
            "CMAKE_TOOLCHAIN_FILE",
            std::fs::canonicalize("../../vendor/melonds-ds/cmake/toolchain/ios.toolchain.cmake").unwrap(),
        )
        .define("PLATFORM", platform)
        .define("DEPLOYMENT_TARGET", IOS_DEPLOYMENT_TARGET)
        // melonDS caches 10.15 otherwise, which CMake passes on as the iOS minimum.
        .define("CMAKE_OSX_DEPLOYMENT_TARGET", IOS_DEPLOYMENT_TARGET)
        .define("BUILD_AS_SHARED_LIBRARY", "ON");
    // project.yml's "Embed Cores" phase copies and signs these into the app's Frameworks.
    let embed = |library: &Path| {
        let binary = make_framework(library, Path::new("cores").join(sdk), vtool_platform);
        if !simulator {
            assert_encryption_info(&binary);
        }
    };
    embed(&build_melonds_ds(&mut melonds_ds, "melondsds_libretro.dylib"));

    if target_arch() == "aarch64" {
        let output = Command::new("xcrun").args(["--sdk", sdk, "--show-sdk-path"]).output().unwrap();
        assert!(output.status.success(), "xcrun found no {sdk} SDK");
        let sysroot = String::from_utf8_lossy(&output.stdout);
        let suffix = if simulator { "-simulator" } else { "" };
        // ios-arm64 hardcodes the device SDK into CC and CXX, and the triple wins over its iOS 8 minimum.
        let target = format!("-target arm64-apple-ios{IOS_DEPLOYMENT_TARGET}{suffix} -isysroot {}", sysroot.trim());
        let library = mupen64plus_next_apple("ios-arm64", "mupen64plus_next_libretro_ios.dylib", |build| {
            build.arg(format!("CC=clang {target}")).arg(format!("CXX=clang++ {target}"));
        });
        assert_no_angrylion(Path::new("nm"), &library);
        embed(&library);

        let mut azahar = azahar_config();
        azahar
            .define("CMAKE_SYSTEM_NAME", "iOS")
            .define("CMAKE_OSX_SYSROOT", sdk)
            .define("CMAKE_OSX_ARCHITECTURES", "arm64")
            .define("CMAKE_OSX_DEPLOYMENT_TARGET", IOS_DEPLOYMENT_TARGET)
            .define("CMAKE_POSITION_INDEPENDENT_CODE", "ON")
            // As Azahar's own iOS build sets them.
            .define("IOS", "ON")
            .cflag("-DIOS")
            .cxxflag("-DIOS")
            .define("CITRA_USE_PRECOMPILED_HEADERS", "OFF")
            .define("ENABLE_OPT", "OFF");
        let library = build_azahar(&mut azahar, "azahar_libretro.dylib", false);
        embed(&library);
        println!("cargo:rustc-env=PKH_EMU_AZAHAR={}", library.display());

        let mut dolphin = dolphin_config();
        dolphin
            .define("CMAKE_SYSTEM_NAME", "iOS")
            .define("CMAKE_OSX_SYSROOT", sdk)
            .define("CMAKE_OSX_ARCHITECTURES", "arm64")
            .define("CMAKE_OSX_DEPLOYMENT_TARGET", IOS_DEPLOYMENT_TARGET)
            // Dolphin picks its CPU code by this, which CMake leaves empty when cross compiling.
            .define("CMAKE_SYSTEM_PROCESSOR", "arm64")
            .define("IOS", "ON");
        let library = build_dolphin(&mut dolphin, "dolphin_libretro.dylib");
        embed(&library);
        println!("cargo:rustc-env=PKH_EMU_DOLPHIN={}", library.display());

        let slice = if simulator { "ios-arm64_x86_64-simulator" } else { "ios-arm64" };
        let inside = format!("MoltenVK/MoltenVK/dynamic/MoltenVK.xcframework/{slice}/MoltenVK.framework/MoltenVK");
        let library = moltenvk(MOLTENVK_ALL, &inside);
        embed(&library);
        println!("cargo:rustc-env=PKH_EMU_MOLTENVK={}", library.display());
    }
    screen_shaders();
}

fn screen_shaders() {
    use naga::valid::{Capabilities, ValidationFlags, Validator};
    let out = Path::new(&std::env::var("OUT_DIR").unwrap()).to_path_buf();
    let shaders = [
        ("screen.vert.spv", naga::ShaderStage::Vertex, &["vulkan.vert"][..]),
        ("screen.frag.spv", naga::ShaderStage::Fragment, &["vulkan.frag", "frame.glsl"][..]),
    ];
    for (name, stage, files) in shaders {
        let source: String = files
            .iter()
            .map(|file| {
                let path = format!("src/screen/{file}");
                println!("cargo:rerun-if-changed={path}");
                std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path}: {e}"))
            })
            .collect();
        let module = naga::front::glsl::Frontend::default()
            .parse(&naga::front::glsl::Options::from(stage), &source)
            .unwrap_or_else(|e| panic!("{name}: {}", e.emit_to_string(&source)));
        let info = Validator::new(ValidationFlags::all(), Capabilities::IMMEDIATES)
            .validate(&module)
            .unwrap_or_else(|e| panic!("{name}: {}", e.emit_to_string(&source)));
        let mut options = naga::back::spv::Options::default();
        // The vertex shader already places the screen's top at Vulkan's top.
        options.flags.remove(naga::back::spv::WriterFlags::ADJUST_COORDINATE_SPACE);
        let words = naga::back::spv::write_vec(&module, &info, &options, None).unwrap();
        let bytes: Vec<u8> = words.iter().flat_map(|word| word.to_le_bytes()).collect();
        std::fs::write(out.join(name), bytes).unwrap();
    }
}

// iOS only loads a library from inside a framework, and App Store Connect checks its Info.plist
// against the binary's build version.
fn make_framework(library: &Path, dir: PathBuf, vtool_platform: &str) -> PathBuf {
    let name = library.file_stem().unwrap().to_str().unwrap();
    let framework = dir.join(format!("{name}.framework"));
    if framework.exists() {
        std::fs::remove_dir_all(&framework).unwrap();
    }
    std::fs::create_dir_all(&framework).unwrap();
    let binary = framework.join(name);
    let output = Command::new("vtool").arg("-show-build").arg(library).output().unwrap();
    let shown = String::from_utf8_lossy(&output.stdout);
    let sdk = shown.lines().find_map(|line| line.trim().strip_prefix("sdk ")).expect("vtool shows no sdk").trim();
    run(Command::new("vtool")
        .args(["-set-build-version", vtool_platform, IOS_DEPLOYMENT_TARGET, sdk, "-replace", "-output"])
        .arg(&binary)
        .arg(library));
    run(Command::new("install_name_tool").arg("-id").arg(format!("@rpath/{name}.framework/{name}")).arg(&binary));
    let identifier = format!("fyi.openpkx.pkhemu.{}", name.replace('_', "-"));
    let plist = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>{name}</string>
  <key>CFBundleName</key>
  <string>{name}</string>
  <key>CFBundleIdentifier</key>
  <string>{identifier}</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>1.0.0</string>
  <key>CFBundlePackageType</key>
  <string>FMWK</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>MinimumOSVersion</key>
  <string>{IOS_DEPLOYMENT_TARGET}</string>
</dict>
</plist>
"#
    );
    std::fs::write(framework.join("Info.plist"), plist).unwrap();
    binary
}

// App Store Connect rejects the whole upload (ITMS-90125) if one binary lacks this unencrypted
// load command, which only Apple's ld writes.
fn assert_encryption_info(binary: &Path) {
    let output = Command::new("otool").arg("-l").arg(binary).output().unwrap();
    let commands = String::from_utf8_lossy(&output.stdout);
    let cryptid = commands
        .split("cmd LC_ENCRYPTION_INFO_64")
        .nth(1)
        .and_then(|rest| rest.lines().find_map(|line| line.trim().strip_prefix("cryptid ")));
    assert_eq!(cryptid.map(str::trim), Some("0"), "{} has no unencrypted LC_ENCRYPTION_INFO_64", binary.display());
}

fn target_arch() -> String {
    std::env::var("CARGO_CFG_TARGET_ARCH").unwrap()
}

fn use_ndk<'a>(config: &'a mut CmakeCore, ndk: &Path, abi: &str) -> &'a mut CmakeCore {
    config
        .define("CMAKE_TOOLCHAIN_FILE", ndk.join("build/cmake/android.toolchain.cmake"))
        .define("ANDROID_ABI", abi)
        .define("ANDROID_PLATFORM", "26")
}

fn mgba_config() -> CmakeCore {
    let mut core = CmakeCore::new("../../core".into());
    core.define("CMAKE_POLICY_VERSION_MINIMUM", "3.5").build_target("mgba_retro").profile("Release");
    core
}

fn build_mgba(core: &mut CmakeCore) {
    let library = out_dir().join("build/libmgba_retro.a");
    let mut key = core.key();
    key.git_tree(&vendor("mgba")).file(Path::new("../../core/CMakeLists.txt"));
    cached("mgba", key, &[&library], || core.build());
    println!("cargo:rustc-link-search=native={}", library.parent().unwrap().display());
    println!("cargo:rustc-link-lib=static=mgba_retro");
    println!("cargo:rerun-if-changed=../../core/CMakeLists.txt");
    println!("cargo:rerun-if-changed=../../vendor/mgba");
}

fn melonds_ds_config(jit: bool) -> CmakeCore {
    let deps = vendor("melonds-ds-deps");
    let mut core = CmakeCore::new(vendor("melonds-ds"));
    core.out_dir(out_dir().join("melonds-ds"));
    // melonDS DS's CMake would clone these at configure time; the submodules pin them instead.
    core.define("FETCHCONTENT_FULLY_DISCONNECTED", "ON");
    for dep in MELONDS_DS_DEPS {
        core.define(&format!("FETCHCONTENT_SOURCE_DIR_{}", dep.to_uppercase()), deps.join(dep));
    }
    // It looks for these CMake modules where FetchContent would have cloned them.
    let modules = [deps.join("melonDS/cmake"), deps.join("embed-binaries/cmake")];
    core.define("CMAKE_MODULE_PATH", modules.map(|dir| dir.display().to_string()).join(";"));
    core.define("ENABLE_OPENGL", "OFF")
        .define("ENABLE_JIT", if jit { "ON" } else { "OFF" })
        .define("BUILD_TESTING", "OFF")
        .build_target("melondsds_libretro")
        .profile("Release");
    core
}

fn build_melonds_ds(core: &mut CmakeCore, name: &str) -> PathBuf {
    println!("cargo:rerun-if-changed=../../vendor/melonds-ds");
    println!("cargo:rerun-if-changed=../../vendor/melonds-ds-deps");
    let library = out_dir().join("melonds-ds/build/src/libretro").join(name);
    let mut key = core.key();
    key.git_tree(&vendor("melonds-ds"));
    for dep in MELONDS_DS_DEPS {
        key.git_tree(&vendor("melonds-ds-deps").join(dep));
    }
    cached("melonds-ds", key, &[&library], || core.build());
    library
}

// angrylion is under the non-commercial MAME licence; paraLLEl needs Vulkan.
const MUPEN64PLUS_NEXT_PLUGINS_OFF: [&str; 3] = ["HAVE_THR_AL=0", "HAVE_PARALLEL_RSP=0", "HAVE_PARALLEL_RDP=0"];

fn mupen64plus_next() -> (PathBuf, PathBuf) {
    println!("cargo:rerun-if-changed=../../vendor/mupen64plus-next");
    let source = std::fs::canonicalize("../../vendor/mupen64plus-next").unwrap();
    (source, Path::new(&std::env::var("OUT_DIR").unwrap()).join("mupen64plus-next"))
}

// The Apple SDKs define TARGET_OS_MAC, so the bundled zlib hides fdopen and the bundled libpng
// includes <fp.h>, which they don't have.
const MUPEN64PLUS_NEXT_APPLE_CPPFLAGS: &str = "CPPFLAGS=-include math.h -Dfdopen=fdopen";

fn mupen64plus_next_apple(platform: &str, built: &str, configure: impl FnOnce(&mut Command)) -> PathBuf {
    let (source, out) = mupen64plus_next();
    // The Makefile writes objects next to the sources, and Cargo would rerun this script
    // for every file it writes into a folder it watches.
    let copy = out.join("source");
    let platform = format!("platform={platform}");
    let mut build = Command::new("make");
    build.current_dir(&copy).arg(&platform).args(MUPEN64PLUS_NEXT_PLUGINS_OFF).arg(MUPEN64PLUS_NEXT_APPLE_CPPFLAGS);
    configure(&mut build);
    let library = copy.join("mupen64plus_next_libretro.dylib");
    let mut key = core_key(&format!("{build:?}"));
    key.git_tree(&source);
    cached("mupen64plus-next", key, &[&library], || {
        std::fs::create_dir_all(&copy).unwrap();
        run(Command::new("rsync").args(["-a", "--exclude=.git"]).arg(format!("{}/", source.display())).arg(&copy));
        // The Makefile doesn't track included files, so a changed one would leave a stale object behind.
        run(Command::new("make").current_dir(&copy).args([&platform, "clean"]));
        run(build.arg(jobs()));
        // retro/ios.rs looks for the framework under the core's name, without the suffix the iOS Makefile gives it.
        std::fs::rename(copy.join(built), &library).unwrap();
    });
    library
}

const AZAHAR_KEYS: &str = "../../vendor/azahar/src/core/hw/default_keys.h";

fn azahar_git(args: &[&str]) -> Vec<u8> {
    let source = vendor("azahar");
    let output = Command::new("git").arg("-C").arg(&source).args(args).output().unwrap();
    assert!(output.status.success(), "git {args:?} failed in {}", source.display());
    output.stdout
}

// Azahar's CMake copies a git hook into .git, which is a file in a submodule, and takes its version from .git.
// A copy without .git builds like Azahar's source archive, which gives the version in GIT-COMMIT and GIT-TAG.
fn azahar_source() {
    let copy = out_dir().join("azahar-source");
    std::fs::create_dir_all(&copy).unwrap();
    run(Command::new("rsync")
        .args(["-a", "--delete", "--exclude=.git"])
        .arg(format!("{}/", vendor("azahar").display()))
        .arg(&copy));
    for (file, args) in [("GIT-COMMIT", &["rev-parse", "HEAD"][..]), ("GIT-TAG", &["describe", "--tags"])] {
        let version = azahar_git(args);
        let path = copy.join(file);
        if std::fs::read(&path).ok().as_ref() != Some(&version) {
            std::fs::write(path, version).unwrap();
        }
    }
}

fn azahar_config() -> CmakeCore {
    let tag = String::from_utf8(azahar_git(&["describe", "--tags"])).unwrap();
    let mut core = CmakeCore::new(out_dir().join("azahar-source"));
    core.out_dir(out_dir().join("azahar"));
    // Under GitHub Actions Azahar names itself after the short commit or the app's tag instead of GIT-TAG. Its
    // version is what states record, so it has to be the same in every build of one revision.
    core.define("GIT_TAG", tag.trim())
        .define("ENABLE_LIBRETRO", "ON")
        // The blob holds console keys; the app plays decrypted games only.
        .define("ENABLE_BUILTIN_KEYBLOB", "OFF")
        .define("ENABLE_TESTS", "OFF")
        .define("CITRA_WARNINGS_AS_ERRORS", "OFF")
        .build_target("citra_libretro")
        .profile("Release");
    core
}

fn build_azahar(core: &mut CmakeCore, name: &str, file_check: bool) -> PathBuf {
    println!("cargo:rerun-if-changed=../../vendor/azahar");
    let library = out_dir().join("azahar/build/bin/Release").join(name);
    let check = azahar_file_check::library();
    let mut key = core.key();
    key.git_tree(&vendor("azahar"));
    let mut outputs = vec![library.as_path()];
    if file_check {
        println!("cargo:rerun-if-changed={}", azahar_file_check::SOURCE);
        key.file(Path::new(azahar_file_check::FILE)).file(Path::new(azahar_file_check::SOURCE));
        outputs.push(&check);
    }
    cached("azahar", key, &outputs, || {
        azahar_source();
        core.build();
        if file_check {
            azahar_file_check::build();
        }
    });
    assert_no_keyblob(&library);
    library
}

// The blob is stored as it appears in default_keys.h, so its first bytes in the library mean it was compiled in.
fn assert_no_keyblob(library: &Path) {
    let header = std::fs::read_to_string(AZAHAR_KEYS).unwrap_or_else(|e| panic!("{AZAHAR_KEYS}: {e}"));
    let array = header.split_once("default_keys_enc[] = {").expect("default_keys.h has no default_keys_enc").1;
    let blob: Vec<u8> = array
        .split(',')
        .take(32)
        .map(|byte| u8::from_str_radix(byte.trim().trim_start_matches("0x"), 16).expect("default_keys.h byte"))
        .collect();
    let bytes = std::fs::read(library).unwrap();
    assert!(
        !bytes.windows(blob.len()).any(|window| window == blob),
        "{} has Azahar's built-in AES key blob; build it with ENABLE_BUILTIN_KEYBLOB=OFF",
        library.display()
    );
}

fn dolphin_config() -> CmakeCore {
    let mut core = CmakeCore::new(vendor("dolphin"));
    core.out_dir(out_dir().join("dolphin"));
    // LIBRETRO already turns off Qt, SDL, the sound backends, analytics, updates and achievements.
    core.define("LIBRETRO", "ON")
        .define("ENABLE_VULKAN", "ON")
        .define("USE_SYSTEM_LIBS", "OFF")
        .define("ENABLE_LTO", "OFF")
        .build_target("dolphin_libretro")
        .profile("Release");
    // Dolphin compiles in its own mGBA, whose symbols would otherwise sit beside the app's.
    let exports = if std::env::var("CARGO_CFG_TARGET_VENDOR").unwrap() == "apple" {
        "-Wl,-exported_symbol,_retro_*".to_string()
    } else {
        let script = out_dir().join("dolphin_exports.map");
        std::fs::write(&script, DOLPHIN_EXPORTS).unwrap();
        format!("-Wl,--version-script={}", script.display())
    };
    core.define("CMAKE_SHARED_LINKER_FLAGS", exports);
    core.recipe += &format!("exports {DOLPHIN_EXPORTS:?}\n");
    core
}

const DOLPHIN_EXPORTS: &str = "{ global: retro_*; local: *; };";

fn build_dolphin(core: &mut CmakeCore, name: &str) -> PathBuf {
    println!("cargo:rerun-if-changed=../../vendor/dolphin");
    let library = out_dir().join("dolphin/build").join(name);
    let mut key = core.key();
    key.git_tree(&vendor("dolphin"));
    cached("dolphin", key, &[&library], || core.build());
    library
}

// Qt's themes, Wii data, title lists and a debugger's symbols. The game settings are what the app needs.
const DOLPHIN_SYS_LEFT_OUT: [&str; 4] = ["Themes", "Wii", "totaldb.dsy", "wiitdb-"];

// Dolphin reads its Sys folder from disk, so the app carries it zipped and unpacks it into its own storage.
fn dolphin_sys() {
    use std::io::Write;
    let sys = vendor("dolphin").join("Data/Sys");
    println!("cargo:rerun-if-changed={}", sys.display());
    let mut files = Vec::new();
    let mut dirs = vec![sys.clone()];
    while let Some(dir) = dirs.pop() {
        for entry in std::fs::read_dir(&dir).unwrap_or_else(|e| panic!("{}: {e}; run scripts/env.sh", dir.display())) {
            let path = entry.unwrap().path();
            let name = path.strip_prefix(&sys).unwrap().to_str().unwrap().to_string();
            if DOLPHIN_SYS_LEFT_OUT.iter().any(|left_out| name.starts_with(left_out)) {
                continue;
            }
            if path.is_dir() {
                dirs.push(path);
            } else {
                files.push(name);
            }
        }
    }
    files.sort();
    let mut zip = zip::ZipWriter::new(std::fs::File::create(out_dir().join("dolphin-sys.zip")).unwrap());
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .last_modified_time(zip::DateTime::default());
    for name in files {
        zip.start_file(name.as_str(), options).unwrap();
        zip.write_all(&std::fs::read(sys.join(&name)).unwrap()).unwrap();
    }
    zip.finish().unwrap();
}

fn out_dir() -> PathBuf {
    PathBuf::from(std::env::var("OUT_DIR").unwrap())
}

fn vendor(name: &str) -> PathBuf {
    std::fs::canonicalize("../../vendor").unwrap().join(name)
}

// Every setting goes through here, so the core cache's key sees all of them.
struct CmakeCore {
    config: cmake::Config,
    recipe: String,
}

impl CmakeCore {
    fn new(source: PathBuf) -> Self {
        CmakeCore { recipe: format!("source {source:?}\n"), config: cmake::Config::new(source) }
    }

    fn define(&mut self, key: &str, value: impl AsRef<OsStr>) -> &mut Self {
        self.recipe += &format!("define {key}={:?}\n", value.as_ref());
        self.config.define(key, value);
        self
    }

    fn cflag(&mut self, flag: &str) -> &mut Self {
        self.recipe += &format!("cflag {flag}\n");
        self.config.cflag(flag);
        self
    }

    fn cxxflag(&mut self, flag: &str) -> &mut Self {
        self.recipe += &format!("cxxflag {flag}\n");
        self.config.cxxflag(flag);
        self
    }

    fn build_target(&mut self, target: &str) -> &mut Self {
        self.recipe += &format!("target {target}\n");
        self.config.build_target(target);
        self
    }

    fn profile(&mut self, profile: &str) -> &mut Self {
        self.recipe += &format!("profile {profile}\n");
        self.config.profile(profile);
        self
    }

    fn out_dir(&mut self, dir: PathBuf) -> &mut Self {
        self.recipe += &format!("out {dir:?}\n");
        self.config.out_dir(dir);
        self
    }

    fn key(&self) -> Key {
        core_key(&self.recipe)
    }

    fn build(&mut self) {
        self.config.build();
    }
}

// Raise it to drop every cached core after a change to how one builds that its key doesn't cover.
const CORE_CACHE_VERSION: &str = "1";

const COMPILER_ENV: [&str; 14] = [
    "CC",
    "CXX",
    "CFLAGS",
    "CXXFLAGS",
    "CPPFLAGS",
    "LDFLAGS",
    "AR",
    "ARFLAGS",
    "RANLIB",
    "CRATE_CC_NO_DEFAULTS",
    "CMAKE",
    "CMAKE_GENERATOR",
    "CMAKE_TOOLCHAIN_FILE",
    "CMAKE_PREFIX_PATH",
];

// Paths inside the checkout are written relative to it, so every worktree shares one entry.
fn core_key(recipe: &str) -> Key {
    let root = std::fs::canonicalize("../..").unwrap();
    let inputs = format!("{recipe}\n{}", String::from_utf8_lossy(toolchain()))
        .replace(&out_dir().display().to_string(), "$OUT_DIR")
        .replace(&root.display().to_string(), "$ROOT");
    let mut key = Key::new();
    key.add("version", CORE_CACHE_VERSION).add("inputs", inputs);
    key
}

fn toolchain() -> &'static [u8] {
    static TOOLCHAIN: OnceLock<Vec<u8>> = OnceLock::new();
    TOOLCHAIN.get_or_init(|| {
        let target = std::env::var("TARGET").unwrap();
        let mut toolchain = format!("{target}\n").into_bytes();
        let versions: &[&[&str]] = match std::env::var("CARGO_CFG_TARGET_OS").unwrap().as_str() {
            "android" => &[&["cmake", "--version"]],
            "macos" | "ios" => &[&["cmake", "--version"], &["cc", "--version"], &["xcodebuild", "-version"]],
            _ => &[&["cmake", "--version"], &["cc", "--version"], &["c++", "--version"]],
        };
        for command in versions {
            let output = Command::new(command[0]).args(&command[1..]).output();
            toolchain.extend(output.map(|output| [output.stdout, output.stderr].concat()).unwrap_or_default());
        }
        if let Ok(ndk) = std::env::var("NDK_HOME") {
            toolchain.extend(std::fs::read(Path::new(&ndk).join("source.properties")).unwrap_or_default());
        }
        // What the cc and cmake crates read to pick compilers and flags.
        let underscored = target.replace('-', "_");
        for base in COMPILER_ENV {
            for name in [
                base.into(),
                format!("{base}_{target}"),
                format!("{base}_{underscored}"),
                format!("TARGET_{base}"),
                format!("HOST_{base}"),
            ] {
                toolchain.extend(format!("{name}={:?}\n", std::env::var_os(&name)).into_bytes());
            }
        }
        for name in [
            // cc passes some of rustc's flags on.
            "CARGO_ENCODED_RUSTFLAGS",
            "SDKROOT",
            "DEVELOPER_DIR",
            "NDK_HOME",
            "MACOSX_DEPLOYMENT_TARGET",
            "IPHONEOS_DEPLOYMENT_TARGET",
            "IPHONESIMULATOR_DEPLOYMENT_TARGET",
        ] {
            toolchain.extend(format!("{name}={:?}\n", std::env::var_os(name)).into_bytes());
        }
        let lock = std::fs::read_to_string("../../Cargo.lock").unwrap();
        for crate_name in ["cc", "cmake"] {
            let package = format!("name = \"{crate_name}\"\n");
            for (_, rest) in lock.match_indices(&package).map(|(at, _)| lock.split_at(at + package.len())) {
                toolchain.extend(rest.lines().next().unwrap_or_default().as_bytes());
            }
        }
        toolchain
    })
}

fn cached(core: &str, key: Key, outputs: &[&Path], build: impl FnOnce()) {
    println!("cargo:rerun-if-env-changed=PKH_EMU_CORE_CACHE");
    let dir = match std::env::var_os("PKH_EMU_CORE_CACHE") {
        Some(dir) if dir == "off" => None,
        Some(dir) => Some(PathBuf::from(dir)),
        None => std::env::var_os("HOME").map(|home| Path::new(&home).join(".cache/pkh-emu/cores")),
    };
    let cache = match dir {
        Some(dir) => Cache::new(&dir.join(std::env::var("TARGET").unwrap())),
        None => Cache::off(),
    };
    let start = std::time::Instant::now();
    let outcome = cache.fetch_or_build(core, key, outputs, build);
    eprintln!("{core}: {outcome:?} in {:.1?}", start.elapsed());
}

fn jobs() -> String {
    format!("-j{}", std::env::var("NUM_JOBS").unwrap_or_else(|_| "1".into()))
}

fn run(command: &mut Command) {
    let status = command.status().unwrap_or_else(|e| panic!("{command:?}: {e}"));
    assert!(status.success(), "{command:?} failed with {status}");
}

fn assert_no_angrylion(nm: &Path, library: &Path) {
    let output = Command::new(nm).arg(library).output().unwrap_or_else(|e| panic!("{}: {e}", nm.display()));
    let symbols = String::from_utf8_lossy(&output.stdout).to_lowercase();
    assert!(symbols.contains("retro_run"), "{} listed no symbols in {}", nm.display(), library.display());
    let found: Vec<&str> =
        symbols.lines().filter(|line| line.contains("angrylion") || line.contains("n64video")).collect();
    assert!(found.is_empty(), "{} has angrylion symbols: {found:?}", library.display());
}
