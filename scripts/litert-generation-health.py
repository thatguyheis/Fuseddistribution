#!/usr/bin/env python3
"""Verify inference, with one restart only while owning the publishing lane."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = 'http://localhost:9379/v1'


def probe():
    body = {'model': 'gemma-e2b,gpu', 'messages': [
        {'role': 'user', 'content': 'Reply with the single word READY.'}
    ], 'max_tokens': 16, 'temperature': 0}
    request = urllib.request.Request(ENDPOINT + '/chat/completions',
        data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=60) as response:
        content = json.load(response)['choices'][0]['message']['content']
    if not isinstance(content, str) or not content.strip():
        raise ValueError('Inference returned empty content')


def owns_lane():
    renderer = Path('/tmp/fused-remotion-render.lock')
    if renderer.exists() and subprocess.run([
        sys.executable, str(ROOT / 'scripts/lock-owner-alive.py'), str(renderer)
    ], check=False).returncode == 0:
        return False
    try:
        owner = int(Path('/tmp/fused-blog-publisher.lock/pid').read_text())
        pid = os.getpid()
        for _ in range(12):
            if pid == owner:
                return True
            if pid <= 1:
                break
            pid = int(subprocess.check_output(['ps', '-o', 'ppid=', '-p', str(pid)], text=True))
    except (OSError, ValueError, subprocess.SubprocessError):
        pass
    return False


def restart():
    subprocess.run(['launchctl', 'kickstart', '-k',
        f'gui/{os.getuid()}/com.nick.litert-serve'], check=True, timeout=15)
    for _ in range(30):
        try:
            with urllib.request.urlopen(ENDPOINT + '/models', timeout=2):
                return
        except OSError:
            time.sleep(2)
    raise RuntimeError('Service did not start within the bounded readiness window')


def ensure():
    result = {'checkedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
              'healthy': False, 'restarted': False}
    try:
        try:
            probe()
        except Exception as error:
            result['initialError'] = str(error)
            if not owns_lane():
                raise RuntimeError('Inference failed; publishing ownership or idle renderer could not be verified') from error
            result['restarted'] = True
            restart()
            probe()
        result['healthy'] = True
    except Exception as error:
        result['error'] = str(error)
    return result


if __name__ == '__main__':
    result = ensure()
    destination = ROOT / '.workflow-state/litert-health/latest.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, indent=2) + '\n')
    temporary.replace(destination)
    print(json.dumps(result))
    sys.exit(0 if result['healthy'] else 1)
