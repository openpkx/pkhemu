mod blz;
mod gb;
mod gen1;
mod gen2;
mod gen3;
mod gen4;
mod gen5;
mod gen6;
mod gen7;
mod header;
mod key;
mod lz77;
mod nds;
mod three_ds;

pub use header::{identify, n64_big_endian, Game, Platform};
pub use key::Key;
use std::io::{Cursor, Read, Seek, SeekFrom, Write};

pub const DECODER_VERSION: u32 = 19;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Status {
    Done,
    Partial,
    Unsupported,
}

impl Status {
    pub fn as_str(self) -> &'static str {
        match self {
            Status::Done => "done",
            Status::Partial => "partial",
            Status::Unsupported => "unsupported",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Image {
    pub key: Key,
    pub width: u32,
    pub height: u32,
    /// Indices into the palette, or RGBA, four bytes a pixel, when the palette is empty.
    pub pixels: Vec<u8>,
    pub palette: Vec<[u8; 4]>,
}

impl Image {
    pub fn rgba(&self) -> Vec<u8> {
        if self.palette.is_empty() {
            return self.pixels.clone();
        }
        self.pixels.iter().flat_map(|&index| self.palette[index as usize]).collect()
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Frame {
    pub pixels: Vec<u8>,
    /// In game frames, 60 to the second.
    pub delay: u16,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AnimatedSprite {
    pub key: Key,
    pub width: u32,
    pub height: u32,
    pub palette: Vec<[u8; 4]>,
    pub frames: Vec<Frame>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Extracted {
    pub game: Option<Game>,
    pub images: Vec<Image>,
    pub animations: Vec<AnimatedSprite>,
    pub status: Status,
}

fn still((images, status): (Vec<Image>, Status)) -> (Vec<Image>, Vec<AnimatedSprite>, Status) {
    (images, Vec::new(), status)
}

fn handed_over(
    (images, animations, status): (Vec<Image>, Vec<AnimatedSprite>, Status),
    animated: &mut dyn FnMut(AnimatedSprite),
) -> (Vec<Image>, Status) {
    animations.into_iter().for_each(animated);
    (images, status)
}

pub fn extract(rom: &[u8]) -> Extracted {
    let mut animations = Vec::new();
    let extracted = extract_each(rom, |animation| animations.push(animation));
    Extracted { animations, ..extracted }
}

pub fn extract_each(rom: &[u8], animated: impl FnMut(AnimatedSprite)) -> Extracted {
    extract_each_from(Cursor::new(rom), animated).expect("a slice reads without errors")
}

const HEADER: u64 = 0x200;
// Gen 3 finds its tables by scanning the whole ROM, and a GBA ROM is 32 MB at most, so GB and GBA ROMs are read whole.
const WHOLE_READ_LIMIT: u64 = 32 << 20;

// Gen 5's animations take most of a gigabyte together, so this hands each one over as it's drawn and keeps none.
pub fn extract_each_from(
    rom: impl Read + Seek,
    mut animated: impl FnMut(AnimatedSprite),
) -> std::io::Result<Extracted> {
    let mut rom = Watched { rom, error: None };
    let game = identify(&read_up_to(&mut rom, HEADER)?);
    let (images, status) = match &game {
        Some(game) if game.platform == Platform::Gba && gen3::is_gen3(&game.code) => {
            handed_over(gen3::extract(&read_up_to(&mut rom, WHOLE_READ_LIMIT)?), &mut animated)
        }
        Some(game) if game.platform == Platform::Nds => {
            match (gen4::Build::of(&game.code), gen5::Build::of(&game.code)) {
                (Some(build), _) => handed_over(gen4::extract(&mut rom, build), &mut animated),
                (_, Some(build)) => gen5::extract(&mut rom, build, &mut animated),
                _ => (Vec::new(), Status::Unsupported),
            }
        }
        Some(game) if game.platform == Platform::ThreeDs => {
            match (gen6::Build::of(&game.code), gen7::Build::of(&game.code)) {
                (Some(build), _) => gen6::extract(&mut rom, build),
                (_, Some(build)) => gen7::extract(&mut rom, build),
                _ => (Vec::new(), Status::Unsupported),
            }
        }
        Some(game) if matches!(game.platform, Platform::Gb | Platform::Gbc) => {
            handed_over(gb::extract(&read_up_to(&mut rom, WHOLE_READ_LIMIT)?, &game.title), &mut animated)
        }
        _ => (Vec::new(), Status::Unsupported),
    };
    match rom.error {
        Some(e) => Err(e),
        None => Ok(Extracted { game, images, animations: Vec::new(), status }),
    }
}

// A 3DS dump runs to gigabytes, so it is told apart by the parts the decoder reads. Other ROMs are told apart by all
// their bytes, and for those this writes nothing and returns false.
pub fn fingerprint(rom: impl Read + Seek, out: &mut dyn Write) -> std::io::Result<bool> {
    let mut rom = Watched { rom, error: None };
    let start = read_up_to(&mut rom, HEADER)?;
    if !identify(&start).is_some_and(|game| game.platform == Platform::ThreeDs) {
        return Ok(false);
    }
    if three_ds::Title::open(&mut rom).and_then(|mut title| title.fingerprint(out)).is_none() {
        out.write_all(&start)?;
    }
    rom.error.map_or(Ok(true), Err)
}

fn read_up_to<R: Read + Seek>(rom: &mut R, len: u64) -> std::io::Result<Vec<u8>> {
    rom.rewind()?;
    let mut bytes = Vec::new();
    rom.take(len).read_to_end(&mut bytes)?;
    Ok(bytes)
}

// The DS decoders take any failed read for a broken ROM, so this keeps a disk error from passing as an unsupported ROM.
struct Watched<R> {
    rom: R,
    error: Option<std::io::Error>,
}

impl<R> Watched<R> {
    fn watch<T>(&mut self, result: std::io::Result<T>) -> std::io::Result<T> {
        if let Err(e) = &result {
            if self.error.is_none() && e.kind() != std::io::ErrorKind::Interrupted {
                self.error = Some(std::io::Error::new(e.kind(), e.to_string()));
            }
        }
        result
    }
}

impl<R: Read> Read for Watched<R> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let result = self.rom.read(buf);
        self.watch(result)
    }
}

impl<R: Seek> Seek for Watched<R> {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        let result = self.rom.seek(pos);
        self.watch(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn supports_no_rom_it_cannot_identify() {
        let extracted = extract(&[0; 0x200]);

        assert_eq!(extracted.images, []);
        assert_eq!(extracted.animations, []);
        assert_eq!(extracted.status, Status::Unsupported);
    }

    struct FailingPast<'a> {
        rom: Cursor<&'a [u8]>,
        at: u64,
    }

    impl Read for FailingPast<'_> {
        fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
            if self.rom.position() + buf.len() as u64 > self.at {
                return Err(std::io::Error::other("disk gone"));
            }
            self.rom.read(buf)
        }
    }

    impl Seek for FailingPast<'_> {
        fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
            self.rom.seek(pos)
        }
    }

    #[test]
    fn fails_when_the_rom_cannot_be_read_rather_than_calling_it_unsupported() {
        let mut rom = nds::build::cartridge(&nds::build::narc(&[]), b"");
        rom[0x0C..0x10].copy_from_slice(b"IPKE");
        let crc = header::crc16(&rom[..0x15E]);
        rom[0x15E..0x160].copy_from_slice(&crc.to_le_bytes());

        let read = extract_each_from(FailingPast { rom: Cursor::new(&rom), at: HEADER }, |_| ());

        assert_eq!(read.map_err(|e| e.to_string()), Err("disk gone".into()));
        assert_eq!(extract(&rom).status, Status::Unsupported);
    }

    fn fingerprint_of(rom: &[u8]) -> (bool, Vec<u8>) {
        let mut out = Vec::new();
        (fingerprint(Cursor::new(rom), &mut out).unwrap(), out)
    }

    #[test]
    fn fingerprints_only_3ds_games() {
        let rom = nds::build::cartridge(&nds::build::narc(&[]), b"");

        assert_eq!(fingerprint_of(&rom), (false, Vec::new()));
        assert_eq!(fingerprint_of(&[0; 0x200]), (false, Vec::new()));
    }

    #[test]
    fn fingerprints_a_3ds_game_it_cannot_open_by_its_header() {
        let game = |title_id| {
            let mut rom = three_ds::build::ncch(title_id, false, b"code", b"", &[0; 0x200]);
            rom[0x600..0x608].copy_from_slice(&[0x8F, 0x13, 0xC2, 0x07, 0x99, 0x41, 0xE0, 0x3B]);
            rom
        };
        let (x, y) = (game(0x0004000000055D00), game(0x0004000000055E00));

        assert_eq!(fingerprint_of(&x), (true, x[..0x200].to_vec()));
        assert_ne!(fingerprint_of(&x), fingerprint_of(&y));
    }

    #[test]
    fn fails_to_fingerprint_a_3ds_game_it_cannot_read() {
        let rom = three_ds::build::ncch(0x0004000000055D00, false, b"code", b"", &[0; 0x200]);

        let read = fingerprint(FailingPast { rom: Cursor::new(&rom), at: 0x400 }, &mut Vec::new());

        assert_eq!(read.map_err(|e| e.to_string()), Err("disk gone".into()));
    }

    #[test]
    fn names_each_status() {
        assert_eq!(
            [Status::Done, Status::Partial, Status::Unsupported].map(Status::as_str),
            ["done", "partial", "unsupported"]
        );
    }
}
