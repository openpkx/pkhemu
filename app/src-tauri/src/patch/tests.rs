use super::*;
use crate::rom::Rom;
use crate::test_games::{game_boy_roms, pattern, roms_by_code};
use sha2::{Digest, Sha256};
use oxidelta::compress::encoder::{encode_all, CompressOptions};
use oxidelta::compress::SecondaryCompression;
use std::io::Cursor;

fn patched(patch: &[u8], base: &[u8], system: System) -> Result<(Vec<u8>, Patched), PatchError> {
    let mut output = Vec::new();
    let result = apply(patch, Cursor::new(base), &mut output, system)?;
    Ok((output, result))
}

fn edited(base: &[u8]) -> Vec<u8> {
    let mut target = base.to_vec();
    target[0] ^= 0xFF;
    target[129] = 0;
    target[300..340].fill(0x42);
    target.extend_from_slice(b"new data at the end");
    target
}

pub(crate) fn ips(base: &[u8], target: &[u8]) -> Vec<u8> {
    let mut patch = b"PATCH".to_vec();
    let mut i = 0;
    while i < target.len() {
        if base.get(i) == Some(&target[i]) {
            i += 1;
            continue;
        }
        let start = i;
        while i < target.len() && i - start < 0xFFFF && base.get(i) != Some(&target[i]) {
            i += 1;
        }
        patch.extend_from_slice(&(start as u32).to_be_bytes()[1..]);
        patch.extend_from_slice(&((i - start) as u16).to_be_bytes());
        patch.extend_from_slice(&target[start..i]);
    }
    patch.extend_from_slice(b"EOF");
    if target.len() < base.len() {
        patch.extend_from_slice(&(target.len() as u32).to_be_bytes()[1..]);
    }
    patch
}

fn number(mut value: u64, out: &mut Vec<u8>) {
    loop {
        let byte = (value & 0x7F) as u8;
        value >>= 7;
        if value == 0 {
            out.push(byte | 0x80);
            return;
        }
        out.push(byte);
        value -= 1;
    }
}

fn bps_action(len: usize, kind: usize, out: &mut Vec<u8>) {
    number((((len - 1) << 2) | kind) as u64, out);
}

fn bps_header(base: &[u8], target: &[u8]) -> Vec<u8> {
    let mut patch = b"BPS1".to_vec();
    for size in [base.len(), target.len(), 0] {
        number(size as u64, &mut patch);
    }
    patch
}

pub(crate) fn bps(base: &[u8], target: &[u8]) -> Vec<u8> {
    let mut patch = bps_header(base, target);
    let same = |i: usize| base.get(i) == Some(&target[i]);
    let mut i = 0;
    while i < target.len() {
        let (start, from_base) = (i, same(i));
        while i < target.len() && same(i) == from_base {
            i += 1;
        }
        if from_base {
            bps_action(i - start, 0, &mut patch);
        } else {
            bps_action(i - start, 1, &mut patch);
            patch.extend_from_slice(&target[start..i]);
        }
    }
    with_crcs(patch, crc32fast::hash(base), crc32fast::hash(target))
}

fn with_crcs(mut patch: Vec<u8>, base_crc: u32, target_crc: u32) -> Vec<u8> {
    patch.extend_from_slice(&base_crc.to_le_bytes());
    patch.extend_from_slice(&target_crc.to_le_bytes());
    let crc = crc32fast::hash(&patch);
    patch.extend_from_slice(&crc.to_le_bytes());
    patch
}

pub(crate) fn ups(base: &[u8], target: &[u8]) -> Vec<u8> {
    let mut patch = b"UPS1".to_vec();
    number(base.len() as u64, &mut patch);
    number(target.len() as u64, &mut patch);
    let byte = |rom: &[u8], i: usize| rom.get(i).copied().unwrap_or(0);
    let (mut i, mut last) = (0, 0);
    while i < base.len().max(target.len()) {
        if byte(base, i) == byte(target, i) {
            i += 1;
            continue;
        }
        number((i - last) as u64, &mut patch);
        while i < base.len().max(target.len()) && byte(base, i) != byte(target, i) {
            patch.push(byte(base, i) ^ byte(target, i));
            i += 1;
        }
        patch.push(0);
        i += 1;
        last = i;
    }
    with_crcs(patch, crc32fast::hash(base), crc32fast::hash(target))
}

pub(crate) fn xdelta_with(base: &[u8], target: &[u8], options: CompressOptions) -> Vec<u8> {
    encode_all(Vec::new(), base, target, options).unwrap()
}

pub(crate) fn xdelta(base: &[u8], target: &[u8]) -> Vec<u8> {
    xdelta_with(base, target, CompressOptions::default())
}

fn all_formats(base: &[u8], target: &[u8]) -> [(Format, Vec<u8>); 4] {
    [
        (Format::Ips, ips(base, target)),
        (Format::Ups, ups(base, target)),
        (Format::Bps, bps(base, target)),
        (Format::Xdelta, xdelta(base, target)),
    ]
}

#[test]
fn applies_every_format() {
    let base = pattern(4096, 7);
    let target = edited(&base);
    for (format, patch) in all_formats(&base, &target) {
        let (output, result) = patched(&patch, &base, System::GameBoyAdvance).unwrap();
        assert!(output == target, "{format:?}");
        assert_eq!(result.format, format);
    }
}

#[test]
fn detects_the_format_from_the_magic_bytes() {
    assert_eq!(detect(b"PATCH\0\0\0"), Some(Format::Ips));
    assert_eq!(detect(b"UPS1\x80"), Some(Format::Ups));
    assert_eq!(detect(b"BPS1\x80"), Some(Format::Bps));
    assert_eq!(detect(&[0xD6, 0xC3, 0xC4, 0x00, 0x00]), Some(Format::Xdelta));
    assert_eq!(detect(b"PK\x03\x04"), None);
    assert_eq!(detect(b""), None);
}

#[test]
fn refuses_an_unknown_format() {
    let base = pattern(64, 1);
    assert_eq!(patched(b"not a patch at all", &base, System::GameBoy), Err(PatchError::UnknownFormat));
    assert_eq!(patched(b"", &base, System::GameBoy), Err(PatchError::UnknownFormat));
}

#[test]
fn only_ips_leaves_the_base_unchecked() {
    let base = pattern(1024, 2);
    let target = edited(&base);
    for (format, patch) in all_formats(&base, &target) {
        let (_, result) = patched(&patch, &base, System::GameBoyAdvance).unwrap();
        assert_eq!(result.base_checked, format != Format::Ips, "{format:?}");
    }
}

#[test]
fn xdelta_without_checksums_leaves_the_base_unchecked() {
    let base = pattern(1024, 2);
    let options = CompressOptions { checksum: false, ..CompressOptions::default() };
    let (_, result) = patched(&xdelta_with(&base, &edited(&base), options), &base, System::Ds).unwrap();
    assert!(!result.base_checked);
}

#[test]
fn inspecting_a_patch_tells_whether_it_checks_the_base() {
    let base = pattern(1024, 2);
    let target = edited(&base);
    for (format, patch) in all_formats(&base, &target) {
        assert_eq!(inspect(&patch[..]).unwrap(), Some(Patched { format, base_checked: format != Format::Ips }), "{format:?}");
    }
    let options = CompressOptions { checksum: false, ..CompressOptions::default() };
    let unchecked = xdelta_with(&base, &target, options);
    assert_eq!(inspect(&unchecked[..]).unwrap(), Some(Patched { format: Format::Xdelta, base_checked: false }));
    assert_eq!(inspect(&b"not a patch"[..]).unwrap(), None);
}

fn vcdiff_number(value: u64, out: &mut Vec<u8>) {
    let mut bytes = vec![(value & 0x7F) as u8];
    let mut rest = value >> 7;
    while rest > 0 {
        bytes.push((rest & 0x7F) as u8 | 0x80);
        rest >>= 7;
    }
    out.extend(bytes.iter().rev());
}

#[test]
fn xdelta_refuses_an_lzma_section_that_expands_past_its_window() {
    let mut bomb = Vec::new();
    lzma_rs::lzma_compress(&mut &vec![0u8; 1 << 22][..], &mut bomb).unwrap();
    let mut patch = vec![0xD6, 0xC3, 0xC4, 0x00, 0x01, 0x02, 0x00];
    for number in [0, 16] {
        vcdiff_number(number, &mut patch);
    }
    patch.push(0x01);
    for number in [bomb.len() as u64, 1, 0] {
        vcdiff_number(number, &mut patch);
    }
    patch.extend_from_slice(&bomb);
    patch.push(17);
    assert_eq!(patched(&patch, &pattern(64, 1), System::Ds), Err(PatchError::Malformed));
}

fn z64(len: usize) -> Vec<u8> {
    [&[0x80, 0x37, 0x12, 0x40][..], &pattern(len - 4, 9)].concat()
}

fn swapped(rom: &[u8], width: usize) -> Vec<u8> {
    rom.chunks(width).flat_map(|chunk| chunk.iter().rev()).copied().collect()
}

#[test]
fn patches_an_n64_rom_the_same_in_any_byte_order() {
    let base = z64(1024);
    let patch = ips(&base, &edited(&base));

    for rom in [base.clone(), swapped(&base, 2), swapped(&base, 4)] {
        let (output, _) = patched(&patch, &rom, System::N64).unwrap();
        assert_eq!(output, edited(&base));
    }
}

#[test]
fn ips_applies_to_any_base() {
    let base = pattern(1024, 2);
    let patch = ips(&base, &edited(&base));
    let other = pattern(1024, 3);
    let (output, _) = patched(&patch, &other, System::GameBoy).unwrap();
    assert_eq!(output[1..129], other[1..129]);
    assert_eq!(output[300..340], [0x42; 40]);
}

#[test]
fn ups_and_bps_refuse_the_wrong_base_with_the_crc32_they_expect() {
    let base = pattern(1024, 2);
    let target = edited(&base);
    let expected = crc32fast::hash(&base);
    for patch in [ups(&base, &target), bps(&base, &target)] {
        let wrong = pattern(1024, 3);
        assert_eq!(
            patched(&patch, &wrong, System::GameBoy),
            Err(PatchError::WrongBase { expected_crc32: Some(expected) })
        );
        let shorter = &base[..1000];
        assert_eq!(
            patched(&patch, shorter, System::GameBoy),
            Err(PatchError::WrongBase { expected_crc32: Some(expected) })
        );
    }
}

#[test]
fn ups_and_bps_check_the_output_crc32() {
    let base = pattern(1024, 2);
    let target = edited(&base);
    let wrong_target_crc = crc32fast::hash(&target) ^ 1;
    let ups = ups(&base, &target);
    let ups = with_crcs(ups[..ups.len() - 12].to_vec(), crc32fast::hash(&base), wrong_target_crc);
    let bps = bps(&base, &target);
    let bps = with_crcs(bps[..bps.len() - 12].to_vec(), crc32fast::hash(&base), wrong_target_crc);
    for patch in [ups, bps] {
        assert_eq!(patched(&patch, &base, System::GameBoy), Err(PatchError::Malformed));
    }
}

#[test]
fn ups_and_bps_refuse_a_patch_whose_own_crc32_is_wrong() {
    let base = pattern(1024, 2);
    let target = edited(&base);
    for mut patch in [ups(&base, &target), bps(&base, &target)] {
        let last = patch.len() - 1;
        patch[last] ^= 1;
        assert_eq!(patched(&patch, &base, System::GameBoy), Err(PatchError::Malformed));
    }
}

#[test]
fn ups_reads_offsets_whose_encoding_starts_with_a_zero_byte() {
    let base = pattern(1024, 2);
    let mut target = base.clone();
    target[0] ^= 1;
    target[130] ^= 1;
    let (output, _) = patched(&ups(&base, &target), &base, System::GameBoy).unwrap();
    assert!(output == target);
}

#[test]
fn shrinks_a_rom() {
    let base = pattern(4096, 5);
    let mut target = base[..1000].to_vec();
    target[10] ^= 1;
    for (format, patch) in all_formats(&base, &target) {
        let (output, _) = patched(&patch, &base, System::GameBoy).unwrap();
        assert!(output == target, "{format:?}");
    }
}

#[test]
fn bps_copies_from_the_base_and_from_its_own_output() {
    let base = pattern(256, 3);
    let target = [&base[100..150], b"ABABABAB", &base[10..20]].concat();
    let mut patch = bps_header(&base, &target);
    bps_action(50, 2, &mut patch);
    number(100 << 1, &mut patch);
    bps_action(2, 1, &mut patch);
    patch.extend_from_slice(b"AB");
    bps_action(6, 3, &mut patch);
    number(50 << 1, &mut patch);
    bps_action(10, 2, &mut patch);
    number((140 << 1) | 1, &mut patch);
    let patch = with_crcs(patch, crc32fast::hash(&base), crc32fast::hash(&target));

    let (output, _) = patched(&patch, &base, System::GameBoy).unwrap();
    assert!(output == target);
}

#[test]
fn xdelta_refuses_the_wrong_base() {
    let base = Random(7).bytes(8192);
    let target = edited(&base);
    let patch = xdelta(&base, &target);
    let mut wrong = base.clone();
    wrong[200] ^= 1;
    assert_eq!(patched(&patch, &wrong, System::Ds), Err(PatchError::WrongBase { expected_crc32: None }));
    assert_eq!(patched(&patch, &base[..4000], System::Ds), Err(PatchError::WrongBase { expected_crc32: None }));
}

#[test]
fn xdelta_streams_one_window_at_a_time() {
    let base = pattern(1 << 16, 2);
    let mut target = edited(&base);
    target.extend(pattern(1 << 16, 9));
    let options = CompressOptions { window_size: 4096, ..CompressOptions::default() };
    let patch = xdelta_with(&base, &target, options);

    struct Writes(Vec<usize>, Vec<u8>);
    impl Write for Writes {
        fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
            self.0.push(bytes.len());
            self.1.extend_from_slice(bytes);
            Ok(bytes.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }
    let mut writes = Writes(Vec::new(), Vec::new());
    apply(&patch[..], Cursor::new(&base), &mut writes, System::Ds).unwrap();
    assert!(writes.1 == target);
    assert!(writes.0.len() > 1);
    assert!(writes.0.iter().all(|&len| len <= 4096));
}

#[test]
fn xdelta_reads_lzma_compressed_windows() {
    let base = pattern(8192, 2);
    let target = edited(&base);
    let options = CompressOptions { secondary: SecondaryCompression::Lzma, ..CompressOptions::default() };
    let (output, _) = patched(&xdelta_with(&base, &target, options), &base, System::Ds).unwrap();
    assert!(output == target);
}

#[test]
fn caps_the_output_at_the_largest_cartridge() {
    assert_eq!(System::GameBoy.max_rom_size(), 8 << 20);
    assert_eq!(System::GameBoyAdvance.max_rom_size(), 32 << 20);
    assert_eq!(System::Ds.max_rom_size(), 512 << 20);
    assert_eq!(System::N64.max_rom_size(), 64 << 20);
}

#[test]
fn refuses_output_over_the_cap_without_writing_past_it() {
    let base = pattern(1024, 4);
    let mut target = base.clone();
    target.resize((8 << 20) + 1, 0x11);
    for (format, patch) in all_formats(&base, &target) {
        let mut output = Vec::new();
        let result = apply(&patch[..], Cursor::new(&base), &mut output, System::GameBoy);
        assert_eq!(result, Err(PatchError::TooBig), "{format:?}");
        assert!(output.len() <= 8 << 20, "{format:?}");
        assert!(patched(&patch, &base, System::GameBoyAdvance).is_ok(), "{format:?}");
    }
}

#[test]
fn refuses_a_truncated_patch() {
    let base = pattern(4096, 2);
    let target = edited(&base);
    for (format, patch) in all_formats(&base, &target) {
        for len in [patch.len() / 2, patch.len() - 1] {
            assert_eq!(patched(&patch[..len], &base, System::GameBoyAdvance), Err(PatchError::Malformed), "{format:?} {len}");
        }
    }
}

struct Random(u64);

impl Random {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }

    fn below(&mut self, n: usize) -> usize {
        (self.next() % n as u64) as usize
    }

    fn bytes(&mut self, len: usize) -> Vec<u8> {
        (0..len).map(|_| self.next() as u8).collect()
    }
}

fn fix_crc(format: Format, patch: &mut [u8]) {
    if matches!(format, Format::Ups | Format::Bps) && patch.len() >= 4 {
        let end = patch.len() - 4;
        let crc = crc32fast::hash(&patch[..end]);
        patch[end..].copy_from_slice(&crc.to_le_bytes());
    }
}

#[test]
fn survives_random_patches() {
    let base = pattern(2048, 6);
    let target = edited(&base);
    let mut random = Random(0x9E37_79B9_7F4A_7C15);
    let cap = System::GameBoy.max_rom_size() as usize;
    for (format, valid) in all_formats(&base, &target) {
        let magic = &valid[..if format == Format::Ips { 5 } else { 4 }];
        for round in 0..3000 {
            let mut patch = if round % 2 == 0 {
                let len = random.below(256);
                [magic, &random.bytes(len)].concat()
            } else {
                let mut patch = valid.clone();
                for _ in 0..1 + random.below(4) {
                    let at = magic.len() + random.below(patch.len() - magic.len());
                    patch[at] = random.next() as u8;
                }
                patch
            };
            if round % 4 < 2 {
                fix_crc(format, &mut patch);
            }
            let mut output = Vec::new();
            let _ = apply(&patch[..], Cursor::new(&base), &mut output, System::GameBoy);
            assert!(output.len() <= cap, "{format:?} round {round}");
        }
    }
}

const PATCHES: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../data/patches");

fn key(name: &str) -> String {
    name.chars().filter(char::is_ascii_alphanumeric).collect::<String>().to_ascii_lowercase()
}

fn find_patch(hack: &str, format: Format) -> Option<Vec<u8>> {
    let found = std::fs::read_dir(PATCHES)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|entry| key(&entry.file_name().to_string_lossy()).contains(&key(hack)))
        .find_map(|entry| std::fs::read(entry.path()).ok().filter(|patch| detect(patch) == Some(format)));
    if found.is_none() {
        eprintln!("skipped: needs the {hack} {format:?} patch in data/patches/");
    }
    found
}

fn check_real_patch(hack: &str, format: Format, base: &str, bases: Vec<Rom>, system: System, sha256: &str) {
    let Some(patch) = find_patch(hack, format) else { return };
    let output = bases.iter().find_map(|rom| {
        let mut output = Vec::new();
        match apply(&patch[..], Cursor::new(&rom.bytes), &mut output, system) {
            Err(PatchError::WrongBase { .. }) => None,
            result => Some(result.map(|_| output)),
        }
    });
    let Some(output) = output else {
        eprintln!("skipped: needs {base} in data/roms/ or data/test-folder/ for {hack}");
        return;
    };
    let hash: String = Sha256::digest(output.unwrap()).iter().map(|b| format!("{b:02x}")).collect();
    assert_eq!(hash, sha256, "{hack}: commit this SHA-256 if the patch and base are right");
}

#[test]
fn applies_radical_red() {
    let bases = roms_by_code(b"BPRE", 0);
    check_real_patch("Radical Red", Format::Ups, "FireRed US 1.0", bases, System::GameBoyAdvance, "679d112cdfe699c2793d82c7e7999ac9dfca9e222ad5a85d4f8f1e457cd0283f");
}

#[test]
fn applies_unbound() {
    let bases = roms_by_code(b"BPRE", 0);
    check_real_patch("Unbound", Format::Ups, "FireRed US 1.0", bases, System::GameBoyAdvance, "7aa25bbf568f7cfcf6ee1cf2e9e6ff637350b3d0705c2375cabb6baa7d9739f7");
}

#[test]
fn applies_modern_emerald() {
    let bases = roms_by_code(b"BPEE", 0);
    check_real_patch("Modern Emerald", Format::Bps, "Emerald US", bases, System::GameBoyAdvance, "bc7286dca750cf735480fece3ff68c7d86ecbf8391031b5ca2964da78fc945a1");
}

#[test]
fn applies_renegade_platinum() {
    let bases = roms_by_code(b"CPUE", 1);
    check_real_patch("Renegade Platinum 4997", Format::Xdelta, "Platinum US revision 1", bases, System::Ds, "c76667d191a8c9032ced5650ba87206d5286102c83fb85bb7226484283bbf72c");
}

#[test]
fn applies_brown() {
    let bases = game_boy_roms("POKEMON RED", 0x91E6);
    check_real_patch("Brown", Format::Ips, "Red US", bases, System::GameBoy, "ef085e982546f51d8353cefc3d55f3a014fd30b04185d25adaaed09ae9e63bed");
}

fn fits(patch: &[u8], base: &[u8], system: System) -> bool {
    fit(patch).unwrap().fits(Cursor::new(base), system).unwrap()
}

#[test]
fn ups_and_bps_fit_only_the_base_with_their_crc32_and_size() {
    let base = pattern(1024, 2);
    let target = edited(&base);
    for patch in [ups(&base, &target), bps(&base, &target)] {
        let crc32 = crc32fast::hash(&base);
        assert!(matches!(fit(&patch[..]), Ok(Fit::Crc32 { size: 1024, crc32: fit }) if fit == crc32));
        assert!(fits(&patch, &base, System::GameBoy));
        assert!(!fits(&patch, &pattern(1024, 3), System::GameBoy));
        assert!(!fits(&patch, &base[..1000], System::GameBoy));
    }
}

#[test]
fn xdelta_with_checksums_fits_only_a_base_its_first_window_decodes_from() {
    let base = Random(7).bytes(8192);
    let patch = xdelta(&base, &edited(&base));
    let mut wrong = base.clone();
    wrong[200] ^= 1;

    assert!(fit(&patch[..]).unwrap().checked());
    assert!(fits(&patch, &base, System::Ds));
    assert!(!fits(&patch, &wrong, System::Ds));
    assert!(!fits(&patch, &base[..4000], System::Ds));
}

#[test]
fn ips_and_xdelta_without_checksums_cant_tell_which_base_fits() {
    let base = pattern(1024, 2);
    let target = edited(&base);
    let options = CompressOptions { checksum: false, ..CompressOptions::default() };
    for patch in [ips(&base, &target), xdelta_with(&base, &target, options)] {
        let fit = fit(&patch[..]).unwrap();
        assert!(!fit.checked());
        assert!(fit.fits(Cursor::new(pattern(64, 9)), System::GameBoy).unwrap());
    }
}

#[test]
fn an_n64_base_fits_in_any_byte_order() {
    let base = z64(1024);
    let target = edited(&base);
    for patch in [bps(&base, &target), xdelta(&base, &target)] {
        for rom in [base.clone(), swapped(&base, 2), swapped(&base, 4)] {
            assert!(fits(&patch, &rom, System::N64));
        }
    }
}

#[test]
fn hashes_a_base_in_the_order_patches_expect() {
    let base = z64(1024);
    let identity = (1024, crc32fast::hash(&base));
    assert_eq!(base_crc32(Cursor::new(swapped(&base, 2)), System::N64).unwrap(), identity);
    assert_eq!(base_crc32(Cursor::new(&base), System::GameBoy).unwrap(), identity);
}

#[test]
fn a_damaged_ups_or_bps_patch_fits_nothing() {
    let base = pattern(1024, 2);
    let mut patch = bps(&base, &edited(&base));
    let last = patch.len() - 1;
    patch[last] ^= 1;
    assert!(matches!(fit(&patch[..]), Err(PatchError::Malformed)));
}

fn check_real_fit(
    hack: &str,
    format: Format,
    base: &str,
    bases: Vec<Rom>,
    others: Vec<Rom>,
    system: System,
    checked: bool,
) {
    let Some(patch) = find_patch(hack, format) else { return };
    let Some(right) = bases.iter().find(|rom| patched(&patch, &rom.bytes, system).is_ok()) else {
        eprintln!("skipped: needs {base} in data/roms/ or data/test-folder/ for {hack}");
        return;
    };
    let fit = fit(&patch[..]).unwrap();
    assert_eq!(fit.checked(), checked, "{hack}");
    assert!(fit.fits(Cursor::new(&right.bytes), system).unwrap(), "{hack}");
    for other in others.iter().filter(|other| other.bytes != right.bytes) {
        assert_eq!(fit.fits(Cursor::new(&other.bytes), system).unwrap(), !checked, "{hack}");
    }
}

#[test]
fn finds_the_base_for_real_patches() {
    let others = || {
        [roms_by_code(b"BPRE", 0), roms_by_code(b"BPRE", 1), roms_by_code(b"BPEE", 0), roms_by_code(b"CPUE", 0)]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
    };
    let gba = System::GameBoyAdvance;
    check_real_fit("Radical Red", Format::Ups, "FireRed US 1.0", roms_by_code(b"BPRE", 0), others(), gba, true);
    check_real_fit("Unbound", Format::Ups, "FireRed US 1.0", roms_by_code(b"BPRE", 0), others(), gba, true);
    check_real_fit("Modern Emerald", Format::Bps, "Emerald US", roms_by_code(b"BPEE", 0), others(), gba, true);
    let platinum = roms_by_code(b"CPUE", 1);
    check_real_fit(
        "Renegade Platinum 4997",
        Format::Xdelta,
        "Platinum US revision 1",
        platinum,
        others(),
        System::Ds,
        true,
    );
    let red = game_boy_roms("POKEMON RED", 0x91E6);
    check_real_fit("Brown", Format::Ips, "Red US", red, others(), System::GameBoy, false);
}

#[test]
fn xdelta_finds_its_base_past_windows_that_dont_copy_from_it() {
    let base = Random(7).bytes(8192);
    let target = [Random(8).bytes(4096), edited(&base)].concat();
    let options = CompressOptions { window_size: 4096, ..CompressOptions::default() };
    let patch = xdelta_with(&base, &target, options);

    assert!(fits(&patch, &base, System::Ds));
    assert!(!fits(&patch, &Random(9).bytes(8192), System::Ds));
}
