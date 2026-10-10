#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Platform {
    Gb,
    Gbc,
    Gba,
    Nds,
    N64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Game {
    pub platform: Platform,
    pub title: String,
    pub code: String,
    pub revision: u8,
}

pub fn identify(rom: &[u8]) -> Option<Game> {
    n64(rom).or_else(|| nds(rom)).or_else(|| gba(rom)).or_else(|| gb(rom))
}

pub fn n64_big_endian(rom: &[u8]) -> Option<Vec<u8>> {
    match rom.get(..4)? {
        [0x80, 0x37, 0x12, 0x40] => Some(rom.to_vec()),
        [0x37, 0x80, 0x40, 0x12] => Some(rom.chunks(2).flat_map(|pair| pair.iter().rev()).copied().collect()),
        [0x40, 0x12, 0x37, 0x80] => Some(rom.chunks(4).flat_map(|word| word.iter().rev()).copied().collect()),
        _ => None,
    }
}

fn text(bytes: &[u8]) -> String {
    let end = bytes.iter().position(|&b| b == 0).unwrap_or(bytes.len());
    String::from_utf8_lossy(&bytes[..end]).trim_end().to_owned()
}

pub(crate) fn crc16(bytes: &[u8]) -> u16 {
    bytes.iter().fold(0xFFFF, |crc, &byte| {
        (0..8).fold(crc ^ byte as u16, |crc, _| if crc & 1 == 1 { (crc >> 1) ^ 0xA001 } else { crc >> 1 })
    })
}

fn nds(rom: &[u8]) -> Option<Game> {
    let header = rom.get(..0x160)?;
    if crc16(&header[..0x15E]) != u16::from_le_bytes([header[0x15E], header[0x15F]]) {
        return None;
    }
    Some(Game { platform: Platform::Nds, title: text(&header[..0x0C]), code: text(&header[0x0C..0x10]), revision: header[0x1E] })
}

fn n64(rom: &[u8]) -> Option<Game> {
    let header = n64_big_endian(rom.get(..0x40)?)?;
    Some(Game { platform: Platform::N64, title: text(&header[0x20..0x34]), code: text(&header[0x3B..0x3F]), revision: header[0x3F] })
}

fn gba(rom: &[u8]) -> Option<Game> {
    let header = rom.get(..0xC0)?;
    let complement = header[0xA0..0xBD].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b)).wrapping_sub(0x19);
    if header[0xB2] != 0x96 || header[0xBD] != complement {
        return None;
    }
    Some(Game { platform: Platform::Gba, title: text(&header[0xA0..0xAC]), code: text(&header[0xAC..0xB0]), revision: header[0xBC] })
}

fn gb(rom: &[u8]) -> Option<Game> {
    let header = rom.get(..0x150)?;
    let checksum = header[0x134..0x14D].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b).wrapping_sub(1));
    if header[0x14D] != checksum {
        return None;
    }
    let color = header[0x143] & 0x80 != 0;
    let title = if color { &header[0x134..0x143] } else { &header[0x134..0x144] };
    Some(Game {
        platform: if color { Platform::Gbc } else { Platform::Gb },
        title: text(title),
        code: String::new(),
        revision: header[0x14C],
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn gba_rom(title: &[u8], code: &[u8], revision: u8) -> Vec<u8> {
        let mut rom = vec![0; 0x200];
        rom[0xA0..0xA0 + title.len()].copy_from_slice(title);
        rom[0xAC..0xB0].copy_from_slice(code);
        rom[0xB2] = 0x96;
        rom[0xBC] = revision;
        rom[0xBD] = rom[0xA0..0xBD].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b)).wrapping_sub(0x19);
        rom
    }

    fn nds_rom(title: &[u8], code: &[u8], revision: u8) -> Vec<u8> {
        let mut rom = vec![0; 0x200];
        rom[..title.len()].copy_from_slice(title);
        rom[0x0C..0x10].copy_from_slice(code);
        rom[0x1E] = revision;
        let crc = crc16(&rom[..0x15E]);
        rom[0x15E..0x160].copy_from_slice(&crc.to_le_bytes());
        rom
    }

    fn z64_rom(title: &[u8], code: &[u8], revision: u8) -> Vec<u8> {
        let mut rom = vec![0; 0x1000];
        rom[..4].copy_from_slice(&[0x80, 0x37, 0x12, 0x40]);
        rom[0x20..0x34].fill(b' ');
        rom[0x20..0x20 + title.len()].copy_from_slice(title);
        rom[0x3B..0x3F].copy_from_slice(code);
        rom[0x3F] = revision;
        rom
    }

    fn gb_rom(title: &[u8], color: u8, revision: u8) -> Vec<u8> {
        let mut rom = vec![0; 0x8000];
        rom[0x134..0x134 + title.len()].copy_from_slice(title);
        rom[0x143] = color;
        rom[0x14C] = revision;
        rom[0x14D] = rom[0x134..0x14D].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b).wrapping_sub(1));
        rom
    }

    #[test]
    fn checks_the_ds_header_with_the_crc_its_tools_use() {
        assert_eq!(crc16(b"123456789"), 0x4B37);
    }

    #[test]
    fn recognises_a_gba_game() {
        assert_eq!(
            identify(&gba_rom(b"POKEMON FIRE", b"BPRE", 1)),
            Some(Game { platform: Platform::Gba, title: "POKEMON FIRE".into(), code: "BPRE".into(), revision: 1 })
        );
    }

    #[test]
    fn recognises_a_ds_game() {
        assert_eq!(
            identify(&nds_rom(b"POKEMON HG", b"IPKE", 0)),
            Some(Game { platform: Platform::Nds, title: "POKEMON HG".into(), code: "IPKE".into(), revision: 0 })
        );
    }

    #[test]
    fn recognises_an_n64_game() {
        assert_eq!(
            identify(&z64_rom(b"POKEMON STADIUM", b"NPOE", 2)),
            Some(Game { platform: Platform::N64, title: "POKEMON STADIUM".into(), code: "NPOE".into(), revision: 2 })
        );
    }

    #[test]
    fn reads_an_n64_header_the_same_in_every_byte_order() {
        let z64 = z64_rom(b"POKEMON STADIUM", b"NPOE", 2);
        let v64: Vec<u8> = z64.chunks(2).flat_map(|pair| [pair[1], pair[0]]).collect();
        let n64: Vec<u8> = z64.chunks(4).flat_map(|word| [word[3], word[2], word[1], word[0]]).collect();

        assert_eq!(&v64[..4], [0x37, 0x80, 0x40, 0x12]);
        assert_eq!(&n64[..4], [0x40, 0x12, 0x37, 0x80]);
        assert_eq!(identify(&v64), identify(&z64));
        assert_eq!(identify(&n64), identify(&z64));
        assert_eq!(n64_big_endian(&v64).as_deref(), Some(&z64[..]));
        assert_eq!(n64_big_endian(&n64).as_deref(), Some(&z64[..]));
    }

    #[test]
    fn recognises_a_game_boy_game() {
        assert_eq!(
            identify(&gb_rom(b"POKEMON RED", 0x00, 0)),
            Some(Game { platform: Platform::Gb, title: "POKEMON RED".into(), code: "".into(), revision: 0 })
        );
    }

    #[test]
    fn recognises_a_game_boy_color_game_without_its_colour_flag_in_the_title() {
        assert_eq!(
            identify(&gb_rom(b"PM_CRYSTAL\0BYTE", 0x80, 1)),
            Some(Game { platform: Platform::Gbc, title: "PM_CRYSTAL".into(), code: "".into(), revision: 1 })
        );
    }

    #[test]
    fn recognises_nothing_in_bytes_without_a_header() {
        let mut broken = gba_rom(b"POKEMON FIRE", b"BPRE", 1);
        broken[0xBD] ^= 1;

        assert_eq!(identify(&broken), None);
        assert_eq!(identify(&[0xFF; 0x8000]), None);
        assert_eq!(identify(&[]), None);
    }
}
