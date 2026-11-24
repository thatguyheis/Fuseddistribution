"""Create the client update from an explicit list of approved distribution files."""
import argparse
import hashlib
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

service = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("coin_project", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
coin = args.coin_project
example = "auction-2026-12-09-b2-v3"
files = {
    "START-HERE.md": service / "workflow/START-HERE.md",
    "docs/VIDEO-SOP.md": coin / "COINS-SINCE-1994-VIDEO-SOP.md",
    "docs/V3-STYLE.md": coin / "COINS-SINCE-1994-STYLE-V3-ARCHIVAL-EDITORIAL.md",
    "tools/preview.py": service / "workflow/preview.py",
    "tools/c1994_video_v3.py": coin / "tools/c1994_video_v3.py",
    "tools/c1994_video_v2.py": coin / "tools/c1994_video_v2.py",
    "examples/lot-876.json": coin / "Drafts" / example / "scenes/lot-876.json",
    "examples/lot-876-stills.jpg": coin / "work" / example / "lot-876/stills-sheet.jpg",
}
contents = {name: source.read_bytes() for name, source in files.items()}
with ZipFile(args.output, "x") as archive:
    for name, data in contents.items():
        info = ZipInfo(name)
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data, compress_type=ZIP_DEFLATED)
print(hashlib.sha256(args.output.read_bytes()).hexdigest())
