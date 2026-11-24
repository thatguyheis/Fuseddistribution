"""Run the packaged V3 renderer against this client's existing auction project."""
import argparse
from functools import lru_cache
from pathlib import Path
import shutil
import sys

import c1994_video_v3 as renderer
from PIL import ImageFont


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("check", "stills", "select", "render", "qa"))
    parser.add_argument("scene", nargs="?")
    parser.add_argument("times", nargs="*")
    parser.add_argument("--project", type=Path, default=Path.cwd())
    args = parser.parse_args()
    if args.action != "check" and not args.scene:
        parser.error("supply the path to a scene plan")
    project = args.project.resolve()
    renderer.BASE = renderer.v2.BASE = project
    renderer.v2.REPO = project.parent
    renderer.v2.VIDEO = project.parent / "video"
    if not Path(renderer.HN).is_file():
        @lru_cache(maxsize=256)
        def portable_font(size, face="regular"):
            name = "DejaVuSans-Bold.ttf" if face in ("bold", "medium") else "DejaVuSans.ttf"
            return ImageFont.truetype(name, max(6, int(size)))
        renderer.font = portable_font
    for face in renderer.FACE:
        renderer.font(32, face)
    for binary in ("ffmpeg", "ffprobe"):
        if not shutil.which(binary):
            sys.exit(f"{binary} is missing in this environment")
    if args.action == "check":
        print(f"Renderer imports, fonts, FFmpeg and FFprobe passed. Auction project: {project}")
        return
    if args.action == "stills":
        renderer.cmd_stills(args.scene, args.times or ["1", "5", "10"])
    else:
        {"select": renderer.cmd_select, "render": renderer.cmd_render, "qa": renderer.cmd_qa}[args.action](args.scene)


if __name__ == "__main__":
    main()
