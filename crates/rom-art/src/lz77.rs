pub fn decompress(data: &[u8], max: usize) -> Option<Vec<u8>> {
    (*data.first()? == 0x10).then(|| inflate(data, max, false))?
}

// The GBA BIOS never reads the type byte, and some hacks store a wrong one.
pub fn decompress_bios(data: &[u8], max: usize) -> Option<Vec<u8>> {
    inflate(data, max, false)
}

// The DS variant, type 0x11, spends a back reference's first nibble on longer runs.
pub fn decompress_extended(data: &[u8], max: usize) -> Option<Vec<u8>> {
    (*data.first()? == 0x11).then(|| inflate(data, max, true))?
}

fn back_reference<'a>(input: &mut impl Iterator<Item = &'a u8>, extended: bool) -> Option<(usize, usize)> {
    let mut next = || input.next().map(|&b| b as usize);
    let first = next()?;
    let (length, high) = match (extended, first >> 4) {
        (false, nibble) => (nibble + 3, first),
        (true, 0) => {
            let second = next()?;
            (((first & 0xF) << 4 | second >> 4) + 0x11, second)
        }
        (true, 1) => {
            let (second, third) = (next()?, next()?);
            (((first & 0xF) << 12 | second << 4 | third >> 4) + 0x111, third)
        }
        (true, nibble) => (nibble + 1, first),
    };
    Some((length, ((high & 0xF) << 8 | next()?) + 1))
}

fn inflate(data: &[u8], max: usize, extended: bool) -> Option<Vec<u8>> {
    let size = u32::from_le_bytes(data.get(..4)?.try_into().ok()?) as usize >> 8;
    if size > max {
        return None;
    }
    let mut out = Vec::with_capacity(size);
    let mut input = data[4..].iter();
    while out.len() < size {
        let flags = *input.next()?;
        for bit in (0..8).rev() {
            if out.len() >= size {
                break;
            }
            if flags & (1 << bit) == 0 {
                out.push(*input.next()?);
                continue;
            }
            let (length, distance) = back_reference(&mut input, extended)?;
            let start = out.len().checked_sub(distance)?;
            for i in 0..length {
                out.push(out[start + i]);
            }
        }
    }
    out.truncate(size);
    Some(out)
}

#[cfg(test)]
pub fn stored(bytes: &[u8]) -> Vec<u8> {
    let mut out = ((bytes.len() as u32) << 8 | 0x10).to_le_bytes().to_vec();
    for chunk in bytes.chunks(8) {
        out.push(0);
        out.extend_from_slice(chunk);
    }
    out
}

#[cfg(test)]
pub fn stored_extended(bytes: &[u8]) -> Vec<u8> {
    let mut out = stored(bytes);
    out[0] = 0x11;
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn copies_literal_bytes() {
        assert_eq!(decompress(&stored(b"0123456789"), 16), Some(b"0123456789".to_vec()));
    }

    #[test]
    fn repeats_earlier_bytes_from_a_back_reference() {
        let data = [0x10, 7, 0, 0, 0b0010_0000, b'a', b'b', 0x20, 0x01];

        assert_eq!(decompress(&data, 16), Some(b"abababa".to_vec()));
    }

    #[test]
    fn repeats_a_run_that_overlaps_itself() {
        let data = [0x10, 6, 0, 0, 0b0100_0000, b'x', 0x20, 0x00];

        assert_eq!(decompress(&data, 16), Some(b"xxxxxx".to_vec()));
    }

    #[test]
    fn stops_at_the_size_in_the_header_mid_group() {
        let data = [0x10, 2, 0, 0, 0, b'a', b'b', b'c', b'd'];

        assert_eq!(decompress(&data, 16), Some(b"ab".to_vec()));
    }

    #[test]
    fn refuses_data_that_is_not_lz77() {
        assert_eq!(decompress(&[0x11, 1, 0, 0, 0, b'a'], 16), None);
        assert_eq!(decompress(&[0x10, 1, 0], 16), None);
    }

    #[test]
    fn refuses_output_larger_than_asked_for() {
        assert_eq!(decompress(&stored(&[0; 32]), 31), None);
    }

    #[test]
    fn reads_the_extended_format_with_its_three_run_lengths() {
        let short = [0x11, 6, 0, 0, 0b0100_0000, b'x', 0x40, 0x00];
        let medium = [0x11, 0x13, 0, 0, 0b0100_0000, b'y', 0x00, 0x10, 0x00];
        let long = [0x11, 0x12, 0x01, 0, 0b0100_0000, b'z', 0x10, 0x00, 0x00, 0x00];

        assert_eq!(decompress_extended(&short, 16), Some(b"xxxxxx".to_vec()));
        assert_eq!(decompress_extended(&medium, 32), Some(vec![b'y'; 0x13]));
        assert_eq!(decompress_extended(&long, 0x200), Some(vec![b'z'; 0x112]));
    }

    #[test]
    fn keeps_each_format_to_its_own_header() {
        assert_eq!(decompress_extended(&stored(b"ab"), 16), None);
        assert_eq!(decompress(&[0x11, 6, 0, 0, 0b0100_0000, b'x', 0x40, 0x00], 16), None);
    }

    #[test]
    fn reads_any_type_byte_the_way_the_gba_bios_does() {
        let mut data = stored(b"0123456789");
        data[0] = 0x0A;

        assert_eq!(decompress_bios(&data, 16), Some(b"0123456789".to_vec()));
        assert_eq!(decompress(&data, 16), None);
    }

    #[test]
    fn refuses_data_that_runs_out() {
        let mut data = stored(b"0123456789");
        data.pop();

        assert_eq!(decompress(&data, 16), None);
    }

    #[test]
    fn refuses_a_back_reference_before_the_start() {
        let data = [0x10, 4, 0, 0, 0b0100_0000, b'a', 0x00, 0x01];

        assert_eq!(decompress(&data, 16), None);
    }
}
