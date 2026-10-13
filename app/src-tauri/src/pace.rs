#[cfg_attr(target_os = "android", path = "pace/android.rs")]
#[cfg_attr(target_os = "ios", path = "pace/ios.rs")]
#[cfg_attr(desktop, path = "pace/desktop.rs")]
mod platform;

use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

const WINDOW: usize = 600;
const MIN_TICKS: usize = 60;
const PAUSE: Duration = Duration::from_millis(100);
const SAMPLES: usize = 60;
const LOCK_TOLERANCE: f64 = 0.02;
const MAX_FRAMES_PER_REFRESH: u32 = 2;
const FALLBACK_HZ: f64 = 60.0;

// Covers a few refreshes the loop was too busy to take, without the game racing to catch up after a stall.
pub const MAX_OWED_FRAMES: u32 = 4;

pub struct DisplayRate {
    ticks: VecDeque<Instant>,
}

impl DisplayRate {
    pub fn new() -> DisplayRate {
        DisplayRate {
            ticks: VecDeque::with_capacity(WINDOW),
        }
    }

    pub fn tick(&mut self, now: Instant) {
        if self.ticks.back().is_some_and(|&last| now.saturating_duration_since(last) > PAUSE) {
            self.ticks.clear();
        }
        if self.ticks.len() == WINDOW {
            self.ticks.pop_front();
        }
        self.ticks.push_back(now);
    }

    pub fn speed(&self, core_fps: f64) -> f64 {
        let (Some(first), Some(last)) = (self.ticks.front(), self.ticks.back()) else {
            return 1.0;
        };
        if self.ticks.len() < MIN_TICKS {
            return 1.0;
        }
        let hz = (self.ticks.len() - 1) as f64 / (*last - *first).as_secs_f64();
        (hz / core_fps).clamp(0.98, 1.02)
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Counts {
    pub skipped: u32,
    pub repeated: u32,
}

// Near the core's rate, one frame per refresh, and the audio resampler absorbs the difference.
// Elsewhere (50, 75, 90, 120, 144 Hz...) that would run the game at the wrong speed, so frames
// follow elapsed time instead and some refreshes repeat a frame.
pub struct Pacer {
    period: f64,
    intervals: VecDeque<f64>,
    last: Option<Instant>,
    owed: f64,
    pub counts: Counts,
}

impl Pacer {
    pub fn new(core_fps: f64) -> Pacer {
        Pacer {
            period: 1.0 / core_fps,
            intervals: VecDeque::with_capacity(SAMPLES + 1),
            last: None,
            owed: 0.0,
            counts: Counts::default(),
        }
    }

    // The refreshes are those since the last call, which come together when the loop was busy.
    pub fn refresh(&mut self, now: Instant, refreshes: u32, most: u32) -> u32 {
        let refreshes = refreshes.max(1);
        let frames = self.paced(now, refreshes).min(most);
        self.counts.skipped = self.counts.skipped.wrapping_add(frames.saturating_sub(1));
        self.counts.repeated = self.counts.repeated.wrapping_add(refreshes - frames.min(1));
        frames
    }

    fn paced(&mut self, now: Instant, refreshes: u32) -> u32 {
        let elapsed = self.last.map_or(self.period, |last| now.saturating_duration_since(last).as_secs_f64());
        if self.last.is_some() && elapsed < PAUSE.as_secs_f64() {
            self.intervals.push_back(elapsed / refreshes as f64);
            if self.intervals.len() > SAMPLES {
                self.intervals.pop_front();
            }
        }
        self.last = Some(now);
        let refresh = median(&self.intervals).unwrap_or(self.period);
        if (refresh - self.period).abs() / self.period <= LOCK_TOLERANCE {
            self.owed = 0.0;
            return refreshes;
        }
        self.owed += elapsed;
        let frames = ((self.owed / self.period).floor() as u32).min(MAX_FRAMES_PER_REFRESH * refreshes);
        self.owed = (self.owed - frames as f64 * self.period).min(self.period);
        frames
    }
}

fn median(values: &VecDeque<f64>) -> Option<f64> {
    let mut sorted: Vec<f64> = values.iter().copied().collect();
    sorted.sort_by(f64::total_cmp);
    sorted.get(sorted.len() / 2).copied()
}

#[derive(Default)]
pub struct Refreshes(Mutex<Option<(u32, Instant)>>);

impl Refreshes {
    // True for the first refresh since the loop last took them, which is the one that wakes it.
    pub fn add(&self, at: Instant) -> bool {
        let mut pending = self.0.lock().unwrap_or_else(|e| e.into_inner());
        let first = pending.is_none();
        *pending = Some((pending.map_or(0, |(count, _)| count) + 1, at));
        first
    }

    pub fn take(&self) -> Option<(u32, Instant)> {
        self.0.lock().unwrap_or_else(|e| e.into_inner()).take()
    }
}

pub type OnRefresh = Arc<dyn Fn(Instant) + Send + Sync>;

pub struct Ticker(Arc<AtomicBool>);

impl Ticker {
    #[cfg(test)]
    pub fn idle() -> Ticker {
        Ticker(Arc::default())
    }
}

impl Drop for Ticker {
    fn drop(&mut self) {
        self.0.store(true, Ordering::Relaxed);
    }
}

pub fn tick(on_refresh: OnRefresh) -> Ticker {
    let stopped = Arc::new(AtomicBool::new(false));
    let stop = stopped.clone();
    let spawned = std::thread::Builder::new().name("refresh".into()).spawn(move || {
        if let Err(e) = platform::refresh(&on_refresh, &stop) {
            eprintln!("following the display's refresh: {e}");
            on_a_timer(&on_refresh, &stop);
        }
    });
    if let Err(e) = spawned {
        eprintln!("starting the refresh thread: {e}");
    }
    Ticker(stopped)
}

fn on_a_timer(on_refresh: &OnRefresh, stopped: &AtomicBool) {
    let period = Duration::from_secs_f64(1.0 / FALLBACK_HZ);
    let mut next = Instant::now() + period;
    while !stopped.load(Ordering::Relaxed) {
        std::thread::sleep(next.saturating_duration_since(Instant::now()));
        next += period;
        if !stopped.load(Ordering::Relaxed) {
            on_refresh(Instant::now());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const CORE_FPS: f64 = 59.7275;

    fn ticks(rate: &mut DisplayRate, start: Instant, count: u32, hz: f64) -> Instant {
        let interval = Duration::from_secs_f64(1.0 / hz);
        for i in 0..count {
            rate.tick(start + interval * i);
        }
        start + interval * count
    }

    #[test]
    fn assumes_the_core_rate_before_it_has_measured() {
        let mut rate = DisplayRate::new();
        ticks(&mut rate, Instant::now(), 5, 60.0);

        assert_eq!(rate.speed(CORE_FPS), 1.0);
    }

    #[test]
    fn measures_how_much_faster_the_display_runs() {
        let mut rate = DisplayRate::new();
        ticks(&mut rate, Instant::now(), 120, 60.0);

        assert!((rate.speed(CORE_FPS) - 60.0 / CORE_FPS).abs() < 1e-4);
    }

    #[test]
    fn starts_over_after_a_pause() {
        let mut rate = DisplayRate::new();
        let end = ticks(&mut rate, Instant::now(), 120, 59.0);
        ticks(&mut rate, end + Duration::from_secs(5), 5, 60.0);

        assert_eq!(rate.speed(CORE_FPS), 1.0);
    }

    #[test]
    fn caps_the_correction_on_displays_far_from_the_core_rate() {
        let mut rate = DisplayRate::new();
        ticks(&mut rate, Instant::now(), 120, 50.0);

        assert_eq!(rate.speed(CORE_FPS), 0.98);
    }

    fn at(start: Instant, seconds: f64) -> Instant {
        start + Duration::from_secs_f64(seconds)
    }

    fn refreshes(pacer: &mut Pacer, start: Instant, count: u32, hz: f64) -> Vec<u32> {
        (0..count).map(|i| pacer.refresh(at(start, i as f64 / hz), 1, MAX_OWED_FRAMES)).collect()
    }

    fn frames_over(seconds: f64, hz: f64) -> u32 {
        refreshes(&mut Pacer::new(CORE_FPS), Instant::now(), (seconds * hz) as u32 + 1, hz).iter().sum()
    }

    #[test]
    fn runs_one_frame_per_refresh_on_a_60_hz_display() {
        let frames = refreshes(&mut Pacer::new(CORE_FPS), Instant::now(), 120, 60.0);

        assert!(frames.iter().all(|&frames| frames == 1));
    }

    #[test]
    fn still_runs_one_frame_after_a_missed_refresh_on_a_60_hz_display() {
        let mut pacer = Pacer::new(CORE_FPS);
        let start = Instant::now();
        refreshes(&mut pacer, start, 60, 60.0);

        assert_eq!(pacer.refresh(at(start, 61.0 / 60.0), 1, MAX_OWED_FRAMES), 1);
    }

    #[test]
    fn runs_at_the_cores_speed_on_displays_off_its_rate() {
        for hz in [50.0, 75.0, 90.0, 120.0, 144.0] {
            assert!((frames_over(10.0, hz) as f64 - 10.0 * CORE_FPS).abs() <= 2.0, "at {hz} Hz");
        }
    }

    #[test]
    fn doesnt_race_to_catch_up_after_a_pause() {
        let mut pacer = Pacer::new(CORE_FPS);
        let start = Instant::now();
        refreshes(&mut pacer, start, 60, 144.0);

        assert!(pacer.refresh(at(start, 5.0), 1, MAX_OWED_FRAMES) <= 2);
    }

    #[test]
    fn runs_a_frame_for_each_refresh_that_came_while_the_loop_was_busy() {
        let mut pacer = Pacer::new(CORE_FPS);
        let start = Instant::now();
        refreshes(&mut pacer, start, 60, 60.0);

        assert_eq!(pacer.refresh(at(start, 62.0 / 60.0), 3, MAX_OWED_FRAMES), 3);
    }

    #[test]
    fn owes_no_more_than_it_is_allowed() {
        let mut pacer = Pacer::new(CORE_FPS);
        let start = Instant::now();
        refreshes(&mut pacer, start, 60, 60.0);

        assert_eq!(pacer.refresh(at(start, 66.0 / 60.0), 6, MAX_OWED_FRAMES), MAX_OWED_FRAMES);
        assert_eq!(pacer.refresh(at(start, 68.0 / 60.0), 2, 1), 1);
    }

    #[test]
    fn counts_frames_run_past_one_a_refresh_as_skipped() {
        let mut pacer = Pacer::new(CORE_FPS);
        let start = Instant::now();
        refreshes(&mut pacer, start, 60, 60.0);

        pacer.refresh(at(start, 62.0 / 60.0), 3, MAX_OWED_FRAMES);

        assert_eq!(pacer.counts.skipped, 2);
    }

    #[test]
    fn counts_refreshes_with_no_new_frame_as_repeated() {
        let mut pacer = Pacer::new(CORE_FPS);
        refreshes(&mut pacer, Instant::now(), 120, 120.0);

        assert_eq!(pacer.counts, Counts { skipped: 0, repeated: 60 });
    }

    #[test]
    fn counts_nothing_on_a_display_at_the_cores_rate() {
        let mut pacer = Pacer::new(CORE_FPS);
        refreshes(&mut pacer, Instant::now(), 120, 60.0);

        assert_eq!(pacer.counts, Counts::default());
    }

    #[test]
    fn wakes_the_loop_only_for_the_first_refresh_it_hasnt_taken() {
        let refreshes = Refreshes::default();
        let start = Instant::now();

        assert!(refreshes.add(start));
        assert!(!refreshes.add(at(start, 0.016)));
        assert_eq!(refreshes.take(), Some((2, at(start, 0.016))));
        assert_eq!(refreshes.take(), None);
        assert!(refreshes.add(at(start, 0.033)));
    }
}
