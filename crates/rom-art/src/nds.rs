use crate::{Image, Key};
use std::io::{Read, Seek, SeekFrom};

pub fn u16_at(bytes: &[u8], at: usize) -> Option<u16> {
    Some(u16::from_le_bytes(bytes.get(at..at + 2)?.try_into().ok()?))
}

pub fn i16_at(bytes: &[u8], at: usize) -> Option<i32> {
    u16_at(bytes, at).map(|value| value as i16 as i32)
}

pub fn u32_at(bytes: &[u8], at: usize) -> Option<usize> {
    Some(u32::from_le_bytes(bytes.get(at..at + 4)?.try_into().ok()?) as usize)
}

const ROOT: u16 = 0xF000;
const HEADER: usize = 0x50;
// Ends the ARM9 module params, whose word 8 bytes earlier is where compressed code ends, or 0 for none.
const MODULE_PARAMS: [u8; 8] = [0x21, 0x06, 0xC0, 0xDE, 0xDE, 0xC0, 0x06, 0x21];

pub struct Cartridge<R> {
    rom: R,
    len: usize,
    header: Vec<u8>,
    names: Vec<u8>,
    allocations: Vec<u8>,
}

impl<R: Read + Seek> Cartridge<R> {
    pub fn open(mut rom: R) -> Option<Cartridge<R>> {
        let len = usize::try_from(rom.seek(SeekFrom::End(0)).ok()?).ok()?;
        let mut cartridge = Cartridge { rom, len, header: Vec::new(), names: Vec::new(), allocations: Vec::new() };
        cartridge.header = cartridge.read(0, HEADER)?;
        let (names, names_size) = (u32_at(&cartridge.header, 0x40)?, u32_at(&cartridge.header, 0x44)?);
        let (allocations, allocations_size) = (u32_at(&cartridge.header, 0x48)?, u32_at(&cartridge.header, 0x4C)?);
        cartridge.names = cartridge.read(names, names.checked_add(names_size)?)?;
        cartridge.allocations = cartridge.read(allocations, allocations.checked_add(allocations_size)?)?;
        Some(cartridge)
    }

    fn read(&mut self, start: usize, end: usize) -> Option<Vec<u8>> {
        if start > end || end > self.len {
            return None;
        }
        self.rom.seek(SeekFrom::Start(start as u64)).ok()?;
        let mut bytes = vec![0; end - start];
        self.rom.read_exact(&mut bytes).ok()?;
        Some(bytes)
    }

    pub fn file(&mut self, path: &str) -> Option<Vec<u8>> {
        let mut dir = ROOT;
        let mut parts = path.split('/').peekable();
        while let Some(name) = parts.next() {
            match self.entry(dir, name.as_bytes())? {
                Entry::Dir(id) if parts.peek().is_some() => dir = id,
                Entry::File(id) if parts.peek().is_none() => return self.file_by_id(id),
                _ => return None,
            }
        }
        None
    }

    pub fn arm9(&mut self) -> Option<Vec<u8>> {
        let (offset, load, size) =
            (u32_at(&self.header, 0x20)?, u32_at(&self.header, 0x28)?, u32_at(&self.header, 0x2C)?);
        let code = self.read(offset, offset.checked_add(size)?)?;
        let params = code.windows(MODULE_PARAMS.len()).position(|window| window == MODULE_PARAMS);
        match params.and_then(|at| u32_at(&code, at.checked_sub(8)?)) {
            Some(0) | None => Some(code),
            Some(compressed_end) => crate::blz::decompress(code.get(..compressed_end.checked_sub(load)?)?),
        }
    }

    fn entry(&self, dir: u16, name: &[u8]) -> Option<Entry> {
        let row = (dir.checked_sub(ROOT)? as usize) * 8;
        let mut at = u32_at(&self.names, row)?;
        let mut file = u16_at(&self.names, row + 4)?;
        loop {
            let kind = *self.names.get(at)?;
            let len = (kind & 0x7F) as usize;
            if len == 0 {
                return None;
            }
            let entry_name = self.names.get(at + 1..at + 1 + len)?;
            at += 1 + len;
            if kind & 0x80 == 0 {
                if entry_name == name {
                    return Some(Entry::File(file));
                }
                file += 1;
            } else {
                let id = u16_at(&self.names, at)?;
                at += 2;
                if entry_name == name {
                    return Some(Entry::Dir(id));
                }
            }
        }
    }

    fn file_by_id(&mut self, id: u16) -> Option<Vec<u8>> {
        let at = id as usize * 8;
        let (start, end) = (u32_at(&self.allocations, at)?, u32_at(&self.allocations, at + 4)?);
        self.read(start, end)
    }
}

enum Entry {
    File(u16),
    Dir(u16),
}

pub fn section<'a>(file: &'a [u8], magic: &[u8; 4], name: &[u8; 4]) -> Option<&'a [u8]> {
    if file.get(..4)? != magic {
        return None;
    }
    let mut at = u16_at(file, 0x0C)? as usize;
    for _ in 0..u16_at(file, 0x0E)? {
        let size = u32_at(file, at + 4)?;
        // Gen 5 sprite graphics claim a character section longer than the file, so a section ends at the file's end at most.
        let section = file.get(at..at.checked_add(size)?.min(file.len()))?;
        if section.len() < 8 {
            return None;
        }
        if &section[..4] == name {
            return Some(section);
        }
        at += size.max(8);
    }
    None
}

pub struct Narc<'a> {
    allocations: &'a [u8],
    images: &'a [u8],
    pub len: usize,
}

impl<'a> Narc<'a> {
    pub fn open(file: &'a [u8]) -> Option<Narc<'a>> {
        let allocations = section(file, b"NARC", b"BTAF")?;
        let images = section(file, b"NARC", b"GMIF")?.get(8..)?;
        let len = u16_at(allocations, 8)? as usize;
        Some(Narc { allocations: allocations.get(12..12 + len * 8)?, images, len })
    }

    pub fn get(&self, index: usize) -> Option<&'a [u8]> {
        let (start, end) = (u32_at(self.allocations, index * 8)?, u32_at(self.allocations, index * 8 + 4)?);
        self.images.get(start..end)
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Graphic {
    pub width: usize,
    pub height: usize,
    pub depth: u8,
    pub scanned: bool,
    pub data: Vec<u8>,
}

impl Graphic {
    pub fn read(file: &[u8]) -> Option<Graphic> {
        let chars = section(file, b"RGCN", b"RAHC")?;
        let (height, width) = (u16_at(chars, 8)?, u16_at(chars, 10)?);
        let depth = match u32_at(chars, 12)? {
            3 => 4,
            4 => 8,
            _ => return None,
        };
        let scanned = u32_at(chars, 20)? & 1 == 1;
        let (size, offset) = (u32_at(chars, 24)?, u32_at(chars, 28)?);
        let data = chars.get(8 + offset..(8 + offset).checked_add(size)?)?.to_vec();
        let (width, height) =
            if width == 0xFFFF || height == 0xFFFF { (0, 0) } else { (width as usize * 8, height as usize * 8) };
        Some(Graphic { width, height, depth, scanned, data })
    }

    pub fn pixels(&self, width: usize, height: usize) -> Option<Vec<u8>> {
        let per_byte = (8 / self.depth) as usize;
        if self.data.len() * per_byte < width * height || !width.is_multiple_of(8) || !height.is_multiple_of(8) {
            return None;
        }
        let index = |at: usize| {
            let byte = self.data[at / per_byte];
            if self.depth == 4 {
                (byte >> (4 * (at % 2))) & 0x0F
            } else {
                byte
            }
        };
        let mut pixels = vec![0; width * height];
        for y in 0..height {
            for x in 0..width {
                let at = if self.scanned {
                    y * width + x
                } else {
                    let tile = (y / 8) * (width / 8) + x / 8;
                    tile * 64 + (y % 8) * 8 + x % 8
                };
                pixels[y * width + x] = index(at);
            }
        }
        Some(pixels)
    }
}

pub fn palette(file: &[u8]) -> Option<Vec<[u8; 4]>> {
    let colours = section(file, b"RLCN", b"TTLP")?;
    let (size, offset) = (u32_at(colours, 16)?, u32_at(colours, 20)?);
    let data = colours.get(8 + offset..(8 + offset).checked_add(size)?)?;
    let channel = |value: u16| {
        let five = (value & 0x1F) as u8;
        (five << 3) | (five >> 2)
    };
    Some(
        data.chunks_exact(2)
            .map(|pair| {
                let colour = u16::from_le_bytes([pair[0], pair[1]]);
                [channel(colour), channel(colour >> 5), channel(colour >> 10), 0xFF]
            })
            .collect(),
    )
}

const ICON_SIZE: usize = 32;

pub fn transparent(mut colours: Vec<[u8; 4]>) -> Vec<[u8; 4]> {
    if let Some(first) = colours.first_mut() {
        first[3] = 0;
    }
    colours
}

pub fn icon(key: Key, graphic: &[u8], palette: Vec<[u8; 4]>) -> Option<Image> {
    let graphic = Graphic::read(graphic)?;
    if graphic.depth != 4 || graphic.scanned || palette.len() < 16 {
        return None;
    }
    let pixels = graphic.pixels(ICON_SIZE, ICON_SIZE)?;
    Some(Image {
        key,
        width: ICON_SIZE as u32,
        height: ICON_SIZE as u32,
        pixels,
        palette: transparent(palette[..16].to_vec()),
    })
}

#[cfg(test)]
pub mod build {
    pub fn nitro(magic: &[u8; 4], sections: &[(&[u8; 4], Vec<u8>)]) -> Vec<u8> {
        let body: Vec<u8> = sections
            .iter()
            .flat_map(|(name, data)| {
                [name.to_vec(), ((data.len() + 8) as u32).to_le_bytes().to_vec(), data.clone()].concat()
            })
            .collect();
        let mut file = magic.to_vec();
        file.extend([0xFF, 0xFE, 0x00, 0x01]);
        file.extend(((body.len() + 16) as u32).to_le_bytes());
        file.extend(16u16.to_le_bytes());
        file.extend((sections.len() as u16).to_le_bytes());
        [file, body].concat()
    }

    pub fn narc(members: &[&[u8]]) -> Vec<u8> {
        let mut allocations = (members.len() as u32).to_le_bytes().to_vec();
        let mut images = Vec::new();
        for member in members {
            allocations.extend((images.len() as u32).to_le_bytes());
            images.extend(*member);
            allocations.extend((images.len() as u32).to_le_bytes());
        }
        nitro(b"NARC", &[(b"BTAF", allocations), (b"BTNF", vec![4, 0, 0, 0, 0, 0, 1, 0]), (b"GMIF", images)])
    }

    pub fn ncgr(width: u16, height: u16, depth: u32, scanned: bool, data: &[u8]) -> Vec<u8> {
        let mut chars = Vec::new();
        chars.extend(height.to_le_bytes());
        chars.extend(width.to_le_bytes());
        chars.extend(depth.to_le_bytes());
        chars.extend(0u32.to_le_bytes());
        chars.extend((scanned as u32).to_le_bytes());
        chars.extend((data.len() as u32).to_le_bytes());
        chars.extend(0x18u32.to_le_bytes());
        chars.extend(data);
        nitro(b"RGCN", &[(b"RAHC", chars)])
    }

    pub fn nclr(colours: &[u16]) -> Vec<u8> {
        let mut table = 3u32.to_le_bytes().to_vec();
        table.extend(0u32.to_le_bytes());
        table.extend(((colours.len() * 2) as u32).to_le_bytes());
        table.extend(0x10u32.to_le_bytes());
        table.extend(colours.iter().flat_map(|c| c.to_le_bytes()));
        nitro(b"RLCN", &[(b"TTLP", table)])
    }

    // Root holds `top.bin` and directory `a`, which holds `b.bin`.
    pub fn cartridge(top: &[u8], nested: &[u8]) -> Vec<u8> {
        let mut names = Vec::new();
        names.extend([16, 0, 0, 0, 0, 0, 2, 0]);
        names.extend([29, 0, 0, 0, 1, 0, 0, 0xF0]);
        names.extend([7]);
        names.extend(b"top.bin");
        names.extend([0x81, b'a', 0x01, 0xF0, 0]);
        names.extend([5]);
        names.extend(b"b.bin");
        names.push(0);
        let names_at = 0x200;
        let allocations_at = names_at + names.len();
        let data_at = allocations_at + 16;
        let mut rom = vec![0; names_at];
        rom[0x40..0x44].copy_from_slice(&(names_at as u32).to_le_bytes());
        rom[0x44..0x48].copy_from_slice(&(names.len() as u32).to_le_bytes());
        rom[0x48..0x4C].copy_from_slice(&(allocations_at as u32).to_le_bytes());
        rom[0x4C..0x50].copy_from_slice(&16u32.to_le_bytes());
        rom.extend(names);
        for (start, len) in [(data_at, top.len()), (data_at + top.len(), nested.len())] {
            rom.extend((start as u32).to_le_bytes());
            rom.extend(((start + len) as u32).to_le_bytes());
        }
        rom.extend(top);
        rom.extend(nested);
        rom
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    struct Counted<'a> {
        rom: Cursor<&'a [u8]>,
        read: usize,
    }

    impl Read for Counted<'_> {
        fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
            let read = self.rom.read(buf)?;
            self.read += read;
            Ok(read)
        }
    }

    impl Seek for Counted<'_> {
        fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
            self.rom.seek(pos)
        }
    }

    #[test]
    fn finds_files_by_path() {
        let rom = build::cartridge(b"top", b"nested");
        let mut cartridge = Cartridge::open(Cursor::new(&rom)).unwrap();

        assert_eq!(cartridge.file("top.bin").as_deref(), Some(&b"top"[..]));
        assert_eq!(cartridge.file("a/b.bin").as_deref(), Some(&b"nested"[..]));
    }

    #[test]
    fn finds_nothing_at_a_wrong_path() {
        let rom = build::cartridge(b"top", b"nested");
        let mut cartridge = Cartridge::open(Cursor::new(&rom)).unwrap();

        for path in ["", "a", "b.bin", "top.bin/b.bin", "a/top.bin", "a/b.bin/c", "A/b.bin"] {
            assert_eq!(cartridge.file(path), None, "{path}");
        }
    }

    #[test]
    fn opens_nothing_without_a_file_system() {
        assert!(Cartridge::open(Cursor::new([0; 0x10])).is_none());
        let mut rom = build::cartridge(b"top", b"nested");
        rom[0x44] = 0xFF;
        rom[0x45] = 0xFF;
        assert!(Cartridge::open(Cursor::new(&rom)).is_none());
    }

    #[test]
    fn reads_only_its_tables_and_the_file_asked_for() {
        let mut rom = build::cartridge(b"top", b"nested");
        rom.resize(rom.len() + 0x10_0000, 0xFF);
        let mut cartridge = Cartridge::open(Counted { rom: Cursor::new(&rom), read: 0 }).unwrap();

        assert_eq!(cartridge.file("a/b.bin").as_deref(), Some(&b"nested"[..]));
        assert!(cartridge.rom.read < 0x100, "read {} bytes", cartridge.rom.read);
    }

    #[test]
    fn finds_nothing_past_the_end_of_the_rom() {
        let mut rom = build::cartridge(b"top", b"nested");
        let end = rom.len() as u32 + 1;
        let at = u32_at(&rom, 0x48).unwrap() + 4;
        rom[at..at + 4].copy_from_slice(&end.to_le_bytes());
        let mut cartridge = Cartridge::open(Cursor::new(&rom)).unwrap();

        assert_eq!(cartridge.file("top.bin"), None);
    }

    #[test]
    fn unpacks_a_narc() {
        let file = build::narc(&[b"one", b"", b"three"]);
        let narc = Narc::open(&file).unwrap();

        assert_eq!(narc.len, 3);
        assert_eq!(
            [narc.get(0), narc.get(1), narc.get(2), narc.get(3)],
            [Some(&b"one"[..]), Some(&b""[..]), Some(&b"three"[..]), None]
        );
    }

    #[test]
    fn refuses_a_narc_with_a_wrong_magic_or_short_table() {
        let mut file = build::narc(&[b"one"]);
        assert!(Narc::open(&file[1..]).is_none());
        file[0x18] = 9;
        assert!(Narc::open(&file).is_none());
    }

    #[test]
    fn reads_a_scanned_4bpp_graphic() {
        let file = build::ncgr(1, 1, 3, true, &(0..32).collect::<Vec<u8>>());
        let graphic = Graphic::read(&file).unwrap();

        assert_eq!((graphic.width, graphic.height, graphic.depth, graphic.scanned), (8, 8, 4, true));
        assert_eq!(&graphic.pixels(8, 8).unwrap()[..6], [0, 0, 1, 0, 2, 0]);
    }

    #[test]
    fn reads_a_graphic_whose_section_claims_more_than_the_file_holds() {
        let mut file = build::ncgr(1, 1, 3, true, &[0x10; 32]);
        file[0x14..0x18].copy_from_slice(&0x2020u32.to_le_bytes());

        assert_eq!(Graphic::read(&file).unwrap().data, [0x10; 32]);
    }

    #[test]
    fn untiles_a_tiled_graphic() {
        let data: Vec<u8> = [[0x11; 32], [0x22; 32]].concat();
        let graphic = Graphic::read(&build::ncgr(0xFFFF, 0xFFFF, 3, false, &data)).unwrap();

        assert_eq!((graphic.width, graphic.height), (0, 0));
        let pixels = graphic.pixels(16, 8).unwrap();
        assert_eq!([pixels[7], pixels[8], pixels[16 * 7 + 15]], [1, 2, 2]);
        let tall = graphic.pixels(8, 16).unwrap();
        assert_eq!([tall[8 * 7], tall[8 * 8]], [1, 2]);
    }

    #[test]
    fn reads_an_8bpp_graphic() {
        let graphic = Graphic::read(&build::ncgr(1, 1, 4, false, &(0..64).collect::<Vec<u8>>())).unwrap();

        assert_eq!(graphic.depth, 8);
        assert_eq!(graphic.pixels(8, 8).unwrap(), (0..64).collect::<Vec<u8>>());
    }

    #[test]
    fn refuses_pixels_past_the_data() {
        let graphic = Graphic::read(&build::ncgr(1, 1, 3, true, &[0; 32])).unwrap();

        assert_eq!(graphic.pixels(8, 16), None);
        assert!(Graphic::read(&build::ncgr(1, 1, 5, true, &[0; 32])).is_none());
    }

    #[test]
    fn reads_a_palette_as_rgba() {
        let file = build::nclr(&[0x0000, 0x001F, 0x03E0, 0x7C00, 0x7FFF, 0x4210]);

        assert_eq!(
            palette(&file).unwrap(),
            [
                [0, 0, 0, 255],
                [255, 0, 0, 255],
                [0, 255, 0, 255],
                [0, 0, 255, 255],
                [255, 255, 255, 255],
                [132, 132, 132, 255]
            ]
        );
    }
}
