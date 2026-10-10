use super::SPRITE_SIZE as SIZE;
use crate::lz77;
use crate::nds::{i16_at, section, u16_at, u32_at, Graphic};
use crate::Frame;
use std::borrow::Cow;
use std::cmp::Reverse;
use std::f64::consts::TAU;

const MAX_FILE: usize = 0x20000;
const LONGEST_LOOP: u32 = 600;
const ONE: i32 = 0x1000;
const SLOTS: usize = 256;

// OBJ sizes by shape, then size, as the DS reads them from OAM attributes.
const OBJ_SIZES: [[(i32, i32); 4]; 3] = [
    [(8, 8), (16, 16), (32, 32), (64, 64)],
    [(16, 8), (32, 8), (32, 16), (64, 32)],
    [(8, 16), (8, 32), (16, 32), (32, 64)],
];

fn unpacked(file: &[u8]) -> Option<Cow<'_, [u8]>> {
    match file.first()? {
        0x11 => lz77::decompress_extended(file, MAX_FILE).map(Cow::Owned),
        _ => Some(Cow::Borrowed(file)),
    }
}

pub struct Sheet {
    width: usize,
    height: usize,
    pixels: Vec<u8>,
}

impl Sheet {
    pub fn read(file: &[u8]) -> Option<Sheet> {
        let graphic = Graphic::read(&unpacked(file)?)?;
        if graphic.depth != 4 || !graphic.scanned || graphic.width == 0 || graphic.height == 0 {
            return None;
        }
        let pixels = graphic.pixels(graphic.width, graphic.height)?;
        Some(Sheet { width: graphic.width, height: graphic.height, pixels })
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct Obj {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    tile: usize,
}

fn obj([first, second, third]: [u16; 3]) -> Option<Option<Obj>> {
    let (affine, doubled) = (first & 0x100 != 0, first & 0x200 != 0);
    if !affine && doubled {
        return Some(None);
    }
    if first & 0x2000 != 0 || (!affine && second & 0x3000 != 0) {
        return None;
    }
    let (width, height) = *OBJ_SIZES.get((first >> 14) as usize)?.get((second >> 14) as usize)?;
    let (x, y) = (((second & 0x1FF) as i32 ^ 0x100) - 0x100, first as u8 as i8 as i32);
    // A double-size OBJ's position is the corner of a box twice its size, with the OBJ in the middle.
    let (x, y) = if doubled { (x + width / 2, y + height / 2) } else { (x, y) };
    Some(Some(Obj { x, y, width, height, tile: (third & 0x3FF) as usize }))
}

fn cells(file: &[u8]) -> Option<Vec<Vec<Obj>>> {
    let file = unpacked(file)?;
    let bank = section(&file, b"RECN", b"KBEC")?;
    let (count, at) = (u16_at(bank, 8)? as usize, 8 + u32_at(bank, 12)?);
    let stride = match u16_at(bank, 10)? {
        0 => 8,
        1 => 16,
        _ => return None,
    };
    let objs = at + count * stride;
    (0..count)
        .map(|cell| {
            let row = at + cell * stride;
            let (len, first) = (u16_at(bank, row)? as usize, objs + u32_at(bank, row + 4)?);
            let mut cell = Vec::new();
            for at in (0..len).map(|k| first + 6 * k) {
                cell.extend(obj([u16_at(bank, at)?, u16_at(bank, at + 2)?, u16_at(bank, at + 4)?])?);
            }
            Some(cell)
        })
        .collect()
}

#[derive(Clone, Debug, PartialEq)]
struct Picture {
    left: i32,
    top: i32,
    width: i32,
    height: i32,
    pixels: Vec<u8>,
}

// Parts sheets map OBJ tiles in 2D, so a tile number is a position on the sheet's grid of 8x8 tiles.
// A few species have OBJs reaching past the sheet, some starting below it, and those pixels draw nothing.
fn picture(objs: &[Obj], sheet: &Sheet) -> Picture {
    let left = objs.iter().map(|obj| obj.x).min().unwrap_or(0);
    let top = objs.iter().map(|obj| obj.y).min().unwrap_or(0);
    let width = objs.iter().map(|obj| obj.x + obj.width).max().unwrap_or(0) - left;
    let height = objs.iter().map(|obj| obj.y + obj.height).max().unwrap_or(0) - top;
    let mut pixels = vec![0; (width * height) as usize];
    let columns = sheet.width / 8;
    for obj in objs.iter().rev() {
        let (sheet_x, sheet_y) = ((obj.tile % columns) * 8, (obj.tile / columns) * 8);
        for y in 0..obj.height {
            for x in 0..obj.width {
                let (u, v) = (sheet_x + x as usize, sheet_y + y as usize);
                let pixel = if u < sheet.width && v < sheet.height { sheet.pixels[v * sheet.width + u] } else { 0 };
                if pixel != 0 {
                    pixels[((obj.y - top + y) * width + obj.x - left + x) as usize] = pixel;
                }
            }
        }
    }
    Picture { left, top, width, height, pixels }
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct Place {
    index: usize,
    angle: u16,
    scale_x: i32,
    scale_y: i32,
    x: i32,
    y: i32,
}

impl Place {
    fn at(index: usize, x: i32, y: i32) -> Place {
        Place { index, angle: 0, scale_x: ONE, scale_y: ONE, x, y }
    }
}

fn place(bank: &[u8], at: usize, element: u16) -> Option<Place> {
    let index = u16_at(bank, at)? as usize;
    match element {
        0 => Some(Place::at(index, 0, 0)),
        1 => Some(Place {
            index,
            angle: u16_at(bank, at + 2)?,
            scale_x: u32_at(bank, at + 4)? as u32 as i32,
            scale_y: u32_at(bank, at + 8)? as u32 as i32,
            x: i16_at(bank, at + 12)?,
            y: i16_at(bank, at + 14)?,
        }),
        2 => Some(Place::at(index, i16_at(bank, at + 4)?, i16_at(bank, at + 6)?)),
        _ => None,
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct Keyframe {
    ticks: u32,
    place: Place,
}

#[derive(Clone, Debug, PartialEq)]
struct Sequence {
    looping: bool,
    keyframes: Vec<Keyframe>,
}

impl Sequence {
    fn ticks(&self) -> u32 {
        self.keyframes.iter().map(|keyframe| keyframe.ticks).sum()
    }

    // A keyframe of 0 ticks never shows. A sequence of only those holds its first keyframe.
    fn at(&self, tick: u32) -> Option<(usize, &Keyframe)> {
        let ticks = self.ticks();
        if ticks == 0 {
            return self.keyframes.first().map(|keyframe| (0, keyframe));
        }
        let mut tick = if self.looping { tick % ticks } else { tick.min(ticks - 1) };
        for (index, keyframe) in self.keyframes.iter().enumerate() {
            if tick < keyframe.ticks {
                return Some((index, keyframe));
            }
            tick -= keyframe.ticks;
        }
        None
    }
}

// NANR and NMAR share this bank. Play mode 1 plays once and 2 loops; the reverse modes and loop starts go unused.
fn sequences(file: &[u8], magic: &[u8; 4]) -> Option<Vec<Sequence>> {
    let file = unpacked(file)?;
    let bank = section(&file, magic, b"KNBA")?;
    let count = u16_at(bank, 8)? as usize;
    let (headers, frames, data) = (8 + u32_at(bank, 12)?, 8 + u32_at(bank, 16)?, 8 + u32_at(bank, 20)?);
    (0..count)
        .map(|sequence| {
            let at = headers + 16 * sequence;
            let looping = match (u16_at(bank, at + 2)?, u32_at(bank, at + 8)?) {
                (0, 1) => false,
                (0, 2) => true,
                _ => return None,
            };
            let (element, first) = (u16_at(bank, at + 4)?, frames + u32_at(bank, at + 12)?);
            let keyframes = (0..u16_at(bank, at)? as usize)
                .map(|k| {
                    let frame = first + 8 * k;
                    let ticks = u16_at(bank, frame + 4)? as u32;
                    Some(Keyframe { ticks, place: place(bank, data + u32_at(bank, frame)?, element)? })
                })
                .collect::<Option<Vec<_>>>()?;
            Some(Sequence { looping, keyframes })
        })
        .collect()
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct Node {
    sequence: usize,
    x: i32,
    y: i32,
    slot: usize,
    reset: bool,
    visible: bool,
}

// A node's attributes hold its play mode in the low nibble, a visibility bit and the cell animation slot it drives.
// Play mode 0 restarts the slot's animation when the multicell comes up, 1 carries on from where it was.
fn multicells(file: &[u8]) -> Option<Vec<Vec<Node>>> {
    let file = unpacked(file)?;
    let bank = section(&file, b"RCMN", b"KBCM")?;
    let (headers, nodes) = (8 + u32_at(bank, 12)?, 8 + u32_at(bank, 16)?);
    (0..u16_at(bank, 8)? as usize)
        .map(|multicell| {
            let at = headers + 8 * multicell;
            let first = nodes + u32_at(bank, at + 4)?;
            (0..u16_at(bank, at)? as usize)
                .map(|k| {
                    let at = first + 8 * k;
                    let attributes = u16_at(bank, at + 6)?;
                    let reset = match attributes & 0xF {
                        0 => true,
                        1 => false,
                        _ => return None,
                    };
                    Some(Node {
                        sequence: u16_at(bank, at)? as usize,
                        x: i16_at(bank, at + 2)?,
                        y: i16_at(bank, at + 4)?,
                        slot: (attributes >> 8) as usize,
                        reset,
                        visible: attributes & 0x20 != 0,
                    })
                })
                .collect()
        })
        .collect()
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct Draw {
    whole: Place,
    node: (i32, i32),
    part: Place,
}

#[derive(Clone, Copy, Debug)]
struct Affine {
    matrix: [f64; 4],
    x: f64,
    y: f64,
}

// Sines and cosines round to the DS's 12 fractional bits, so frames don't depend on the platform's last bits.
fn turn(angle: u16) -> (f64, f64) {
    let radians = angle as f64 * TAU / 65536.0;
    let fixed = |value: f64| (value * ONE as f64).round() / ONE as f64;
    (fixed(radians.cos()), fixed(radians.sin()))
}

impl Affine {
    fn shift(x: i32, y: i32) -> Affine {
        Affine { matrix: [1.0, 0.0, 0.0, 1.0], x: x as f64, y: y as f64 }
    }

    // Scales, then turns clockwise on screen, then moves.
    fn of(place: &Place) -> Option<Affine> {
        if place.scale_x == 0 || place.scale_y == 0 {
            return None;
        }
        let (cos, sin) = turn(place.angle);
        let (sx, sy) = (place.scale_x as f64 / ONE as f64, place.scale_y as f64 / ONE as f64);
        Some(Affine { matrix: [cos * sx, -sin * sy, sin * sx, cos * sy], x: place.x as f64, y: place.y as f64 })
    }

    fn apply(&self, x: f64, y: f64) -> (f64, f64) {
        let [a, b, c, d] = self.matrix;
        (a * x + b * y + self.x, c * x + d * y + self.y)
    }

    fn then(self, outer: Affine) -> Affine {
        let ([a, b, c, d], [e, f, g, h]) = (self.matrix, outer.matrix);
        let (x, y) = outer.apply(self.x, self.y);
        Affine { matrix: [e * a + f * c, e * b + f * d, g * a + h * c, g * b + h * d], x, y }
    }

    fn inverse(&self) -> Affine {
        let [a, b, c, d] = self.matrix;
        let det = a * d - b * c;
        let matrix = [d / det, -b / det, -c / det, a / det];
        let x = -(matrix[0] * self.x + matrix[1] * self.y);
        let y = -(matrix[2] * self.x + matrix[3] * self.y);
        Affine { matrix, x, y }
    }
}

// The first node drawn stays on top.
fn draw(draws: &[Draw], pictures: &[Picture], origin: (i32, i32), width: usize, height: usize) -> Vec<u8> {
    let mut pixels = vec![0; width * height];
    for draw in draws {
        let picture = &pictures[draw.part.index];
        let (Some(whole), Some(part)) = (Affine::of(&draw.whole), Affine::of(&draw.part)) else {
            continue;
        };
        let forward =
            part.then(Affine::shift(draw.node.0, draw.node.1)).then(whole).then(Affine::shift(origin.0, origin.1));
        let (left, top) = (picture.left as f64, picture.top as f64);
        let (right, bottom) = (left + picture.width as f64, top + picture.height as f64);
        let corners = [(left, top), (right, top), (left, bottom), (right, bottom)].map(|(x, y)| forward.apply(x, y));
        let span = |values: [f64; 4], len: usize| {
            let low = values.iter().copied().fold(f64::INFINITY, f64::min).floor().max(0.0) as usize;
            let high = values.iter().copied().fold(f64::NEG_INFINITY, f64::max).ceil().clamp(0.0, len as f64) as usize;
            low..high
        };
        let back = forward.inverse();
        for y in span(corners.map(|(_, y)| y), height) {
            for x in span(corners.map(|(x, _)| x), width) {
                let at = y * width + x;
                if pixels[at] != 0 {
                    continue;
                }
                let (u, v) = back.apply(x as f64 + 0.5, y as f64 + 0.5);
                let (u, v) = (u.floor() as i32 - picture.left, v.floor() as i32 - picture.top);
                if (0..picture.width).contains(&u) && (0..picture.height).contains(&v) {
                    pixels[at] = picture.pixels[(v * picture.width + u) as usize];
                }
            }
        }
    }
    pixels
}

const CANVAS: usize = 3 * SIZE;
const CANVAS_ORIGIN: (i32, i32) = (CANVAS as i32 / 2, 2 * SIZE as i32);
const COARSE: usize = 8;
const CANDIDATES: usize = 32;

// The ROM keeps no offset between the parts' origin and the still front, which sits higher or lower per species.
// So the origin goes where the first pose best covers the still, searching every origin on a sample of its pixels first.
fn fit(draws: &[Draw], pictures: &[Picture], still: &[u8]) -> Option<(i32, i32)> {
    let canvas = draw(draws, pictures, CANVAS_ORIGIN, CANVAS, CANVAS);
    let points: Vec<(i32, i32, u8)> = (canvas.iter().enumerate())
        .filter(|&(_, &pixel)| pixel != 0)
        .map(|(at, &pixel)| ((at % CANVAS) as i32 - CANVAS_ORIGIN.0, (at / CANVAS) as i32 - CANVAS_ORIGIN.1, pixel))
        .collect();
    let size = SIZE as i32;
    let score = |points: &[(i32, i32, u8)], (ox, oy): (i32, i32)| {
        (points.iter())
            .filter(|&&(x, y, pixel)| {
                let (x, y) = (x + ox, y + oy);
                (0..size).contains(&x) && (0..size).contains(&y) && still.get((y * size + x) as usize) == Some(&pixel)
            })
            .count()
    };
    let sample: Vec<(i32, i32, u8)> = points.iter().step_by(COARSE).copied().collect();
    let mut origins: Vec<((i32, i32), usize)> = (0..size + size / 2)
        .flat_map(|oy| (0..size).map(move |ox| (ox, oy)))
        .map(|origin| (origin, score(&sample, origin)))
        .collect();
    origins.sort_by_key(|&(_, score)| Reverse(score));
    let (origin, best) = (origins.iter().take(CANDIDATES))
        .map(|&(origin, _)| (origin, score(&points, origin)))
        .max_by_key(|&((ox, oy), score)| (score, Reverse((oy, ox))))?;
    (best * 2 >= points.len() && best > 0).then_some(origin)
}

fn merged(frames: impl IntoIterator<Item = Frame>) -> Vec<Frame> {
    let mut merged: Vec<Frame> = Vec::new();
    for frame in frames {
        match merged.last_mut() {
            Some(last) if last.pixels == frame.pixels => last.delay += frame.delay,
            _ => merged.push(frame),
        }
    }
    merged
}

pub struct Rig {
    cells: Vec<Vec<Obj>>,
    sequences: Vec<Sequence>,
    multicells: Vec<Vec<Node>>,
    idle: Sequence,
}

impl Rig {
    // The NMAR's first sequence is the battle idle: its loop lasts as long as Showdown's Gen 5 battle sprites,
    // ripped from the game (Bulbasaur 306 ticks, Charmander 324, Charmeleon 270). The few others are short poses.
    pub fn read(ncer: &[u8], nanr: &[u8], nmcr: &[u8], nmar: &[u8]) -> Option<Rig> {
        let idle = sequences(nmar, b"RAMN")?.into_iter().next()?;
        Rig { cells: cells(ncer)?, sequences: sequences(nanr, b"RNAN")?, multicells: multicells(nmcr)?, idle }.checked()
    }

    fn checked(self) -> Option<Rig> {
        let cells = self.cells.len();
        let parts = (self.sequences.iter())
            .all(|sequence| !sequence.keyframes.is_empty() && sequence.keyframes.iter().all(|k| k.place.index < cells));
        let nodes = self.multicells.iter().flatten().all(|node| node.sequence < self.sequences.len());
        let poses = !self.idle.keyframes.is_empty()
            && self.idle.keyframes.iter().all(|keyframe| keyframe.place.index < self.multicells.len());
        let ticks = self.idle.ticks();
        (parts && nodes && poses && (1..LONGEST_LOOP).contains(&ticks)).then_some(self)
    }

    fn poses(&self) -> Vec<(Vec<Draw>, u32)> {
        let mut times = [None::<u32>; SLOTS];
        let mut shown = None;
        let mut poses: Vec<(Vec<Draw>, u32)> = Vec::new();
        for tick in 0..self.idle.ticks() {
            let Some((index, keyframe)) = self.idle.at(tick) else {
                break;
            };
            let nodes = &self.multicells[keyframe.place.index];
            if shown != Some(index) {
                shown = Some(index);
                for node in nodes {
                    if node.reset || times[node.slot].is_none() {
                        times[node.slot] = Some(0);
                    }
                }
            }
            let draws: Vec<Draw> = (nodes.iter().filter(|node| node.visible))
                .filter_map(|node| {
                    let (_, part) = self.sequences[node.sequence].at(times[node.slot]?)?;
                    Some(Draw { whole: keyframe.place, node: (node.x, node.y), part: part.place })
                })
                .collect();
            match poses.last_mut() {
                Some((last, ticks)) if *last == draws => *ticks += 1,
                _ => poses.push((draws, 1)),
            }
            times.iter_mut().flatten().for_each(|time| *time += 1);
        }
        poses
    }

    pub fn play(&self, sheet: &Sheet, still: &[u8]) -> Option<Vec<Frame>> {
        let pictures: Vec<Picture> = self.cells.iter().map(|objs| picture(objs, sheet)).collect();
        let poses = self.poses();
        let origin = fit(&poses.first()?.0, &pictures, still)?;
        let frames =
            merged(poses.iter().map(|(draws, ticks)| Frame {
                pixels: draw(draws, &pictures, origin, SIZE, SIZE),
                delay: *ticks as u16,
            }));
        (frames.len() > 1).then_some(frames)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::nds::build;

    fn picture(width: i32, pixels: &[u8]) -> Picture {
        Picture { left: 0, top: 0, width, height: pixels.len() as i32 / width, pixels: pixels.to_vec() }
    }

    fn shown(pixels: &[u8], width: usize) -> Vec<(usize, usize, u8)> {
        (pixels.iter().enumerate())
            .filter(|&(_, &pixel)| pixel != 0)
            .map(|(at, &p)| (at % width, at / width, p))
            .collect()
    }

    fn part(index: usize, x: i32, y: i32) -> Draw {
        Draw { whole: Place::at(0, 0, 0), node: (0, 0), part: Place::at(index, x, y) }
    }

    #[test]
    fn moves_scales_and_turns_a_cell_by_its_keyframe() {
        let pictures = [picture(2, &[1, 2])];
        let moved = part(0, 3, 1);
        let scaled = Draw { part: Place { scale_x: 2 * ONE, scale_y: 2 * ONE, ..moved.part }, ..moved };
        let turned = Draw { part: Place { angle: 0x4000, ..Place::at(0, 0, 0) }, ..moved };

        assert_eq!(shown(&draw(&[moved], &pictures, (1, 1), 8, 8), 8), [(4, 2, 1), (5, 2, 2)]);
        assert_eq!(
            shown(&draw(&[scaled], &pictures, (1, 1), 8, 8), 8),
            [(4, 2, 1), (5, 2, 1), (6, 2, 2), (7, 2, 2), (4, 3, 1), (5, 3, 1), (6, 3, 2), (7, 3, 2)]
        );
        assert_eq!(shown(&draw(&[turned], &pictures, (4, 4), 8, 8), 8), [(3, 4, 1), (3, 5, 2)]);
    }

    #[test]
    fn places_parts_at_their_node_and_keeps_the_first_on_top() {
        let pictures = [picture(2, &[1, 1]), picture(2, &[2, 2])];
        let first = Draw { node: (2, 0), ..part(0, 0, 1) };
        let second = Draw { node: (3, 0), ..part(1, 0, 1) };

        assert_eq!(shown(&draw(&[first, second], &pictures, (0, 0), 8, 4), 8), [(2, 1, 1), (3, 1, 1), (4, 1, 2)]);
    }

    #[test]
    fn turns_and_moves_the_whole_multicell_around_its_origin() {
        let pictures = [picture(1, &[5])];
        let whole = Place { angle: 0x8000, ..Place::at(0, 1, 0) };
        let draws = [Draw { whole, node: (2, 0), part: Place::at(0, 0, 0) }];

        assert_eq!(shown(&draw(&draws, &pictures, (4, 2), 8, 4), 8), [(2, 1, 5)]);
    }

    #[test]
    fn clips_what_leaves_the_frame() {
        let pictures = [picture(3, &[1, 2, 3, 4, 5, 6])];

        assert_eq!(shown(&draw(&[part(0, -1, -1)], &pictures, (0, 0), 2, 2), 2), [(0, 0, 5), (1, 0, 6)]);
        assert_eq!(shown(&draw(&[part(0, 9, 9)], &pictures, (0, 0), 2, 2), 2), []);
    }

    #[test]
    fn draws_nothing_for_a_part_scaled_to_nothing() {
        let draws = [Draw { part: Place { scale_x: 0, ..Place::at(0, 0, 0) }, ..part(0, 0, 0) }];

        assert_eq!(shown(&draw(&draws, &[picture(1, &[1])], (0, 0), 2, 2), 2), []);
    }

    fn keyframe(ticks: u32, index: usize, x: i32) -> Keyframe {
        Keyframe { ticks, place: Place::at(index, x, 0) }
    }

    fn looping(keyframes: &[Keyframe]) -> Sequence {
        Sequence { looping: true, keyframes: keyframes.to_vec() }
    }

    fn node(sequence: usize, x: i32, slot: usize, reset: bool) -> Node {
        Node { sequence, x, y: 0, slot, reset, visible: true }
    }

    fn rig(sequences: Vec<Sequence>, multicells: Vec<Vec<Node>>, idle: &[Keyframe]) -> Rig {
        Rig { cells: vec![Vec::new(); 2], sequences, multicells, idle: looping(idle) }
    }

    type Timeline = Vec<(Vec<(i32, (i32, i32), usize, i32)>, u32)>;

    fn timeline(rig: &Rig) -> Timeline {
        let flat = |draws: &[Draw]| -> Vec<_> {
            draws.iter().map(|draw| (draw.whole.x, draw.node, draw.part.index, draw.part.x)).collect()
        };
        rig.poses().iter().map(|(draws, ticks)| (flat(draws), *ticks)).collect()
    }

    #[test]
    fn plays_each_node_through_its_keyframes_tick_by_tick() {
        let sequences =
            vec![looping(&[keyframe(2, 0, 0), keyframe(0, 1, 9), keyframe(1, 1, 1)]), looping(&[keyframe(4, 0, 5)])];
        let multicells =
            vec![vec![node(0, 10, 0, true), Node { visible: false, ..node(1, 20, 1, true) }, node(1, 30, 2, true)]];
        let rig = rig(sequences, multicells, &[keyframe(5, 0, 7)]);

        assert_eq!(
            timeline(&rig),
            [
                (vec![(7, (10, 0), 0, 0), (7, (30, 0), 0, 5)], 2),
                (vec![(7, (10, 0), 1, 1), (7, (30, 0), 0, 5)], 1),
                (vec![(7, (10, 0), 0, 0), (7, (30, 0), 0, 5)], 2),
            ]
        );
    }

    #[test]
    fn restarts_or_continues_a_slot_when_the_next_multicell_comes_up() {
        let counting = looping(&[keyframe(1, 0, 0), keyframe(1, 0, 1), keyframe(1, 0, 2), keyframe(1, 0, 3)]);
        let multicells =
            vec![vec![node(0, 0, 0, true), node(0, 1, 1, true)], vec![node(0, 0, 0, true), node(0, 1, 1, false)]];
        let rig = rig(vec![counting], multicells, &[keyframe(2, 0, 0), keyframe(2, 1, 0)]);

        let parts: Vec<Vec<i32>> =
            timeline(&rig).iter().map(|(draws, _)| draws.iter().map(|draw| draw.3).collect()).collect();
        assert_eq!(parts, [[0, 0], [1, 1], [0, 2], [1, 3]]);
    }

    #[test]
    fn holds_the_last_keyframe_of_a_sequence_that_plays_once() {
        let once = Sequence { looping: false, keyframes: vec![keyframe(1, 0, 0), keyframe(1, 0, 1)] };

        assert_eq!([0, 1, 5].map(|tick| once.at(tick).map(|(at, _)| at)), [Some(0), Some(1), Some(1)]);
        assert_eq!(looping(&[keyframe(0, 0, 0), keyframe(0, 1, 0)]).at(3).map(|(at, _)| at), Some(0));
    }

    #[test]
    fn checks_that_cells_sequences_and_multicells_are_in_range() {
        let fits = || rig(vec![looping(&[keyframe(1, 1, 0)])], vec![vec![node(0, 0, 0, true)]], &[keyframe(9, 0, 0)]);
        assert!(fits().checked().is_some());

        let mut cell_past_the_end = fits();
        cell_past_the_end.sequences[0].keyframes[0].place.index = 2;
        let mut sequence_past_the_end = fits();
        sequence_past_the_end.multicells[0][0].sequence = 1;
        let mut multicell_past_the_end = fits();
        multicell_past_the_end.idle.keyframes[0].place.index = 1;
        let mut ten_seconds = fits();
        ten_seconds.idle.keyframes[0].ticks = LONGEST_LOOP;
        let mut no_keyframes = fits();
        no_keyframes.sequences[0].keyframes.clear();
        for rig in [cell_past_the_end, sequence_past_the_end, multicell_past_the_end, ten_seconds, no_keyframes] {
            assert!(rig.checked().is_none());
        }
    }

    #[test]
    fn merges_identical_frames_and_adds_their_delays() {
        let frame = |pixel: u8, delay: u16| Frame { pixels: vec![pixel; 4], delay };

        assert_eq!(
            merged([frame(1, 6), frame(1, 3), frame(2, 6), frame(1, 6)]),
            [frame(1, 9), frame(2, 6), frame(1, 6)]
        );
    }

    #[test]
    fn finds_the_origin_where_the_first_pose_covers_the_still() {
        let mut body = vec![1; 64];
        body[9] = 2;
        let pictures = [Picture { left: -4, top: -8, width: 8, height: 8, pixels: body }];
        let draws = [part(0, 0, 0)];
        let mut still = draw(&draws, &pictures, (40, 70), SIZE, SIZE);
        still[0] = 3;

        assert_eq!(fit(&draws, &pictures, &still), Some((40, 70)));
        assert_eq!(fit(&draws, &pictures, &[0; SIZE * SIZE]), None);
    }

    #[test]
    fn reads_double_size_objs_from_their_middle_and_hides_disabled_ones() {
        assert_eq!(obj([0x43F0, 0x81F8, 20]), Some(Some(Obj { x: 8, y: -8, width: 32, height: 16, tile: 20 })));
        assert_eq!(obj([0x00FE, 0x0003, 1]), Some(Some(Obj { x: 3, y: -2, width: 8, height: 8, tile: 1 })));
        assert_eq!(obj([0x0200, 0, 0]), Some(None));
        assert_eq!(obj([0x2000, 0, 0]), None);
        assert_eq!(obj([0xC000, 0, 0]), None);
    }

    #[test]
    fn composes_a_cell_from_the_sheet_with_the_first_obj_on_top_and_nothing_past_it() {
        let mut pixels = vec![0; 16 * 8];
        pixels[0] = 1;
        pixels[9] = 2;
        pixels[8] = 3;
        let sheet = Sheet { width: 16, height: 8, pixels };
        let objs =
            [Obj { x: 0, y: 0, width: 8, height: 8, tile: 1 }, Obj { x: -1, y: 0, width: 8, height: 8, tile: 0 }];

        let cell = super::picture(&objs, &sheet);
        let below = super::picture(&[Obj { tile: 2, ..objs[0] }], &sheet);

        assert_eq!((cell.left, cell.top, cell.width, cell.height), (-1, 0, 9, 8));
        assert_eq!(&cell.pixels[..3], [1, 3, 2]);
        assert_eq!(below.pixels, [0; 64]);
    }

    fn bank(element: u16, mode: u32, keyframes: &[(u16, &[u8])]) -> Vec<u8> {
        let mut frames = Vec::new();
        let mut data: Vec<u8> = Vec::new();
        for (ticks, place) in keyframes {
            frames.extend((data.len() as u32).to_le_bytes());
            frames.extend(ticks.to_le_bytes());
            frames.extend(0xBEEFu16.to_le_bytes());
            data.extend(*place);
        }
        let mut bank = vec![1, 0, keyframes.len() as u8, 0];
        bank.extend([0x18u32, 0x28, 0x28 + frames.len() as u32, 0, 0].iter().flat_map(|v| v.to_le_bytes()));
        bank.extend((keyframes.len() as u16).to_le_bytes());
        bank.extend(0u16.to_le_bytes());
        bank.extend(element.to_le_bytes());
        bank.extend(1u16.to_le_bytes());
        bank.extend(mode.to_le_bytes());
        bank.extend(0u32.to_le_bytes());
        bank.extend(frames);
        bank.extend(data);
        build::nitro(b"RNAN", &[(b"KNBA", bank)])
    }

    #[test]
    fn reads_keyframes_that_move_or_also_scale_and_turn() {
        let moving = bank(2, 2, &[(6, &[3, 0, 0xEF, 0xBE, 0xFE, 0xFF, 4, 0])]);
        let turning =
            [&[1, 0, 0, 0x40][..], &0x2000i32.to_le_bytes(), &0x1800i32.to_le_bytes(), &[5, 0, 0xFB, 0xFF]].concat();
        let turning = bank(1, 1, &[(0, &turning)]);

        assert_eq!(
            sequences(&moving, b"RNAN"),
            Some(vec![Sequence { looping: true, keyframes: vec![Keyframe { ticks: 6, place: Place::at(3, -2, 4) }] }])
        );
        let place = Place { index: 1, angle: 0x4000, scale_x: 0x2000, scale_y: 0x1800, x: 5, y: -5 };
        assert_eq!(
            sequences(&turning, b"RNAN"),
            Some(vec![Sequence { looping: false, keyframes: vec![Keyframe { ticks: 0, place }] }])
        );
        assert_eq!(sequences(&bank(0, 3, &[(1, &[0, 0])]), b"RNAN"), None);
        assert_eq!(sequences(&bank(3, 2, &[(1, &[0, 0])]), b"RNAN"), None);
    }

    fn words(values: &[u16]) -> Vec<u8> {
        values.iter().flat_map(|value| value.to_le_bytes()).collect()
    }

    #[test]
    fn reads_each_cells_objs() {
        let mut bank = words(&[2, 0, 0x18, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        bank.extend(words(&[2, 0, 0, 0, 1, 0, 12, 0]));
        bank.extend(words(&[0x00FE, 0x0003, 1, 0x0200, 0, 0, 0x43F0, 0x81F8, 20]));
        let file = build::nitro(b"RECN", &[(b"KBEC", bank)]);

        assert_eq!(
            cells(&file),
            Some(vec![
                vec![Obj { x: 3, y: -2, width: 8, height: 8, tile: 1 }],
                vec![Obj { x: 8, y: -8, width: 32, height: 16, tile: 20 }],
            ])
        );
    }

    #[test]
    fn reads_where_each_multicell_places_its_nodes() {
        let mut bank = words(&[2, 0, 0x14, 0, 0x24, 0, 0, 0, 0, 0]);
        bank.extend(words(&[1, 1, 0, 0, 2, 2, 8, 0]));
        bank.extend(words(&[3, 16, 0xFFFE, 0x0020, 4, 0xFFFD, 5, 0x0121, 0, 0, 0, 0x0001]));
        let file = build::nitro(b"RCMN", &[(b"KBCM", bank)]);

        assert_eq!(
            multicells(&file),
            Some(vec![
                vec![Node { sequence: 3, x: 16, y: -2, slot: 0, reset: true, visible: true }],
                vec![
                    Node { sequence: 4, x: -3, y: 5, slot: 1, reset: false, visible: true },
                    Node { sequence: 0, x: 0, y: 0, slot: 0, reset: false, visible: false },
                ],
            ])
        );
        let mut paused = words(&[1, 0, 0x14, 0, 0x1C, 0, 0, 0, 0, 0]);
        paused.extend(words(&[1, 1, 0, 0, 0, 0, 0, 0x0022]));
        assert_eq!(multicells(&build::nitro(b"RCMN", &[(b"KBCM", paused)])), None);
    }
}
