use super::tests::{playing_pokemon_x, quit};
use crate::retro;
use crate::test_games::{lock_core, pokemon_x, pokemon_x_save};
use crate::vulkan::harness;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use std::time::Instant;

const A: u16 = 1 << 8;
const WALK: [u16; 8] = [1 << 4, 1 << 7, 1 << 5, 1 << 6, 1 << 7, 1 << 4, 1 << 6, 1 << 5];

fn number(name: &str, default: u32) -> u32 {
    std::env::var(name).ok().and_then(|value| value.parse().ok()).unwrap_or(default)
}

fn on(name: &str) -> bool {
    std::env::var(name).as_deref() == Ok("1")
}

fn thread_cpu_ns() -> u64 {
    let mut time = libc::timespec { tv_sec: 0, tv_nsec: 0 };
    unsafe { libc::clock_gettime(libc::CLOCK_THREAD_CPUTIME_ID, &mut time) };
    time.tv_sec as u64 * 1_000_000_000 + time.tv_nsec as u64
}

fn process_cpu_ns() -> u64 {
    let mut usage: libc::rusage = unsafe { std::mem::zeroed() };
    unsafe { libc::getrusage(libc::RUSAGE_SELF, &mut usage) };
    let us = |t: libc::timeval| t.tv_sec as u64 * 1_000_000 + t.tv_usec as u64;
    (us(usage.ru_utime) + us(usage.ru_stime)) * 1000
}

// The core stamps its events with the same clock.
fn uptime_ns() -> u64 {
    let mut time = libc::timespec { tv_sec: 0, tv_nsec: 0 };
    unsafe { libc::clock_gettime(libc::CLOCK_UPTIME_RAW, &mut time) };
    time.tv_sec as u64 * 1_000_000_000 + time.tv_nsec as u64
}

#[test]
#[ignore = "needs Pokémon X, its save and PKH_EMU_HARNESS_OUT"]
fn pokemon_x_pipelines() {
    let _lock = lock_core();
    let (Some(rom), Some(save)) = (pokemon_x(), pokemon_x_save()) else { return };
    let out = std::env::var("PKH_EMU_HARNESS_OUT").map(PathBuf::from).expect("PKH_EMU_HARNESS_OUT");
    let shots = out.join("shots");
    std::fs::create_dir_all(&shots).unwrap();
    let async_shaders = on("PKH_EMU_HARNESS_ASYNC");
    let warm = on("PKH_EMU_HARNESS_WARM");
    let (boot, walk, every) = (
        number("PKH_EMU_HARNESS_BOOT", 1800),
        number("PKH_EMU_HARNESS_WALK", 5400),
        number("PKH_EMU_HARNESS_SHOT_EVERY", 300),
    );
    let (shot_from, shot_to) = (number("PKH_EMU_HARNESS_SHOT_FROM", 0), number("PKH_EMU_HARNESS_SHOT_TO", 0));

    retro::set_async_shaders(async_shaders);
    let azahar = retro::azahar_dir(&std::env::temp_dir());
    if !warm {
        let _ = std::fs::remove_dir_all(azahar.join("shaders"));
    }
    let stats = out.join("stats.jsonl");
    let _ = std::fs::remove_file(&stats);
    if !std::env::var("PKH_EMU_HARNESS_STATS").is_ok_and(|value| value == "0") {
        unsafe { std::env::set_var("AZAHAR_PIPELINE_STATS", &stats) };
    }
    let root = std::env::temp_dir().join(format!("pkh-emu-shader-harness-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&root);

    let loading = Instant::now();
    let load_started = uptime_ns();
    let mut game = playing_pokemon_x(&root, rom, &save);
    let load_ms = loading.elapsed().as_secs_f64() * 1000.0;
    let mut frames = Vec::with_capacity((boot + walk) as usize);
    let mut cpu = String::from("frame,wall_ms,gpu_wait_ms,thread_cpu_ms,process_cpu_ms\n");
    let rgb8 = on("PKH_EMU_HARNESS_RGB8");
    harness::KEEP_RGB8.store(rgb8, Ordering::Relaxed);
    if rgb8 {
        std::fs::create_dir_all(out.join("shots8")).unwrap();
    }
    for frame in 0..boot + walk {
        let input = match frame {
            frame if frame < 300 => 0,
            frame if frame < boot => {
                if frame % 60 < 6 {
                    A
                } else {
                    0
                }
            }
            frame => WALK[((frame - boot) / 150) as usize % WALK.len()],
        };
        retro::set_input(input);
        let (started, timer) = (uptime_ns(), Instant::now());
        let (thread0, process0) = (thread_cpu_ns(), process_cpu_ns());
        harness::READBACK_WAIT_NS.store(0, Ordering::Relaxed);
        game.run_frame();
        let wall = timer.elapsed().as_secs_f64() * 1000.0;
        frames.push((started, wall));
        let waited = harness::READBACK_WAIT_NS.load(Ordering::Relaxed) as f64 / 1e6;
        let thread = (thread_cpu_ns() - thread0) as f64 / 1e6;
        let process = (process_cpu_ns() - process0) as f64 / 1e6;
        cpu.push_str(&format!("{frame},{wall:.3},{waited:.3},{thread:.3},{process:.3}\n"));
        let in_range = (shot_from..shot_to).contains(&(frame + 1));
        if in_range || (every > 0 && (frame + 1) % every == 0) {
            match game.screenshot() {
                Some(png) => std::fs::write(shots.join(format!("frame-{:05}.png", frame + 1)), png).unwrap(),
                None => eprintln!("no screenshot at frame {}", frame + 1),
            }
            if rgb8 {
                let (width, height, pixels) = harness::LAST_RGB8.lock().unwrap().clone();
                if width == 0 {
                    eprintln!("no 8-bit screenshot at frame {}", frame + 1);
                    continue;
                }
                let file =
                    std::fs::File::create(out.join("shots8").join(format!("frame-{:05}.png", frame + 1))).unwrap();
                let mut encoder = png::Encoder::new(std::io::BufWriter::new(file), width, height);
                encoder.set_color(png::ColorType::Rgb);
                encoder.set_depth(png::BitDepth::Eight);
                encoder.write_header().unwrap().write_image_data(&pixels).unwrap();
            }
        }
    }
    retro::set_input(0);
    quit(game);
    let _ = std::fs::remove_dir_all(&root);

    let csv: String = frames.iter().enumerate().map(|(i, (t, ms))| format!("{i},{t},{ms:.3}\n")).collect();
    std::fs::write(out.join("cpu.csv"), cpu).unwrap();
    std::fs::write(out.join("frames.csv"), format!("frame,start_ns,ms\n{csv}")).unwrap();
    let events: Vec<Value> = std::fs::read_to_string(&stats)
        .unwrap_or_default()
        .lines()
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect();
    let walk_start = frames.get(boot as usize).map_or(u64::MAX, |frame| frame.0);
    let phases = [
        ("boot and title", 0..boot as usize, 0..walk_start),
        ("walking", boot as usize..frames.len(), walk_start..u64::MAX),
    ];
    let mut seen = Seen::default();
    let fallbacks: HashSet<String> = events
        .iter()
        .filter(|event| event["e"] == "fbpl")
        .filter_map(|event| event["pl"].as_str().map(str::to_string))
        .collect();
    let summaries: Vec<Value> = phases
        .into_iter()
        .map(|(name, frame_range, time_range)| {
            let in_phase = events.iter().filter(|event| time_range.contains(&event["t"].as_u64().unwrap_or(0)));
            summarise(name, &frames[frame_range.clone()], frame_range.start, in_phase, &mut seen, &fallbacks)
        })
        .collect();
    let ms_after_load = |t: u64| t.saturating_sub(load_started) as f64 / 1e6;
    let ubershaders: Vec<Value> = events
        .iter()
        .filter(|event| event["e"] == "uber")
        .map(|event| {
            json!({
                "tex0": event["tex0"],
                "compile_ms": event["ns"].as_u64().unwrap_or(0) as f64 / 1e6,
                "spirv_bytes": event["bytes"],
                "done_ms_after_load_start": ms_after_load(event["t"].as_u64().unwrap_or(0)),
            })
        })
        .collect();
    let fallback_built: Vec<&Value> = events
        .iter()
        .filter(|event| event["e"] == "built" && event["pl"].as_str().is_some_and(|pl| fallbacks.contains(pl)))
        .collect();
    let mut fallback_sources: HashMap<String, usize> = HashMap::new();
    for event in events.iter().filter(|event| event["e"] == "fbpl") {
        *fallback_sources.entry(event["source"].as_str().unwrap_or_default().to_string()).or_default() += 1;
    }
    let fallback = json!({
        "ubershaders": ubershaders,
        "pipelines": fallbacks.len(),
        "pipelines_by_source": fallback_sources,
        "built": fallback_built.len(),
        "last_built_ms_after_load_start":
            fallback_built.iter().filter_map(|event| event["t"].as_u64()).max().map(ms_after_load),
        "built_before_first_frame": fallback_built
            .iter()
            .filter(|event| frames.first().is_some_and(|first| event["t"].as_u64().unwrap_or(0) < first.0))
            .count(),
    });
    let instance = events.iter().find(|event| event["e"] == "instance").cloned();
    let summary = json!({
        "async_shaders": async_shaders,
        "warm_shader_cache": warm,
        "load_ms": load_ms,
        "load_started_ns": load_started,
        "first_frame_ms_after_load": frames.first().map(|f| (f.0 - load_started) as f64 / 1e6),
        "instance": instance,
        "phases": summaries,
        "fallback": fallback,
        "total": seen.totals(),
        "conditions": std::env::var("PKH_EMU_HARNESS_CONDITIONS").ok(),
    });
    let text = serde_json::to_string_pretty(&summary).unwrap();
    std::fs::write(out.join("summary.json"), &text).unwrap();
    eprintln!("{text}");
}

#[derive(Default)]
struct Seen {
    sets: HashMap<&'static str, HashSet<String>>,
}

impl Seen {
    fn add(&mut self, set: &'static str, key: String) -> bool {
        self.sets.entry(set).or_default().insert(key)
    }

    fn totals(&self) -> Value {
        let mut names: Vec<_> = self.sets.keys().collect();
        names.sort();
        Value::Object(names.into_iter().map(|name| (name.to_string(), json!(self.sets[name].len()))).collect())
    }
}

fn tex0_class(event: &Value) -> &'static str {
    if event["tex0_on"] != true {
        return "off";
    }
    match event["tex0"].as_u64() {
        Some(0 | 3) => "2d",
        Some(1) => "cube",
        Some(2) => "shadow2d",
        Some(4) => "shadowcube",
        _ => "off",
    }
}

// Blend factors don't matter with blending off, and logic ops are emulated in the fragment shader on Apple GPUs.
fn effective_blend(event: &Value) -> String {
    let attachments = format!("{}/{}", event["color"], event["depth"]);
    if event["be"].as_u64() == Some(0) {
        format!("off/{}/{attachments}", event["fwm"])
    } else {
        format!("on/{}/{}/{attachments}", event["bf"], event["fwm"])
    }
}

fn summarise<'a>(
    name: &str,
    frames: &[(u64, f64)],
    first_frame: usize,
    events: impl Iterator<Item = &'a Value>,
    seen: &mut Seen,
    fallbacks: &HashSet<String>,
) -> Value {
    let mut new: HashMap<&'static str, usize> = HashMap::new();
    let mut count = |seen: &mut Seen, set: &'static str, key: String| {
        let added = seen.add(set, key);
        *new.entry(set).or_default() += added as usize;
    };
    let (mut waits, mut wait_ns, mut worst_wait, mut worst_wait_pipeline) = (0, 0u64, 0u64, String::new());
    let (mut skips, mut skipped_vertices) = (0, 0u64);
    let (mut builds, mut build_ns, mut worst_build, mut worst_build_pipeline) = (0, 0u64, 0u64, String::new());
    let (mut fast_builds, mut fs_compiles, mut fs_ns, mut vs_compiles, mut vs_ns) = (0, 0, 0u64, 0, 0u64);
    let (mut draws, mut hardware_draws, mut pending_draws) = (0u64, 0u64, 0u64);
    let (mut fallback_draws, mut redirected_draws, mut fallback_missing, mut ineligible) = (0u64, 0u64, 0u64, 0u64);
    let (mut fallback_builds, mut fallback_build_ns, mut worst_fallback_build) = (0, 0u64, 0u64);
    let mut fs_features: HashMap<String, usize> = HashMap::new();
    let mut builds_by_pipeline: HashMap<String, u64> = HashMap::new();
    let mut requested_at: HashMap<String, u64> = HashMap::new();
    let mut ready_after: HashMap<String, u64> = HashMap::new();
    for event in events {
        let text = |key: &str| event[key].as_str().unwrap_or_default().to_string();
        match event["e"].as_str() {
            Some("req") => {
                if event["built"] == false {
                    requested_at.entry(text("pl")).or_insert(event["t"].as_u64().unwrap_or(0));
                }
                if event["first"] != true {
                    continue;
                }
                let tex0 = tex0_class(event);
                let blend = format!("{}/{}", text("ba"), event["fwm"]);
                count(seen, "pipelines", text("pl"));
                count(seen, "fs", text("fs"));
                count(seen, "vs", text("vs"));
                count(seen, "vertex_layouts", text("vl"));
                count(seen, "blend_attachments", blend.clone());
                count(seen, "blend_attachments_tex0", format!("{blend}/{tex0}"));
                count(seen, "blend_attachments_raster_depth", format!("{blend}/{}", text("rd")));
                count(seen, "blend_attachments_tex0_raster_depth", format!("{blend}/{tex0}/{}", text("rd")));
                count(seen, "effective_blend_attachments", effective_blend(event));
                count(seen, "effective_blend_attachments_tex0", format!("{}/{tex0}", effective_blend(event)));
                count(seen, "tex0_classes", tex0.to_string());
                count(seen, if event["hw"] == true { "hardware_pipelines" } else { "software_pipelines" }, text("pl"));
            }
            Some("skip") => {
                skips += 1;
                skipped_vertices += event["n"].as_u64().unwrap_or(0);
            }
            Some("wait") => {
                let ns = event["ns"].as_u64().unwrap_or(0);
                waits += 1;
                wait_ns += ns;
                if ns > worst_wait {
                    (worst_wait, worst_wait_pipeline) = (ns, text("pl"));
                }
            }
            Some("built") => {
                let ns = event["ns"].as_u64().unwrap_or(0);
                if fallbacks.contains(&text("pl")) {
                    fallback_builds += 1;
                    fallback_build_ns += ns;
                    worst_fallback_build = worst_fallback_build.max(ns);
                    continue;
                }
                if event["fail_on_compile"] == true {
                    fast_builds += 1;
                    continue;
                }
                builds += 1;
                build_ns += ns;
                if let Some(requested) = requested_at.get(&text("pl")) {
                    let t = event["t"].as_u64().unwrap_or(0);
                    ready_after.entry(text("pl")).or_insert(t.saturating_sub(*requested));
                }
                let slowest = builds_by_pipeline.entry(text("pl")).or_default();
                *slowest = (*slowest).max(ns);
                if ns > worst_build {
                    (worst_build, worst_build_pipeline) = (ns, text("pl"));
                }
            }
            Some("fs") => {
                fs_compiles += 1;
                fs_ns += event["ns"].as_u64().unwrap_or(0);
                for feature in ["lighting", "proctex", "shadow_rendering", "shadow_light", "minmax", "glsl"] {
                    if event[feature] == true || event[feature].as_u64().is_some_and(|n| n > 0) {
                        *fs_features.entry(feature.to_string()).or_default() += 1;
                    }
                }
                if event["fog"].as_u64().is_some_and(|fog| fog != 0) {
                    *fs_features.entry("fog".into()).or_default() += 1;
                }
                *fs_features.entry(format!("tex0_{}", event["tex0"])).or_default() += 1;
            }
            Some("vs") => {
                vs_compiles += 1;
                vs_ns += event["ns"].as_u64().unwrap_or(0);
            }
            Some("frame") => {
                draws += event["draws"].as_u64().unwrap_or(0);
                hardware_draws += event["hw"].as_u64().unwrap_or(0);
                pending_draws += event["pending"].as_u64().unwrap_or(0);
                fallback_draws += event["fb"].as_u64().unwrap_or(0);
                redirected_draws += event["redir"].as_u64().unwrap_or(0);
                fallback_missing += event["fbmiss"].as_u64().unwrap_or(0);
                ineligible += event["inelig"].as_u64().unwrap_or(0);
            }
            _ => {}
        }
    }
    let mut times: Vec<f64> = frames.iter().map(|frame| frame.1).collect();
    let worst = frames.iter().enumerate().max_by(|a, b| a.1 .1.total_cmp(&b.1 .1));
    times.sort_by(f64::total_cmp);
    let percentile = |p: usize| times.get(times.len() * p / 100).copied().unwrap_or(0.0);
    let mut new: Vec<_> = new.into_iter().collect();
    new.sort();
    json!({
        "phase": name,
        "frames": frames.len(),
        "average_ms": times.iter().sum::<f64>() / times.len().max(1) as f64,
        "p95_ms": percentile(95),
        "p99_ms": percentile(99),
        "worst_ms": worst.map(|w| w.1 .1),
        "worst_frame": worst.map(|w| w.0 + first_frame),
        "over_33_ms": times.iter().filter(|&&t| t > 33.3).count(),
        "over_100_ms": times.iter().filter(|&&t| t > 100.0).count(),
        "new": Value::Object(new.into_iter().map(|(k, v)| (k.to_string(), json!(v))).collect()),
        "draws": draws,
        "hardware_draws": hardware_draws,
        "draws_on_unbuilt_pipelines": pending_draws,
        "fallback_draws": fallback_draws,
        "redirected_draws": redirected_draws,
        "fallback_missing": fallback_missing,
        "ineligible_unbuilt_draws": ineligible,
        "fallback_builds": fallback_builds,
        "fallback_build_total_ms": fallback_build_ns as f64 / 1e6,
        "worst_fallback_build_ms": worst_fallback_build as f64 / 1e6,
        "waits": waits,
        "wait_total_ms": wait_ns as f64 / 1e6,
        "worst_wait_ms": worst_wait as f64 / 1e6,
        "worst_wait_pipeline": worst_wait_pipeline,
        "worst_wait_pipeline_build_ms": builds_by_pipeline.get(&worst_wait_pipeline).map(|ns| *ns as f64 / 1e6),
        "worst_wait_pipeline_ready_after_request_ms": ready_after.get(&worst_wait_pipeline).map(|ns| *ns as f64 / 1e6),
        "worst_ready_after_request_ms": ready_after.values().max().map(|ns| *ns as f64 / 1e6),
        "skips": skips,
        "skipped_vertices": skipped_vertices,
        "pipeline_builds": builds,
        "pipeline_build_total_ms": build_ns as f64 / 1e6,
        "worst_pipeline_build_ms": worst_build as f64 / 1e6,
        "worst_pipeline_build": worst_build_pipeline,
        "fail_on_compile_attempts": fast_builds,
        "fs_compiles": fs_compiles,
        "fs_compile_total_ms": fs_ns as f64 / 1e6,
        "fs_features": fs_features,
        "vs_compiles": vs_compiles,
        "vs_compile_total_ms": vs_ns as f64 / 1e6,
    })
}

fn rgb(path: &Path) -> (u32, u32, Vec<u8>) {
    let decoder = png::Decoder::new(std::io::BufReader::new(std::fs::File::open(path).unwrap()));
    let mut reader = decoder.read_info().unwrap();
    let mut pixels = vec![0; reader.output_buffer_size().unwrap()];
    let info = reader.next_frame(&mut pixels).unwrap();
    pixels.truncate(info.buffer_size());
    (info.width, info.height, pixels)
}

// Screenshots from two runs differ a little even when nothing went wrong, so this reports how much they differ.
#[test]
#[ignore = "compares two harness runs: PKH_EMU_HARNESS_COMPARE=<run>:<run>"]
fn compare_shader_harness_runs() {
    let runs = std::env::var("PKH_EMU_HARNESS_COMPARE").expect("PKH_EMU_HARNESS_COMPARE");
    let (a, b) = runs.split_once(':').expect("two runs separated by ':'");
    let threshold = number("PKH_EMU_HARNESS_DIFF_THRESHOLD", 24) as i32;
    let mut names: Vec<_> = std::fs::read_dir(Path::new(a).join("shots"))
        .unwrap()
        .filter_map(|entry| entry.ok().map(|entry| entry.file_name()))
        .collect();
    names.sort();
    let mut report = Vec::new();
    for name in names {
        let other = Path::new(b).join("shots").join(&name);
        if !other.exists() {
            continue;
        }
        let (width, height, left) = rgb(&Path::new(a).join("shots").join(&name));
        let (other_width, other_height, right) = rgb(&other);
        if (width, height) != (other_width, other_height) {
            report.push(json!({ "shot": name.to_string_lossy(), "error": "sizes differ" }));
            continue;
        }
        let pixels = left.len() / 3;
        let differing = left
            .chunks(3)
            .zip(right.chunks(3))
            .filter(|(l, r)| l.iter().zip(r.iter()).any(|(x, y)| (*x as i32 - *y as i32).abs() > threshold))
            .count();
        let half = pixels / 2;
        let top = left[..half * 3]
            .chunks(3)
            .zip(right[..half * 3].chunks(3))
            .filter(|(l, r)| l.iter().zip(r.iter()).any(|(x, y)| (*x as i32 - *y as i32).abs() > threshold))
            .count();
        report.push(json!({
            "shot": name.to_string_lossy(),
            "differing_percent": differing as f64 * 100.0 / pixels as f64,
            "top_half_percent": top as f64 * 100.0 / half as f64,
            "bottom_half_percent": (differing - top) as f64 * 100.0 / (pixels - half) as f64,
        }));
    }
    let text = serde_json::to_string_pretty(&report).unwrap();
    if let Ok(path) = std::env::var("PKH_EMU_HARNESS_COMPARE_OUT") {
        std::fs::write(path, &text).unwrap();
    }
    eprintln!("{text}");
}
