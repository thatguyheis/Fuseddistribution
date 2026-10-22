"""Bounded, offline Whisper batch worker. One model load for all reel segments."""
import argparse
import json
from pathlib import Path
from faster_whisper import WhisperModel

parser = argparse.ArgumentParser()
parser.add_argument('--manifest', required=True)
args = parser.parse_args()
manifest = json.loads(Path(args.manifest).read_text())
config = manifest['runtime']
model = WhisperModel(config['modelPath'], device='cpu', compute_type=config['computeType'], cpu_threads=config['cpuThreads'], local_files_only=True)
for job in manifest['jobs']:
    segments, info = model.transcribe(job['audioPath'], language='en', beam_size=config['beamSize'], word_timestamps=True, condition_on_previous_text=False, temperature=0, vad_filter=config['vadFilter'], initial_prompt=job['narration'] if config['narrationPrompt'] else None)
    words = [{'text': w.word.strip(), 'startSec': w.start, 'endSec': w.end, 'probability': w.probability} for s in segments for w in (s.words or []) if w.word.strip()]
    if not words:
        raise RuntimeError(f"No speech recognized in segment {job['index']}")
    Path(job['outputPath']).write_text(json.dumps({'words': words, 'duration': info.duration, 'language': info.language}, indent=2)+'\n')
    print(f"Whisper segment {job['index']}: {len(words)} timed words", flush=True)
