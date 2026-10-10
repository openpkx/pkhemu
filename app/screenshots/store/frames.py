"""Plays each store game headless through the app's cores and writes frames to data/store/frames/<game>-<shot>.png.

Run with python3 from anywhere after games.sh and a macOS build (scripts/macos-dev.sh or scripts/macos-build.sh),
which leaves mGBA's static library and melonDS DS's dylib under app/src-tauri.
"""

import ctypes as C
import glob
import os
import struct
import subprocess
import sys
import zlib

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
STORE = os.path.join(ROOT, "data/store")
GAMES = os.path.join(STORE, "games")
FRAMES = os.path.join(STORE, "frames")
MELONDS = os.path.join(ROOT, "app/src-tauri/cores/melondsds_libretro.dylib")
MGBA = os.path.join(STORE, "mgba_retro.dylib")


def steps(press, rounds):
    return " ".join(f"{press} shot:{n:02}" for n in range(1, rounds + 1))


HANDHELD = steps("start:4 none:150 a:4 none:150", 16)
DS = steps("start:6 none:150 a:6 none:150 t=128,96:6 none:100", 16)

# Each game runs its steps from power-on. "button:frames" holds a button, "t=x,y:frames" touches the DS bottom
# screen, "none:frames" waits, and "shot:name" writes a frame. Deterministic, so the same steps give the same frames.
GAMES_STEPS = {
    "tobu": ("gb", "gb/Tobu Tobu Girl.gb", HANDHELD),
    "libbet": ("gb", "gb/Libbet and the Magic Floor.gb", HANDHELD),
    "rhythm": ("gb", "gb/Rhythm Land.gb", HANDHELD),
    "tobudx": ("gbc", "gbc/Tobu Tobu Girl Deluxe.gbc", HANDHELD),
    "ucity": ("gbc", "gbc/µCity.gbc", "none:300 down:10 none:40 down:10 none:40 shot:01 a:10 none:200 shot:02 a:10 none:200 shot:03"),
    "geometrix": ("gbc", "gbc/Geometrix.gbc", HANDHELD),
    "collie": ("gba", "gba/Collie Defense.gba", HANDHELD),
    "feline": ("gba", "gba/Feline.gba", HANDHELD),
    "lro": ("gba", "gba/Luggage Retrieval Officer.gba", HANDHELD),
    "jamclown": ("nds", "nds/JamClown.nds", DS),
    "traffic": ("nds", "nds/Traffic Escape.nds", "none:200 right:12 none:30 left:12 none:30 a:12 none:400 shot:01"),
}

BUTTONS = dict(b=0, y=1, select=2, start=3, up=4, down=5, left=6, right=7, a=8, x=9, l=10, r=11)
OPTIONS = {
    b"melonds_console_mode": b"ds",
    b"melonds_sysfile_mode": b"builtin",
    b"melonds_render_mode": b"software",
    b"melonds_jit_enable": b"disabled",
    b"melonds_number_of_screen_layouts": b"1",
    b"melonds_screen_layout1": b"top-bottom",
    b"melonds_screen_gap": b"0",
    b"melonds_show_cursor": b"disabled",
    b"melonds_touch_mode": b"touch",
    b"melonds_homebrew_sdcard": b"disabled",
}


def mgba_dylib():
    if os.path.exists(MGBA):
        return MGBA
    libs = sorted(glob.glob(os.path.join(ROOT, "app/src-tauri/target/*/build/*/out/build/libmgba_retro.a")), key=os.path.getmtime)
    if not libs:
        sys.exit("No libmgba_retro.a under app/src-tauri/target. Build the macOS app once first.")
    subprocess.run(["clang", "-dynamiclib", "-Wl,-all_load", libs[-1], "-lz", "-o", MGBA], check=True)
    return MGBA


class Var(C.Structure):
    _fields_ = [("key", C.c_char_p), ("value", C.c_void_p)]


class GameInfo(C.Structure):
    _fields_ = [("path", C.c_char_p), ("data", C.c_void_p), ("size", C.c_size_t), ("meta", C.c_char_p)]


ENV = C.CFUNCTYPE(C.c_bool, C.c_uint, C.c_void_p)
VIDEO = C.CFUNCTYPE(None, C.c_void_p, C.c_uint, C.c_uint, C.c_size_t)
SAMPLE = C.CFUNCTYPE(None, C.c_int16, C.c_int16)
BATCH = C.CFUNCTYPE(C.c_size_t, C.c_void_p, C.c_size_t)
POLL = C.CFUNCTYPE(None)
STATE = C.CFUNCTYPE(C.c_int16, C.c_uint, C.c_uint, C.c_uint, C.c_uint)


def play(system, rom_path, script, prefix):
    lib = C.CDLL(MELONDS if system == "nds" else mgba_dylib())
    system_dir = C.create_string_buffer(os.path.join(STORE, "system").encode())
    os.makedirs(system_dir.value.decode(), exist_ok=True)
    option_buffers = {key: C.create_string_buffer(value) for key, value in OPTIONS.items()}
    pixel_format = [2]
    frame = {}
    pressed = {"mask": 0, "touch": None}

    def environment(cmd, data):
        if cmd == 10:
            requested = C.cast(data, C.POINTER(C.c_uint))[0]
            if requested in (1, 2):
                pixel_format[0] = requested
                return True
            return False
        if cmd == 3:
            C.cast(data, C.POINTER(C.c_bool))[0] = True
            return True
        if cmd == 15:
            var = C.cast(data, C.POINTER(Var))[0]
            buffer = option_buffers.get(var.key)
            if buffer is None:
                return False
            C.cast(data, C.POINTER(Var))[0].value = C.cast(buffer, C.c_void_p).value
            return True
        if cmd in (9, 31):
            C.cast(data, C.POINTER(C.c_void_p))[0] = C.cast(system_dir, C.c_void_p).value
            return True
        if cmd == 17:
            C.cast(data, C.POINTER(C.c_bool))[0] = False
            return True
        if cmd == 52:
            C.cast(data, C.POINTER(C.c_uint))[0] = 2
            return True
        return cmd in (16, 32, 37, 53, 54, 55, 67, 68, 51 | 0x10000, 36 | 0x10000)

    def video(data, width, height, pitch):
        if data:
            frame.update(data=C.string_at(data, pitch * height), width=width, height=height, pitch=pitch)

    def state(port, device, index, button):
        if port:
            return 0
        if device == 1:
            return pressed["mask"] if button == 256 else (pressed["mask"] >> button) & 1
        if device == 6 and index == 0 and pressed["touch"]:
            return {0: pressed["touch"][0], 1: pressed["touch"][1], 2: 1}.get(button, 0)
        return 0

    callbacks = [ENV(environment), VIDEO(video), SAMPLE(lambda left, right: None), BATCH(lambda data, n: n), POLL(lambda: None), STATE(state)]
    lib.retro_set_environment(callbacks[0])
    lib.retro_set_video_refresh(callbacks[1])
    lib.retro_set_audio_sample(callbacks[2])
    lib.retro_set_audio_sample_batch(callbacks[3])
    lib.retro_set_input_poll(callbacks[4])
    lib.retro_set_input_state(callbacks[5])
    lib.retro_load_game.argtypes = [C.c_void_p]
    lib.retro_init()
    rom = open(rom_path, "rb").read()
    rom_buffer = C.create_string_buffer(rom, len(rom))
    info = GameInfo(rom_path.encode(), C.cast(rom_buffer, C.c_void_p), len(rom), None)
    if not lib.retro_load_game(C.byref(info)):
        sys.exit(f"The core couldn't load {rom_path}")

    for step in script.split():
        what, _, count = step.partition(":")
        if what == "shot":
            write_png(f"{prefix}-{count}.png", frame, pixel_format[0])
            continue
        mask, touch = 0, None
        for part in what.split("+"):
            if part.startswith("t="):
                x, y = map(int, part[2:].split(","))
                touch = (int(x / 256 * 65535 - 32767), int((192 + y) / 384 * 65535 - 32767))
            elif part != "none":
                mask |= 1 << BUTTONS[part]
        pressed.update(mask=mask, touch=touch)
        for _ in range(int(count)):
            lib.retro_run()
    lib.retro_unload_game()
    lib.retro_deinit()


def write_png(path, frame, pixel_format):
    width, height, pitch, data = frame["width"], frame["height"], frame["pitch"], frame["data"]
    rows = bytearray()
    for y in range(height):
        rows.append(0)
        line = data[y * pitch:(y + 1) * pitch]
        for x in range(width):
            if pixel_format == 1:
                rows += bytes((line[x * 4 + 2], line[x * 4 + 1], line[x * 4]))
            else:
                v = line[x * 2] | line[x * 2 + 1] << 8
                rows += bytes(((v >> 11) << 3, ((v >> 5) & 63) << 2, (v & 31) << 3))

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body))

    with open(path, "wb") as file:
        file.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)))
        file.write(chunk(b"IDAT", zlib.compress(bytes(rows))) + chunk(b"IEND", b""))


if __name__ == "__main__":
    os.makedirs(FRAMES, exist_ok=True)
    only = sys.argv[1:]
    for key, (system, rom, script) in GAMES_STEPS.items():
        if only and key not in only:
            continue
        rom_path = os.path.join(GAMES, rom)
        if not os.path.exists(rom_path):
            sys.exit(f"Missing {rom_path}. Run games.sh first.")
        # A core keeps global state between games, so each game gets its own process.
        if only:
            print(key)
            play(system, rom_path, script, os.path.join(FRAMES, key))
        else:
            subprocess.run([sys.executable, __file__, key], check=True)
