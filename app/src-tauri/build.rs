use std::path::Path;
use std::process::Command;

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
const STORE_KEYS: [(&str, &[&str]); 2] = [("PKH_EMU_STORE", &["", "play", "appstore"]), ("PKH_EMU_PLUS", &["", "on"])];

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

fn main() {
    sync_config();
    transfer_pak_crcs();
    let mut core = cmake::Config::new("../../core");
    core.define("CMAKE_POLICY_VERSION_MINIMUM", "3.5")
        .build_target("mgba_retro")
        .profile("Release");
    // mGBA only detects bionic's strtof_l through the NDK toolchain file; without it,
    // its fallback strtof_l compiles to a strtof that calls itself.
    use_ndk(&mut core);
    let dst = core.build();
    println!("cargo:rustc-link-search=native={}/build", dst.display());
    println!("cargo:rustc-link-lib=static=mgba_retro");
    println!("cargo:rerun-if-changed=../../core/CMakeLists.txt");
    println!("cargo:rerun-if-changed=../../vendor/mgba");
    println!("cargo:rerun-if-env-changed=NDK_HOME");

    let os = std::env::var("CARGO_CFG_TARGET_OS").unwrap();
    if matches!(os.as_str(), "macos" | "android") {
        build_melonds_ds();
        if std::env::var("CARGO_CFG_TARGET_ARCH").unwrap() == "aarch64" {
            build_mupen64plus_next();
        }
    }
    tauri_build::build()
}

fn android_abi() -> Option<&'static str> {
    if std::env::var("CARGO_CFG_TARGET_OS").unwrap() != "android" {
        return None;
    }
    Some(match std::env::var("CARGO_CFG_TARGET_ARCH").unwrap().as_str() {
        "aarch64" => "arm64-v8a",
        "arm" => "armeabi-v7a",
        "x86" => "x86",
        "x86_64" => "x86_64",
        arch => panic!("no Android ABI for {arch}"),
    })
}

fn use_ndk(config: &mut cmake::Config) {
    if let Some(abi) = android_abi() {
        let ndk = std::env::var("NDK_HOME").expect("NDK_HOME");
        config
            .define("CMAKE_TOOLCHAIN_FILE", format!("{ndk}/build/cmake/android.toolchain.cmake"))
            .define("ANDROID_ABI", abi)
            .define("ANDROID_PLATFORM", "26");
    }
}

fn build_melonds_ds() {
    let jit = matches!(android_abi(), None | Some("arm64-v8a"));
    let vendor = std::fs::canonicalize("../../vendor").unwrap();
    let deps = vendor.join("melonds-ds-deps");
    let mut core = cmake::Config::new(vendor.join("melonds-ds"));
    core.out_dir(Path::new(&std::env::var("OUT_DIR").unwrap()).join("melonds-ds"));
    // melonDS DS's CMake would clone these at configure time; the submodules pin them instead.
    core.define("FETCHCONTENT_FULLY_DISCONNECTED", "ON");
    for dep in MELONDS_DS_DEPS {
        core.define(format!("FETCHCONTENT_SOURCE_DIR_{}", dep.to_uppercase()), deps.join(dep));
    }
    // It looks for these CMake modules where FetchContent would have cloned them.
    let modules = [deps.join("melonDS/cmake"), deps.join("embed-binaries/cmake")];
    core.define("CMAKE_MODULE_PATH", modules.map(|dir| dir.display().to_string()).join(";"));
    core.define("ENABLE_OPENGL", "OFF")
        .define("ENABLE_JIT", if jit { "ON" } else { "OFF" })
        .define("BUILD_TESTING", "OFF")
        .build_target("melondsds_libretro")
        .profile("Release");
    if android_abi().is_some() {
        use_ndk(&mut core);
    } else {
        // melonDS needs std::filesystem; tauri.conf.json's minimumSystemVersion matches.
        core.define("CMAKE_OSX_DEPLOYMENT_TARGET", "10.15");
    }
    let built = core.build().join("build/src/libretro");
    if let Some(abi) = android_abi() {
        let library = built.join("melondsds_libretro_android.so");
        // Gradle packages everything in jniLibs; Android only installs libraries named lib*.so.
        let jni_libs = Path::new("gen/android/app/src/main/jniLibs").join(abi);
        std::fs::create_dir_all(&jni_libs).unwrap();
        std::fs::copy(&library, jni_libs.join("libmelondsds_libretro.so")).unwrap();
    } else {
        let library = built.join("melondsds_libretro.dylib");
        // tauri.conf.json bundles the core from here into Contents/Frameworks.
        std::fs::create_dir_all("cores").unwrap();
        std::fs::copy(&library, "cores/melondsds_libretro.dylib").unwrap();
        println!("cargo:rustc-env=PKH_EMU_MELONDS_DS={}", library.display());
    }
    println!("cargo:rerun-if-changed=../../vendor/melonds-ds");
    println!("cargo:rerun-if-changed=../../vendor/melonds-ds-deps");
}

fn build_mupen64plus_next() {
    let source = std::fs::canonicalize("../../vendor/mupen64plus-next").unwrap();
    let out = Path::new(&std::env::var("OUT_DIR").unwrap()).join("mupen64plus-next");
    let jobs = format!("-j{}", std::env::var("NUM_JOBS").unwrap_or_else(|_| "1".into()));
    // angrylion is under the non-commercial MAME licence; paraLLEl needs Vulkan.
    let plugins_off = ["HAVE_THR_AL=0", "HAVE_PARALLEL_RSP=0", "HAVE_PARALLEL_RDP=0"];
    if android_abi().is_some() {
        let ndk = Path::new(&std::env::var("NDK_HOME").expect("NDK_HOME")).to_path_buf();
        let prebuilt = std::fs::read_dir(ndk.join("toolchains/llvm/prebuilt")).unwrap().next().unwrap().unwrap().path();
        let mut build = Command::new(ndk.join("ndk-build"));
        build
            .arg("-C")
            .arg(source.join("libretro/jni"))
            .args(["APP_ABI=arm64-v8a", "GLES3=1"])
            .args(plugins_off)
            // Android.mk hardcodes the linux-x86_64 llvm-strings.
            .arg(format!("STRINGS={}", prebuilt.join("bin/llvm-strings").display()))
            .arg(format!("NDK_OUT={}", out.join("obj").display()))
            .arg(format!("NDK_LIBS_OUT={}", out.join("libs").display()))
            .arg(jobs);
        run(&mut build);
        let unstripped = out.join("obj/local/arm64-v8a/libretro.so");
        assert_no_angrylion(&prebuilt.join("bin/llvm-nm"), &unstripped);
        let jni_libs = Path::new("gen/android/app/src/main/jniLibs/arm64-v8a");
        std::fs::create_dir_all(jni_libs).unwrap();
        std::fs::copy(out.join("libs/arm64-v8a/libretro.so"), jni_libs.join("libmupen64plus_next_libretro.so"))
            .unwrap();
    } else {
        // The Makefile writes objects next to the sources, and Cargo would rerun this script
        // for every file it writes into a folder it watches.
        let copy = out.join("source");
        std::fs::create_dir_all(&copy).unwrap();
        run(Command::new("rsync").args(["-a", "--exclude=.git"]).arg(format!("{}/", source.display())).arg(&copy));
        // The Makefile doesn't track included files, so a changed one would leave a stale object behind.
        run(Command::new("make").current_dir(&copy).args(["platform=osx", "clean"]));
        let mut build = Command::new("make");
        build
            .current_dir(&copy)
            .arg("platform=osx")
            .args(plugins_off)
            // The macOS SDK defines TARGET_OS_MAC, so the bundled zlib hides fdopen and the bundled
            // libpng includes <fp.h>, which macOS doesn't have.
            .arg("CPPFLAGS=-include math.h -Dfdopen=fdopen")
            .arg(jobs)
            .env("MACOSX_DEPLOYMENT_TARGET", "11.0");
        run(&mut build);
        let library = copy.join("mupen64plus_next_libretro.dylib");
        assert_no_angrylion(Path::new("nm"), &library);
        std::fs::create_dir_all("cores").unwrap();
        std::fs::copy(&library, "cores/mupen64plus_next_libretro.dylib").unwrap();
        println!("cargo:rustc-env=PKH_EMU_MUPEN64PLUS_NEXT={}", library.display());
    }
    println!("cargo:rerun-if-changed=../../vendor/mupen64plus-next");
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
