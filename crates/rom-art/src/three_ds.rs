use crate::lz77;
use crate::nds::{u16_at, u32_at};
use crate::{Image, Key};
use std::io::{Read, Seek, SeekFrom, Write};

// Layouts from 3dbrew's NCSD, NCCH, ExeFS, RomFS and Extended Header pages.
const MEDIA_UNIT: u64 = 0x200;
const NONE: usize = 0xFFFF_FFFF;
const MAX_TABLE: u64 = 16 << 20;
const MAX_FILE: u64 = 64 << 20;
const DIR_NAME: usize = 0x18;
const FILE_NAME: usize = 0x20;

fn u64_at(bytes: &[u8], at: usize) -> Option<u64> {
    Some(u64::from_le_bytes(bytes.get(at..at.checked_add(8)?)?.try_into().ok()?))
}

fn align(value: u64, to: u64) -> Option<u64> {
    Some(value.checked_add(to - 1)? / to * to)
}

// A decrypted dump can leave its NoCrypto flag clear, and encrypted names read as noise, so printable names mean plain.
fn plain_names(exefs: &[u8]) -> bool {
    let named = |entry: &[u8]| {
        let length = entry[..8].iter().position(|&b| b == 0).unwrap_or(8);
        entry[..length].iter().all(u8::is_ascii_graphic) && entry[length..8].iter().all(|&b| b == 0)
    };
    exefs.len() >= 0xA0 && exefs[0] != 0 && exefs[..0xA0].chunks(0x10).all(named)
}

pub struct Title<R> {
    rom: R,
    len: u64,
    title_id: u64,
    exefs: (u64, u64),
    code: (u64, u64),
    compressed: bool,
    ivfc: (u64, u64),
    tables: Vec<u8>,
    data: u64,
    dirs: Vec<u8>,
    files: Vec<u8>,
}

impl<R: Read + Seek> Title<R> {
    // A cartridge's other partitions, the manual and update data, can stay encrypted in a decrypted dump.
    pub fn open(mut rom: R) -> Option<Title<R>> {
        let len = rom.seek(SeekFrom::End(0)).ok()?;
        let mut title = Title {
            rom,
            len,
            title_id: 0,
            exefs: (0, 0),
            code: (0, 0),
            compressed: false,
            ivfc: (0, 0),
            tables: Vec::new(),
            data: 0,
            dirs: Vec::new(),
            files: Vec::new(),
        };
        let start = title.read(0, 0x200)?;
        let ncch = match start.get(0x100..0x104)? {
            b"NCSD" => u32_at(&start, 0x120)? as u64 * MEDIA_UNIT,
            b"NCCH" => 0,
            _ => return None,
        };
        let header = title.read(ncch, 0x200)?;
        if &header[0x100..0x104] != b"NCCH" {
            return None;
        }
        let region = |at: usize| Some(ncch + u32_at(&header, at)? as u64 * MEDIA_UNIT);
        let (exefs, romfs) = (region(0x1A0)?, region(0x1B0)?);
        title.title_id = u64_at(&header, 0x118)?;
        title.exefs = (exefs, u32_at(&header, 0x1A4)? as u64 * MEDIA_UNIT);
        if u32_at(&header, 0x180)? >= 0x10 {
            title.compressed = title.read(ncch + 0x200, 0x10)?[0x0D] & 1 == 1;
        }
        let names = title.read(exefs, 0x200)?;
        if !plain_names(&names) {
            return None;
        }
        let code = names.chunks(0x10).take(10).find(|entry| entry[..8] == *b".code\0\0\0")?;
        title.code = (exefs + 0x200 + u32_at(code, 8)? as u64, u32_at(code, 12)? as u64);
        title.open_romfs(romfs)?;
        Some(title)
    }

    fn open_romfs(&mut self, romfs: u64) -> Option<()> {
        let ivfc = self.read(romfs, 0x60)?;
        if &ivfc[..4] != b"IVFC" {
            return None;
        }
        let (master, block, header) = (u32_at(&ivfc, 0x08)? as u64, u32_at(&ivfc, 0x4C)?, u32_at(&ivfc, 0x54)? as u64);
        if block > 30 {
            return None;
        }
        let hashes = align(header, 0x10)? + master;
        if hashes > MAX_TABLE {
            return None;
        }
        self.ivfc = (romfs, hashes);
        let level3 = romfs + align(hashes, 1 << block)?;
        let tables = self.read(level3, 0x28)?;
        if u32_at(&tables, 0)? != 0x28 {
            return None;
        }
        let mut table = |at: usize| {
            let (offset, len) = (u32_at(&tables, at)? as u64, u32_at(&tables, at + 4)? as u64);
            (len <= MAX_TABLE).then(|| self.read(level3 + offset, len))?
        };
        let (dirs, files) = (table(0x0C)?, table(0x1C)?);
        self.data = level3 + u32_at(&tables, 0x24)? as u64;
        (self.tables, self.dirs, self.files) = (tables, dirs, files);
        Some(())
    }

    fn read(&mut self, at: u64, len: u64) -> Option<Vec<u8>> {
        if at.checked_add(len)? > self.len {
            return None;
        }
        self.rom.seek(SeekFrom::Start(at)).ok()?;
        let mut bytes = vec![0; usize::try_from(len).ok()?];
        self.rom.read_exact(&mut bytes).ok()?;
        Some(bytes)
    }

    // A hack changes `.code` or the RomFS, whose master hash covers its files and whose tables cover their layout, so
    // a dump is told apart without reading its data. The NCCH header is left out, as an import may fix its flags.
    pub fn fingerprint(&mut self, out: &mut dyn Write) -> Option<()> {
        let (exefs, len) = self.exefs;
        if len > MAX_FILE {
            return None;
        }
        let (romfs, ivfc) = self.ivfc;
        let parts = [self.title_id.to_le_bytes().to_vec(), self.read(exefs, len)?, self.read(romfs, ivfc)?];
        for part in parts.iter().chain([&self.tables, &self.dirs, &self.files]) {
            out.write_all(part).ok()?;
        }
        Some(())
    }

    pub fn code(&mut self) -> Option<Vec<u8>> {
        let (at, len) = self.code;
        if len > MAX_FILE {
            return None;
        }
        let code = self.read(at, len)?;
        if !self.compressed {
            return Some(code);
        }
        let extra = u32_at(&code, code.len().checked_sub(4)?)? as u64;
        (len + extra <= MAX_FILE).then(|| crate::blz::decompress(&code))?
    }

    pub fn file(&mut self, path: &str) -> Option<Vec<u8>> {
        let mut dir = 0;
        let mut parts = path.split('/').peekable();
        while let Some(part) = parts.next() {
            let name: Vec<u8> = part.encode_utf16().flat_map(u16::to_le_bytes).collect();
            if parts.peek().is_some() {
                dir = named(&self.dirs, u32_at(&self.dirs, dir + 8)?, DIR_NAME, &name)?;
                continue;
            }
            let file = named(&self.files, u32_at(&self.dirs, dir + 0x0C)?, FILE_NAME, &name)?;
            let (offset, len) = (u64_at(&self.files, file + 8)?, u64_at(&self.files, file + 0x10)?);
            return (len <= MAX_FILE).then(|| self.read(self.data.checked_add(offset)?, len))?;
        }
        None
    }
}

// Each entry links to its next sibling at 4 and keeps its name's length just before the UTF-16 name.
fn named(table: &[u8], first: usize, name_at: usize, name: &[u8]) -> Option<usize> {
    let mut at = first;
    for _ in 0..table.len() / name_at {
        if at == NONE {
            return None;
        }
        let len = u32_at(table, at + name_at - 4)?;
        if table.get(at + name_at..at + name_at + len)? == name {
            return Some(at);
        }
        at = u32_at(table, at + 4)?;
    }
    None
}

// Game Freak's archive, its magics stored reversed. Layout from Project Pokémon's X/Y file system notes:
// https://projectpokemon.org/home/docs/gen-6/xy-file-system-r89/
pub struct Garc<'a> {
    offsets: &'a [u8],
    entries: &'a [u8],
    data: &'a [u8],
    pub len: usize,
}

impl<'a> Garc<'a> {
    pub fn open(file: &'a [u8]) -> Option<Garc<'a>> {
        let section = |at: usize, magic: &[u8; 4]| {
            let size = u32_at(file, at + 4)?;
            (file.get(at..at + 4)? == magic).then(|| file.get(at..at.checked_add(size)?))?
        };
        if file.get(..4)? != b"CRAG" {
            return None;
        }
        let fato_at = u32_at(file, 4)?;
        let fato = section(fato_at, b"OTAF")?;
        let fatb = section(fato_at + fato.len(), b"BTAF")?;
        section(fato_at + fato.len() + fatb.len(), b"BMIF")?;
        let len = u16_at(fato, 8)? as usize;
        Some(Garc {
            offsets: fato.get(12..12 + len * 4)?,
            entries: fatb.get(12..)?,
            data: file.get(u32_at(file, 0x10)?..)?,
            len,
        })
    }

    // An entry may hold several files, one per set bit, and only the first is ever wanted here.
    pub fn get(&self, index: usize) -> Option<&'a [u8]> {
        let at = u32_at(self.offsets, index * 4)?;
        if u32_at(self.entries, at)? == 0 {
            return None;
        }
        let (start, end) = (u32_at(self.entries, at + 4)?, u32_at(self.entries, at + 8)?);
        self.data.get(start..end)
    }
}

// An empty palette means the pixels are RGBA, as in `Image`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Picture {
    pub width: u32,
    pub height: u32,
    pub pixels: Vec<u8>,
    pub palette: Vec<[u8; 4]>,
}

impl Picture {
    pub fn image(self, key: Key) -> Image {
        Image { key, width: self.width, height: self.height, pixels: self.pixels, palette: self.palette }
    }

    pub fn centred(self, width: u32, height: u32) -> Picture {
        let (width, height) = (width.min(self.width), height.min(self.height));
        let (left, top) = ((self.width - width) / 2, (self.height - height) / 2);
        let size = if self.palette.is_empty() { 4 } else { 1 };
        let row = |y: u32| {
            let at = ((top + y) * self.width + left) as usize * size;
            &self.pixels[at..at + width as usize * size]
        };
        let pixels = (0..height).flat_map(row).copied().collect();
        Picture { width, height, pixels, palette: self.palette }
    }
}

const MAX_PICTURE: usize = 0x10000;

// Nothing flags a compressed entry, so each format is tried before the raw bytes.
fn unpacked<T>(entry: &[u8], read: impl Fn(&[u8]) -> Option<T>) -> Option<T> {
    let unpacked = [lz77::decompress_extended, lz77::decompress];
    unpacked.iter().find_map(|unpack| unpack(entry, MAX_PICTURE).and_then(|file| read(&file))).or_else(|| read(entry))
}

pub fn picture(entry: &[u8]) -> Option<Picture> {
    unpacked(entry, |file| clim(file).or_else(|| flim(file)))
}

fn z_order(x: usize, y: usize) -> usize {
    (0..3).map(|bit| (x >> bit & 1) << (2 * bit) | (y >> bit & 1) << (2 * bit + 1)).sum()
}

fn tiled(x: usize, y: usize, width: usize) -> usize {
    ((y / 8) * (width / 8) + x / 8) * 64 + z_order(x % 8, y % 8)
}

fn colour(value: u16) -> [u8; 4] {
    let channel = |shift: u16| {
        let five = (value >> shift & 0x1F) as u8;
        (five << 3) | (five >> 2)
    };
    [channel(11), channel(6), channel(1), if value & 1 == 1 { 0xFF } else { 0 }]
}

// The 3DS GPU's formats, from 3dbrew's GPU texture page: RGBA8 is stored ABGR, and RGB5A1 and RGBA4 are u16s.
fn rgba(format: u8, bytes: &[u8]) -> [u8; 4] {
    let short = || u16::from_le_bytes([bytes[0], bytes[1]]);
    match format {
        7 => colour(short()),
        8 => [12, 8, 4, 0].map(|shift| (short() >> shift & 0xF) as u8 * 0x11),
        _ => [bytes[3], bytes[2], bytes[1], bytes[0]],
    }
}

// Gen 7's FLIM: unpaletted pixels in 8×8 tiles, with the CLIM footer's layout. Swizzle 4 stores the picture turned a
// quarter turn clockwise, so its width runs down the texture.
fn flim(file: &[u8]) -> Option<Picture> {
    let footer = file.get(file.len().checked_sub(0x28)?..)?;
    if &footer[..4] != b"FLIM" || &footer[0x14..0x18] != b"imag" {
        return None;
    }
    let (width, height) = (u16_at(footer, 0x1C)? as usize, u16_at(footer, 0x1E)? as usize);
    let (format, turned) = match (footer[0x22], footer[0x23]) {
        (format @ 7..=9, swizzle @ (0 | 4)) => (format, swizzle == 4),
        _ => return None,
    };
    let (wide, high) = if turned { (height, width) } else { (width, height) };
    texels(&file[..file.len() - 0x28], format, (width, height), (wide, high), turned)
}

// Omega Ruby and Alpha Sapphire's dex renders: a CLIM like the icons' but unpaletted, its format a u32, in a texture
// sized up to powers of two.
pub fn render(entry: &[u8]) -> Option<Picture> {
    unpacked(entry, rgba_clim)
}

fn rgba_clim(file: &[u8]) -> Option<Picture> {
    let footer = file.get(file.len().checked_sub(0x28)?..)?;
    if &footer[..4] != b"CLIM" || &footer[0x14..0x18] != b"imag" {
        return None;
    }
    let (width, height) = (u16_at(footer, 0x1C)? as usize, u16_at(footer, 0x1E)? as usize);
    let format = match u32_at(footer, 0x20)? {
        format @ 7..=9 => format as u8,
        _ => return None,
    };
    if width == 0 || height == 0 {
        return None;
    }
    let texture = (width.max(8).next_power_of_two(), height.max(8).next_power_of_two());
    texels(&file[..file.len() - 0x28], format, (width, height), texture, false)
}

fn texels(
    data: &[u8],
    format: u8,
    (width, height): (usize, usize),
    (wide, high): (usize, usize),
    turned: bool,
) -> Option<Picture> {
    let size = if format == 9 { 4 } else { 2 };
    if !wide.is_multiple_of(8) || !high.is_multiple_of(8) || data.len() < wide * high * size {
        return None;
    }
    let mut pixels = Vec::with_capacity(width * height * 4);
    for y in 0..height {
        for x in 0..width {
            let at = if turned { tiled(wide - 1 - y, x, wide) } else { tiled(x, y, wide) } * size;
            pixels.extend(rgba(format, &data[at..at + size]));
        }
    }
    Some(Picture { width: width as u32, height: height as u32, pixels, palette: Vec::new() })
}

pub struct Texture {
    pub name: String,
    pub picture: Picture,
}

const ETC1A4: u16 = 0x2B;

pub fn texture(entry: &[u8]) -> Option<Texture> {
    unpacked(entry, gf_texture)
}

// Game Freak's texture, 0x80 bytes naming it and giving its size and format, then its pixels. The format numbers are
// SPICA's GFTextureFormat.
fn gf_texture(file: &[u8]) -> Option<Texture> {
    if file.get(8..16)? != b"texture\0" || u16_at(file, 0x6C)? != ETC1A4 {
        return None;
    }
    let name = file.get(0x28..0x68)?;
    let name = String::from_utf8(name[..name.iter().position(|&b| b == 0)?].to_vec()).ok()?;
    let (width, height) = (u16_at(file, 0x68)? as usize, u16_at(file, 0x6A)? as usize);
    let pixels = etc1a4(file.get(0x80..)?, width, height)?;
    Some(Texture { name, picture: Picture { width: width as u32, height: height as u32, pixels, palette: Vec::new() } })
}

// Each 4×4 block is 4-bit alphas then an ETC1 block, each a little-endian u64 indexed down each column in turn, and
// the four blocks of each 8×8 tile run in Z order.
fn etc1a4(data: &[u8], width: usize, height: usize) -> Option<Vec<u8>> {
    if !width.is_multiple_of(8) || !height.is_multiple_of(8) || data.len() < width * height {
        return None;
    }
    let mut pixels = vec![0; width * height * 4];
    for (k, block) in data.chunks_exact(16).take(width * height / 16).enumerate() {
        let (tile, quarter) = (k / 4, k % 4);
        let left = tile % (width / 8) * 8 + quarter % 2 * 4;
        let top = tile / (width / 8) * 8 + quarter / 2 * 4;
        let alpha = u64::from_le_bytes(block[..8].try_into().ok()?);
        let colours = etc1(u64::from_le_bytes(block[8..].try_into().ok()?));
        for (i, [r, g, b]) in colours.into_iter().enumerate() {
            let at = ((top + i % 4) * width + left + i / 4) * 4;
            pixels[at..at + 4].copy_from_slice(&[r, g, b, (alpha >> (4 * i) & 0xF) as u8 * 0x11]);
        }
    }
    Some(pixels)
}

const ETC1_MODIFIERS: [[i32; 2]; 8] = [[2, 8], [5, 17], [9, 29], [13, 42], [18, 60], [24, 80], [33, 106], [47, 183]];

// Khronos' OES_compressed_ETC1_RGB8_texture: two halves, side by side or flipped one above the other, each a base
// colour and a table of modifiers, then a 2-bit modifier per pixel.
fn etc1(block: u64) -> [[u8; 3]; 16] {
    let bits = |at: usize, len: u32| (block >> at & ((1 << len) - 1)) as i32;
    let (flip, differential) = (bits(32, 1) == 1, bits(33, 1) == 1);
    let bases = if differential {
        let five = |value: i32| value << 3 | value >> 2;
        let first = [59, 51, 43].map(|at| bits(at, 5));
        let delta = [56, 48, 40].map(|at| (bits(at, 3) ^ 4) - 4);
        [first.map(five), [0, 1, 2].map(|c| five((first[c] + delta[c]) & 0x1F))]
    } else {
        [[60, 52, 44].map(|at| bits(at, 4) * 17), [56, 48, 40].map(|at| bits(at, 4) * 17)]
    };
    let tables = [bits(37, 3), bits(34, 3)];
    std::array::from_fn(|i| {
        let half = usize::from(if flip { i % 4 >= 2 } else { i / 4 >= 2 });
        let [small, large] = ETC1_MODIFIERS[tables[half] as usize];
        let modifier = [small, large, -small, -large][(bits(i + 16, 1) << 1 | bits(i, 1)) as usize];
        bases[half].map(|c| (c + modifier).clamp(0, 255) as u8)
    })
}

// The Pokémon games' paletted CLIM: u16 2, a colour count, RGBA5551 colours, then 4- or 8-bit indices in 8×8 tiles
// of a texture sized up to powers of two, of which the footer's width and height are the picture.
fn clim(file: &[u8]) -> Option<Picture> {
    let footer = file.get(file.len().checked_sub(0x28)?..)?;
    if &footer[..4] != b"CLIM" || &footer[0x14..0x18] != b"imag" {
        return None;
    }
    let (width, height) = (u16_at(footer, 0x1C)? as usize, u16_at(footer, 0x1E)? as usize);
    let data = file.get(..u32_at(footer, 0x24)?)?;
    let count = u16_at(data, 2)? as usize;
    if u16_at(data, 0)? != 2 || count == 0 || count > 0x100 || width == 0 || height == 0 {
        return None;
    }
    let palette =
        data.get(4..4 + 2 * count)?.chunks_exact(2).map(|c| colour(u16::from_le_bytes([c[0], c[1]]))).collect();
    let indices = &data[4 + 2 * count..];
    let wide = width.max(8).next_power_of_two();
    let depth = if count <= 16 { 4 } else { 8 };
    if indices.len() * 8 < wide * height.max(8).next_power_of_two() * depth {
        return None;
    }
    let mut pixels = Vec::with_capacity(width * height);
    for y in 0..height {
        for x in 0..width {
            let at = tiled(x, y, wide);
            let index = match depth {
                4 => indices[at / 2] >> (4 - 4 * (at % 2)) & 0x0F,
                _ => indices[at],
            };
            if index as usize >= count {
                return None;
            }
            pixels.push(index);
        }
    }
    Some(Picture { width: width as u32, height: height as u32, pixels, palette })
}

#[cfg(test)]
pub mod build {
    use std::io::{Cursor, Read, Seek, SeekFrom};

    pub struct Counted<'a> {
        pub rom: Cursor<&'a [u8]>,
        pub read: usize,
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

    fn put(bytes: &mut Vec<u8>, at: usize, value: &[u8]) {
        if bytes.len() < at + value.len() {
            bytes.resize(at + value.len(), 0);
        }
        bytes[at..at + value.len()].copy_from_slice(value);
    }

    fn pad(bytes: &mut Vec<u8>, to: usize) {
        bytes.resize(bytes.len().div_ceil(to) * to, 0);
    }

    pub fn clim(width: u16, height: u16, colours: &[u16], indices: &[u8]) -> Vec<u8> {
        let mut file = 2u16.to_le_bytes().to_vec();
        file.extend((colours.len() as u16).to_le_bytes());
        file.extend(colours.iter().flat_map(|c| c.to_le_bytes()));
        file.extend(indices);
        let data = file.len() as u32;
        file.extend(b"CLIM\xFF\xFE\x14\x00\x00\x00\x02\x02");
        file.extend((data + 0x28).to_le_bytes());
        file.extend(1u32.to_le_bytes());
        file.extend(b"imag\x10\x00\x00\x00");
        file.extend(width.to_le_bytes());
        file.extend(height.to_le_bytes());
        file.extend(7u32.to_le_bytes());
        file.extend(data.to_le_bytes());
        file
    }

    pub fn rgba_clim(width: u16, height: u16, format: u32, data: &[u8]) -> Vec<u8> {
        let mut file = data.to_vec();
        file.extend(b"CLIM\xFF\xFE\x14\x00\x00\x00\x02\x02");
        file.extend(((data.len() + 0x28) as u32).to_le_bytes());
        file.extend(1u32.to_le_bytes());
        file.extend(b"imag\x10\x00\x00\x00");
        file.extend(width.to_le_bytes());
        file.extend(height.to_le_bytes());
        file.extend(format.to_le_bytes());
        file.extend((data.len() as u32).to_le_bytes());
        file
    }

    pub fn flim(width: u16, height: u16, format: u8, swizzle: u8, data: &[u8]) -> Vec<u8> {
        let mut file = data.to_vec();
        file.extend(b"FLIM\xFF\xFE\x14\x00\x00\x01\x02\x07");
        file.extend(((data.len() + 0x28) as u32).to_le_bytes());
        file.extend(1u32.to_le_bytes());
        file.extend(b"imag\x10\x00\x00\x00");
        file.extend(width.to_le_bytes());
        file.extend(height.to_le_bytes());
        file.extend(0x80u16.to_le_bytes());
        file.extend([format, swizzle]);
        file.extend((data.len() as u32).to_le_bytes());
        file
    }

    pub fn texture(name: &str, width: u16, height: u16, format: u16, data: &[u8]) -> Vec<u8> {
        let mut file = vec![0xFF; 0x80];
        put(&mut file, 0, &0x1504_1213u32.to_le_bytes());
        put(&mut file, 4, &1u32.to_le_bytes());
        put(&mut file, 8, b"texture\0");
        put(&mut file, 0x10, &(data.len() as u32 + 0x68).to_le_bytes());
        put(&mut file, 0x18, &[&(data.len() as u32).to_le_bytes()[..], &[0; 12]].concat());
        put(&mut file, 0x28, &[name.as_bytes(), &vec![0; 0x40 - name.len()]].concat());
        for (at, value) in [(0x68, width), (0x6A, height), (0x6C, format), (0x6E, 1)] {
            put(&mut file, at, &value.to_le_bytes());
        }
        file.extend(data);
        file
    }

    pub fn garc(entries: &[&[u8]]) -> Vec<u8> {
        let mut offsets = Vec::new();
        let mut table = Vec::new();
        let mut data = Vec::new();
        for entry in entries {
            offsets.extend((table.len() as u32).to_le_bytes());
            table.extend(1u32.to_le_bytes());
            table.extend((data.len() as u32).to_le_bytes());
            table.extend(((data.len() + entry.len()) as u32).to_le_bytes());
            table.extend((entry.len() as u32).to_le_bytes());
            data.extend(*entry);
            pad(&mut data, 4);
        }
        let fato = [&b"OTAF"[..], &((offsets.len() + 12) as u32).to_le_bytes(), &(entries.len() as u16).to_le_bytes()]
            .concat();
        let fato = [fato, vec![0xFF, 0xFF], offsets].concat();
        let fatb =
            [&b"BTAF"[..], &((table.len() + 12) as u32).to_le_bytes(), &(entries.len() as u32).to_le_bytes()].concat();
        let fatb = [fatb, table].concat();
        let fimb = [&b"BMIF\x0C\x00\x00\x00"[..], &(data.len() as u32).to_le_bytes()].concat();
        let start = 0x1C + fato.len() + fatb.len() + fimb.len();
        let mut file = b"CRAG\x1C\x00\x00\x00\xFF\xFE\x00\x04\x04\x00\x00\x00".to_vec();
        file.extend((start as u32).to_le_bytes());
        file.extend(((start + data.len()) as u32).to_le_bytes());
        file.extend(0u32.to_le_bytes());
        [file, fato, fatb, fimb, data].concat()
    }

    fn utf16(name: &str) -> Vec<u8> {
        name.encode_utf16().flat_map(u16::to_le_bytes).collect()
    }

    fn entry(fields: &[u32], wide: &[u64], name: &str) -> Vec<u8> {
        let name = utf16(name);
        let mut entry: Vec<u8> = fields.iter().flat_map(|f| f.to_le_bytes()).collect();
        if !wide.is_empty() {
            entry.splice(8..8, wide.iter().flat_map(|f| f.to_le_bytes()));
        }
        entry.extend((name.len() as u32).to_le_bytes());
        entry.extend(name);
        pad(&mut entry, 4);
        entry
    }

    // Level 3 starts at 0x60 plus the master hash, aligned to its block size.
    pub fn romfs(files: &[(&str, &[u8])], master: u32, block: u32) -> Vec<u8> {
        let mut dirs: Vec<(String, usize)> = vec![(String::new(), 0)];
        let mut leaves: Vec<(usize, String, &[u8])> = Vec::new();
        for &(path, data) in files {
            let parts: Vec<&str> = path.split('/').collect();
            let mut dir = 0;
            for part in &parts[..parts.len() - 1] {
                dir = match dirs.iter().skip(1).position(|(name, parent)| name == part && *parent == dir) {
                    Some(at) => at + 1,
                    None => {
                        dirs.push((part.to_string(), dir));
                        dirs.len() - 1
                    }
                };
            }
            leaves.push((dir, parts[parts.len() - 1].into(), data));
        }
        let none = u32::MAX;
        let sizes = |names: Vec<&str>, base: usize| -> Vec<u32> {
            let mut offsets = Vec::new();
            let mut at = 0;
            for name in names {
                offsets.push(at as u32);
                at += base + utf16(name).len().div_ceil(4) * 4;
            }
            offsets
        };
        let dir_at = sizes(dirs.iter().map(|(name, _)| name.as_str()).collect(), 0x18);
        let file_at = sizes(leaves.iter().map(|(_, name, _)| name.as_str()).collect(), 0x20);
        let next = |parents: &[usize], from: usize, parent: usize, at: &[u32]| {
            (from..parents.len()).find(|&k| parents[k] == parent).map_or(none, |k| at[k])
        };
        let dir_parents: Vec<usize> =
            dirs.iter().enumerate().map(|(k, d)| if k == 0 { usize::MAX } else { d.1 }).collect();
        let file_parents: Vec<usize> = leaves.iter().map(|leaf| leaf.0).collect();
        let mut dir_table = Vec::new();
        for (k, (name, parent)) in dirs.iter().enumerate() {
            let sibling = if k == 0 { none } else { next(&dir_parents, k + 1, *parent, &dir_at) };
            let fields = [
                dir_at[*parent],
                sibling,
                next(&dir_parents, 1, k, &dir_at),
                next(&file_parents, 0, k, &file_at),
                none,
            ];
            dir_table.extend(entry(&fields, &[], name));
        }
        let mut file_table = Vec::new();
        let mut data = Vec::new();
        for (k, (dir, name, bytes)) in leaves.iter().enumerate() {
            let fields = [dir_at[*dir], next(&file_parents, k + 1, *dir, &file_at), none];
            file_table.extend(entry(&fields, &[data.len() as u64, bytes.len() as u64], name));
            data.extend(*bytes);
            pad(&mut data, 16);
        }
        let dirs_at = 0x28;
        let files_at = dirs_at + dir_table.len();
        let data_at = (files_at + file_table.len()).div_ceil(16) * 16;
        let mut level3 = Vec::new();
        for value in [0x28, dirs_at, 0, dirs_at, dir_table.len(), files_at, 0, files_at, file_table.len(), data_at] {
            level3.extend((value as u32).to_le_bytes());
        }
        level3.extend(dir_table);
        level3.extend(file_table);
        level3.resize(data_at, 0);
        level3.extend(data);
        let mut ivfc = b"IVFC\x00\x00\x01\x00".to_vec();
        put(&mut ivfc, 0x08, &master.to_le_bytes());
        put(&mut ivfc, 0x4C, &block.to_le_bytes());
        put(&mut ivfc, 0x54, &0x5Cu32.to_le_bytes());
        ivfc.resize((0x60 + master as usize).div_ceil(1 << block) * (1 << block), 0);
        [ivfc, level3].concat()
    }

    // An ExeFS of `.code` and a banner, then the RomFS, each starting on a media unit.
    pub fn ncch(title_id: u64, compressed: bool, code: &[u8], banner: &[u8], romfs: &[u8]) -> Vec<u8> {
        let mut exefs = vec![0; 0x200];
        put(&mut exefs, 0, b".code");
        put(&mut exefs, 12, &(code.len() as u32).to_le_bytes());
        let banner_at = code.len().div_ceil(0x200) * 0x200;
        put(&mut exefs, 0x10, b"banner");
        put(&mut exefs, 0x18, &(banner_at as u32).to_le_bytes());
        put(&mut exefs, 0x1C, &(banner.len() as u32).to_le_bytes());
        exefs.extend(code);
        pad(&mut exefs, 0x200);
        exefs.extend(banner);
        pad(&mut exefs, 0x200);
        let mut ncch = vec![0; 0x600];
        put(&mut ncch, 0x100, b"NCCH");
        put(&mut ncch, 0x108, &title_id.to_le_bytes());
        put(&mut ncch, 0x118, &title_id.to_le_bytes());
        put(&mut ncch, 0x180, &0x400u32.to_le_bytes());
        put(&mut ncch, 0x200, b"kujira-1");
        ncch[0x20D] = compressed as u8;
        let romfs_at = (0x600 + exefs.len()) / 0x200;
        for (at, value) in [(0x1A0, 3), (0x1A4, exefs.len() / 0x200), (0x1B0, romfs_at), (0x1B4, romfs.len() / 0x200)] {
            put(&mut ncch, at, &(value as u32).to_le_bytes());
        }
        ncch.extend(exefs);
        ncch.extend(romfs);
        pad(&mut ncch, 0x200);
        ncch
    }

    // The game in partition 0 at 0x4000 and noise standing for an encrypted manual in partition 1.
    pub fn ncsd(title_id: u64, game: &[u8], manual: &[u8]) -> Vec<u8> {
        let mut card = vec![0x5A; 0x100];
        card.resize(0x4000, 0);
        put(&mut card, 0x100, b"NCSD");
        put(&mut card, 0x108, &title_id.to_le_bytes());
        let manual_at = 0x4000 + game.len();
        for (at, value) in [(0x120, 0x4000), (0x124, game.len()), (0x128, manual_at), (0x12C, manual.len())] {
            put(&mut card, at, &((value / 0x200) as u32).to_le_bytes());
        }
        card.extend(game);
        card.extend(manual);
        card
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    const X: u64 = 0x0004000000055D00;

    fn romfs() -> Vec<u8> {
        build::romfs(&[("a/0/9/3", b"icons"), ("a/0/9/4", b"items"), ("a/1/top", b"other"), ("root", b"r")], 0x360, 12)
    }

    #[test]
    fn finds_romfs_files_by_path() {
        let rom = build::ncch(X, false, b"code", b"", &romfs());
        let mut title = Title::open(Cursor::new(&rom)).unwrap();

        assert_eq!(
            ["a/0/9/3", "a/0/9/4", "a/1/top", "root"].map(|path| title.file(path)),
            [Some(b"icons".to_vec()), Some(b"items".to_vec()), Some(b"other".to_vec()), Some(b"r".to_vec())]
        );
        for path in ["", "a", "a/0/9", "a/0/9/5", "a/0/8/3", "b/0/9/3", "a/0/9/3/x", "root/a"] {
            assert_eq!(title.file(path), None, "{path}");
        }
    }

    #[test]
    fn finds_level_3_from_the_ivfc_header() {
        let rom = build::ncch(X, false, b"code", b"", &build::romfs(&[("f", b"small blocks")], 0x20, 7));
        let mut title = Title::open(Cursor::new(&rom)).unwrap();

        assert_eq!(title.file("f"), Some(b"small blocks".to_vec()));
    }

    #[test]
    fn opens_the_game_in_a_cartridges_first_partition() {
        let rom = build::ncsd(X, &build::ncch(X, false, b"code", b"", &romfs()), &[0xA7; 0x400]);
        let mut title = Title::open(Cursor::new(&rom)).unwrap();

        assert_eq!(title.code(), Some(b"code".to_vec()));
        assert_eq!(title.file("a/0/9/4"), Some(b"items".to_vec()));
    }

    #[test]
    fn unpacks_code_when_the_extended_header_says_it_is_compressed() {
        // Read backwards: literals C, B and A, then 18 bytes copied from 3 bytes further on.
        let packed = [&b"pre"[..], &[0x00, 0xF0, b'A', b'B', b'C', 0x10, 14, 0, 0, 8, 7, 0, 0, 0]].concat();
        let rom = build::ncch(X, true, &packed, b"", &romfs());

        assert_eq!(Title::open(Cursor::new(&rom)).unwrap().code(), Some([&b"pre"[..], &b"ABC".repeat(7)].concat()));
    }

    #[test]
    fn opens_no_encrypted_game() {
        let mut rom = build::ncch(X, false, b"code", b"", &romfs());
        rom[0x600..0x608].copy_from_slice(&[0x8F, 0x13, 0xC2, 0x07, 0x99, 0x41, 0xE0, 0x3B]);

        assert!(Title::open(Cursor::new(&rom)).is_none());
        assert!(Title::open(Cursor::new([0; 0x400])).is_none());
    }

    #[test]
    fn opens_no_romfs_without_its_magic() {
        let mut romfs = romfs();
        romfs[0] = b'X';

        assert!(Title::open(Cursor::new(build::ncch(X, false, b"code", b"", &romfs))).is_none());
    }

    fn fingerprint(rom: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        Title::open(Cursor::new(rom)).unwrap().fingerprint(&mut out).unwrap();
        out
    }

    #[test]
    fn fingerprints_a_game_the_same_on_a_cartridge_and_alone() {
        let game = build::ncch(X, false, b"code", b"banner", &romfs());

        assert_eq!(fingerprint(&build::ncsd(X, &game, &[0xA7; 0x400])), fingerprint(&game));
    }

    #[test]
    fn fingerprints_a_game_whatever_its_ncch_flags_say() {
        let game = build::ncch(X, false, b"code", b"", &romfs());
        let mut flagged = game.clone();
        flagged[0x18B] = 1;
        flagged[0x18F] |= 4;

        assert_eq!(fingerprint(&flagged), fingerprint(&game));
    }

    #[test]
    fn fingerprints_another_title_or_a_change_to_its_code_or_romfs_apart() {
        let game = build::ncch(X, false, b"code", b"", &romfs());
        let mut rehashed = romfs();
        rehashed[0x60] ^= 1;
        let others = [
            build::ncch(X + 0x100, false, b"code", b"", &romfs()),
            build::ncch(X, false, b"hack", b"", &romfs()),
            build::ncch(X, false, b"code", b"", &build::romfs(&[("a/0/9/3", b"more icons")], 0x360, 12)),
            build::ncch(X, false, b"code", b"", &rehashed),
        ];

        for (k, other) in others.iter().enumerate() {
            assert_ne!(fingerprint(other), fingerprint(&game), "{k}");
        }
    }

    #[test]
    fn fingerprints_a_game_without_reading_its_romfs_data() {
        let data = vec![0x5A; 4 << 20];
        let rom = build::ncch(X, false, b"code", b"banner", &build::romfs(&[("a/0/9/3", &data)], 0x360, 12));
        let mut counted = build::Counted { rom: Cursor::new(&rom), read: 0 };

        Title::open(&mut counted).unwrap().fingerprint(&mut Vec::new()).unwrap();

        assert!(counted.read < 0x2000, "read {} bytes", counted.read);
    }

    #[test]
    fn unpacks_a_garc() {
        let file = build::garc(&[b"one", b"", b"three"]);
        let garc = Garc::open(&file).unwrap();

        assert_eq!(garc.len, 3);
        assert_eq!(
            [garc.get(0), garc.get(1), garc.get(2), garc.get(3)],
            [Some(&b"one"[..]), Some(&b""[..]), Some(&b"three"[..]), None]
        );
    }

    #[test]
    fn refuses_a_garc_with_a_wrong_magic() {
        let file = build::garc(&[b"one"]);
        for at in [0, 0x1C, 0x1C + 0x10, 0x1C + 0x10 + 0x1C] {
            let mut broken = file.clone();
            broken[at] ^= 0xFF;
            assert!(Garc::open(&broken).is_none(), "{at:#x}");
        }
    }

    #[test]
    fn reads_a_4_bit_picture_high_nibble_first_in_z_order() {
        let mut indices = vec![0; 32];
        indices[0] = 0x12;
        indices[1] = 0x30;
        let file = build::clim(8, 8, &[0x0000, 0xF801, 0x07C1, 0x003F], &indices);

        let picture = picture(&file).unwrap();

        assert_eq!((picture.width, picture.height), (8, 8));
        assert_eq!([picture.pixels[0], picture.pixels[1], picture.pixels[8], picture.pixels[9]], [1, 2, 3, 0]);
        assert_eq!(picture.palette, [[0, 0, 0, 0], [255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255]]);
    }

    #[test]
    fn crops_a_picture_from_its_tiles() {
        let mut indices = vec![0; 64 * 32];
        indices[64] = 5;
        indices[(8 * 2 + 4) * 64 + 63] = 6;
        let colours: Vec<u16> = (0..17).collect();
        let file = build::clim(40, 30, &colours, &indices);

        let picture = picture(&file).unwrap();

        assert_eq!((picture.width, picture.height, picture.pixels.len()), (40, 30, 1200));
        assert_eq!(picture.pixels[8], 5);
        assert_eq!(picture.pixels[23 * 40 + 39], 6);
    }

    #[test]
    fn unpacks_a_compressed_picture() {
        let file = build::clim(8, 8, &[0, 1], &[0x10; 32]);

        for packed in [lz77::stored(&file), lz77::stored_extended(&file)] {
            assert_eq!(picture(&packed), picture(&file));
        }
        assert_eq!(picture(&file).unwrap().pixels[..2], [1, 0]);
    }

    fn rgba_at(picture: &Picture, x: usize, y: usize) -> [u8; 4] {
        let at = (y * picture.width as usize + x) * 4;
        picture.pixels[at..at + 4].try_into().unwrap()
    }

    #[test]
    fn reads_a_flim_stored_a_quarter_turn_round() {
        let mut data = vec![0; 8 * 16 * 2];
        data[21 * 2..21 * 2 + 2].copy_from_slice(&0xF801u16.to_le_bytes());
        data[66 * 2..66 * 2 + 2].copy_from_slice(&0x07C1u16.to_le_bytes());

        let picture = picture(&build::flim(16, 8, 7, 4, &data)).unwrap();

        assert_eq!((picture.width, picture.height, picture.pixels.len()), (16, 8, 16 * 8 * 4));
        assert!(picture.palette.is_empty());
        assert_eq!(
            [rgba_at(&picture, 0, 0), rgba_at(&picture, 9, 7), rgba_at(&picture, 1, 0)],
            [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 0, 0]]
        );
    }

    #[test]
    fn reads_flims_in_each_rgba_format() {
        let rgba4 = [0x1234u16.to_le_bytes().repeat(64)].concat();
        let rgba8 = [0x40, 0x30, 0x20, 0x10].repeat(64);

        let pictures = [build::flim(8, 8, 8, 0, &rgba4), build::flim(8, 8, 9, 0, &rgba8)].map(|f| picture(&f).unwrap());

        assert_eq!(pictures.each_ref().map(|p| rgba_at(p, 7, 7)), [[17, 34, 51, 68], [0x10, 0x20, 0x30, 0x40]]);
    }

    #[test]
    fn unpacks_a_compressed_flim() {
        let file = build::flim(8, 8, 7, 0, &[0xFF; 128]);

        assert_eq!(picture(&lz77::stored_extended(&file)), picture(&file));
        assert_eq!(rgba_at(&picture(&file).unwrap(), 3, 3), [255, 255, 255, 255]);
    }

    #[test]
    fn refuses_a_flim_in_another_format_or_short_of_pixels() {
        for file in [
            build::flim(8, 8, 0x0B, 0, &[0; 128]),
            build::flim(8, 8, 7, 8, &[0; 128]),
            build::flim(8, 8, 7, 0, &[0; 126]),
            build::flim(12, 8, 7, 0, &[0; 192]),
        ] {
            assert!(picture(&file).is_none());
        }
    }

    #[test]
    fn reads_an_rgba_clim_from_a_texture_sized_up_to_powers_of_two() {
        let mut data = vec![0; 16 * 8 * 2];
        data[57 * 2..57 * 2 + 2].copy_from_slice(&0x1234u16.to_le_bytes());
        data[127 * 2..127 * 2 + 2].copy_from_slice(&0xF00Fu16.to_le_bytes());

        let picture = render(&build::rgba_clim(12, 8, 8, &data)).unwrap();

        assert_eq!((picture.width, picture.height, picture.pixels.len()), (12, 8, 12 * 8 * 4));
        assert!(picture.palette.is_empty());
        assert_eq!(
            [rgba_at(&picture, 5, 6), rgba_at(&picture, 11, 7), rgba_at(&picture, 0, 0)],
            [[17, 34, 51, 68], [0, 0, 0, 0], [0, 0, 0, 0]]
        );
    }

    #[test]
    fn reads_rgba_clims_in_each_rgba_format() {
        let rgba5551 = [0xF801u16.to_le_bytes().repeat(64)].concat();
        let rgba8 = [0x40, 0x30, 0x20, 0x10].repeat(64);

        let pictures =
            [build::rgba_clim(8, 8, 7, &rgba5551), build::rgba_clim(8, 8, 9, &rgba8)].map(|f| render(&f).unwrap());

        assert_eq!(pictures.each_ref().map(|p| rgba_at(p, 7, 7)), [[255, 0, 0, 255], [0x10, 0x20, 0x30, 0x40]]);
    }

    #[test]
    fn unpacks_a_compressed_rgba_clim() {
        let file = build::rgba_clim(8, 8, 8, &[0xFF; 128]);

        assert_eq!(render(&lz77::stored_extended(&file)), render(&file));
        assert_eq!(rgba_at(&render(&file).unwrap(), 3, 3), [255, 255, 255, 255]);
    }

    #[test]
    fn refuses_an_rgba_clim_in_another_format_or_short_of_pixels() {
        for file in [
            build::rgba_clim(8, 8, 0x0B, &[0; 128]),
            build::rgba_clim(8, 8, 0x107, &[0; 128]),
            build::rgba_clim(8, 8, 7, &[0; 126]),
            build::rgba_clim(12, 8, 7, &[0; 192]),
            build::rgba_clim(0, 8, 7, &[0; 128]),
            build::flim(8, 8, 7, 0, &[0; 128]),
        ] {
            assert!(render(&file).is_none());
        }
    }

    fn etc1a4_block(alpha: u64, colours: u32, selectors: u32) -> Vec<u8> {
        let block = (colours as u64) << 32 | selectors as u64;
        [alpha.to_le_bytes(), block.to_le_bytes()].concat()
    }

    // The top left block sets each half's colour outright, with a red half and a blue half side by side, and the top
    // right block sets one colour and a difference for the other, with the halves one above the other.
    fn etc1a4_tile() -> Vec<u8> {
        let alpha = !(0xF << 16) | 7 << 16;
        [
            etc1a4_block(alpha, 0xF080_0F1C, 1 << 16 | 1),
            etc1a4_block(0, 0x87F8_032B, 0xFFFF),
            etc1a4_block(!0, 0, 0),
            etc1a4_block(0, 0, 0),
        ]
        .concat()
    }

    #[test]
    fn reads_an_etc1a4_texture_block_by_block() {
        let file = build::texture("pokepic_025_00m_n_picfl.tga", 8, 8, 0x2B, &etc1a4_tile());

        let texture = texture(&file).unwrap();

        assert_eq!(texture.name, "pokepic_025_00m_n_picfl.tga");
        let picture = texture.picture;
        assert_eq!((picture.width, picture.height, picture.pixels.len(), picture.palette.len()), (8, 8, 256, 0));
        let at = |x, y| rgba_at(&picture, x, y);
        assert_eq!([at(0, 0), at(1, 0), at(3, 0)], [[247, 128, 0, 255], [255, 138, 2, 0x77], [47, 47, 255, 255]]);
        let (top, bottom) = ([149, 255, 17, 0], [152, 255, 53, 0]);
        assert_eq!([at(4, 0), at(7, 1), at(4, 3), at(7, 2)], [top, top, bottom, bottom]);
        assert_eq!([at(0, 4), at(4, 4)], [[2, 2, 2, 255], [2, 2, 2, 0]]);
    }

    #[test]
    fn unpacks_a_compressed_texture() {
        let file = build::texture("name", 8, 8, 0x2B, &etc1a4_tile());
        let packed = lz77::stored_extended(&file);

        assert_eq!(texture(&packed).map(|t| t.picture), texture(&file).map(|t| t.picture));
    }

    #[test]
    fn refuses_a_texture_in_another_format_or_short_of_pixels() {
        let mut misnamed = build::texture("name", 8, 8, 0x2B, &etc1a4_tile());
        misnamed[8] = b'T';
        for file in [
            build::texture("name", 8, 8, 0x2A, &etc1a4_tile()),
            build::texture("name", 8, 8, 0x2B, &etc1a4_tile()[..63]),
            build::texture("name", 8, 12, 0x2B, &[0; 96]),
            misnamed,
        ] {
            assert!(texture(&file).is_none());
        }
    }

    #[test]
    fn crops_a_picture_round_its_centre() {
        let mut data = vec![0; 8 * 16 * 2];
        data[71 * 2..71 * 2 + 2].copy_from_slice(&0x07C1u16.to_le_bytes());
        let paletted = picture(&build::clim(5, 4, &[0, 1, 2], &[0x12; 32])).unwrap();

        let rgba = picture(&build::flim(16, 8, 7, 4, &data)).unwrap().centred(12, 6);
        let cropped = paletted.clone().centred(3, 2);

        assert_eq!((rgba.width, rgba.height, rgba.pixels.len()), (12, 6, 12 * 6 * 4));
        assert_eq!(rgba_at(&rgba, 7, 3), [0, 255, 0, 255]);
        assert_eq!((cropped.width, cropped.height, cropped.palette.len()), (3, 2, 3));
        assert_eq!(cropped.pixels, [paletted.pixels[6..9].to_vec(), paletted.pixels[11..14].to_vec()].concat());
        assert_eq!(paletted.clone().centred(40, 30), paletted);
    }

    #[test]
    fn refuses_a_picture_short_of_pixels_or_colours() {
        assert!(picture(&build::clim(8, 8, &[0, 1], &[0; 31])).is_none());
        assert!(picture(&build::clim(8, 8, &[0, 1], &[0x20; 32])).is_none());
        assert!(picture(&build::clim(8, 8, &[], &[0; 32])).is_none());
        assert!(picture(&[0; 0x27]).is_none());
    }
}
