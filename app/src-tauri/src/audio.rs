use crate::resample::{correction, Resampler};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use ringbuf::traits::{Consumer, Observer, Producer, Split};
use ringbuf::{HeapCons, HeapProd, HeapRb};

const BUFFER_SECONDS: f64 = 0.25;
const TARGET_SECONDS: f64 = 0.06;

pub struct Audio {
    _stream: cpal::Stream,
    producer: HeapProd<[f32; 2]>,
    resampler: Resampler,
    target_fill: usize,
}

impl Audio {
    pub fn open(in_rate: f64) -> Result<Audio, String> {
        let device = cpal::default_host()
            .default_output_device()
            .ok_or("no audio output device")?;
        let default = device.default_output_config().map_err(|e| e.to_string())?;
        let config: cpal::StreamConfig = if default.sample_format() == cpal::SampleFormat::F32 {
            default.into()
        } else {
            device
                .supported_output_configs()
                .map_err(|e| e.to_string())?
                .filter(|c| c.sample_format() == cpal::SampleFormat::F32)
                .find_map(|c| c.try_with_sample_rate(default.sample_rate()))
                .ok_or("the audio device doesn't take f32 samples")?
                .into()
        };
        let out_rate = config.sample_rate as f64;
        let channels = config.channels as usize;

        let (producer, mut consumer): (HeapProd<[f32; 2]>, HeapCons<[f32; 2]>) =
            HeapRb::new((out_rate * BUFFER_SECONDS) as usize).split();

        let stream = device
            .build_output_stream(
                config,
                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                    for frame in data.chunks_mut(channels) {
                        let [l, r] = consumer.try_pop().unwrap_or_default();
                        match frame {
                            [mono] => *mono = (l + r) / 2.0,
                            _ => {
                                for (i, sample) in frame.iter_mut().enumerate() {
                                    *sample = match i {
                                        0 => l,
                                        1 => r,
                                        _ => 0.0,
                                    };
                                }
                            }
                        }
                    }
                },
                |err| eprintln!("audio: {err}"),
                None,
            )
            .map_err(|e| e.to_string())?;
        stream.play().map_err(|e| e.to_string())?;

        Ok(Audio {
            _stream: stream,
            producer,
            resampler: Resampler::new(in_rate, out_rate),
            target_fill: (out_rate * TARGET_SECONDS) as usize,
        })
    }

    pub fn push(&mut self, samples: &[i16], speed: f64) {
        let speed = speed / correction(self.producer.occupied_len(), self.target_fill);
        let producer = &mut self.producer;
        self.resampler.push(samples, speed, |frame| {
            let _ = producer.try_push(frame);
        });
    }

    pub fn fill_with_silence(&mut self) {
        let missing = self.target_fill.saturating_sub(self.producer.occupied_len());
        for _ in 0..missing {
            let _ = self.producer.try_push([0.0; 2]);
        }
    }
}
