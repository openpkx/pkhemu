use std::collections::VecDeque;
use std::time::{Duration, Instant};

const WINDOW: usize = 600;
const MIN_TICKS: usize = 60;
const PAUSE: Duration = Duration::from_millis(100);

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
}
