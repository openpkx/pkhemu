use std::io::{Read, Seek, SeekFrom};

pub const HEADER: usize = 0x80;
const MAGIC: u32 = 0xC233_9F3D;
const WIA_DISC_HEADER: u64 = 0x58;
const CISO_HEADER: u64 = 0x8000;
const GCZ_MAGIC: u32 = 0xB10B_C001;
const GCZ_HEADER: u64 = 32;
const GCZ_UNCOMPRESSED: u64 = 1 << 63;

/// The first 0x80 bytes of a GameCube disc, which name the game, its disc and its revision. Only the block that
/// holds them is read, so a compressed disc isn't unpacked.
pub fn header(mut file: impl Read + Seek) -> std::io::Result<Option<[u8; HEADER]>> {
    let mut start = [0; HEADER];
    file.rewind()?;
    if !read_fully(&mut file, &mut start)? {
        return Ok(None);
    }
    let header = match &start[..4] {
        b"RVZ\x01" | b"WIA\x01" => at(&mut file, WIA_DISC_HEADER)?,
        // A CISO keeps the blocks its map marks, in order, so the first block, when kept, comes first.
        b"CISO" if start[8] == 1 => at(&mut file, CISO_HEADER)?,
        b"CISO" => None,
        _ if u32_le(&start, 0) == GCZ_MAGIC => gcz(&mut file, &start)?,
        _ => Some(start),
    };
    Ok(header.filter(|header| u32::from_be_bytes(header[0x1C..0x20].try_into().unwrap()) == MAGIC))
}

pub fn not_a_disc(name: &str) -> String {
    format!("{name} isn't a GameCube disc")
}

fn at(file: &mut (impl Read + Seek), offset: u64) -> std::io::Result<Option<[u8; HEADER]>> {
    let mut header = [0; HEADER];
    file.seek(SeekFrom::Start(offset))?;
    Ok(read_fully(file, &mut header)?.then_some(header))
}

// The block pointers follow the header. A set top bit marks a block kept uncompressed, and the rest of each pointer
// counts from the end of the pointer and checksum tables.
fn gcz(file: &mut (impl Read + Seek), start: &[u8]) -> std::io::Result<Option<[u8; HEADER]>> {
    let blocks = u32_le(start, 28) as u64;
    if blocks == 0 {
        return Ok(None);
    }
    let mut pointers = [0; 16];
    file.seek(SeekFrom::Start(GCZ_HEADER))?;
    let both = blocks > 1;
    if !read_fully(file, &mut pointers[..if both { 16 } else { 8 }])? {
        return Ok(None);
    }
    let first = u64::from_le_bytes(pointers[..8].try_into().unwrap());
    let end = match both {
        true => u64::from_le_bytes(pointers[8..].try_into().unwrap()) & !GCZ_UNCOMPRESSED,
        false => u64::from_le_bytes(start[8..16].try_into().unwrap()),
    };
    let offset = first & !GCZ_UNCOMPRESSED;
    let data = GCZ_HEADER + blocks * 12;
    if first & GCZ_UNCOMPRESSED != 0 {
        return at(file, data + offset);
    }
    file.seek(SeekFrom::Start(data + offset))?;
    let mut header = [0; HEADER];
    let mut block = flate2::read::ZlibDecoder::new(file.take(end.saturating_sub(offset)));
    Ok(read_fully(&mut block, &mut header)?.then_some(header))
}

fn u32_le(bytes: &[u8], at: usize) -> u32 {
    u32::from_le_bytes(bytes[at..at + 4].try_into().unwrap())
}

// A file too short to hold what's asked for isn't a disc, rather than a failed read.
fn read_fully(file: &mut impl Read, buf: &mut [u8]) -> std::io::Result<bool> {
    match file.read_exact(buf) {
        Ok(()) => Ok(true),
        Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => Ok(false),
        Err(e) => Err(e),
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use std::io::Cursor;

    pub fn iso(game_id: &[u8; 6], number: u8) -> Vec<u8> {
        let mut disc = vec![0; 0x10000];
        disc[..6].copy_from_slice(game_id);
        disc[6] = number;
        disc[0x1C..0x20].copy_from_slice(&0xC233_9F3Du32.to_be_bytes());
        disc[0x20..0x29].copy_from_slice(b"Colosseum");
        disc
    }

    // RVZ and WIA keep the first 0x80 bytes of the disc in their second header, at 0x58.
    pub fn rvz_of(iso: &[u8], magic: &[u8; 4]) -> Vec<u8> {
        let mut file = vec![0; 0x100];
        file[..4].copy_from_slice(magic);
        file[0x58..0xD8].copy_from_slice(&iso[..0x80]);
        file
    }

    // A CISO keeps only the blocks marked in its map, in order, after a 0x8000-byte header.
    pub fn ciso_of(iso: &[u8], block_size: usize) -> Vec<u8> {
        let mut file = vec![0; 0x8000];
        file[..4].copy_from_slice(b"CISO");
        file[4..8].copy_from_slice(&(block_size as u32).to_le_bytes());
        for (index, block) in iso.chunks(block_size).enumerate() {
            if block.iter().any(|&byte| byte != 0) {
                file[8 + index] = 1;
                file.extend_from_slice(block);
                file.resize(file.len().next_multiple_of(block_size), 0);
            }
        }
        file
    }

    // A GCZ zlib-compresses each block and points at it from a table; a block that doesn't shrink is kept as is.
    pub fn gcz_of(iso: &[u8], block_size: usize) -> Vec<u8> {
        use flate2::write::ZlibEncoder;
        use std::io::Write;
        let blocks: Vec<&[u8]> = iso.chunks(block_size).collect();
        let (mut pointers, mut data) = (Vec::new(), Vec::new());
        for block in &blocks {
            let mut encoder = ZlibEncoder::new(Vec::new(), flate2::Compression::default());
            encoder.write_all(block).unwrap();
            let compressed = encoder.finish().unwrap();
            match compressed.len() < block.len() {
                true => {
                    pointers.push(data.len() as u64);
                    data.extend_from_slice(&compressed);
                }
                false => {
                    pointers.push(data.len() as u64 | 1 << 63);
                    data.extend_from_slice(block);
                }
            }
        }
        let mut file = Vec::new();
        file.extend_from_slice(&0xB10B_C001u32.to_le_bytes());
        file.extend_from_slice(&0u32.to_le_bytes());
        file.extend_from_slice(&(data.len() as u64).to_le_bytes());
        file.extend_from_slice(&(iso.len() as u64).to_le_bytes());
        file.extend_from_slice(&(block_size as u32).to_le_bytes());
        file.extend_from_slice(&(blocks.len() as u32).to_le_bytes());
        pointers.iter().for_each(|pointer| file.extend_from_slice(&pointer.to_le_bytes()));
        blocks.iter().for_each(|block| file.extend_from_slice(&adler32(block).to_le_bytes()));
        file.extend_from_slice(&data);
        file
    }

    fn adler32(bytes: &[u8]) -> u32 {
        let (a, b) = bytes.iter().fold((1u32, 0u32), |(a, b), &byte| {
            let a = (a + byte as u32) % 65521;
            (a, (b + a) % 65521)
        });
        b << 16 | a
    }

    #[derive(Debug, PartialEq)]
    struct Disc {
        game_id: String,
        number: u8,
    }

    fn read(file: Vec<u8>) -> Option<Disc> {
        let header = header(Cursor::new(file)).unwrap()?;
        Some(Disc { game_id: String::from_utf8_lossy(&header[..6]).into_owned(), number: header[6] })
    }

    #[test]
    fn reads_the_game_id_and_disc_number_in_every_format() {
        let iso = iso(b"GC6E01", 1);
        let colosseum = Some(Disc { game_id: "GC6E01".into(), number: 1 });

        assert_eq!(read(iso.clone()), colosseum, "iso");
        assert_eq!(read(rvz_of(&iso, b"RVZ\x01")), colosseum, "rvz");
        assert_eq!(read(rvz_of(&iso, b"WIA\x01")), colosseum, "wia");
        assert_eq!(read(ciso_of(&iso, 0x8000)), colosseum, "ciso");
        assert_eq!(read(gcz_of(&iso, 0x4000)), colosseum, "gcz");
    }

    #[test]
    fn reads_a_gcz_block_kept_uncompressed() {
        let mut noise = 0x2545_F491u32;
        let mut iso: Vec<u8> = (0..0x10000)
            .map(|_| {
                noise ^= noise << 13;
                noise ^= noise >> 17;
                noise ^= noise << 5;
                noise as u8
            })
            .collect();
        iso[..0x20].copy_from_slice(&self::iso(b"GXXE01", 0)[..0x20]);
        let gcz = gcz_of(&iso, 0x8000);

        assert_ne!(u64::from_le_bytes(gcz[32..40].try_into().unwrap()) & GCZ_UNCOMPRESSED, 0);
        assert_eq!(read(gcz), Some(Disc { game_id: "GXXE01".into(), number: 0 }));
    }

    #[test]
    fn knows_a_file_that_isnt_a_gamecube_disc() {
        let mut wii = iso(b"RPJE01", 0);
        wii[0x18..0x20].copy_from_slice(&[0x5D, 0x1C, 0x9E, 0xA3, 0, 0, 0, 0]);
        let mut psp = b"CISO".to_vec();
        psp.extend_from_slice(&[0x18, 0, 0, 0]);
        psp.resize(0x10000, 0);

        for (name, file) in [("wii", wii), ("psp", psp), ("short", b"GC6E01".to_vec()), ("empty", Vec::new())] {
            assert_eq!(read(file), None, "{name}");
        }
        assert_eq!(read(ciso_of(&vec![0; 0x10000], 0x8000)), None, "ciso without its first block");
    }
}
