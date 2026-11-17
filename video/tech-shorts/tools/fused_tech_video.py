#!/usr/bin/env python3
"""Fused tech short builder, adapted copy of the C1994 v2 method. See LOCAL-PRODUCTION-SOP.md.

v2 adds: scene transitions (flip, push, zoom, wipe), animated chart and stat card scenes (refs like e:<id>),
an optional soft whoosh under transitions, coin photos always shown as cards, a number-tolerant speech check,
and a limiter that no longer raises the level. v1 (c1994_video.py) is kept unchanged for batch 1.


Run with the Chatterbox venv python (it has Pillow and numpy):
  PY=/Users/nick/.venvs/chatterbox/bin/python3
  $PY tools/c1994_video_v2.py prep    <auction>          # fetch stock photos, write TTS manifest
  $PY tools/c1994_video_v2.py tts     <auction>          # voice every missing segment (slow, one job at a time)
  $PY tools/c1994_video_v2.py whisper <auction> [lot..]  # word timings + speech check
  $PY tools/c1994_video_v2.py render  <auction> [lot..]  # build MP4s into Out/
  $PY tools/c1994_video_v2.py qa      <auction> [lot..]  # measure finished MP4s, write contact sheets
<auction> is the date folder name, e.g. 2026-11-18. Nothing here uploads or posts anything.
"""
import difflib, json, math, os, re, subprocess, sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
REPO = Path(json.loads((BASE / "project.json").read_text())["repo"]).resolve()
VIDEO = REPO / "video"
INTRO = None
CHATTERBOX_PY = "/Users/nick/.venvs/chatterbox/bin/python3"
W, H, FPS = 720, 1280, 30
LEAD, GAP, TAIL = 0.0, 0.22, 0.45          # seconds: before first word, between segments, after last word
OVER = 1.0625                                # still master oversize, gives the slow zoom its room
MUSIC_LUFS, VOICE_LUFS = -33.0, -16.0
FONT = "/System/Library/Fonts/Avenir Next.ttc"
GOLD = (88, 214, 255)


def run(cmd, **kw):
    return run_process(cmd, check=True, capture_output=True, text=True, **kw)


def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]).stdout.strip())


def load(auction):
    cfg = json.loads((BASE / "Approved" / f"auction-{auction}" / "lots.json").read_text())
    cfg["work"] = BASE / "work" / f"auction-{auction}"
    cfg["out"] = BASE / "Out" / f"auction-{auction}"
    cfg["say_keys"] = sorted(cfg["say"], key=len, reverse=True)
    for key in ("profile", "reference", "exaggeration", "cfgWeight", "temperature"):
        if key not in cfg["voice"]:
            sys.exit(f"lots.json voice block is missing {key}")
    cfg.setdefault("transitions", [])
    return cfg


def base_ref(ref):
    return ref.split("~")[0]


def pick(cfg, wanted):
    lots = [l for l in cfg["lots"] if not wanted or str(l["lot"]) in wanted]
    if not lots:
        sys.exit("no matching lots")
    return lots


def say_text(cfg, seg):
    if "s" in seg:
        return seg["s"]
    text = seg["t"]
    for key in cfg["say_keys"]:
        text = text.replace(key, cfg["say"][key])
    return text


def seg_wav(cfg, lot, i):
    return cfg["work"] / f"reel-{lot['lot']}" / f"audio-{cfg['voice']['profile']}" / f"seg-{i + 1:02d}.wav"


def image_path(cfg, lot, ref):
    ref = base_ref(ref)
    if ref.startswith("c"):
        return BASE / cfg["imageRoot"] / lot["folder"] / f"reel-{lot['lot']}-{int(ref[1:]):02d}.jpg"
    return BASE / cfg["pexelsRoot"] / f"{ref[1:]}.jpg"


# ---------------------------------------------------------------- prep / tts
def cmd_prep(cfg, lots):
    pex = BASE / cfg["pexelsRoot"]
    pex.mkdir(parents=True, exist_ok=True)
    picks = {}
    picks_file = BASE / cfg["picksFile"] if "picksFile" in cfg else BASE / "Drafts" / f"auction-{cfg['auction']}" / "pexels-picks.jsonl"
    for line in picks_file.read_text().splitlines():
        p = json.loads(line)
        picks[str(p["id"])] = p["original"]
    for lot in lots:
        used = [base_ref(r) for s in lot["segments"] for r in s["img"]]
        photos = sorted((BASE / cfg["imageRoot"] / lot["folder"]).glob("*.jpg"))
        missing = [p.name for n, p in enumerate(photos, 1) if f"c{n}" not in used]
        if missing:
            sys.exit(f"reel {lot['lot']}: lot photos not used in script: {missing}")
        for ref in used:
            if ref.startswith("e:"):
                if ref[2:] not in lot.get("enrich", {}):
                    sys.exit(f"reel {lot['lot']}: chart {ref} is not defined in the lot's enrich block")
                continue
            target = image_path(cfg, lot, ref)
            if ref.startswith("p") and not target.exists():
                run(["curl", "-sfL", "-A", "Mozilla/5.0", "-o", str(target), picks[ref[1:]] + "?auto=compress&cs=tinysrgb&h=1700"])
            if not target.exists() or target.stat().st_size < 5000:
                sys.exit(f"reel {lot['lot']}: missing image {ref} -> {target}")
    jobs = []
    for lot in lots:
        words = 0
        for i, seg in enumerate(lot["segments"]):
            text = say_text(cfg, seg)
            words += len(text.split())
            if len(text) > 240:
                sys.exit(f"reel {lot['lot']} segment {i + 1} is {len(text)} chars; keep each under 240")
            if re.search(r"\d", text):
                sys.exit(f"reel {lot['lot']} segment {i + 1} still has digits for the voice: {text}")
            wav = seg_wav(cfg, lot, i)
            wav.parent.mkdir(parents=True, exist_ok=True)
            (wav.with_suffix(".txt")).write_text(text + "\n")
            if not wav.exists():
                jobs.append({"text": text, "out_path": str(wav)})
        print(f"reel {lot['lot']}: {len(lot['segments'])} segments, {words} spoken words")
    manifest = cfg["work"] / "tts-manifest.json"
    manifest.write_text(json.dumps(jobs, indent=1))
    print(f"{len(jobs)} segments need voicing -> {manifest}")


def cmd_tts(cfg, lots):
    cmd_prep(cfg, lots)
    manifest = cfg["work"] / "tts-manifest.json"
    if not json.loads(manifest.read_text()):
        return print("all segments already voiced")
    v = cfg["voice"]                                     # per-project voice settings; Fused tts-runtime.json is untouched
    env = dict(os.environ, HF_HUB_OFFLINE="1", TOKENIZERS_PARALLELISM="false",
               CHATTERBOX_TTS_EXAGGERATION=str(v["exaggeration"]), CHATTERBOX_TTS_CFG_WEIGHT=str(v["cfgWeight"]),
               CHATTERBOX_TTS_TEMPERATURE=str(v["temperature"]))
    run_process([CHATTERBOX_PY, str(VIDEO / "scripts" / "chatterbox-tts.py"), f"--manifest={manifest}",
                    f"--speaker_wav={BASE / v['reference']}"], check=True, env=env, cwd=str(VIDEO / "scripts"))


# ---------------------------------------------------------------- whisper
def norm_words(text):
    text = text.lower().replace("-", " ").replace("%", " percent ")   # the transcriber writes "90%" for "90 percent"
    # Recognition may split these exact technical terms without changing speech.
    text = re.sub(r"\bfile\s+names?\b", lambda m: "filenames" if m.group().endswith("names") else "filename", text)
    text = re.sub(r"\bh\s*\.?\s*(264|265)\b", r"h\1", text)
    words, out = re.sub(r"[^a-z0-9 ]", "", text).split(), []
    for w in words:                                      # "30 125" and "30,125" both become 30125
        if w.isdigit() and out and out[-1].isdigit():
            out[-1] += w
        else:
            out.append(w)
    return out


def cmd_whisper(cfg, lots):
    runtime = json.loads((VIDEO / "whisper-runtime.json").read_text())
    runtime["modelPath"] = str(REPO / runtime["modelPath"])
    jobs = []
    for lot in lots:
        for i, seg in enumerate(lot["segments"]):
            wav = seg_wav(cfg, lot, i)
            out = wav.with_suffix(".words.json")
            if wav.exists() and not (out.exists() and out.stat().st_mtime >= wav.stat().st_mtime):
                jobs.append({"index": f"{lot['lot']}-{i + 1}", "audioPath": str(wav), "narration": seg["t"], "outputPath": str(out)})
    if jobs:
        manifest = cfg["work"] / "whisper-manifest.json"
        manifest.write_text(json.dumps({"runtime": runtime, "jobs": jobs}))
        run_process([str(REPO / runtime["python"]), str(VIDEO / "scripts" / "transcribe-local.py"), "--manifest", str(manifest)],
                       check=True, env=dict(os.environ, HF_HUB_OFFLINE="1", TOKENIZERS_PARALLELISM="false"))
    bad = 0
    for lot in lots:
        for i, seg in enumerate(lot["segments"]):
            wav = seg_wav(cfg, lot, i)
            if not wav.exists():
                print(f"reel {lot['lot']} seg {i + 1}: NOT VOICED YET")
                bad += 1
                continue
            heard = norm_words(" ".join(w["text"] for w in json.loads(wav.with_suffix(".words.json").read_text())["words"]))
            score = max(difflib.SequenceMatcher(None, heard, norm_words(x)).ratio() for x in (seg["t"], say_text(cfg, seg)))
            secs, expect = duration(wav), len(say_text(cfg, seg)) / 15.5
            flag = "" if score >= 0.8 and 0.55 * expect < secs < 1.7 * expect else "  <-- CHECK"
            bad += bool(flag)
            if flag or "-v" in sys.argv:
                print(f"reel {lot['lot']} seg {i + 1}: match {score:.2f}, {secs:.1f}s (expected ~{expect:.1f}s){flag}\n    heard: {' '.join(heard)}")
    print(f"speech check: {bad} segment(s) flagged")
    return bad


# ---------------------------------------------------------------- timeline
def timeline(cfg, lot, intro_secs):
    t, segs = LEAD, []
    for i, seg in enumerate(lot["segments"]):
        d = duration(seg_wav(cfg, lot, i))
        segs.append({"start": t, "end": t + d, "seg": seg, "wav": seg_wav(cfg, lot, i)})
        t += d + GAP
    end = max(segs[-1]["end"] + TAIL, intro_secs + 2)
    scenes = []
    for i, s in enumerate(segs):
        if not s["seg"]["img"]:
            continue
        a = max(s["start"] - 0.15, intro_secs)
        b = segs[i + 1]["start"] - 0.15 if i + 1 < len(segs) else end
        if b - a < 0.8:
            continue
        n = len(s["seg"]["img"])
        for k, ref in enumerate(s["seg"]["img"]):
            scenes.append({"ref": base_ref(ref), "force": ref.split("~")[1] if "~" in ref else None,
                           "a": a + (b - a) * k / n, "b": a + (b - a) * (k + 1) / n})
    scenes[0]["a"], scenes[-1]["b"] = intro_secs, end
    for i, sc in enumerate(scenes):                      # choose how each scene arrives
        kind = lambda r: "chart" if r.startswith("e:") else "stock" if r.startswith("p") else "coin"
        sc["kind"] = kind(sc["ref"])
        auto = "dissolve" if i == 0 else "wipe" if sc["kind"] == "chart" else "zoom" if sc["kind"] == "stock" else "push"
        tr = sc.pop("force") or auto
        if i == 0 or (tr != "dissolve" and tr not in cfg["transitions"]):
            tr = "dissolve"
        sc["tr"], sc["td"] = tr, min({"dissolve": 0.4, "push": 0.45, "flip": 0.5, "zoom": 0.5, "wipe": 0.55}[tr], (sc["b"] - sc["a"]) * 0.4)
    return segs, scenes, end


def caption_chunks(cfg, segs):
    chunks = []
    for s in segs:
        shown = s["seg"]["t"].split()
        heard = json.loads(s["wav"].with_suffix(".words.json").read_text())["words"]
        if len(heard) == len(shown):
            times = [(s["start"] + w["startSec"], s["start"] + w["endSec"]) for w in heard]
        else:  # counts differ (numbers, names): spread by length across the spoken span
            a = s["start"] + (heard[0]["startSec"] if heard else 0)
            b = s["start"] + (heard[-1]["endSec"] if heard else s["end"] - s["start"])
            weights = [len(cfg_say_len(cfg, w)) + 1 for w in shown]
            total, acc, times = sum(weights), 0, []
            for wgt in weights:
                times.append((a + (b - a) * acc / total, a + (b - a) * (acc + wgt) / total))
                acc += wgt
        group = []
        for word, tm in zip(shown, times):
            group.append((word, tm))
            if len(group) == 3 or sum(len(g[0]) for g in group) >= 15 or word[-1] in ".,?!:;":
                chunks.append(group)
                group = []
        if group:
            chunks.append(group)
    out = []
    for i, g in enumerate(chunks):
        nxt = chunks[i + 1][0][1][0] if i + 1 < len(chunks) else g[-1][1][1] + 0.4
        out.append({"words": [x[0].upper() for x in g], "times": [x[1] for x in g], "a": g[0][1][0], "b": min(nxt, g[-1][1][1] + 0.6)})
    return out


def cfg_say_len(cfg, word):
    for key in cfg["say_keys"]:
        word = word.replace(key, cfg["say"][key])
    return word


# ---------------------------------------------------------------- drawing
def make_master(path, full_bleed_ok=True):
    from PIL import Image, ImageDraw, ImageFilter, ImageOps
    mw, mh = round(W * OVER), round(H * OVER)
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if full_bleed_ok and im.width / im.height < 0.8:    # portrait stock photo: full bleed (lot photos are always cards)
        return ImageOps.fit(im, (mw, mh), Image.LANCZOS, centering=(0.5, 0.4))
    bg = ImageOps.fit(im, (mw // 8, mh // 8), Image.BILINEAR).filter(ImageFilter.GaussianBlur(10)).resize((mw, mh), Image.BICUBIC)
    bg = Image.eval(bg, lambda v: int(v * 0.38))
    box_w, box_h = round(650 * OVER), round(640 * OVER)
    scale = min(box_w / im.width, box_h / im.height)
    fg = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    x, y = (mw - fg.width) // 2, round(mh * 0.46) - fg.height // 2
    shadow = Image.new("L", (mw, mh), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((x - 6, y + 4, x + fg.width + 6, y + fg.height + 22), 30, fill=170)
    bg = Image.composite(Image.new("RGB", (mw, mh), "black"), bg, shadow.filter(ImageFilter.GaussianBlur(22)))
    mask = Image.new("L", fg.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, fg.width - 1, fg.height - 1), 22, fill=255)
    bg.paste(fg, (x, y), mask)
    return bg


def view(master, u, zoom_in):
    from PIL import Image
    u = min(max(u, 0.0), 1.0)
    z = 1 + (OVER - 1) * (u if zoom_in else 1 - u)
    vw, vh = master.width / z, master.height / z
    return master.transform((W, H), Image.AFFINE, (vw / W, 0, (master.width - vw) / 2, 0, vh / H, (master.height - vh) / 2), Image.BICUBIC)


def make_pill(lot):
    from PIL import Image, ImageDraw, ImageFont
    big, small = ImageFont.truetype(FONT, 34, index=8), ImageFont.truetype(FONT, 25, index=2)
    line1, line2 = lot["tool"].upper(), lot["title"].upper()
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    wide = max(probe.textlength(line1, font=big), probe.textlength(line2, font=small)) + 56
    pill = Image.new("RGBA", (int(wide), 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(pill)
    d.rounded_rectangle((0, 0, pill.width - 1, 95), 22, fill=(8, 12, 18, 205), outline=(88, 214, 255, 150), width=2)
    d.text((pill.width / 2, 30), line1, font=big, fill=GOLD, anchor="mm")
    d.text((pill.width / 2, 68), line2, font=small, fill=(240, 244, 248), anchor="mm")
    return pill


class Captions:
    def __init__(self, chunks):
        self.chunks, self.cache = [dict(c) for c in chunks], {}
        # A phrase is removed when the next phrase starts. Never crossfade text.
        for previous,current in zip(self.chunks,self.chunks[1:]):
            previous['b']=min(previous['b'],current['a'])

    def draw(self, frame, t):
        from PIL import Image, ImageDraw, ImageFont
        for ci, c in enumerate(self.chunks):
            if c["a"] <= t < c["b"]:
                active = max([k for k, tm in enumerate(c["times"]) if tm[0] - 0.03 <= t] or [0])
                key = (ci, active)
                if key not in self.cache:
                    self.cache = {k: v for k, v in self.cache.items() if k[0] == ci}
                    size = 62
                    while True:
                        font = ImageFont.truetype(FONT, size, index=8)
                        probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
                        space = probe.textlength(" ", font=font)
                        widths = [probe.textlength(w, font=font) for w in c["words"]]
                        total = sum(widths) + space * (len(widths) - 1)
                        if total <= W - 80 or size <= 34:
                            break
                        size -= 4
                    img = Image.new("RGBA", (W, 130), (0, 0, 0, 0))
                    d, x = ImageDraw.Draw(img), (W - total) / 2
                    for k, word in enumerate(c["words"]):
                        d.text((x, 65), word, font=font, anchor="lm", fill=GOLD if k == active else (255, 255, 255),
                               stroke_width=7, stroke_fill=(0, 0, 0))
                        x += widths[k] + space
                    self.cache[key] = img
                frame.paste(self.cache[key], (0, 905), self.cache[key])
                return


def video_frames(path):
    """Yield RGB frames of a clip, scaled and padded to the canvas, at the project frame rate."""
    import numpy as np
    vf = f"fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1"
    proc = start_process(["ffmpeg", "-v", "error", "-i", str(path), "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                            stdout=subprocess.PIPE)
    size = W * H * 3
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    proc.wait()


# ---------------------------------------------------------------- transitions, charts, whoosh
def ease_out(p):
    p = min(max(p, 0.0), 1.0)
    return 1 - (1 - p) ** 3


def ease_io(p):
    p = min(max(p, 0.0), 1.0)
    return 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2


def zoomed(im, z):
    from PIL import Image
    vw, vh = W / z, H / z
    return im.transform((W, H), Image.AFFINE, (1 / z, 0, (W - vw) / 2, 0, 1 / z, (H - vh) / 2), Image.BILINEAR)


def transition(kind, a, b, p):
    from PIL import Image, ImageDraw, ImageEnhance
    if kind == "push":
        off = round(W * ease_io(p))
        out = Image.new("RGB", (W, H))
        out.paste(a, (-off, 0))
        out.paste(b, (W - off, 0))
        return out
    if kind == "wipe":
        bar = 14
        x = round((W + bar) * ease_io(p))
        out = a.copy()
        if x > bar:
            out.paste(b.crop((0, 0, min(x - bar, W), H)), (0, 0))
        ImageDraw.Draw(out).rectangle((max(x - bar, 0), 0, min(x, W), H), fill=GOLD)
        return out
    if kind == "flip":
        e = ease_io(p)
        src, s = (a, math.cos(e * math.pi)) if e < 0.5 else (b, -math.cos(e * math.pi))
        w = max(2, round(W * s))
        side = ImageEnhance.Brightness(src.resize((w, H), Image.BILINEAR)).enhance(0.45 + 0.55 * s)
        out = Image.new("RGB", (W, H), (6, 9, 14))
        out.paste(side, ((W - w) // 2, 0))
        return out
    if kind == "zoom":
        e = ease_io(p)
        return Image.blend(zoomed(a, 1 + 1.5 * e), zoomed(b, 1.3 - 0.3 * e), min(1.0, e * 1.25))
    return Image.blend(a, b, min(max(p, 0.0), 1.0))


def whoosh_track(cfg, work, times, end):
    """Mono track with a soft procedural whoosh (filtered noise, no sampled media) at each transition time."""
    import wave
    import numpy as np
    sr, out = 48000, work / "sfx.wav"
    track = np.zeros(int((end + 1) * sr), np.float32)
    gain = float(cfg.get("whooshGain", 0))
    if gain > 0 and times:
        n = int(0.5 * sr)
        tt = np.arange(n) / n
        noise = np.random.default_rng(7).standard_normal(n)
        alpha = 1 - np.exp(-2 * np.pi * (500 + 5500 * np.sin(np.pi * tt) ** 2) / sr)
        low, slow, y = 0.0, 0.0, np.zeros(n)
        for i in range(n):
            low += alpha[i] * (noise[i] - low)
            slow += 0.04 * (low - slow)
            y[i] = low - slow
        y *= np.sin(np.pi * tt) ** 2
        y = (y / np.abs(y).max() * gain).astype(np.float32)
        for t in times:
            k = max(0, int((t - 0.1) * sr))
            track[k:k + n] += y[:len(track) - k]
    with wave.open(str(out), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes((np.clip(track, -1, 1) * 32767).astype("<i2").tobytes())
    return out


class Chart:
    """Animated chart or stat card drawn in the video look. Values come only from the lot's enrich block."""
    X0, Y0, CW, CH, SS = 36, 258, 648, 632, 2
    INK, DIM, BAR, BG = (255, 255, 255), (175, 198, 207), (54, 87, 104), (4, 16, 24)

    def __init__(self, spec):
        import numpy as np
        from PIL import Image
        self.spec, self.final, self.fonts = spec, None, {}
        ys = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
        grad = (np.array([10, 33, 47], np.float32) * (1 - ys) + np.array([4, 16, 24], np.float32) * ys).repeat(W, 1)
        self.bg = Image.fromarray(grad.astype(np.uint8))

    def font(self, size, heavy=True):
        from PIL import ImageFont
        key = (size, heavy)
        if key not in self.fonts:
            self.fonts[key] = ImageFont.truetype(FONT, int(size * self.SS), index=8 if heavy else 2)
        return self.fonts[key]

    def mix(self, color, a):
        a = min(max(a, 0.0), 1.0)
        return tuple(int(b + (c - b) * a) for c, b in zip(color, self.BG))

    @staticmethod
    def num(v, like):
        """Format v the way the final value `like` is written (decimals kept, thousands commas)."""
        dec = len(str(like).split(".")[1]) if "." in str(like) else 0
        return f"{v:,.{dec}f}"

    def frame(self, tt):
        from PIL import Image
        tt = max(tt, 0.0)
        if self.final is not None and tt >= 4.5:
            return self.final.copy()
        s, e = self.SS, self.spec
        layer = Image.new("RGBA", (self.CW * s, self.CH * s), (0, 0, 0, 0))
        self.paint(layer, e, tt)
        img = self.bg.copy()
        small = layer.resize((self.CW, self.CH), Image.LANCZOS)
        img.paste(small, (self.X0, self.Y0), small)
        if tt >= 4.5:
            self.final = img.copy()
        return img

    def paint(self, layer, e, tt):
        from PIL import ImageDraw
        s, cw, ch = self.SS, self.CW, self.CH
        d = ImageDraw.Draw(layer)
        P = lambda *v: tuple(int(x * s) for x in v)

        def text(x, y, t, size, fill, heavy=True, anchor="mm", fit=None):
            while fit and d.textlength(t, font=self.font(size, heavy)) > fit * s and size > 14:
                size -= 2
            d.text(P(x, y), t, font=self.font(size, heavy), fill=fill, anchor=anchor)

        d.rounded_rectangle(P(0, 0, cw - 1, ch - 1), 28 * s, fill=self.BG + (255,), outline=GOLD + (150,), width=2 * s)
        for i, line in enumerate(e["title"]):
            text(cw / 2, 50 + i * 46, line, 38, GOLD, fit=cw - 60)
        top, bottom = 50 + len(e["title"]) * 46 + 4, ch - 50
        text(cw / 2, ch - 26, "Source: " + e["src"], 16, self.DIM, heavy=False, fit=cw - 50)
        kind = e["kind"]

        if kind == "bars" and e.get("compact"):
            items = e["items"]
            row, top_v = (bottom - top) / len(items), max(i[1] for i in items)
            for i, it in enumerate(items):
                y, hl = top + i * row, len(it) > 2 and it[2]
                p = ease_out((tt - 0.3 - 0.05 * i) / 0.7)
                text(44, y + row / 2, str(it[0]), 21, GOLD if hl else self.INK, heavy=bool(hl), anchor="lm")
                if it[1]:
                    w = max(4, it[1] / top_v * 360 * p)
                    d.rounded_rectangle(P(112, y + 4, 112 + w, y + row - 4), 3 * s, fill=GOLD if hl else self.BAR)
                    if hl:
                        text(112 + w + 12, y + row / 2, self.num(it[1] * p, it[1]), 23, GOLD, anchor="lm")
                else:
                    text(114, y + row / 2, "closed", 18, self.DIM, heavy=False, anchor="lm")
        elif kind == "bars":
            items = e["items"]
            row, top_v = min(150, (bottom - top) / len(items)), max(i[1] for i in items)
            y0 = top + ((bottom - top) - row * len(items)) / 2
            for i, it in enumerate(items):
                y, hl = y0 + i * row, len(it) > 2 and it[2]
                p = ease_out((tt - 0.3 - 0.15 * i) / 0.9)
                unit = "%" if e.get("pct") else (" " + e.get("unitSingular", e.get("unit", "")) if it[1] == 1 else " " + e.get("unit", ""))
                value = self.num(it[1] * p, it[1]) + unit.rstrip()
                text(40, y + 22, it[0], 26, self.INK, heavy=False, anchor="lm", fit=cw - 260)
                text(cw - 40, y + 22, value, 30, GOLD if hl else self.INK, anchor="rm")
                bh = min(40, row - 56)
                if it[1] > 0:
                    d.rounded_rectangle(P(40, y + 44, 40 + max(6, it[1] / top_v * (cw - 80) * p), y + 44 + bh), 6 * s, fill=GOLD if hl else self.BAR)
        elif kind == "timeline":
            items = e["items"]
            gap = min(120, (bottom - top - 40) / len(items))
            y0 = top + 44 + ((bottom - top - 40) - gap * len(items)) / 2
            grow = ease_out((tt - 0.3) / (0.45 * len(items)))
            d.line(P(70, y0, 70, y0 + gap * (len(items) - 1) * grow), fill=self.BAR, width=4 * s)
            for k, it in enumerate(items):
                a, y, hl = ease_out((tt - 0.3 - 0.45 * k) / 0.4), y0 + k * gap, len(it) > 2 and it[2]
                if a <= 0:
                    continue
                r = 13 if hl else 9
                d.ellipse(P(70 - r, y - r, 70 + r, y + r), fill=self.mix(GOLD if hl else self.BAR, a))
                text(104, y - 12, str(it[0]), 36, self.mix(GOLD if hl else self.INK, a), anchor="lm")
                text(104, y + 24, it[1], 24, self.mix(self.INK, a * 0.85), heavy=False, anchor="lm", fit=cw - 140)
        elif kind == "donut":
            p, cy, R = ease_out((tt - 0.3) / 1.1), top + 185, 138
            box = P(cw / 2 - R, cy - R, cw / 2 + R, cy + R)
            d.arc(box, 0, 360, fill=self.BAR, width=46 * s)
            d.arc(box, -90, -90 + 360 * e["pct"] / 100 * p, fill=GOLD, width=46 * s)
            text(cw / 2, cy, self.num(e["pct"] * p, e["pct"]) + "%", 60, (255, 255, 255), fit=2 * R - 130)
            for i, line in enumerate(e["sub"]):
                text(cw / 2, cy + R + 48 + i * 38, line, 28, self.INK, heavy=False)
        elif kind == "step":
            items, col, gap = e["items"], 150, 36
            x0, base = (cw - (col * len(items) + gap * (len(items) - 1))) / 2, bottom - 50
            for i, it in enumerate(items):
                p, hl, x = ease_out((tt - 0.3 - 0.35 * i) / 0.8), len(it) > 2 and it[2], x0 + i * (col + gap)
                h = max(5, it[1] / 100 * (base - top - 70) * p)
                d.rounded_rectangle(P(x, base - h, x + col, base), 6 * s, fill=GOLD if hl else self.BAR)
                text(x + col / 2, base - h - 30, f"{round(it[1] * p)}%", 40, GOLD if hl else self.INK)
                text(x + col / 2, base + 28, it[0], 22, self.INK, heavy=False, fit=col + gap - 8)
        elif kind == "gauge":
            p, y, xa, xb = ease_out((tt - 0.4) / 1.1), top + 215, 56, cw - 56
            text(cw / 2, top + 95, e["big"], 100, (255, 255, 255), fit=cw - 80)
            knob = xa + (xb - xa) * e["value"] / e["max"] * p
            d.rounded_rectangle(P(xa, y - 11, xb, y + 11), 11 * s, fill=self.BAR)
            d.rounded_rectangle(P(xa, y - 11, max(knob, xa + 22), y + 11), 11 * s, fill=GOLD)
            d.ellipse(P(knob - 20, y - 20, knob + 20, y + 20), fill=(255, 255, 255), outline=GOLD, width=5 * s)
            text(xa, y + 46, str(e.get("min", 1)), 20, self.DIM, heavy=False, anchor="lm")
            text(xb, y + 46, str(e["max"]), 20, self.DIM, heavy=False, anchor="rm")
            for i, line in enumerate(e["sub"]):
                text(cw / 2, y + 110 + i * 38, line, 28, self.INK, heavy=False)
        elif kind == "counter":
            m = re.match(r"^(\D*)([\d,]*\.?\d+)(.*)$", e["big"])
            target = float(m.group(2).replace(",", ""))
            p = ease_out((tt - 0.3) / 1.0)
            shown = m.group(1) + (self.num(target * p, m.group(2).replace(",", "")) if target >= 10 else m.group(2)) + m.group(3)
            cy = (top + bottom) / 2 - 20 * len(e["sub"])
            size = 200
            while d.textlength(e["big"], font=self.font(size)) > (cw - 90) * s:
                size -= 6
            text(cw / 2, cy, shown, size, self.mix((255, 255, 255), 0.25 + 0.75 * p))
            for i, line in enumerate(e["sub"]):
                text(cw / 2, cy + size * 0.62 + 30 + i * 38, line, 28, self.INK, heavy=False)
        elif kind == "incuse":
            def profile(y, sign, fill):
                xs = [80, 80, 190, 222, 306, 357, 422, 454, 568, 568]
                ys = [y + 60, y, y, y - sign * 64, y - sign * 78, y - sign * 50, y - sign * 74, y, y, y + 60]
                if sign < 0:
                    ys[0] = ys[-1] = y + 130
                d.polygon([P(a, b) for a, b in zip(xs, ys)], fill=fill)
            a1, a2 = ease_out((tt - 0.3) / 0.6), ease_out((tt - 1.5) / 0.6)
            text(cw / 2, top + 30, "Most coins: the design stands up", 27, self.mix(self.INK, a1), heavy=False)
            profile(top + 140, 1, self.mix(self.BAR, a1))
            text(cw / 2, top + 250, "This coin: the design sinks in", 28, self.mix(GOLD, a2))
            profile(top + 285, -1, self.mix(GOLD, a2))
        else:
            sys.exit(f"unknown chart kind {kind}")


# ---------------------------------------------------------------- render
def loudness(path):
    err = run_process(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    return float(json.loads(err[err.rindex("{"):err.rindex("}") + 1])["input_i"])


def cmd_render(cfg, lots):
    import numpy as np
    from PIL import Image
    if cmd_whisper(cfg, lots) and "--force" not in sys.argv:
        sys.exit("speech check flagged segments; fix or rerun with --force after listening")
    cfg["out"].mkdir(parents=True, exist_ok=True)
    intro_secs, outro = duration(INTRO), BASE / cfg["outro"]
    n_intro = round(intro_secs * FPS)
    intro_secs = n_intro / FPS
    shade = np.ones((H, 1, 1), np.float32)               # darken top and bottom so text stays readable
    ys = np.arange(H, dtype=np.float32)
    shade[:, 0, 0] = 1 - 0.55 * np.clip((ys - 800) / 330, 0, 1) - 0.40 * np.clip((260 - ys) / 260, 0, 1)
    music_levels = json.loads((VIDEO / "data" / "audio-rights.json").read_text())["policy"]["musicMix"]["measuredIntegratedLufs"]

    for lot in lots:
        work = cfg["work"] / f"reel-{lot['lot']}"
        target = cfg["out"] / f"reel-{lot['lot']}-{lot['slug']}.mp4"
        version = 1
        while target.exists():                           # never overwrite a finished file
            version += 1
            target = cfg["out"] / f"reel-{lot['lot']}-{lot['slug']}_v{version}.mp4"
        segs, scenes, end = timeline(cfg, lot, intro_secs)
        n_body = round(end * FPS)
        end = n_body / FPS
        caps, pill = Captions(caption_chunks(cfg, segs)), make_pill(lot)
        (work / "timeline.json").write_text(json.dumps({
            "end": end, "segments": [{"start": s["start"], "end": s["end"], "text": s["seg"]["t"]} for s in segs],
            "scenes": scenes}, indent=1, default=str))

        # audio: voice bed first, levelled, then mixed with intro sound, music and the outro's own audio
        voice = work / "narration.wav"
        parts = [x for s in segs for x in ("-i", str(s["wav"]))]
        delays = ";".join(f"[{i}]aresample=48000,adelay={round(s['start'] * 1000)}:all=1[v{i}]" for i, s in enumerate(segs))
        run(["ffmpeg", "-v", "error", "-y", *parts, "-filter_complex",
             f"{delays};{''.join(f'[v{i}]' for i in range(len(segs)))}amix=inputs={len(segs)}:normalize=0,apad=whole_dur={end}", str(voice)])
        gain = VOICE_LUFS - loudness(voice)
        sfx = whoosh_track(cfg, work, [sc["a"] for sc in scenes[1:] if sc["tr"] != "dissolve"], end)
        music = VIDEO / "public" / "music" / lot["music"]
        mgain = MUSIC_LUFS - music_levels[lot["music"]]
        audio_filter = (
            f"[1:a]volume={gain:.2f}dB,alimiter=limit=0.84:level=disabled[voice];"
            f"[2:a]aresample=48000,volume=0.30,afade=t=out:st={intro_secs - 0.5}:d=0.5[intro];"
            f"[3:a]aresample=48000,atrim=0:{end},volume={mgain:.2f}dB,afade=t=in:d=0.6,afade=t=out:st={end - 0.9}:d=0.9[music];"
            f"[4:a]aresample=48000,adelay={round(end * 1000)}:all=1[outro];"
            f"[5:a]aresample=48000[sfx];"
            f"[voice][intro][music][outro][sfx]amix=inputs=5:normalize=0:duration=longest[a]")
        enc = start_process(
            ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
             "-i", str(voice), "-i", str(INTRO), "-stream_loop", "-1", "-i", str(music), "-i", str(outro), "-i", str(sfx),
             "-filter_complex", audio_filter, "-map", "0:v", "-map", "[a]",
             "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-shortest", str(target)],
            stdin=subprocess.PIPE)

        masters, fade = {}, 0.4

        def still(i, t):
            sc = scenes[i]
            if i not in masters:
                for old in [k for k in masters if k < i - 1]:
                    del masters[old]
                if sc["kind"] == "chart":
                    masters[i] = Chart(lot["enrich"][sc["ref"][2:]])
                else:
                    masters[i] = make_master(image_path(cfg, lot, sc["ref"]), sc["kind"] == "stock")
            if sc["kind"] == "chart":
                return masters[i].frame(t - sc["a"])
            return view(masters[i], (t - sc["a"] + fade) / (sc["b"] - sc["a"] + fade), i % 2 == 0)

        def body(t):
            i = max(k for k, sc in enumerate(scenes) if sc["a"] <= t or k == 0)
            img = still(i, t)
            if i and t - scenes[i]["a"] < scenes[i]["td"]:
                img = transition(scenes[i]["tr"], still(i - 1, t), img, (t - scenes[i]["a"]) / scenes[i]["td"])
            arr = (np.asarray(img, np.float32) * shade).astype(np.uint8)
            img = Image.fromarray(arr)
            img.paste(pill, ((W - pill.width) // 2, 138), pill)
            return img

        frame_no = 0
        for raw in video_frames(INTRO):                  # intro, hook captions on top, dissolving into the first still
            if frame_no >= n_intro:
                break
            t = frame_no / FPS
            img = Image.fromarray(raw)
            left = intro_secs - t
            if left < 0.5:
                img = Image.blend(body(intro_secs), img, left / 0.5)
            caps.draw(img, t)
            enc.stdin.write(img.tobytes())
            frame_no += 1
        while frame_no < n_body:
            t = frame_no / FPS
            img = body(t)
            caps.draw(img, t)
            enc.stdin.write(img.tobytes())
            frame_no += 1
        last = body(end - 1 / FPS)
        for k, raw in enumerate(video_frames(outro)):    # outro, untouched apart from a short dissolve in
            img = Image.fromarray(raw)
            if k < 10:
                img = Image.blend(last, img, (k + 1) / 11)
            enc.stdin.write(img.tobytes())
        enc.stdin.close()
        if enc.wait():
            sys.exit(f"reel {lot['lot']}: encoder failed")
        print(f"reel {lot['lot']}: {target.name}  {duration(target):.1f}s  narration ends {end:.1f}s")


# ---------------------------------------------------------------- qa
def cmd_qa(cfg, lots):
    from PIL import Image
    report = []
    for lot in lots:
        files = sorted(cfg["out"].glob(f"reel-{lot['lot']}-*.mp4"), key=lambda p: p.stat().st_mtime)
        if not files:
            report.append({"lot": lot["lot"], "status": "NOT RENDERED"})
            continue
        mp4, work = files[-1], cfg["work"] / f"reel-{lot['lot']}"
        tl = json.loads((work / "timeline.json").read_text())
        info = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_type,width,height,r_frame_rate",
                               "-of", "json", str(mp4)]).stdout)
        decode = run_process(["ffmpeg", "-v", "error", "-i", str(mp4), "-f", "null", "-"], capture_output=True, text=True)
        dur = float(info["format"]["duration"])
        outro_secs = duration(BASE / cfg["outro"])
        times = [0.1, 2.5] + [(s["a"] + s["b"]) / 2 for s in tl["scenes"]] + [tl["end"] + 3, dur - 0.5]
        sheet = Image.new("RGB", (180 * 8, 320 * math.ceil(len(times) / 8)), "black")
        for k, t in enumerate(times):
            raw = run_process(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(mp4), "-frames:v", "1", "-vf", "scale=180:320",
                                  "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
            if len(raw) == 180 * 320 * 3:
                sheet.paste(Image.frombytes("RGB", (180, 320), raw), (180 * (k % 8), 320 * (k // 8)))
        sheet.save(work / "contact-sheet.jpg", quality=85)
        v = next(s for s in info["streams"] if s["codec_type"] == "video")
        entry = {
            "lot": lot["lot"], "file": mp4.name, "seconds": round(dur, 2), "megabytes": round(int(info["format"]["size"]) / 1e6, 1),
            "size": f"{v['width']}x{v['height']}", "fps": v["r_frame_rate"], "loudnessLufs": round(loudness(mp4), 1),
            "narrationSeconds": round(tl["end"], 1), "decodeClean": decode.returncode == 0 and not decode.stderr.strip(),
            "outroIntact": abs(dur - tl["end"] - outro_secs) < 0.2,
            "hookFirst": tl["segments"][0]["start"] < 0.5, "ctaLast": True, "contactSheet": str(work / "contact-sheet.jpg")}
        report.append(entry)
        print(json.dumps(entry))
    (cfg["work"] / "qa-report.json").write_text(json.dumps(report, indent=1))



# Fused-only overrides. The Coins Since 1994 source file is never changed.
import hashlib, secrets, time

def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''): h.update(chunk)
    return h.hexdigest()

def load(batch):
    directory = BASE / 'Approved' / batch
    path = directory / 'reels.json'
    cfg = json.loads(path.read_text())
    approval = json.loads((directory / 'approval.json').read_text())
    if approval.get('approvedBy') != 'Nick' or approval.get('packageSha256') != digest(path):
        raise RuntimeError('Missing or stale owner-approved tech package')
    if digest(VIDEO / 'tts-runtime.json') != cfg['runtimeSha256']:
        raise RuntimeError('Fused voice runtime changed after package approval')
    for relative, expected in cfg['artifactSha256'].items():
        target = (BASE / relative).resolve()
        if not target.is_relative_to(BASE.resolve()) or digest(target) != expected:
            raise RuntimeError('Approved tech artifact missing or changed: ' + relative)
    v = json.loads((VIDEO / 'tts-runtime.json').read_text())
    reference = VIDEO / v['voiceReference']
    if reference.resolve() != (VIDEO / 'voice-sample/voice-reference.wav').resolve():
        raise RuntimeError('This batch requires the Fused voice reference')
    cfg['voice'] = dict(profile='fused-' + v['qualityProfile'], reference=str(reference), **v['generation'])
    if digest(reference) != cfg['voiceReferenceSha256']:
        raise RuntimeError('Fused voice reference changed after approval')
    cfg['voice']['referenceSha256'] = digest(reference)
    cfg['voice']['modelRevision'] = v['modelRevision']
    cfg['work'], cfg['out'] = BASE / 'work' / batch, BASE / 'Out' / batch
    cfg['work'].mkdir(parents=True, exist_ok=True)
    cfg['say_keys'] = sorted(cfg['say'], key=len, reverse=True)
    cfg['lots'] = [dict(reel, lot=reel['id']) for reel in cfg['reels']]
    cfg['transitions'] = ['flip','push','zoom','wipe']
    cfg['whooshGain'] = 0.07
    cfg['batch'] = batch
    cfg['packageSha256'] = approval['packageSha256']
    for item in cfg['lots']:
        if item['segments'][0]['t'] != approval['hooks'][item['id']]:
            raise RuntimeError('Hook differs from the owner-selected idea')
        if item['segments'][-1]['t'] != cfg['cta']:
            raise RuntimeError('Closing differs from the approved CTA')
        count = len(item['segments'])
        if not 9 <= count <= 11: raise RuntimeError('Tech scripts require 9 to 11 segments')
        words = sum(len(say_text(cfg, s).split()) for s in item['segments'])
        if not 145 <= words <= 170: raise RuntimeError(f'{item["id"]}: {words} spoken words, expected 145-170')
    return cfg

def image_path(cfg, item, ref):
    ref = base_ref(ref)
    if ref == 'h:hero': return BASE / cfg['imageRoot'] / item['folder'] / 'hero.png'
    if ref.startswith('c'):
        return BASE / cfg['imageRoot'] / item['folder'] / f'c{int(ref[1:])}.jpg'
    return BASE / cfg['pexelsRoot'] / f'{ref[1:]}.jpg'

_original_timeline = timeline
def timeline(cfg, item, intro_secs=0):
    copy = dict(item, segments=[dict(s, img=list(s['img'])) for s in item['segments']])
    copy['segments'][0]['img'] = ['h:hero']
    segs, scenes, end = _original_timeline(cfg, copy, 0)
    for scene in scenes:
        if scene['ref'].startswith('e:') and scene['b']-scene['a'] < 4:
            raise RuntimeError(f'{item["id"]}: chart shorter than four seconds')
    return segs, scenes, end

def input_key(cfg, segment):
    payload = {'text':say_text(cfg, segment), 'voice':cfg['voice']}
    return hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()

def archive_rejected(path):
    path = Path(path)
    if not path.exists(): return
    n = 1
    while path.with_name(path.stem+f'_rejected{n}'+path.suffix).exists(): n += 1
    path.rename(path.with_name(path.stem+f'_rejected{n}'+path.suffix))

def verify_caption_rendering():
    """Check temporal compositing, not just a single clean midpoint frame."""
    import numpy as np
    spec={'kind':'counter','title':['CAPTION REGRESSION'],'big':'1','sub':['Clean chart cache'],'src':'Illustrative regression fixture'}
    chunks=[{'a':5.,'b':5.6,'words':['OLD','PHRASE'],'times':[(5.,5.2),(5.2,5.6)]},
            {'a':5.3,'b':5.8,'words':['NEW','WORDS'],'times':[(5.3,5.5),(5.5,5.8)]}]
    chart=Chart(spec);caps=Captions(chunks)
    first=chart.frame(5.1);caps.draw(first,5.1)
    actual=chart.frame(5.4);caps.draw(actual,5.4)
    expected=Chart(spec).frame(5.4);Captions([chunks[1]]).draw(expected,5.4)
    if not np.array_equal(np.asarray(actual),np.asarray(expected)):
        raise RuntimeError('Old captions survived the phrase handoff or contaminated a cached chart')
    cleared=chart.frame(6.);caps.draw(cleared,6.)
    if not np.array_equal(np.asarray(cleared),np.asarray(Chart(spec).frame(6.))):
        raise RuntimeError('Expired captions remain on the chart')
    return True

_original_prep = cmd_prep
def cmd_prep(cfg, items):
    verify_caption_rendering()
    for item in items:
        for index, seg in enumerate(item['segments']):
            wav = seg_wav(cfg,item,index)
            record = wav.with_suffix('.inputs.json')
            valid = False
            if wav.exists() and record.exists():
                saved = json.loads(record.read_text())
                valid = saved.get('inputSha256')==input_key(cfg,seg) and saved.get('audioSha256')==digest(wav)
            if wav.exists() and not valid:
                for p in [wav,wav.with_suffix('.words.json'),record]: archive_rejected(p)
    _original_prep(cfg, items)

def cmd_tts(cfg, items):
    cmd_prep(cfg,items)
    circuit = ['python3',str(REPO/'scripts/tts-circuit.py'),'check','--voice=chatterbox']
    run_process(circuit,check=True,stdout=subprocess.DEVNULL)
    jobs = []
    for item in items:
        for i,seg in enumerate(item['segments']):
            wav = seg_wav(cfg,item,i)
            if not wav.exists(): jobs.append({'text':say_text(cfg,seg),'out_path':str(wav)})
    if not jobs: return print('All approved narration is cached',flush=True)
    manifest=cfg['work']/'tts-manifest.json';manifest.write_text(json.dumps(jobs,indent=2))
    v=cfg['voice'];seed=secrets.randbelow(2**32)
    env=dict(os.environ,HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',TOKENIZERS_PARALLELISM='false',CHATTERBOX_TTS_VARIANT='standard',CHATTERBOX_TTS_SEED=str(seed),CHATTERBOX_TTS_EXAGGERATION=str(v['exaggeration']),CHATTERBOX_TTS_CFG_WEIGHT=str(v['cfgWeight']),CHATTERBOX_TTS_TEMPERATURE=str(v['temperature']),CHATTERBOX_TTS_MIN_P=str(v['minP']),CHATTERBOX_TTS_TOP_P=str(v['topP']),CHATTERBOX_TTS_REPETITION_PENALTY=str(v['repetitionPenalty']),CHATTERBOX_TTS_CHUNK_CHARS=str(v['chunkCharacters']),CHATTERBOX_TTS_MAX_SPEECH_TOKENS=str(v['maxSpeechTokens']))
    try:
        run_process([CHATTERBOX_PY,str(VIDEO/'scripts/chatterbox-tts.py'),f'--manifest={manifest}',f'--speaker_wav={v["reference"]}'],check=True,env=env,cwd=VIDEO/'scripts',timeout=2700)
    except (subprocess.SubprocessError,OSError):
        run_process(['python3',str(REPO/'scripts/tts-circuit.py'),'failure','--voice=chatterbox'],check=False)
        raise
    finally:
        generated_paths={j['out_path'] for j in jobs}
        for item in items:
            for i,seg in enumerate(item['segments']):
                wav=seg_wav(cfg,item,i)
                if str(wav) not in generated_paths or not wav.exists(): continue
                try:
                    if duration(wav)<=0.1: continue
                    run(['ffmpeg','-v','error','-xerror','-i',str(wav),'-f','null','-'])
                except subprocess.SubprocessError: continue
                record={'inputSha256':input_key(cfg,seg),'audioSha256':digest(wav),'voice':v,'baseSeed':seed,'seedPolicy':'Worker derives a distinct seed per chunk and segment'}
                wav.with_suffix('.inputs.json').write_text(json.dumps(record,indent=2))
    run_process(['python3',str(REPO/'scripts/tts-circuit.py'),'success','--voice=chatterbox'],check=True,stdout=subprocess.DEVNULL)

def transcript_cache_valid(cfg,wav,words,meta,runtime):
    if not words.exists() or not meta.exists(): return False
    try:
        saved=json.loads(meta.read_text())
        current={'audioSha256':digest(wav),'modelRevision':runtime['modelRevision']}
        if saved==current: return True
        base=json.loads((VIDEO/'whisper-runtime.json').read_text())
        evidence=(cfg['work']/saved.get('evidenceFile','')).resolve()
        return (saved.get('selection')=='independent-recognition-after-flag'
                and saved.get('audioSha256')==current['audioSha256']
                and saved.get('primaryModelRevision')==runtime['modelRevision']
                and saved.get('modelRevision')==base['modelRevision']
                and evidence.is_relative_to(cfg['work'].resolve()) and evidence.is_file()
                and saved.get('wordsSha256')==digest(words)==digest(evidence))
    except (OSError,ValueError,TypeError): return False

def cmd_whisper(cfg,items):
    # Use the pinned independent small.en recognizer for this short-format pilot.
    runtime=json.loads((VIDEO/'whisper-fallback-runtime.json').read_text());runtime['modelPath']=str(REPO/runtime['modelPath'])
    jobs=[]
    for item in items:
        for i,seg in enumerate(item['segments']):
            wav=seg_wav(cfg,item,i);words=wav.with_suffix('.words.json');meta=wav.with_suffix('.words-source.json')
            if not wav.exists(): raise RuntimeError('Missing narration: '+str(wav))
            current={'audioSha256':digest(wav),'modelRevision':runtime['modelRevision']}
            if not transcript_cache_valid(cfg,wav,words,meta,runtime):
                jobs.append({'index':f'{item["id"]}-{i+1}','audioPath':str(wav),'outputPath':str(words),'narration':seg['t']})
    if jobs:
        manifest=cfg['work']/'whisper-manifest.json';manifest.write_text(json.dumps({'runtime':runtime,'jobs':jobs},indent=2))
        run_process([str(REPO/runtime['python']),str(VIDEO/'scripts/transcribe-local.py'),'--manifest',str(manifest)],check=True,env=dict(os.environ,HF_HUB_OFFLINE='1',TOKENIZERS_PARALLELISM='false'),timeout=600)
        for job in jobs:
            wav=Path(job['audioPath']);wav.with_suffix('.words-source.json').write_text(json.dumps({'audioSha256':digest(wav),'modelRevision':runtime['modelRevision']}))
    findings=[]
    for item in items:
        for i,seg in enumerate(item['segments']):
            wav=seg_wav(cfg,item,i);heard=' '.join(w['text'] for w in json.loads(wav.with_suffix('.words.json').read_text())['words'])
            norm=lambda s: ''.join(norm_words(s))
            expected=[seg['t'],say_text(cfg,seg)]
            score=max(difflib.SequenceMatcher(None,norm_words(heard),norm_words(x)).ratio() for x in expected)
            exact=any(norm(heard)==norm(x) for x in expected)
            required_exact=i in [0,len(item['segments'])-1]
            issues=[]
            if score<0.93 or (required_exact and not exact):issues.append('speech differs from approved words')
            got=norm_words(heard);exp=norm_words(say_text(cfg,seg))
            for a,b in zip(got,got[1:]):
                if a==b and f'{a} {b}' not in ' '.join(exp):issues.append('unexpected adjacent repeat')
            if duration(wav)>max(12,len(say_text(cfg,seg))/8):issues.append('unusual speech duration')
            findings.append({'id':item['id'],'segment':i+1,'heard':heard,'expected':seg['t'],'score':score,'issues':issues})
    for item in items:
        (cfg['work']/f'reel-{item["id"]}'/'speech-check.json').write_text(json.dumps([x for x in findings if x['id']==item['id']],indent=2))
    aggregate_path=cfg['work']/'speech-check.json'
    previous=json.loads(aggregate_path.read_text()) if aggregate_path.exists() else []
    current_ids={item['id'] for item in items}
    aggregate_path.write_text(json.dumps([x for x in previous if x['id'] not in current_ids]+findings,indent=2))
    if any(x['issues'] for x in findings):raise RuntimeError('Speech check requires review; no force bypass. See speech-check.json')
    print('Speech check passed',flush=True);return 0

def cmd_render(cfg,items):
    import numpy as np
    from PIL import Image
    cmd_whisper(cfg,items);cfg['out'].mkdir(parents=True,exist_ok=True)
    music_policy=json.loads((VIDEO/'data/audio-rights.json').read_text())['policy'];levels=music_policy['musicMix']['measuredIntegratedLufs']
    for item in items:
        if item['music'] not in music_policy['trustedCycle']:raise RuntimeError('Music not in the approved Fused cycle')
        work=cfg['work']/f'reel-{item["id"]}';work.mkdir(parents=True,exist_ok=True)
        target=cfg['out']/f'reel-{item["id"]}-{item["slug"]}.mp4';n=1
        while target.exists():n+=1;target=target.with_name(f'reel-{item["id"]}-{item["slug"]}_v{n}.mp4')
        segs,scenes,end=timeline(cfg,item,0);frames=round(end*FPS);end=frames/FPS
        if not 45<=end<=85:raise RuntimeError(f'{item["id"]}: measured short timeline {end:.2f}s outside 45-85s')
        tl={'end':end,'segments':[{'start':s['start'],'end':s['end'],'text':s['seg']['t']} for s in segs],'scenes':scenes,'format':'Fused tech short, no coin intro or outro'}
        (work/'timeline.json').write_text(json.dumps(tl,indent=2,default=str))
        voice=work/f'narration-{time.time_ns()}.wav';parts=[x for s in segs for x in ('-i',str(s['wav']))]
        delays=';'.join(f'[{i}]aresample=48000,adelay={round(s["start"]*1000)}:all=1[v{i}]' for i,s in enumerate(segs))
        run(['ffmpeg','-v','error','-y',*parts,'-filter_complex',f'{delays};'+''.join(f'[v{i}]' for i in range(len(segs)))+f'amix=inputs={len(segs)}:normalize=0,apad=whole_dur={end}',str(voice)])
        gain=VOICE_LUFS-loudness(voice);sfx=whoosh_track(cfg,work,[s['a'] for s in scenes[1:] if s['tr']!='dissolve'],end);music=VIDEO/'public/music'/item['music'];mgain=MUSIC_LUFS-levels[item['music']]
        audio=f'[1:a]volume={gain:.2f}dB,alimiter=limit=0.84:level=disabled[voice];[2:a]aresample=48000,atrim=0:{end},volume={mgain:.2f}dB,afade=t=in:d=0.6,afade=t=out:st={end-0.8}:d=0.8[music];[3:a]aresample=48000[sfx];[voice][music][sfx]amix=inputs=3:normalize=0,alimiter=limit=0.84:level=disabled,atrim=0:{end}[a]'
        temporary=work/f'encode-{time.time_ns()}.mp4'
        enc=start_process(['ffmpeg','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(voice),'-stream_loop','-1','-i',str(music),'-i',str(sfx),'-filter_complex',audio,'-map','0:v','-map','[a]','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-r',str(FPS),'-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-t',str(end),str(temporary)],stdin=subprocess.PIPE)
        caps,pill=Captions(caption_chunks(cfg,segs)),make_pill(item)
        if pill.width>660:raise RuntimeError('Lesson label exceeds safe width')
        masters={}
        def still(i,t):
            s=scenes[i]
            if i not in masters:
                for old in [k for k in masters if k<i-1]:del masters[old]
                masters[i]=Chart(item['enrich'][s['ref'][2:]]) if s['kind']=='chart' else make_master(image_path(cfg,item,s['ref']),s['kind']=='stock' or s['ref']=='h:hero')
            if s['kind']=='chart':return masters[i].frame(t-s['a'])
            return view(masters[i],(t-s['a'])/(s['b']-s['a']),i%2==0)
        try:
            for k in range(frames):
                t=k/FPS;i=max(n for n,s in enumerate(scenes) if s['a']<=t or n==0);im=still(i,t).copy()
                if i and t-scenes[i]['a']<scenes[i]['td']:im=transition(scenes[i]['tr'],still(i-1,t),im,(t-scenes[i]['a'])/scenes[i]['td'])
                im.paste(pill,((W-pill.width)//2,110),pill);caps.draw(im,t);enc.stdin.write(im.tobytes())
                if k%300==0:print(f'{item["id"]}: frame {k}/{frames}',flush=True)
            enc.stdin.close()
            if enc.wait():raise RuntimeError('Video encoder failed')
        except BaseException:
            enc.terminate();enc.wait();raise
        level=loudness(temporary)
        if not -18<=level<=-14:raise RuntimeError(f'Mixed audio loudness {level} LUFS needs review')
        if target.exists():raise RuntimeError('Refusing to overwrite an output created by another owner')
        temporary.rename(target)
        (work/'render-record.json').write_text(json.dumps({'file':str(target),'sha256':digest(target),'seconds':duration(target),'voice':cfg['voice'],'music':item['music'],'voiceTargetLufs':VOICE_LUFS,'musicTargetLufs':MUSIC_LUFS,'measuredLufs':level,'firstFrame':'approved hero','captionEngine':runtime_name(),'status':'encoded-review-required','packageSha256':cfg['packageSha256']},indent=2))
        print('Encoded, review required: '+str(target),flush=True)

def runtime_name():return 'Local faster-whisper with hash-bound per-segment model provenance'

def cmd_qa(cfg,items):
    from PIL import Image
    results=[]
    for item in items:
        work=cfg['work']/f'reel-{item["id"]}';record=json.loads((work/'render-record.json').read_text());path=Path(record['file']);tl=json.loads((work/'timeline.json').read_text())
        if digest(path)!=record['sha256']:raise RuntimeError('Encoded file changed after its record')
        info=json.loads(run(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,duration','-of','json',str(path)]).stdout)
        decode=run_process(['ffmpeg','-v','error','-xerror','-i',str(path),'-f','null','-'],capture_output=True,text=True)
        video=next(x for x in info['streams'] if x['codec_type']=='video');audio=next(x for x in info['streams'] if x['codec_type']=='audio');duration_diff=abs(float(video.get('duration',info['format']['duration']))-float(audio.get('duration',info['format']['duration'])))
        measurement=run_process(['ffmpeg','-hide_banner','-i',str(path),'-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True).stderr
        levels=json.loads(measurement[measurement.rindex('{'):measurement.rindex('}')+1])
        late_chart_times=[min(s['a']+4.8,s['b']-0.1) for s in tl['scenes'] if s['kind']=='chart']+[s['b']-0.1 for s in tl['scenes'] if s['kind']=='chart']
        times=sorted(set(round(t*FPS)/FPS for t in [0,0.5,16,16.5,17,17.5,18]+[(s['a']+s['b'])/2 for s in tl['scenes']]+late_chart_times+[float(info['format']['duration'])-0.1]))
        sheet=Image.new('RGB',(180*6,320*math.ceil(len(times)/6)),'black');frames=[]
        for i,t in enumerate(times):
            pic=work/f'qa-frame-{i:02d}.jpg';run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(path),'-frames:v','1',str(pic)]);im=Image.open(pic).convert('RGB');sheet.paste(im.resize((180,320)),(180*(i%6),320*(i//6)));frames.append({'path':str(pic),'seconds':t,'sha256':digest(pic)})
        sheet.save(work/'contact-sheet.jpg',quality=90)
        # Compare decoded chart caption bands with clean, single-caption composites.
        import numpy as np
        caption_errors=[]
        segs,_,_=timeline(cfg,item,0)
        for entry in frames:
            t=entry['seconds']
            scene=next((s for s in tl['scenes'] if s['kind']=='chart' and s['a']+4.6<=t<s['b']),None)
            if scene is None:continue
            expected=Chart(item['enrich'][scene['ref'][2:]]).frame(t-scene['a'])
            Captions(caption_chunks(cfg,segs)).draw(expected,t)
            actual=Image.open(entry['path']).convert('RGB')
            error=float(np.abs(np.asarray(actual.crop((0,905,W,1035)),dtype=np.float32)-np.asarray(expected.crop((0,905,W,1035)),dtype=np.float32)).mean())
            caption_errors.append({'seconds':t,'meanAbsolutePixelError':round(error,4)})
        caption_band_pass=bool(caption_errors) and all(x['meanAbsolutePixelError']<10 for x in caption_errors)
        checks={'captionRegression':verify_caption_rendering(),'decodedCaptionBands':caption_band_pass,'decode':decode.returncode==0 and not decode.stderr.strip(),'dimensions':(video['width'],video['height'])==(720,1280),'fps':video['r_frame_rate']=='30/1','videoCodec':video['codec_name']=='h264','audioCodec':audio['codec_name']=='aac','avSync':duration_diff<0.1,'size':int(info['format']['size'])<25_000_000,'loudness':-18<=float(levels['input_i'])<=-14,'truePeak':float(levels['input_tp'])<-1,'duration':45<=float(info['format']['duration'])<=85,'hookStartsAtZero':tl['segments'][0]['start']==0,'heroFirst':tl['scenes'][0]['ref']=='h:hero' and tl['scenes'][0]['a']==0,'noAdditionalClipDuration':abs(float(info['format']['duration'])-tl['end'])<0.1}
        if not all(checks.values()):
            failed=work/'failed';failed.mkdir(exist_ok=True)
            quarantine=failed/f'{time.time_ns()}-{path.name}';path.rename(quarantine)
            record.update(file=str(quarantine),status='failed-qa')
            (work/'render-record.json').write_text(json.dumps(record,indent=2));path=quarantine
        results.append({'id':item['id'],'file':str(path),'sha256':digest(path),'seconds':float(info['format']['duration']),'bytes':int(info['format']['size']),'lufs':float(levels['input_i']),'truePeakDb':float(levels['input_tp']),'checks':checks,'automatedChecksPassed':all(checks.values()),'visualReviewRequired':True,'captionBandChecks':caption_errors,'frames':frames})
    report_path=cfg['work']/'qa-report.json'
    old=json.loads(report_path.read_text()) if report_path.exists() else []
    ids={x['id'] for x in results}
    report_path.write_text(json.dumps([x for x in old if x['id'] not in ids]+results,indent=2))
    if not all(x['automatedChecksPassed'] for x in results):raise RuntimeError('Final media QA failed')
    print('Automated QA passed; contact sheets and first frames require actual visual inspection',flush=True)


def lease_fds():
    value = os.environ.get('FUSED_TECH_LEASE_FD')
    if value is None: return ()
    fd = int(value)
    os.fstat(fd)
    return (fd,)

def run_process(*args, **kwargs):
    kwargs.setdefault('pass_fds', lease_fds())
    return subprocess.run(*args, **kwargs)

def start_process(*args, **kwargs):
    kwargs.setdefault('pass_fds', lease_fds())
    return subprocess.Popen(*args, **kwargs)

if __name__ == '__main__':
    if len(sys.argv)<3 or sys.argv[1] not in ('prep','tts','whisper','render','qa'):raise SystemExit('Usage: fused_tech_video.py prep|tts|whisper|render|qa BATCH [T-01 ...]')
    cfg=load(sys.argv[2]);items=pick(cfg,[x for x in sys.argv[3:] if not x.startswith('-')])
    {'prep':cmd_prep,'tts':cmd_tts,'whisper':cmd_whisper,'render':cmd_render,'qa':cmd_qa}[sys.argv[1]](cfg,items)
