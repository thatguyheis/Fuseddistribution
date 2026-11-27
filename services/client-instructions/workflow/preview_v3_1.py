"""Run the packaged V3.1 renderer and checks against this client's existing auction project."""
import argparse
from functools import lru_cache
from pathlib import Path
import shutil
import sys

import c1994_video_v3_1 as tool
from PIL import ImageFont

ACTIONS = ("check-env", "lint", "assets", "stills", "check", "select", "render", "qa")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=ACTIONS)
    parser.add_argument("args", nargs="*", help="lint/assets: <auction-id> <lot> [scenes.json]; others: <scenes.json> [times]")
    parser.add_argument("--project", type=Path, default=Path.cwd())
    opts = parser.parse_args()
    project = opts.project.resolve()
    v3 = tool.v3
    v3.BASE = v3.v2.BASE = project
    v3.v2.REPO = project.parent
    v3.v2.VIDEO = project.parent / "video"
    if not Path(v3.HN).is_file():
        @lru_cache(maxsize=256)
        def portable_font(size, face="regular"):
            name = "DejaVuSans-Bold.ttf" if face in ("bold", "medium") else "DejaVuSans.ttf"
            return ImageFont.truetype(name, max(6, int(size)))
        v3.font = portable_font
    for face in v3.FACE:
        v3.font(32, face)
    for binary in ("ffmpeg", "ffprobe"):
        if not shutil.which(binary):
            sys.exit(f"{binary} is missing in this environment")
    a = opts.args
    if opts.action == "check-env":
        print(f"V{tool.VERSION} renderer, checks, fonts, FFmpeg and FFprobe passed. Auction project: {project}")
        return
    if opts.action in ("lint", "assets") and len(a) < 2:
        parser.error(f"{opts.action} needs <auction-id> <lot>")
    if opts.action not in ("lint", "assets") and not a:
        parser.error("supply the path to a scene plan")
    if opts.action == "lint":
        sys.exit(tool.cmd_lint(a[0], a[1]))
    if opts.action == "assets":
        tool.cmd_assets(a[0], a[1], a[2] if len(a) > 2 else None)
    elif opts.action == "stills":
        tool.cmd_stills(a[0], a[1:] or ["1", "5", "10"])
    elif opts.action == "check":
        sys.exit(tool.cmd_check(a[0]))
    elif opts.action == "select":
        tool.cmd_select(a[0])
    elif opts.action == "render":
        tool.cmd_render(a[0])
    elif opts.action == "qa":
        tool.cmd_qa(a[0])


if __name__ == "__main__":
    main()
