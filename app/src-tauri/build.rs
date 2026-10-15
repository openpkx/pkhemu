use std::path::{Path, PathBuf};
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
    let built = build_melonds_ds(use_ndk(&mut melonds_ds_config(jit), &ndk, abi));
    std::fs::copy(built.join("melondsds_libretro_android.so"), jni_libs.join("libmelondsds_libretro.so")).unwrap();

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
            .arg(format!("NDK_LIBS_OUT={}", out.join("libs").display()))
            .arg(jobs());
        run(&mut build);
        let unstripped = out.join("obj/local/arm64-v8a/libretro.so");
        assert_no_angrylion(&prebuilt.join("bin/llvm-nm"), &unstripped);
        std::fs::copy(out.join("libs/arm64-v8a/libretro.so"), jni_libs.join("libmupen64plus_next_libretro.so"))
            .unwrap();

        let mut azahar = azahar_config();
        use_ndk(&mut azahar, &ndk, abi)
            // From API 23 bionic gives the GNU strerror_r, which Azahar doesn't expect on Android. Upstream builds for 21.
            .define("ANDROID_PLATFORM", "21");
        let library = build_azahar(&mut azahar, "azahar_libretro.so");
        // Gradle packages it as it is, and its debug info would add over 200 MB to the APK.
        run(Command::new(prebuilt.join("bin/llvm-strip"))
            .arg("--strip-unneeded")
            .arg(&library)
            .arg("-o")
            .arg(jni_libs.join("libazahar_libretro.so")));
    }
}

fn build_macos() {
    build_mgba(&mut mgba_config());

    let mut melonds_ds = melonds_ds_config(true);
    // melonDS needs std::filesystem; tauri.conf.json's minimumSystemVersion matches.
    melonds_ds.define("CMAKE_OSX_DEPLOYMENT_TARGET", "10.15");
    let library = build_melonds_ds(&mut melonds_ds).join("melondsds_libretro.dylib");
    // tauri.conf.json bundles the cores from here into Contents/Frameworks.
    std::fs::create_dir_all("cores").unwrap();
    std::fs::copy(&library, "cores/melondsds_libretro.dylib").unwrap();
    println!("cargo:rustc-env=PKH_EMU_MELONDS_DS={}", library.display());

    if target_arch() == "aarch64" {
        let (copy, mut build) = mupen64plus_next_apple("osx");
        run(build.env("MACOSX_DEPLOYMENT_TARGET", "11.0"));
        let library = copy.join("mupen64plus_next_libretro.dylib");
        assert_no_angrylion(Path::new("nm"), &library);
        std::fs::copy(&library, "cores/mupen64plus_next_libretro.dylib").unwrap();
        println!("cargo:rustc-env=PKH_EMU_MUPEN64PLUS_NEXT={}", library.display());

        let mut azahar = azahar_config();
        azahar.define("CMAKE_OSX_ARCHITECTURES", "arm64").define("CMAKE_OSX_DEPLOYMENT_TARGET", "11.0");
        let library = build_azahar(&mut azahar, "azahar_libretro.dylib");
        std::fs::copy(&library, "cores/azahar_libretro.dylib").unwrap();
        println!("cargo:rustc-env=PKH_EMU_AZAHAR={}", library.display());
        let check = azahar_file_check();
        println!("cargo:rustc-env=PKH_EMU_AZAHAR_FILE_CHECK={}", check.display());

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
    if library.is_file() {
        return library;
    }
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
    library
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
    embed(&build_melonds_ds(&mut melonds_ds).join("melondsds_libretro.dylib"));

    if target_arch() == "aarch64" {
        let output = Command::new("xcrun").args(["--sdk", sdk, "--show-sdk-path"]).output().unwrap();
        assert!(output.status.success(), "xcrun found no {sdk} SDK");
        let sysroot = String::from_utf8_lossy(&output.stdout);
        let suffix = if simulator { "-simulator" } else { "" };
        // ios-arm64 hardcodes the device SDK into CC and CXX, and the triple wins over its iOS 8 minimum.
        let target = format!("-target arm64-apple-ios{IOS_DEPLOYMENT_TARGET}{suffix} -isysroot {}", sysroot.trim());
        let (copy, mut build) = mupen64plus_next_apple("ios-arm64");
        run(build.arg(format!("CC=clang {target}")).arg(format!("CXX=clang++ {target}")));
        // retro/ios.rs looks for the framework under the core's name, without the suffix.
        let library = copy.join("mupen64plus_next_libretro.dylib");
        std::fs::rename(copy.join("mupen64plus_next_libretro_ios.dylib"), &library).unwrap();
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
        let library = build_azahar(&mut azahar, "azahar_libretro.dylib");
        embed(&library);
        println!("cargo:rustc-env=PKH_EMU_AZAHAR={}", library.display());

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

fn use_ndk<'a>(config: &'a mut cmake::Config, ndk: &Path, abi: &str) -> &'a mut cmake::Config {
    config
        .define("CMAKE_TOOLCHAIN_FILE", ndk.join("build/cmake/android.toolchain.cmake"))
        .define("ANDROID_ABI", abi)
        .define("ANDROID_PLATFORM", "26")
}

fn mgba_config() -> cmake::Config {
    let mut core = cmake::Config::new("../../core");
    core.define("CMAKE_POLICY_VERSION_MINIMUM", "3.5").build_target("mgba_retro").profile("Release");
    core
}

fn build_mgba(core: &mut cmake::Config) {
    let dst = core.build();
    println!("cargo:rustc-link-search=native={}/build", dst.display());
    println!("cargo:rustc-link-lib=static=mgba_retro");
    println!("cargo:rerun-if-changed=../../core/CMakeLists.txt");
    println!("cargo:rerun-if-changed=../../vendor/mgba");
}

fn melonds_ds_config(jit: bool) -> cmake::Config {
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
    core
}

fn build_melonds_ds(core: &mut cmake::Config) -> PathBuf {
    println!("cargo:rerun-if-changed=../../vendor/melonds-ds");
    println!("cargo:rerun-if-changed=../../vendor/melonds-ds-deps");
    core.build().join("build/src/libretro")
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

fn mupen64plus_next_apple(platform: &str) -> (PathBuf, Command) {
    let (source, out) = mupen64plus_next();
    // The Makefile writes objects next to the sources, and Cargo would rerun this script
    // for every file it writes into a folder it watches.
    let copy = out.join("source");
    std::fs::create_dir_all(&copy).unwrap();
    run(Command::new("rsync").args(["-a", "--exclude=.git"]).arg(format!("{}/", source.display())).arg(&copy));
    // The Makefile doesn't track included files, so a changed one would leave a stale object behind.
    let platform = format!("platform={platform}");
    run(Command::new("make").current_dir(&copy).args([&platform, "clean"]));
    let mut build = Command::new("make");
    build
        .current_dir(&copy)
        .arg(platform)
        .args(MUPEN64PLUS_NEXT_PLUGINS_OFF)
        .arg(MUPEN64PLUS_NEXT_APPLE_CPPFLAGS)
        .arg(jobs());
    (copy, build)
}

const AZAHAR_KEYS: &str = "../../vendor/azahar/src/core/hw/default_keys.h";

// Azahar's CMake copies a git hook into .git, which is a file in a submodule, and takes its version from .git.
// A copy without .git builds like Azahar's source archive, which gives the version in GIT-COMMIT and GIT-TAG.
fn azahar_source() -> PathBuf {
    println!("cargo:rerun-if-changed=../../vendor/azahar");
    let source = std::fs::canonicalize("../../vendor/azahar").unwrap();
    let copy = Path::new(&std::env::var("OUT_DIR").unwrap()).join("azahar-source");
    std::fs::create_dir_all(&copy).unwrap();
    run(Command::new("rsync")
        .args(["-a", "--delete", "--exclude=.git"])
        .arg(format!("{}/", source.display()))
        .arg(&copy));
    for (file, args) in [("GIT-COMMIT", &["rev-parse", "HEAD"][..]), ("GIT-TAG", &["describe", "--tags"])] {
        let output = Command::new("git").arg("-C").arg(&source).args(args).output().unwrap();
        assert!(output.status.success(), "git {args:?} failed in {}", source.display());
        let path = copy.join(file);
        if std::fs::read(&path).ok().as_ref() != Some(&output.stdout) {
            std::fs::write(path, output.stdout).unwrap();
        }
    }
    copy
}

fn azahar_config() -> cmake::Config {
    let source = azahar_source();
    let tag = std::fs::read_to_string(source.join("GIT-TAG")).unwrap();
    let mut core = cmake::Config::new(source);
    core.out_dir(Path::new(&std::env::var("OUT_DIR").unwrap()).join("azahar"))
        // Under GitHub Actions Azahar names itself after the short commit or the app's tag instead of GIT-TAG. Its
        // version is what states record, so it has to be the same in every build of one revision.
        .define("GIT_TAG", tag.trim())
        .define("ENABLE_LIBRETRO", "ON")
        // The blob holds console keys; the app plays decrypted games only.
        .define("ENABLE_BUILTIN_KEYBLOB", "OFF")
        .define("ENABLE_TESTS", "OFF")
        .define("CITRA_WARNINGS_AS_ERRORS", "OFF")
        .build_target("citra_libretro")
        .profile("Release");
    core
}

// Azahar writes through the app's VFS only on Android, so the macOS tests load Azahar's file code built that way.
fn azahar_file_check() -> PathBuf {
    println!("cargo:rerun-if-changed=src/retro/azahar_file_check.cpp");
    let out = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let (source, build) = (out.join("azahar-source"), out.join("azahar/build"));
    let retro = source.join("externals/libretro-common/libretro-common");
    let mut cpp = cc::Build::new();
    cpp.cpp(true)
        .std("gnu++20")
        .define("HAVE_LIBRETRO_VFS", None)
        .define("BOOST_ERROR_CODE_HEADER_ONLY", None)
        .define("BOOST_NO_CXX98_FUNCTION_BASE", None)
        .includes([source.join("src"), build.join("src"), retro.join("include")])
        .includes(
            ["boost", "cryptopp/include", "fmt/include", "zstd/lib", "zstd/contrib/seekable_format"]
                .map(|dir| source.join("externals").join(dir)),
        )
        .file("src/retro/azahar_file_check.cpp")
        .files(["file_util.cpp", "error.cpp", "string_util.cpp"].map(|file| source.join("src/common").join(file)))
        .warnings(false)
        .cargo_warnings(false)
        .cargo_metadata(false)
        .compile("azahar_file_check_cpp");
    cc::Build::new()
        .include(retro.join("include"))
        .files(
            [
                "compat/compat_posix_string.c",
                "compat/compat_strl.c",
                "compat/fopen_utf8.c",
                "encodings/encoding_utf.c",
                "file/file_path.c",
                "streams/file_stream.c",
                "streams/file_stream_transforms.c",
                "string/stdstring.c",
                "time/rtime.c",
                "vfs/vfs_implementation.c",
            ]
            .map(|file| retro.join(file)),
        )
        .warnings(false)
        .cargo_warnings(false)
        .cargo_metadata(false)
        .compile("azahar_file_check_c");
    let library = out.join("libazahar_file_check.dylib");
    run(cpp
        .get_compiler()
        .to_command()
        .args(["-dynamiclib", "-o"])
        .arg(&library)
        .arg(format!("-Wl,-force_load,{}", out.join("libazahar_file_check_cpp.a").display()))
        .arg(out.join("libazahar_file_check_c.a"))
        .args(
            [
                "externals/fmt/libfmt.a",
                "externals/libboost_iostreams.a",
                "externals/libboost_serialization.a",
                "externals/cryptopp/libcryptopp.a",
                "externals/libzstd_seekable.a",
                "externals/zstd/build/cmake/lib/libzstd.a",
            ]
            .map(|lib| build.join(lib)),
        )
        .args(["-framework", "CoreFoundation"]));
    library
}

fn build_azahar(core: &mut cmake::Config, name: &str) -> PathBuf {
    let library = core.build().join("build/bin/Release").join(name);
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
