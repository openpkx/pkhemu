#[allow(dead_code)]
#[path = "../tests/common/mod.rs"]
mod common;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let [code, hack] = args.as_slice() else {
        eprintln!("usage: hack_keys <game code> <hack>");
        std::process::exit(1);
    };
    let Some(rom) = common::find_hack(code, hack) else {
        eprintln!("needs {hack} ({code} with {hack} in its text) in data/roms/ or data/test-folder/");
        std::process::exit(2);
    };
    for image in rom_art::extract(&rom).images {
        println!("{}", image.key);
    }
}
