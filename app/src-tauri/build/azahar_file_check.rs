use super::{out_dir, run};
use std::path::PathBuf;

// The core cache keys the macOS Azahar entry on this file, so it holds everything that decides how the check builds.
pub const FILE: &str = "build/azahar_file_check.rs";
pub const SOURCE: &str = "src/retro/azahar_file_check.cpp";

pub fn library() -> PathBuf {
    out_dir().join("libazahar_file_check.dylib")
}

// Azahar writes through the app's VFS only on Android, so the macOS tests load Azahar's file code built that way.
pub fn build() {
    let out = out_dir();
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
        .file(SOURCE)
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
    run(cpp
        .get_compiler()
        .to_command()
        .args(["-dynamiclib", "-o"])
        .arg(library())
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
}
