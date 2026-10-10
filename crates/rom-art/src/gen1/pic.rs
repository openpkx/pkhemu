pub struct Picture {
    pub width: usize,
    pub height: usize,
    pub pixels: Vec<u8>,
}

struct Bits<'a> {
    data: &'a [u8],
    at: usize,
}

impl Bits<'_> {
    fn bit(&mut self) -> Option<usize> {
        let byte = self.data.get(self.at / 8)?;
        let bit = byte >> (7 - self.at % 8) & 1;
        self.at += 1;
        Some(bit as usize)
    }

    fn read(&mut self, count: usize) -> Option<usize> {
        (0..count).try_fold(0, |value, _| Some(value << 1 | self.bit()?))
    }
}

// A plane is stored a column of bytes at a time, each byte eight pixels of one row.
struct Plane {
    bytes: Vec<u8>,
    rows: usize,
}

impl Plane {
    // Pairs of pixels arrive down each column, then shift right two pixels, then move to the next column.
    fn fill(&mut self, bits: &mut Bits) -> Option<()> {
        let total = self.bytes.len() * 4;
        let mut written = 0;
        let mut write = |pair: usize| {
            let (column, within) = (written / (self.rows * 4), written % (self.rows * 4));
            self.bytes[column * self.rows + within % self.rows] |= (pair as u8) << (6 - 2 * (within / self.rows));
            written += 1;
            written == total
        };
        let mut zeros = bits.bit()? == 0;
        loop {
            if zeros {
                let mut ones = 0;
                while bits.bit()? == 1 {
                    ones += 1;
                    if ones == 16 {
                        return None;
                    }
                }
                let count = (1 << (ones + 1)) - 1 + bits.read(ones + 1)?;
                for _ in 0..count {
                    if write(0) {
                        return Some(());
                    }
                }
            } else {
                loop {
                    let pair = bits.read(2)?;
                    if pair == 0 {
                        break;
                    }
                    if write(pair) {
                        return Some(());
                    }
                }
            }
            zeros = !zeros;
        }
    }

    // Each set bit flips the pixel from the one to its left, starting clear at each row.
    fn undo_changes(&mut self) {
        let columns = self.bytes.len() / self.rows;
        for row in 0..self.rows {
            let mut pixel = 0;
            for column in 0..columns {
                let byte = &mut self.bytes[column * self.rows + row];
                let mut decoded = 0;
                for bit in (0..8).rev() {
                    pixel ^= *byte >> bit & 1;
                    decoded |= pixel << bit;
                }
                *byte = decoded;
            }
        }
    }

    fn xor(&mut self, other: &Plane) {
        for (byte, other) in self.bytes.iter_mut().zip(&other.bytes) {
            *byte ^= other;
        }
    }

    fn pixel(&self, x: usize, y: usize) -> u8 {
        self.bytes[x / 8 * self.rows + y] >> (7 - x % 8) & 1
    }
}

pub fn decompress(data: &[u8]) -> Option<Picture> {
    let mut bits = Bits { data, at: 0 };
    let (width, height) = (bits.read(4)?, bits.read(4)?);
    if !(1..=7).contains(&width) || !(1..=7).contains(&height) {
        return None;
    }
    let rows = height * 8;
    let mut planes = [0, 1].map(|_| Plane { bytes: vec![0; width * rows], rows });
    let first = bits.bit()?;
    let second = 1 - first;
    planes[first].fill(&mut bits)?;
    let mode = match bits.bit()? {
        0 => 0,
        _ => 1 + bits.bit()?,
    };
    planes[second].fill(&mut bits)?;
    let [low, high] = &mut planes;
    let (first_plane, second_plane) = if first == 0 { (low, high) } else { (high, low) };
    match mode {
        0 => {
            first_plane.undo_changes();
            second_plane.undo_changes();
        }
        1 => {
            first_plane.undo_changes();
            second_plane.xor(first_plane);
        }
        _ => {
            second_plane.undo_changes();
            first_plane.undo_changes();
            second_plane.xor(first_plane);
        }
    }
    let pixels = (0..rows)
        .flat_map(|y| (0..width * 8).map(move |x| (x, y)))
        .map(|(x, y)| planes[0].pixel(x, y) | planes[1].pixel(x, y) << 1)
        .collect();
    Some(Picture { width, height, pixels })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pack(bits: &str) -> Vec<u8> {
        let bits: Vec<u8> = bits.bytes().filter(|b| !b.is_ascii_whitespace()).map(|b| b - b'0').collect();
        bits.chunks(8).map(|chunk| chunk.iter().enumerate().fold(0, |byte, (i, &bit)| byte | bit << (7 - i))).collect()
    }

    const ONE_BY_ONE: &str = "0001 0001";
    const ALL_ZEROS: &str = "0 11110 00001";
    const TOP_LEFT_PAIR: &str = "1 01 00 11110 00000";
    const TWO_TOP_LEFT_PAIRS: &str = "1 01 01 00 1110 1111";

    fn rows(picture: &Picture) -> Vec<&[u8]> {
        picture.pixels.chunks(picture.width * 8).collect()
    }

    #[test]
    fn reads_a_blank_picture_from_two_runs_of_zeros() {
        let picture = decompress(&pack(&[ONE_BY_ONE, "0", ALL_ZEROS, "0", ALL_ZEROS].concat())).unwrap();

        assert_eq!((picture.width, picture.height), (1, 1));
        assert_eq!(picture.pixels, vec![0; 64]);
    }

    #[test]
    fn decodes_each_row_as_changes_from_the_pixel_to_its_left() {
        let picture = decompress(&pack(&[ONE_BY_ONE, "0", TOP_LEFT_PAIR, "0", ALL_ZEROS].concat())).unwrap();

        assert_eq!(rows(&picture)[0], [0, 1, 1, 1, 1, 1, 1, 1]);
        assert!(rows(&picture)[1..].iter().all(|row| row.iter().all(|&p| p == 0)));
    }

    #[test]
    fn fills_each_column_downwards() {
        let picture = decompress(&pack(&[ONE_BY_ONE, "0", TWO_TOP_LEFT_PAIRS, "0", ALL_ZEROS].concat())).unwrap();

        assert_eq!(rows(&picture)[0], [0, 1, 1, 1, 1, 1, 1, 1]);
        assert_eq!(rows(&picture)[1], [0, 1, 1, 1, 1, 1, 1, 1]);
        assert_eq!(rows(&picture)[2], [0; 8]);
    }

    #[test]
    fn fills_the_high_plane_first_when_the_picture_says_so() {
        let picture = decompress(&pack(&[ONE_BY_ONE, "1", TOP_LEFT_PAIR, "0", ALL_ZEROS].concat())).unwrap();

        assert_eq!(rows(&picture)[0], [0, 2, 2, 2, 2, 2, 2, 2]);
    }

    #[test]
    fn xors_the_second_plane_with_the_first() {
        let picture = decompress(&pack(&[ONE_BY_ONE, "0", TOP_LEFT_PAIR, "10", ALL_ZEROS].concat())).unwrap();

        assert_eq!(rows(&picture)[0], [0, 3, 3, 3, 3, 3, 3, 3]);
    }

    #[test]
    fn decodes_both_planes_before_xoring_in_the_third_mode() {
        let picture = decompress(&pack(&[ONE_BY_ONE, "0", TOP_LEFT_PAIR, "11", TOP_LEFT_PAIR].concat())).unwrap();

        assert_eq!(rows(&picture)[0], [0, 1, 1, 1, 1, 1, 1, 1]);
    }

    #[test]
    fn starts_the_next_column_once_one_is_full() {
        let pair_at_second_column = "0 11110 00001 01 00 11110 00000";
        let picture = decompress(&pack(&["0010 0001 0", pair_at_second_column, "0 0 111110 000001"].concat())).unwrap();

        assert_eq!((picture.width, picture.height), (2, 1));
        assert_eq!(rows(&picture)[0], [[0; 9].as_slice(), &[1; 7]].concat());
        assert_eq!(rows(&picture)[1], [0; 16]);
    }

    #[test]
    fn refuses_data_that_runs_out() {
        assert!(decompress(&pack(&[ONE_BY_ONE, "0", ALL_ZEROS, "0"].concat())).is_none());
        assert!(decompress(&[]).is_none());
    }

    #[test]
    fn refuses_a_picture_wider_or_taller_than_seven_tiles() {
        assert!(decompress(&pack(&["1000 0001 0", ALL_ZEROS, "0", ALL_ZEROS].concat())).is_none());
        assert!(decompress(&pack(&["0000 0001 0", ALL_ZEROS, "0", ALL_ZEROS].concat())).is_none());
    }

    #[test]
    fn refuses_a_run_longer_than_the_game_can_count() {
        assert!(decompress(&pack(&[ONE_BY_ONE, "0 0", &"1".repeat(16), "0", &"0".repeat(17)].concat())).is_none());
    }
}
