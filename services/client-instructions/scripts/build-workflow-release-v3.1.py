"""Create the V3.1 client update from an explicit list of approved distribution files (2026-11-24)."""
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
files = {
    "START-HERE.md": service / "workflow/START-HERE-v3.1.md",
    "docs/V3.1-ADDENDUM.md": coin / "COINS-SINCE-1994-V3.1-ADDENDUM.md",
    "docs/VIDEO-SOP.md": coin / "COINS-SINCE-1994-VIDEO-SOP.md",
    "docs/V3-STYLE.md": coin / "COINS-SINCE-1994-STYLE-V3-ARCHIVAL-EDITORIAL.md",
    "tools/preview.py": service / "workflow/preview_v3_1.py",
    "tools/c1994_video_v3_1.py": coin / "tools/c1994_video_v3_1.py",
    "tools/c1994_video_v3.py": coin / "tools/c1994_video_v3.py",
    "tools/c1994_video_v2.py": coin / "tools/c1994_video_v2.py",
    "data/us-states.json": coin / "work/auction-2026-12-09-v31/archival/us-states.json",
    "data/world.geo.json": coin / "work/auction-2026-12-09-v31/archival/world.geo.json",
    "examples/lot-851.json": coin / "work/style-test-v3/lot-851/scenes.json",
    "examples/lot-851-stills.jpg": coin / "work/style-test-v3/lot-851/stills-sheet.jpg",
    "examples/lot-870-v3.1.json": coin / "Approved/auction-2026-12-09-v31/scenes/lot-870.json",
    "examples/lot-870-v3.1-contact-sheet.jpg": coin / "work/auction-2026-12-09-v31/v31-lot-870/qa-contact-sheet.jpg",
}
missing = [str(p) for p in files.values() if not p.is_file()]
if missing:
    raise SystemExit("missing release files:\n  " + "\n  ".join(missing))
contents = {name: source.read_bytes() for name, source in files.items()}
with ZipFile(args.output, "x") as archive:
    for name, data in contents.items():
        info = ZipInfo(name)
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data, compress_type=ZIP_DEFLATED)
print(hashlib.sha256(args.output.read_bytes()).hexdigest())
