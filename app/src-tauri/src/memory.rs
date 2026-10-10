#[derive(serde::Deserialize, Debug, Clone, Copy)]
pub struct Range {
    pub address: u32,
    pub length: u32,
}

#[derive(Debug, Clone, Copy)]
pub struct Region {
    pub start: usize,
    pub select: usize,
    pub disconnect: usize,
    pub len: usize,
    pub ptr: *const u8,
}

impl Region {
    pub fn flat(start: usize, bytes: &[u8]) -> Region {
        Region { start, select: 0, disconnect: 0, len: bytes.len(), ptr: bytes.as_ptr() }
    }

    // Follows libretro's select and disconnect rules, but fails past the region's length rather than mirroring.
    pub fn locate(&self, address: usize, length: usize) -> Option<*const u8> {
        let selected = if self.select == 0 {
            address.wrapping_sub(self.start) < self.len
        } else {
            address & self.select == self.start & self.select
        };
        let at = (address & !self.disconnect).wrapping_sub(self.start);
        (selected && at < self.len && length <= self.len - at).then(|| self.ptr.wrapping_add(at))
    }
}

// Every region must point at memory that stays alive and in place for the whole call.
pub unsafe fn read(regions: &[Region], ranges: &[Range]) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    for &Range { address, length } in ranges {
        let ptr = regions
            .iter()
            .find_map(|region| region.locate(address as usize, length as usize))
            .filter(|ptr| !ptr.is_null())
            .ok_or_else(|| format!("{length} bytes at 0x{address:08X} aren't in the core's memory map"))?;
        bytes.extend_from_slice(std::slice::from_raw_parts(ptr, length as usize));
    }
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn read_one(regions: &[Region], address: u32, length: u32) -> Result<Vec<u8>, String> {
        unsafe { read(regions, &[Range { address, length }]) }
    }

    #[test]
    fn reads_a_range_at_its_offset_into_the_region() {
        let ewram = [1, 2, 3, 4, 5, 6];

        assert_eq!(read_one(&[Region::flat(0x0200_0000, &ewram)], 0x0200_0002, 3), Ok(vec![3, 4, 5]));
    }

    #[test]
    fn joins_ranges_from_different_regions_in_the_order_asked() {
        let ewram = [1, 2, 3, 4];
        let iwram = [9, 8, 7, 6];
        let regions = [Region::flat(0x0200_0000, &ewram), Region::flat(0x0300_0000, &iwram)];
        let ranges = [Range { address: 0x0300_0001, length: 2 }, Range { address: 0x0200_0000, length: 1 }];

        assert_eq!(unsafe { read(&regions, &ranges) }, Ok(vec![8, 7, 1]));
    }

    #[test]
    fn fails_on_an_address_outside_every_region() {
        let ewram = [0; 4];

        assert!(read_one(&[Region::flat(0x0200_0000, &ewram)], 0x0400_0000, 1).is_err());
        assert!(read_one(&[Region::flat(0x0200_0000, &ewram)], 0x01FF_FFFF, 1).is_err());
    }

    #[test]
    fn fails_on_a_range_that_runs_past_the_end_of_its_region() {
        let ewram = [0; 4];

        assert!(read_one(&[Region::flat(0x0200_0000, &ewram)], 0x0200_0002, 3).is_err());
        assert!(read_one(&[Region::flat(0x0200_0000, &ewram)], 0x0200_0003, u32::MAX).is_err());
    }

    #[test]
    fn fails_the_whole_read_when_one_range_is_unmapped() {
        let ewram = [1, 2];
        let ranges = [Range { address: 0x0200_0000, length: 1 }, Range { address: 0x0300_0000, length: 1 }];

        assert!(unsafe { read(&[Region::flat(0x0200_0000, &ewram)], &ranges) }.is_err());
    }

    #[test]
    fn takes_the_first_region_that_covers_an_address() {
        let mapped = [1, 2];
        let fallback = [7, 7];

        let regions = [Region::flat(0x0200_0000, &mapped), Region::flat(0x0200_0000, &fallback)];
        assert_eq!(read_one(&regions, 0x0200_0001, 1), Ok(vec![2]));
    }

    #[test]
    fn fails_on_an_address_a_region_without_memory_claims() {
        let fallback = [7; 4];
        let unmapped = Region { ptr: std::ptr::null(), ..Region::flat(0x0200_0000, &fallback) };

        assert!(read_one(&[unmapped, Region::flat(0x0200_0000, &fallback)], 0x0200_0000, 1).is_err());
    }

    #[test]
    fn reads_a_mirror_through_the_regions_disconnected_bits() {
        // A DS's 4MB of main RAM repeats across the 16MB window at 0x02000000.
        let mut main_ram = vec![0; 0x40_0000];
        main_ram[0x10] = 42;
        let ds = Region {
            start: 0x0200_0000,
            select: 0xFF00_0000,
            disconnect: 0x00C0_0000,
            len: main_ram.len(),
            ptr: main_ram.as_ptr(),
        };

        assert_eq!(read_one(&[ds], 0x0200_0010, 1), Ok(vec![42]));
        assert_eq!(read_one(&[ds], 0x0240_0010, 1), Ok(vec![42]));
        assert!(read_one(&[ds], 0x0300_0010, 1).is_err());
        assert!(read_one(&[ds], 0x023F_FFFF, 2).is_err());
    }

    #[test]
    fn skips_a_selected_region_whose_address_lands_past_its_length() {
        // mGBA selects all of 0x03xxxxxx for IWRAM but only maps its first 32KB.
        let iwram = [5; 0x8000];
        let iwram = Region { select: 0xFF00_0000, ..Region::flat(0x0300_0000, &iwram) };

        assert_eq!(read_one(&[iwram], 0x0300_7FFF, 1), Ok(vec![5]));
        assert!(read_one(&[iwram], 0x0300_8000, 1).is_err());
    }
}
