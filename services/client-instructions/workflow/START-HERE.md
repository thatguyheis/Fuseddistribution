# Coins & Auctions Since 1994 | V3 video workflow

Read `docs/VIDEO-SOP.md` and `docs/V3-STYLE.md` for the approved coin production and visual standards. Use the commands below for this portable release.

Run this update alongside the existing auction workflow. Keep each release in its own directory under the coin project. The current client setup supplies the voice, word timings, approved music, auction photos, intro and outro. The release contains the V3 picture renderer and its matching V2 helper. Continue using the installed local voice workflow for audio production.

1. From the coin project directory, use its existing Python environment with Pillow and NumPy. Run `python "$release/tools/preview.py" check` where `release` is the extracted release directory. On Linux, FFmpeg, FFprobe and DejaVu Sans regular and bold must be installed in that environment.
2. Open the example scene plan and reference stills in `examples/`. For a new lot, verify the facts against the auction record and verify the identity of every coin image. Prepare two hooks, two closing questions, and visual choices for approval. Use the existing voice and timing workflow after the script is approved.
3. Make a scene plan against the local approved lot, voice timings and media paths. Show the actual lot photos in full color. Use cleared stock and credited archival photos for context. Change the visual every two to five seconds. Use small captions, one word at a time. Time red highlights, maps, labels and numbers to the matching spoken word.
4. From the coin project, run `python "$release/tools/preview.py" select path/to/scenes.json`. Review the generated selection page, timing, text fit, and accuracy. Apply the selected edits and save the approved scene plan before rendering.
5. Run `python "$release/tools/preview.py" render path/to/approved-scenes.json` and then `python "$release/tools/preview.py" qa path/to/approved-scenes.json`. Verify picture, spoken numbers, rights, captions, level, closing and file size before handing off. Uploading and scheduling are separate actions.

The example illustrates the shot design. Rendering that particular example requires its original auction media, geography files and voice timings on the workstation.
