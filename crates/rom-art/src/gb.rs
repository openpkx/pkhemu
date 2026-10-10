use crate::{gen1, gen2, AnimatedSprite, Image, Key, Status};

pub const TILE: usize = 16;
const BANK: usize = 0x4000;
const BOX: usize = 7;
pub const SPRITE_SIZE: usize = BOX * 8;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Far {
    pub bank: u8,
    pub address: u16,
}

pub const fn far(bank: u8, address: u16) -> Far {
    Far { bank, address }
}

impl Far {
    pub fn plus(self, offset: usize) -> Far {
        far(self.bank, self.address.wrapping_add(offset as u16))
    }
}

pub struct Rom<'a>(pub &'a [u8]);

impl<'a> Rom<'a> {
    // A read stops at the end of the bank, as the game's own reads do.
    pub fn rest_of_bank(&self, at: Far) -> Option<&'a [u8]> {
        let address = at.address as usize;
        let (start, end) = match (at.bank, address) {
            (0, 0..BANK) => (address, BANK),
            (1.., BANK..0x8000) => (at.bank as usize * BANK + address - BANK, (at.bank as usize + 1) * BANK),
            _ => return None,
        };
        self.0.get(start..end.min(self.0.len())).filter(|bytes| !bytes.is_empty())
    }

    pub fn bytes(&self, at: Far, len: usize) -> Option<&'a [u8]> {
        self.rest_of_bank(at)?.get(..len)
    }

    pub fn u16(&self, at: Far) -> Option<u16> {
        let bytes = self.bytes(at, 2)?;
        Some(u16::from_le_bytes([bytes[0], bytes[1]]))
    }
}

pub fn colours(bytes: &[u8]) -> [u16; 4] {
    [0, 2, 4, 6].map(|at| u16::from_le_bytes([bytes[at], bytes[at + 1]]))
}

pub fn palette(colours: [u16; 4]) -> Vec<[u8; 4]> {
    let channel = |value: u16| {
        let five = (value & 0x1F) as u8;
        five << 3 | five >> 2
    };
    colours
        .iter()
        .enumerate()
        .map(|(i, &c)| [channel(c), channel(c >> 5), channel(c >> 10), if i == 0 { 0 } else { 0xFF }])
        .collect()
}

pub type Tile = [[u8; 8]; 8];

pub fn tile(bytes: &[u8]) -> Tile {
    let mut tile = [[0; 8]; 8];
    for (row, pair) in tile.iter_mut().zip(bytes.chunks(2)) {
        for (x, pixel) in row.iter_mut().enumerate() {
            *pixel = pair[0] >> (7 - x) & 1 | (pair[1] >> (7 - x) & 1) << 1;
        }
    }
    tile
}

pub fn flipped(mut tile: Tile) -> Tile {
    for row in tile.iter_mut() {
        row.reverse();
    }
    tile
}

#[derive(Clone, Copy)]
pub enum Order {
    ByColumn,
    ByRow,
}

pub fn compose(tiles: &[Tile], columns: usize, rows: usize, order: Order) -> Vec<u8> {
    let width = columns * 8;
    let mut pixels = vec![0; width * rows * 8];
    for (n, tile) in tiles.iter().enumerate().take(columns * rows) {
        let (column, row) = match order {
            Order::ByColumn => (n / rows, n % rows),
            Order::ByRow => (n % columns, n / columns),
        };
        for (y, line) in tile.iter().enumerate() {
            let at = (row * 8 + y) * width + column * 8;
            pixels[at..at + 8].copy_from_slice(line);
        }
    }
    pixels
}

// Both generations centre a smaller picture in a 7x7 tile box, rounding left, and sit it on the bottom.
pub fn pad(pixels: &[u8], width: usize, height: usize) -> Vec<u8> {
    let (left, top) = ((BOX + 1 - width) / 2 * 8, (BOX - height) * 8);
    let mut out = vec![0; SPRITE_SIZE * SPRITE_SIZE];
    for (y, line) in pixels.chunks(width * 8).enumerate() {
        let at = (top + y) * SPRITE_SIZE + left;
        out[at..at + line.len()].copy_from_slice(line);
    }
    out
}

pub fn image(key: Key, size: usize, pixels: Vec<u8>, palette: Vec<[u8; 4]>) -> Image {
    Image { key, width: size as u32, height: size as u32, pixels, palette }
}

const INSIDE_WHITE: u8 = 4;

pub fn sprite(key: Key, pixels: Vec<u8>, colours: [u16; 4]) -> Image {
    image(key, SPRITE_SIZE, whiten_inside(pixels), sprite_palette(colours))
}

// Colour 0 is both the background and the white inside a picture, so only colour 0 reachable from the edge is clear.
pub fn whiten_inside(mut pixels: Vec<u8>) -> Vec<u8> {
    let size = SPRITE_SIZE;
    let mut outside = vec![false; pixels.len()];
    let mut next: Vec<usize> =
        (0..size).flat_map(|i| [i, (size - 1) * size + i, i * size, i * size + size - 1]).collect();
    while let Some(at) = next.pop() {
        if outside[at] || pixels[at] != 0 {
            continue;
        }
        outside[at] = true;
        let (x, y) = (at % size, at / size);
        next.extend(
            [
                (x > 0).then(|| at - 1),
                (x + 1 < size).then(|| at + 1),
                (y > 0).then(|| at - size),
                (y + 1 < size).then(|| at + size),
            ]
            .into_iter()
            .flatten(),
        );
    }
    for (pixel, outside) in pixels.iter_mut().zip(outside) {
        if *pixel == 0 && !outside {
            *pixel = INSIDE_WHITE;
        }
    }
    pixels
}

pub fn sprite_palette(colours: [u16; 4]) -> Vec<[u8; 4]> {
    let mut palette = palette(colours);
    palette.push([palette[0][0], palette[0][1], palette[0][2], 0xFF]);
    palette
}

enum Decoder {
    Gen1(&'static gen1::Tables),
    Gen2(&'static gen2::Tables),
}

struct Build {
    title: &'static str,
    cgb: u8,
    checksum: u16,
    decoder: Decoder,
}

const fn build(title: &'static str, cgb: u8, checksum: u16, decoder: Decoder) -> Build {
    Build { title, cgb, checksum, decoder }
}

const BUILDS: [Build; 12] = [
    build("POKEMON RED", 0x00, 0x91E6, Decoder::Gen1(&gen1::RED_BLUE)),
    build("POKEMON BLUE", 0x00, 0x9D0A, Decoder::Gen1(&gen1::RED_BLUE)),
    build("POKEMON YELLOW", 0x80, 0x047C, Decoder::Gen1(&gen1::YELLOW)),
    build("POKEMON RED", 0x00, 0xA2C1, Decoder::Gen1(&gen1::JAPANESE)),
    build("POKEMON RED", 0x00, 0xB866, Decoder::Gen1(&gen1::JAPANESE)),
    build("POKEMON GREEN", 0x00, 0xDDD5, Decoder::Gen1(&gen1::JAPANESE)),
    build("POKEMON GREEN", 0x00, 0xF547, Decoder::Gen1(&gen1::JAPANESE)),
    build("POKEMON_GLDAAUE", 0x80, 0x682D, Decoder::Gen2(&gen2::GOLD)),
    build("POKEMON_SLVAAXE", 0x80, 0x0DAE, Decoder::Gen2(&gen2::SILVER)),
    build("PM_CRYSTAL", 0xC0, 0x129F, Decoder::Gen2(&gen2::CRYSTAL)),
    build("PM_CRYSTAL", 0xC0, 0x18D2, Decoder::Gen2(&gen2::CRYSTAL)),
    build("PM_CRYSTAL", 0xC0, 0xAF7C, Decoder::Gen2(&gen2::CRYSTAL)),
];

const CGB_FLAG: usize = 0x143;
const CHECKSUM: usize = 0x14E;

// The global checksum sums every byte but its own two, so a patched ROM that kept the header no longer matches.
fn checksum(rom: &[u8]) -> Option<u16> {
    let stored = u16::from_be_bytes([*rom.get(CHECKSUM)?, *rom.get(CHECKSUM + 1)?]);
    let sum = rom.iter().fold(0u16, |sum, &b| sum.wrapping_add(b as u16));
    let own = (stored >> 8) + (stored & 0xFF);
    (sum.wrapping_sub(own) == stored).then_some(stored)
}

pub fn extract(rom: &[u8], title: &str) -> (Vec<Image>, Vec<AnimatedSprite>, Status) {
    let checksum = checksum(rom);
    let found = BUILDS.iter().find(|build| {
        build.title == title && rom.get(CGB_FLAG) == Some(&build.cgb) && checksum == Some(build.checksum)
    });
    match found.map(|build| &build.decoder) {
        Some(Decoder::Gen1(tables)) => crate::still(gen1::extract(&Rom(rom), tables)),
        Some(Decoder::Gen2(tables)) => gen2::extract(&Rom(rom), tables),
        None => (Vec::new(), Vec::new(), Status::Unsupported),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_banked_addresses_up_to_the_end_of_their_bank() {
        let rom: Vec<u8> = (0..4 * BANK).map(|i| (i / BANK) as u8).collect();
        let rom = Rom(&rom);

        assert_eq!(rom.rest_of_bank(far(0, 0x3FFF)), Some(&[0][..]));
        assert_eq!(rom.rest_of_bank(far(2, 0x7FFE)), Some(&[2, 2][..]));
        assert_eq!(rom.bytes(far(3, 0x4000), 3), Some(&[3, 3, 3][..]));
        assert_eq!(rom.bytes(far(2, 0x7FFF), 2), None);
        assert_eq!(rom.rest_of_bank(far(0, 0x4000)), None);
        assert_eq!(rom.rest_of_bank(far(1, 0x3FFF)), None);
        assert_eq!(rom.rest_of_bank(far(4, 0x4000)), None);
    }

    #[test]
    fn reads_game_boy_colours_with_the_first_clear() {
        assert_eq!(
            palette([0x7FFF, 0x001F, 0x7C00, 0x0000]),
            [[0xFF, 0xFF, 0xFF, 0], [0xFF, 0, 0, 0xFF], [0, 0, 0xFF, 0xFF], [0, 0, 0, 0xFF]]
        );
    }

    #[test]
    fn reads_a_tile_two_planes_per_row() {
        let mut bytes = [0; TILE];
        bytes[0] = 0b1010_0000;
        bytes[1] = 0b1100_0000;

        assert_eq!(tile(&bytes)[0], [3, 2, 1, 0, 0, 0, 0, 0]);
        assert_eq!(flipped(tile(&bytes))[0], [0, 0, 0, 0, 0, 1, 2, 3]);
    }

    #[test]
    fn lays_tiles_out_by_column_or_by_row() {
        let tiles: Vec<Tile> = (0..4).map(|n| [[n; 8]; 8]).collect();

        let by_column = compose(&tiles, 2, 2, Order::ByColumn);
        let by_row = compose(&tiles, 2, 2, Order::ByRow);

        assert_eq!([by_column[0], by_column[8], by_column[8 * 16], by_column[8 * 16 + 8]], [0, 2, 1, 3]);
        assert_eq!([by_row[0], by_row[8], by_row[8 * 16], by_row[8 * 16 + 8]], [0, 1, 2, 3]);
    }

    #[test]
    fn clears_only_the_white_around_a_sprite() {
        let mut pixels = vec![0; SPRITE_SIZE * SPRITE_SIZE];
        for at in [2, SPRITE_SIZE + 1, SPRITE_SIZE + 3, 2 * SPRITE_SIZE + 2] {
            pixels[at] = 3;
        }

        let image = sprite(Key::Egg, pixels, [0x7FFF, 0, 0, 0]);

        assert_eq!(&image.pixels[SPRITE_SIZE..SPRITE_SIZE + 5], [0, 3, 4, 3, 0]);
        assert_eq!(image.pixels[0], 0);
        assert_eq!(image.palette[0][3], 0);
        assert_eq!(image.palette[4], [0xFF, 0xFF, 0xFF, 0xFF]);
    }

    #[test]
    fn centres_a_small_picture_on_the_bottom_of_the_box() {
        let padded = pad(&[1; 40 * 40], 5, 5);

        assert_eq!(padded[16 * SPRITE_SIZE + 8], 1);
        assert_eq!(padded[16 * SPRITE_SIZE + 7], 0);
        assert_eq!(padded[15 * SPRITE_SIZE + 8], 0);
        assert_eq!(padded[SPRITE_SIZE * SPRITE_SIZE - 9], 1);
        assert_eq!(padded[SPRITE_SIZE * SPRITE_SIZE - 8], 0);
        assert_eq!(pad(&[1; 56 * 56], 7, 7), vec![1; 56 * 56]);
    }

    fn with_header(title: &[u8], cgb: u8, fix_checksum: bool) -> Vec<u8> {
        let mut rom = vec![0; 2 * BANK];
        rom[0x134..0x134 + title.len()].copy_from_slice(title);
        rom[CGB_FLAG] = cgb;
        rom[0x14D] = rom[0x134..0x14D].iter().fold(0u8, |sum, &b| sum.wrapping_sub(b).wrapping_sub(1));
        if fix_checksum {
            let sum = rom.iter().fold(0u16, |sum, &b| sum.wrapping_add(b as u16));
            rom[CHECKSUM..CHECKSUM + 2].copy_from_slice(&sum.to_be_bytes());
        }
        rom
    }

    #[test]
    fn checks_the_global_checksum_against_the_rom() {
        let rom = with_header(b"POKEMON RED", 0, true);
        let mut patched = rom.clone();
        patched[0x5000] = 1;

        assert!(checksum(&rom).is_some());
        assert_eq!(checksum(&patched), None);
    }

    #[test]
    fn supports_no_build_it_does_not_know() {
        let rom = with_header(b"POKEMON RED", 0, true);

        assert_eq!(extract(&rom, "POKEMON RED"), (Vec::new(), Vec::new(), Status::Unsupported));
    }
}
