use crate::retro::Core;
use crate::rom::{Rom, System};
use std::ops::Range;

const EXTDATA_RTC: u32 = 4;
const HEADER_LEN: usize = 16;
const RTC_LEN: usize = 16;
const RTC_NO_OVERRIDE: i32 = 0;
pub const RTC_WALLCLOCK_OFFSET: i32 = 3;
// sizeof(GBSerializedState) and sizeof(GBASerializedState), which mGBA pins with static_assert.
pub const GB_STATE_SIZE: usize = 0x11800;
const GBA_STATE_SIZE: usize = 0x6_1000;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Clock {
    Mgba { state_size: usize, offset_ms: i64 },
    // melonDS DS takes its offset as core options when it loads, not through its states.
    Ds { offset_seconds: i64 },
    Absent,
}

impl Clock {
    pub fn new(rom: &Rom, offset_seconds: i64) -> Clock {
        let offset_ms = offset_seconds * 1000;
        match rom.system() {
            System::Ds => Clock::Ds { offset_seconds },
            System::Gb => Clock::Mgba { state_size: GB_STATE_SIZE, offset_ms },
            System::Gba => Clock::Mgba { state_size: GBA_STATE_SIZE, offset_ms },
            System::N64 => Clock::Absent,
        }
    }

    pub fn set_core_options(&self) {
        if let Clock::Ds { offset_seconds } = *self {
            crate::retro::set_ds_clock_offset(offset_seconds);
        }
    }

    pub fn set(&self, state: &mut [u8]) -> Result<(), String> {
        let Clock::Mgba { state_size, offset_ms } = *self else {
            return Ok(());
        };
        let block = rtc_block(state, state_size).ok_or("the state has no clock")?;
        let (kind, value) = if offset_ms == 0 { (RTC_NO_OVERRIDE, 0) } else { (RTC_WALLCLOCK_OFFSET, offset_ms) };
        let rtc = &mut state[block];
        rtc[0..4].copy_from_slice(&kind.to_le_bytes());
        rtc[4..8].fill(0);
        rtc[8..16].copy_from_slice(&value.to_le_bytes());
        Ok(())
    }

    pub fn start(&self, core: &mut Core) -> Result<(), String> {
        let Clock::Mgba { .. } = self else {
            return Ok(());
        };
        let mut state = core.serialize().ok_or("the core couldn't save its state")?;
        self.set(&mut state)?;
        core.unserialize(&state).then_some(()).ok_or_else(|| "the core didn't take its clock".into())
    }
}

fn rtc_block(state: &[u8], state_size: usize) -> Option<Range<usize>> {
    let mut at = state_size;
    loop {
        let header = state.get(at..at + HEADER_LEN)?;
        let tag = u32::from_le_bytes(header[0..4].try_into().unwrap());
        let size = i32::from_le_bytes(header[4..8].try_into().unwrap());
        let offset = i64::from_le_bytes(header[8..16].try_into().unwrap());
        match tag {
            0 => return None,
            EXTDATA_RTC if size as usize == RTC_LEN => {
                let start = usize::try_from(offset).ok()?;
                let block = start..start.checked_add(RTC_LEN)?;
                return state.get(block.clone()).map(|_| block);
            }
            _ => at += HEADER_LEN,
        }
    }
}

#[cfg(test)]
pub fn read(state: &[u8], state_size: usize) -> Option<(i32, i64)> {
    let rtc = &state[rtc_block(state, state_size)?];
    Some((i32::from_le_bytes(rtc[0..4].try_into().unwrap()), i64::from_le_bytes(rtc[8..16].try_into().unwrap())))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_games::{clock_rom, clock_save, days_on_the_clock, gba_rom, lock_core};

    const DAY: i64 = 24 * 60 * 60;

    fn running(rom: Rom) -> Core {
        let mut core = Core::load(rom, &std::env::temp_dir()).unwrap();
        let [save_ram, rtc] = core.save_memory();
        crate::save::fill(save_ram, rtc, &clock_save());
        for _ in 0..10 {
            core.run_frame();
        }
        core
    }

    #[test]
    fn sets_the_clock_of_a_gb_state_and_the_game_sees_it() {
        let _lock = lock_core();
        let mut core = running(clock_rom());
        assert_eq!(days_on_the_clock(&mut core), 0);
        let mut state = core.serialize().unwrap();

        Clock::new(&clock_rom(), 3 * DAY).set(&mut state).unwrap();
        assert!(core.unserialize(&state));
        core.run_frame();

        assert_eq!(read(&state, GB_STATE_SIZE), Some((RTC_WALLCLOCK_OFFSET, 3 * DAY * 1000)));
        assert_eq!(days_on_the_clock(&mut core), 3);
    }

    #[test]
    fn sets_the_clock_of_a_gba_state_and_the_core_keeps_it() {
        let _lock = lock_core();
        let mut core = running(gba_rom());
        let mut state = core.serialize().unwrap();
        let untouched = state.clone();

        Clock::new(&gba_rom(), 6 * 60 * 60).set(&mut state).unwrap();
        assert!(core.unserialize(&state));
        core.run_frame();

        assert_eq!(read(&core.serialize().unwrap(), GBA_STATE_SIZE), Some((RTC_WALLCLOCK_OFFSET, 6 * 60 * 60 * 1000)));
        assert_eq!(state[..GBA_STATE_SIZE], untouched[..GBA_STATE_SIZE]);
    }

    #[test]
    fn no_offset_puts_the_clock_back_to_real_time() {
        let _lock = lock_core();
        let mut core = running(clock_rom());
        Clock::new(&clock_rom(), 2 * DAY).start(&mut core).unwrap();
        let mut state = core.serialize().unwrap();

        Clock::new(&clock_rom(), 0).set(&mut state).unwrap();

        assert_eq!(read(&state, GB_STATE_SIZE), Some((RTC_NO_OVERRIDE, 0)));
    }

    #[test]
    fn starts_a_fresh_core_on_the_clock() {
        let _lock = lock_core();
        let mut core = Core::load(clock_rom(), &std::env::temp_dir()).unwrap();
        let [save_ram, rtc] = core.save_memory();
        crate::save::fill(save_ram, rtc, &clock_save());

        Clock::new(&clock_rom(), DAY).start(&mut core).unwrap();
        core.run_frame();

        assert_eq!(days_on_the_clock(&mut core), 1);
    }

    #[test]
    fn leaves_ds_states_alone() {
        let ds = Rom { name: "HeartGold.nds".into(), bytes: Vec::new() };
        let mut state = vec![7; 64];

        Clock::new(&ds, DAY).set(&mut state).unwrap();

        assert_eq!(state, vec![7; 64]);
    }

    #[test]
    fn leaves_n64_states_alone() {
        let n64 = Rom { name: "Stadium.z64".into(), bytes: Vec::new() };
        let mut state = vec![7; 64];

        Clock::new(&n64, DAY).set(&mut state).unwrap();

        assert_eq!(state, vec![7; 64]);
    }

    #[test]
    fn refuses_a_state_with_no_clock() {
        let mut state = vec![0; GB_STATE_SIZE + HEADER_LEN];

        assert!(Clock::new(&clock_rom(), DAY).set(&mut state).is_err());
        assert!(Clock::new(&clock_rom(), DAY).set(&mut b"not a state".to_vec()).is_err());
    }
}
