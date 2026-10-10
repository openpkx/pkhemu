const END: u8 = 0xFF;
const LONG: u8 = 7;

pub fn decompress(data: &[u8], max: usize) -> Option<Vec<u8>> {
    let mut out = Vec::new();
    let mut input = data.iter().copied();
    loop {
        let head = input.next()?;
        if head == END {
            return Some(out);
        }
        let (command, length) = if head >> 5 == LONG {
            (head >> 2 & 7, ((head as usize & 3) << 8 | input.next()? as usize) + 1)
        } else {
            (head >> 5, (head as usize & 0x1F) + 1)
        };
        if out.len() + length > max {
            return None;
        }
        match command {
            0 => {
                for _ in 0..length {
                    out.push(input.next()?);
                }
            }
            1 => {
                let byte = input.next()?;
                out.extend(std::iter::repeat_n(byte, length));
            }
            2 => {
                let pair = [input.next()?, input.next()?];
                out.extend((0..length).map(|i| pair[i % 2]));
            }
            3 => out.extend(std::iter::repeat_n(0, length)),
            _ => {
                let first = input.next()?;
                let start = if first & 0x80 != 0 {
                    out.len().checked_sub((first & 0x7F) as usize + 1)?
                } else {
                    (first as usize) << 8 | input.next()? as usize
                };
                for i in 0..length {
                    let byte = match command {
                        5 => out.get(start + i)?.reverse_bits(),
                        6 => *out.get(start.checked_sub(i)?)?,
                        _ => *out.get(start + i)?,
                    };
                    out.push(byte);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copies_literal_bytes() {
        assert_eq!(decompress(&[0x02, b'a', b'b', b'c', END], 16), Some(b"abc".to_vec()));
    }

    #[test]
    fn repeats_one_byte() {
        assert_eq!(decompress(&[0x23, b'x', END], 16), Some(b"xxxx".to_vec()));
    }

    #[test]
    fn alternates_two_bytes() {
        assert_eq!(decompress(&[0x44, b'a', b'b', END], 16), Some(b"ababa".to_vec()));
    }

    #[test]
    fn writes_zeros() {
        assert_eq!(decompress(&[0x62, END], 16), Some(vec![0; 3]));
    }

    #[test]
    fn repeats_earlier_output_counted_back_from_the_end() {
        let data = [0x02, b'a', b'b', b'c', 0x81, 0x82, END];

        assert_eq!(decompress(&data, 16), Some(b"abcab".to_vec()));
    }

    #[test]
    fn repeats_earlier_output_counted_from_the_start() {
        let data = [0x02, b'a', b'b', b'c', 0x81, 0x00, 0x01, END];

        assert_eq!(decompress(&data, 16), Some(b"abcbc".to_vec()));
    }

    #[test]
    fn repeats_a_run_that_overlaps_itself() {
        let data = [0x00, b'z', 0x83, 0x80, END];

        assert_eq!(decompress(&data, 16), Some(b"zzzzz".to_vec()));
    }

    #[test]
    fn repeats_earlier_output_with_its_bits_mirrored() {
        let data = [0x01, 0b1000_0000, 0b0000_0011, 0xA1, 0x00, 0x00, END];

        assert_eq!(decompress(&data, 16), Some(vec![0x80, 0x03, 0x01, 0xC0]));
    }

    #[test]
    fn repeats_earlier_output_backwards() {
        let data = [0x02, b'a', b'b', b'c', 0xC1, 0x81, END];

        assert_eq!(decompress(&data, 16), Some(b"abcba".to_vec()));
    }

    #[test]
    fn reads_a_ten_bit_length_from_a_long_command() {
        let data = [0xE5, 0x00, b'q', END];

        assert_eq!(decompress(&data, 0x200), Some(vec![b'q'; 0x101]));
    }

    #[test]
    fn stops_at_the_end_marker() {
        assert_eq!(decompress(&[END, 0x00, b'a'], 16), Some(Vec::new()));
    }

    #[test]
    fn refuses_data_that_runs_out() {
        assert_eq!(decompress(&[0x02, b'a', b'b'], 16), None);
        assert_eq!(decompress(&[0x00, b'a'], 16), None);
    }

    #[test]
    fn refuses_output_larger_than_asked_for() {
        assert_eq!(decompress(&[0x67, END], 7), None);
    }

    #[test]
    fn refuses_a_copy_from_outside_the_output() {
        assert_eq!(decompress(&[0x00, b'a', 0x81, 0x81, END], 16), None);
        assert_eq!(decompress(&[0x00, b'a', 0x81, 0x00, 0x01, END], 16), None);
        assert_eq!(decompress(&[0x00, b'a', 0xC1, 0x80, END], 16), None);
    }
}
