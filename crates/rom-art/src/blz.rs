use crate::nds::u32_at;

// The DS "backward LZ" that compresses ARM9 binaries and overlays: it runs from the end of the data towards the start.
pub fn decompress(data: &[u8]) -> Option<Vec<u8>> {
    let len = data.len();
    let extra = u32_at(data, len.checked_sub(4)?)?;
    if extra == 0 {
        return Some(data.to_vec());
    }
    let footer = u32_at(data, len.checked_sub(8)?)?;
    let (packed_len, header_len) = (footer & 0xFF_FFFF, footer >> 24);
    let start = len.checked_sub(packed_len)?;
    let mut src = len.checked_sub(header_len)?;
    if src < start {
        return None;
    }
    let mut out = data.to_vec();
    out.resize(len + extra, 0);
    let mut dst = out.len();
    while dst > start {
        src = src.checked_sub(1)?;
        let flags = *data.get(src)?;
        for bit in (0..8).rev() {
            if dst <= start {
                break;
            }
            if flags >> bit & 1 == 0 {
                src = src.checked_sub(1)?;
                dst -= 1;
                out[dst] = data[src];
            } else {
                src = src.checked_sub(2)?;
                let pair = (data[src + 1] as usize) << 8 | data[src] as usize;
                let (count, distance) = ((pair >> 12) + 3, (pair & 0xFFF) + 3);
                if count > dst - start {
                    return None;
                }
                for _ in 0..count {
                    dst -= 1;
                    out[dst] = *out.get(dst + distance)?;
                }
            }
            if src < start {
                return None;
            }
        }
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn packed(prefix: &[u8], stream: &[u8], extra: usize) -> Vec<u8> {
        let header = 8;
        let packed_len = stream.len() + header;
        [prefix, stream, &((packed_len as u32) | (header as u32) << 24).to_le_bytes(), &(extra as u32).to_le_bytes()]
            .concat()
    }

    #[test]
    fn leaves_data_with_no_extra_size_alone() {
        assert_eq!(decompress(&[1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0]), Some(vec![1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0]));
    }

    #[test]
    fn copies_literals_and_backward_references() {
        // Read backwards: literals C, B and A, then 18 bytes copied from 3 bytes further on.
        let stream = [0x00, 0xF0, b'A', b'B', b'C', 0b0001_0000];
        let file = packed(b"pre", &stream, 7);

        assert_eq!(decompress(&file).unwrap(), [&b"pre"[..], &b"ABC".repeat(7)].concat());
    }

    #[test]
    fn refuses_a_reference_past_the_end() {
        let stream = [0x00, 0xF0, 0b1000_0000];
        assert_eq!(decompress(&packed(b"", &stream, 64)), None);
    }

    #[test]
    fn refuses_a_footer_longer_than_the_data() {
        let mut file = packed(b"", &[0, 0], 4);
        file[2] = 0xFF;
        assert_eq!(decompress(&file), None);
    }
}
