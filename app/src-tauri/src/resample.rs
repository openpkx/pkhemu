pub struct Resampler {
    in_rate: f64,
    out_rate: f64,
    position: f64,
    previous: [f32; 2],
}

impl Resampler {
    pub fn new(in_rate: f64, out_rate: f64) -> Resampler {
        Resampler {
            in_rate,
            out_rate,
            position: 0.0,
            previous: [0.0; 2],
        }
    }

    pub fn push(&mut self, samples: &[i16], speed: f64, mut out: impl FnMut([f32; 2])) {
        let step = self.in_rate * speed / self.out_rate;
        let frames = samples.len() / 2;
        let at = |i: usize, c: usize| samples[i * 2 + c] as f32 / 32768.0;
        while self.position < frames as f64 {
            let index = self.position as usize;
            let t = (self.position - index as f64) as f32;
            let mut frame = [0.0; 2];
            for (c, sample) in frame.iter_mut().enumerate() {
                let a = if index == 0 { self.previous[c] } else { at(index - 1, c) };
                *sample = a + (at(index, c) - a) * t;
            }
            out(frame);
            self.position += step;
        }
        self.position -= frames as f64;
        if frames > 0 {
            self.previous = [at(frames - 1, 0), at(frames - 1, 1)];
        }
    }
}

pub fn correction(fill: usize, target: usize) -> f64 {
    let target = target as f64;
    (1.0 + 0.005 * (target - fill as f64) / target).clamp(0.995, 1.005)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(resampler: &mut Resampler, input_frames: usize, speed: f64) -> Vec<[f32; 2]> {
        let input: Vec<i16> = (0..input_frames).flat_map(|i| [(i % 1000) as i16, -((i % 1000) as i16)]).collect();
        let mut output = Vec::new();
        for chunk in input.chunks(548 * 2) {
            resampler.push(chunk, speed, |frame| output.push(frame));
        }
        output
    }

    #[test]
    fn converts_a_second_of_core_audio_to_a_second_at_the_device_rate() {
        let mut resampler = Resampler::new(32768.0, 48000.0);

        let output = run(&mut resampler, 32768, 1.0);

        assert!((output.len() as i64 - 48000).abs() <= 1, "{}", output.len());
    }

    #[test]
    fn plays_a_game_running_fast_at_the_device_rate() {
        let mut resampler = Resampler::new(32768.0, 48000.0);

        let output = run(&mut resampler, (32768.0 * 1.0045) as usize, 1.0045);

        assert!((output.len() as i64 - 48000).abs() <= 1, "{}", output.len());
    }

    #[test]
    fn interpolates_across_chunk_boundaries() {
        let mut resampler = Resampler::new(32768.0, 48000.0);
        let ramp: Vec<i16> = (0..2000).flat_map(|i| [i * 10, i * 10]).collect();
        let mut output = Vec::new();

        for chunk in ramp.chunks(7 * 2) {
            resampler.push(chunk, 1.0, |frame| output.push(frame[0]));
        }

        let step = 10.0 / 48000.0;
        for pair in output[2..].windows(2) {
            assert!((pair[1] - pair[0] - step).abs() < 1e-6, "{pair:?}");
        }
    }

    #[test]
    fn keeps_stereo_channels_apart() {
        let mut resampler = Resampler::new(32768.0, 32768.0);
        let mut output = Vec::new();

        resampler.push(&[16384, -16384, 16384, -16384], 1.0, |frame| output.push(frame));

        assert_eq!(output.last(), Some(&[0.5, -0.5]));
    }

    #[test]
    fn leaves_the_rate_alone_when_the_buffer_is_on_target() {
        assert_eq!(correction(1000, 1000), 1.0);
    }

    #[test]
    fn stretches_audio_when_the_buffer_runs_low() {
        assert!(correction(500, 1000) > 1.0);
        assert_eq!(correction(0, 1000), 1.005);
    }

    #[test]
    fn squeezes_audio_when_the_buffer_fills() {
        assert!(correction(1500, 1000) < 1.0);
        assert_eq!(correction(5000, 1000), 0.995);
    }
}
