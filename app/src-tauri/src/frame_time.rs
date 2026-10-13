use std::time::Duration;

const WINDOW: usize = 600;

pub struct FrameTimes {
    times: Vec<Duration>,
}

#[derive(Debug, PartialEq)]
pub struct Report {
    pub average: Duration,
    pub p95: Duration,
    pub worst: Duration,
    pub budget: Duration,
}

impl FrameTimes {
    pub fn new() -> FrameTimes {
        FrameTimes { times: Vec::with_capacity(WINDOW) }
    }

    pub fn record(&mut self, took: Duration, fps: f64) -> Option<Report> {
        self.times.push(took);
        if self.times.len() < WINDOW {
            return None;
        }
        self.times.sort_unstable();
        let report = Report {
            average: self.times.iter().sum::<Duration>() / WINDOW as u32,
            p95: self.times[WINDOW * 95 / 100 - 1],
            worst: self.times[WINDOW - 1],
            budget: Duration::from_secs_f64(1.0 / fps),
        };
        self.times.clear();
        Some(report)
    }
}

impl std::fmt::Display for Report {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        let ms = |time: Duration| time.as_secs_f64() * 1000.0;
        let share = |time: Duration| time.as_secs_f64() / self.budget.as_secs_f64() * 100.0;
        write!(
            f,
            "frame time over {WINDOW} frames: average {:.1} ms ({:.0}%), 95th percentile {:.1} ms ({:.0}%), worst {:.1} ms ({:.0}%) of {:.1} ms",
            ms(self.average),
            share(self.average),
            ms(self.p95),
            share(self.p95),
            ms(self.worst),
            share(self.worst),
            ms(self.budget),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const DS_FPS: f64 = 59.8261;

    fn ms(ms: u64) -> Duration {
        Duration::from_millis(ms)
    }

    #[test]
    fn reports_once_a_window_of_frames_has_run() {
        let mut times = FrameTimes::new();
        let reports: Vec<Report> = (0..WINDOW * 2).filter_map(|_| times.record(ms(5), DS_FPS)).collect();

        assert_eq!(reports.len(), 2);
    }

    #[test]
    fn reports_the_average_95th_percentile_and_worst_frame_against_the_budget() {
        let mut times = FrameTimes::new();
        let report = (1..=WINDOW as u64).rev().find_map(|i| times.record(ms(i % 100 + 1), DS_FPS)).unwrap();

        assert_eq!(report.average, Duration::from_micros(50_500));
        assert_eq!(report.p95, ms(95));
        assert_eq!(report.worst, ms(100));
        assert_eq!(report.budget, Duration::from_secs_f64(1.0 / DS_FPS));
    }

    #[test]
    fn measures_each_window_afresh() {
        let mut times = FrameTimes::new();
        (0..WINDOW).for_each(|_| _ = times.record(ms(30), DS_FPS));
        let report = (0..WINDOW).find_map(|_| times.record(ms(5), DS_FPS)).unwrap();

        assert_eq!(report.worst, ms(5));
    }
}
