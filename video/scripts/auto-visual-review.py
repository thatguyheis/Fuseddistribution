#!/usr/bin/env python3
"""Run a hash-bound local vision QA pass over an encoded reel contact sheet."""
import argparse
import base64
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]


def normalized_hook(text: str) -> str:
    return re.sub(r'[^a-z0-9]', '', text.lower())


def verify_approved_hook(expected: str, visible: str, captions: dict | list) -> dict:
    chunks = captions.get('0', []) if isinstance(captions, dict) else captions[0] if captions else []
    recognized = ' '.join(chunk.get('text', '') for chunk in chunks)
    return {
        'expectedText': expected,
        'spokenMatch': normalized_hook(recognized) == normalized_hook(expected),
        'visibleMatch': normalized_hook(visible) == normalized_hook(expected),
        'frameSeconds': 0,
        'recognizedSpeech': recognized,
        'recognizedVisibleText': visible,
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_ollama(endpoint: str) -> None:
    tags = endpoint.rstrip('/') + '/api/tags'
    for _ in range(2):
        try:
            with urllib.request.urlopen(tags, timeout=5):
                return
        except urllib.error.URLError:
            subprocess.run(['launchctl', 'kickstart', '-k', f'gui/{os.getuid()}/homebrew.mxcl.ollama'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False, timeout=20)
            for _ in range(24):
                try:
                    with urllib.request.urlopen(tags, timeout=3):
                        return
                except urllib.error.URLError:
                    time.sleep(5)
    raise RuntimeError('local Ollama API is unavailable after service recovery')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--slug', required=True)
    parser.add_argument('--model', default=os.environ.get('COIN_HISTORY_MODEL', 'gemma3:4b'))
    args = parser.parse_args()

    out_dir = ROOT / 'video' / 'out' / args.slug
    video = out_dir / f'{args.slug}.mp4'
    script_path = out_dir / 'script.json'
    if not video.is_file() or not script_path.is_file():
        raise RuntimeError('encoded MP4 and render script are required')
    script = json.loads(script_path.read_text())
    hook_path = ROOT / 'ops' / 'reel-hook-exceptions.json'
    hook = json.loads(hook_path.read_text()).get('exceptions', {}).get(args.slug, {}) if hook_path.is_file() else {}
    expected_hook = hook.get('spokenText') if hook.get('approvedBy') == 'Nick' and hook.get('preserveExactText') is True else None
    duration = float(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'default=noprint_wrappers=1:nokey=1', str(video)], text=True
    ).strip())
    if duration <= 0:
        raise RuntimeError('invalid encoded duration')

    contact_sheet = out_dir / 'visual-review-contact-sheet.jpg'
    # Seek independently to six explicit points. Sampling exact EOF through a
    # rate filter can yield a synthetic black tile, so all points stay in-file.
    sample_seconds = [0.0] + [round(duration * fraction, 3) for fraction in (0.19, 0.36, 0.53, 0.70, 0.92)]
    frame_paths = [out_dir / f'.visual-review-frame-{index}.jpg' for index in range(6)]
    for timestamp, frame_path in zip(sample_seconds, frame_paths):
        subprocess.run([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(timestamp), '-i', str(video),
            '-frames:v', '1', '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2',
            '-q:v', '5', str(frame_path),
        ], check=True, timeout=60)
        if not frame_path.is_file() or frame_path.stat().st_size < 1024:
            raise RuntimeError(f'could not extract a valid visual QA frame at {timestamp}s')
    filters = ';'.join(f'[{index}:v]scale=480:854[v{index}]' for index in range(6))
    layout = '0_0|480_0|960_0|0_854|480_854|960_854'
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *sum((['-i', str(path)] for path in frame_paths), []),
        '-filter_complex', f'{filters};[v0][v1][v2][v3][v4][v5]xstack=inputs=6:layout={layout}[out]',
        '-map', '[out]', '-frames:v', '1', '-q:v', '5', str(contact_sheet),
    ], check=True, timeout=60)
    sheet_hash = sha256(contact_sheet)
    narration = (ROOT / 'content' / 'coin-history' / args.slug / 'narration-v1-approved.txt')
    if not narration.is_file():
        narration = ROOT / 'public' / 'blog' / args.slug / 'reel-script-approved.md'
    if not narration.is_file():
        narration = ROOT / 'public' / 'blog' / args.slug / 'reel-script.md'
    context = narration.read_text()[:6000] if narration.is_file() else ''
    prompt_prefix = (
        'Inspect this single full-resolution frame from a finished vertical educational coin reel. '
        'Report only clear, visible defects: a frame that is almost entirely black/blank, an actual compositing or decode glitch, '
        'captions cut off by the screen edge or visibly overlapping each other, the coin evidence cropped out, '
        'or a plainly unrelated main subject (for example, tax paperwork during coin-design narration). '
        'This reel intentionally uses one verified owner coin photograph as its repeated visual anchor while narration explains history; '
        'that repetition is not a contradiction. Generic silver or coin imagery may support the story without depicting the exact issue. '
        'AI-generated backgrounds are illustrative only, not evidence. A dark scene is not blank when identifiable objects or a subject are visible. '
        'Dark margins and negative space are intentional. Captions near the bottom are acceptable when every letter remains inside the frame. '
        'Do not infer coin identity, date, mint mark, grade, or historical fact. Do not call text clipped or unreadable unless letters visibly cross the frame edge or overlap. '
        'Pass when no clear defect is visible. Return JSON only: {"pass": boolean, "issues": [short strings], "summary": "short string"}.\n\n'
        f'Title/slug: {script.get("title", args.slug)}\n'
        f'Approved narration context:\n{context}'
    )
    if expected_hook:
        prompt_prefix = (
            'Inspect this full-resolution frame from an AI/business educational reel. '
            'Report clear visible defects: blank or black opening, decode glitches, clipped or overlapping '
            'headlines or captions, or unreadable low-contrast main text. Supporting stock photos and '
            'illustrative diagrams are intentional. Dark backgrounds and negative space are acceptable. '
            'Return JSON only with pass (boolean), issues (list of short strings), summary (short string).\n'
            f'Title/slug: {script.get("title", args.slug)}\nApproved narration context:\n{context}'
        )
    endpoint = os.environ.get('OLLAMA_LOCAL_BASE_URL', 'http://127.0.0.1:11434').rstrip('/') + '/api/chat'
    ensure_ollama(endpoint.removesuffix('/api/chat'))
    response_schema = {
        'type': 'object',
        'properties': {
            'pass': {'type': 'boolean'},
            'issues': {'type': 'array', 'items': {'type': 'string'}},
            'summary': {'type': 'string'},
        },
        'required': ['pass', 'issues', 'summary'],
        'additionalProperties': False,
    }
    frame_results = []
    visible_hook = ''
    for index, (timestamp, frame_path) in enumerate(zip(sample_seconds, frame_paths), start=1):
        prompt = f'{prompt_prefix}\nFrame {index} at {timestamp:.3f} seconds.'
        schema = response_schema
        if expected_hook and index == 1:
            prompt += (
                '\nThis opening is an AI/business educational reel. Transcribe the main opening headline '
                'from the actual image into visibleHookText. Do not copy the expected text unless every word '
                'is visibly present. Ignore branding and small labels. '
                f'Expected approved headline: {expected_hook}'
            )
            schema = {**response_schema, 'properties': {**response_schema['properties'], 'visibleHookText': {'type': 'string'}},
                      'required': response_schema['required'] + ['visibleHookText']}
        payload = json.dumps({
            'model': args.model,
            'messages': [{'role': 'user', 'content': prompt,
                          'images': [base64.b64encode(frame_path.read_bytes()).decode('ascii')]}],
            'format': schema, 'stream': False, 'think': False,
            'options': {'temperature': 0, 'num_predict': 192}, 'keep_alive': '10m',
        }).encode()
        request = urllib.request.Request(endpoint, data=payload, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                answer = json.loads(response.read())['message']['content']
            result = json.loads(answer)
        except (urllib.error.URLError, TimeoutError, KeyError, json.JSONDecodeError) as error:
            raise RuntimeError(f'local visual model failed on frame {index}: {error}') from error
        issues = result.get('issues')
        if not isinstance(issues, list) or any(not isinstance(issue, str) or not issue.strip() for issue in issues):
            raise RuntimeError(f'local visual model returned malformed issues for frame {index}')
        frame_passed = result.get('pass') is True and not issues
        if expected_hook and index == 1:
            visible_hook = str(result.get('visibleHookText', ''))
        frame_results.append({
            'sampleSeconds': timestamp,
            'pass': frame_passed,
            'issues': issues,
            'summary': str(result.get('summary', '')).strip()[:300],
        })
    for frame_path in frame_paths:
        frame_path.unlink(missing_ok=True)
    issues = [f'Frame {index}: {issue}' for index, item in enumerate(frame_results, start=1) for issue in item['issues']]
    passed = all(item['pass'] for item in frame_results)
    hook_verification = None
    if expected_hook:
        captions = json.loads((out_dir / 'captions.json').read_text())
        hook_verification = verify_approved_hook(expected_hook, visible_hook, captions)
        if not hook_verification['spokenMatch'] or not hook_verification['visibleMatch']:
            issues.append('Approved hook differs from recognized opening speech or visible frame-zero headline')
            passed = False
    review = {
        'slug': args.slug,
        'pass': passed,
        'reviewer': 'automated-local-vision-v1',
        'model': args.model,
        'policy': 'encoded-full-resolution-frame-visual-qa-v2',
        'reviewedAt': datetime.now(timezone.utc).isoformat(),
        'videoSha256': sha256(video),
        'contactSheetSha256': sheet_hash,
        'durationSeconds': round(duration, 3),
        'frames': frame_results,
        'issues': issues,
        'summary': ' '.join(item['summary'] for item in frame_results if item['summary'])[:500],
    }
    if hook_verification:
        review['approvedHookVerification'] = hook_verification
    target = out_dir / 'visual-review.json'
    target.write_text(json.dumps(review, indent=2) + '\n')
    print(f'[auto-visual-review] {"PASS" if passed else "BLOCKED"}: {target}')
    return 0 if passed else 1


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f'[auto-visual-review] ERROR: {error}', file=sys.stderr)
        raise SystemExit(1)
