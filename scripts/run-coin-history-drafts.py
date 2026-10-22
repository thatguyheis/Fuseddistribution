#!/usr/bin/env python3
"""Resumable, local-only production for owner-authorized coin-history drafts."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from zoneinfo import ZoneInfo
from coin_history_ops import queue_health, throughput_report, write_report

ROOT = Path(__file__).resolve().parents[1]
SCOPE_PATH = ROOT / 'ops/content-scope.json'
SCOPE = json.loads(SCOPE_PATH.read_text()) if SCOPE_PATH.exists() else {}
LEGACY_QUEUE = ROOT / 'content/coin-history/production-2026-10-20/draft-queue.json'
QUEUE = ROOT / SCOPE['coinHistoryQueue'] if SCOPE.get('coinHistoryQueue') else LEGACY_QUEUE
DAILY_TARGET = int(SCOPE.get('dailyTarget', 0))
TIMEZONE = ZoneInfo(SCOPE.get('timezone', 'America/Los_Angeles'))
STATE = ROOT / '.workflow-state/coin-history-drafts/state.json'
LOG = ROOT / '.workflow-state/coin-history-drafts/runner.log'
LOCK = Path('/tmp/fused-coin-history-drafts.lock')
MODEL = os.environ.get('COIN_HISTORY_MODEL', 'gemma3:4b')


def now():
    return dt.datetime.now(dt.timezone.utc)


def save(state):
    state['updatedAt'] = now().isoformat()
    STATE.parent.mkdir(parents=True, exist_ok=True)
    temp = STATE.with_suffix('.tmp')
    temp.write_text(json.dumps(state, indent=2) + '\n')
    temp.replace(STATE)


def log(message):
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open('a') as stream:
        stream.write(f'{now().isoformat()} {message}\n')


def alive_lock(path):
    return path.is_dir() and subprocess.run(
        [sys.executable, str(ROOT / 'scripts/lock-owner-alive.py'), str(path)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
    ).returncode == 0


def load_state():
    if STATE.exists():
        try:
            return json.loads(STATE.read_text())
        except (OSError, json.JSONDecodeError):
            pass
    return {'version': 1, 'items': {}}


def transcript_verified(slug):
    work = ROOT / 'content/coin-history' / slug
    transcript = work / 'narration-v1-approved.txt'
    approval = json.loads((work / 'script-approval.json').read_text())
    digest = hashlib.sha256(transcript.read_bytes()).hexdigest()
    if approval.get('transcriptApproved') is not True or approval.get('approvedTranscriptSha256') != digest:
        raise ValueError(f'{slug}: approved transcript hash mismatch')
    return digest


def ensure_final_question(slug):
    """Add the owner-authorized short discussion card before production."""
    work = ROOT / 'content/coin-history' / slug
    blog = ROOT / 'public/blog' / slug
    transcript_path = work / 'narration-v1-approved.txt'
    approval_path = work / 'script-approval.json'
    transcript = transcript_path.read_text()
    approval = json.loads(approval_path.read_text())
    old_digest = hashlib.sha256(transcript.encode()).hexdigest()
    if approval.get('transcriptApproved') is not True or approval.get('approvedTranscriptSha256') != old_digest:
        raise ValueError(f'{slug}: approved transcript hash mismatch before question-card repair')
    if transcript.rstrip().endswith('?'):
        sync_coin_reel_labels(slug, transcript)
        return old_digest

    social_path = blog / 'social-copy.json'
    social = json.loads(social_path.read_text()) if social_path.exists() else {}
    question = str(social.get('discussion_question') or '').strip()
    if not question.endswith('?'):
        question = f'{question.rstrip(".! ")}?'
    if not question or len(question.split()) > 10:
        question = 'Which detail in this coin’s story stands out to you?'

    transcript = f'{transcript.rstrip()}\n\n{question}\n'
    new_digest = hashlib.sha256(transcript.encode()).hexdigest()
    transcript_path.write_text(transcript)
    approval.update(
        approvedTranscriptSha256=new_digest,
        wordCount=len(transcript.split()),
        automaticRevision=True,
        revisionReason='Added a short source-neutral final question card under the owner-authorized automatic transcript policy.',
        audit={**approval.get('audit', {}), 'finalQuestionCard': 'pass'},
    )
    approval_path.write_text(json.dumps(approval, indent=2) + '\n')

    sync_coin_reel_labels(slug, transcript)

    inputs_path = blog / 'production-inputs.json'
    inputs = json.loads(inputs_path.read_text()) if inputs_path.exists() else {}
    inputs.update(transcriptSha256=new_digest, transcriptWords=len(transcript.split()))
    inputs_path.write_text(json.dumps(inputs, indent=2) + '\n')
    for name in ('reel-script-approved.md', 'reel-script.md'):
        path = blog / name
        if not path.exists():
            raise FileNotFoundError(f'{slug}: missing approved reel script {path}')
        script = path.read_text().rstrip()
        if not re.search(r'^## QUESTION\b', script, flags=re.M):
            script += f'\n\n---\n## QUESTION\nText on screen: {question}\nNarration: {question}\n'
        path.write_text(script + '\n')

    qa_path = blog / 'qa.json'
    if qa_path.exists():
        qa = json.loads(qa_path.read_text())
        qa.setdefault('automaticApproval', {})['transcriptHashVerified'] = True
        qa['automaticApproval']['lastRevision'] = approval['revisionReason']
        for name in ('reel-script.md', 'reel-script-approved.md', 'production-inputs.json'):
            qa.setdefault('artifactSha256', {})[name] = hashlib.sha256((blog / name).read_bytes()).hexdigest()
        for name in ('narration-v1-approved.txt', 'script-approval.json', 'claim-map.json'):
            qa.setdefault('artifactSha256', {})[f'content/coin-history/{slug}/{name}'] = hashlib.sha256((work / name).read_bytes()).hexdigest()
        qa_path.write_text(json.dumps(qa, indent=2) + '\n')
    return new_digest


def sync_coin_reel_labels(slug, transcript):
    work = ROOT / 'content/coin-history' / slug
    labels_path = work / 'reel-labels.json'
    if not labels_path.exists():
        return
    paragraphs = [part.strip() for part in re.split(r'\n\s*\n', transcript.strip()) if part.strip()]
    labels = json.loads(labels_path.read_text())
    if not paragraphs[-1].endswith('?') or len(paragraphs) != len(labels) + 2:
        raise ValueError(f'{slug}: beat map must match hook, body beats and final question')
    blog = ROOT / 'public/blog' / slug
    title = json.loads((blog / 'meta.json').read_text())['title']
    lines = [f'# Reel Script: {title}', 'format: long-form', 'content-kind: educate', '', '---',
             '## HOOK', f'Narration: {paragraphs[0]}']
    for label, narration in zip(labels, paragraphs[1:-1]):
        lines += ['', '---', f'## OVERLAY: {label.upper()}', f'Narration: {narration}']
    question = paragraphs[-1]
    lines += ['', '---', '## QUESTION', f'Text on screen: {question}', f'Narration: {question}', '']
    value = '\n'.join(lines)
    for name in ('reel-script-approved.md', 'reel-script.md'):
        (blog / name).write_text(value)
    qa_path = blog / 'qa.json'
    if qa_path.exists():
        qa = json.loads(qa_path.read_text())
        for name in ('reel-script-approved.md', 'reel-script.md'):
            qa.setdefault('artifactSha256', {})[name] = hashlib.sha256((blog / name).read_bytes()).hexdigest()
        qa_path.write_text(json.dumps(qa, indent=2) + '\n')


def runtime_ready():
    endpoint = os.environ.get('OLLAMA_LOCAL_BASE_URL', 'http://127.0.0.1:11434')
    try:
        subprocess.run(['curl', '-fsS', '--max-time', '5', f'{endpoint}/api/tags'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        try:
            subprocess.run(['launchctl', 'kickstart', '-k', f'gui/{os.getuid()}/homebrew.mxcl.ollama'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True, timeout=20)
        except (subprocess.SubprocessError, FileNotFoundError):
            return False
        for _ in range(24):
            try:
                subprocess.run(['curl', '-fsS', '--max-time', '2', f'{endpoint}/api/tags'],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                return True
            except (FileNotFoundError, subprocess.CalledProcessError):
                time.sleep(5)
        return False


def published_today(state):
    today = now().astimezone(TIMEZONE).date()
    count = 0
    for record in state['items'].values():
        stamp = record.get('blogPublishedAt')
        if stamp and dt.datetime.fromisoformat(stamp).astimezone(TIMEZONE).date() == today:
            count += 1
    return count


def refresh_operating_reports(queue, state):
    health = queue_health(ROOT, queue.get('posts', []), state, DAILY_TARGET or 3, TIMEZONE.key)
    reports = STATE.parent
    write_report(reports / 'queue-health.json', health)
    write_report(reports / 'throughput.json', throughput_report(state, DAILY_TARGET or 3, TIMEZONE.key))
    if health['alert']:
        marker = reports / 'queue-alert-date.txt'
        alert_date = health['operatingDate']
        if not marker.exists() or marker.read_text().strip() != alert_date:
            log(f"ALERT: {health['message']} Invalid packages: {', '.join(health['invalidPackages']) or 'none'}")
            marker.write_text(alert_date + '\n')


def begin_stage(state, record, name):
    record['currentStage'] = name
    record['currentStageStartedAt'] = now().isoformat()
    record.setdefault('stageMetrics', []).append({'stage': name, 'startedAt': record['currentStageStartedAt']})
    save(state)
    return time.monotonic()


def finish_stage(state, record, started, outcome):
    metrics = record.get('stageMetrics', [])
    if metrics:
        metrics[-1].update(finishedAt=now().isoformat(), elapsedSeconds=round(time.monotonic() - started, 2), outcome=outcome)
    record.pop('currentStage', None)
    record.pop('currentStageStartedAt', None)
    save(state)
    write_report(STATE.parent / 'throughput.json', throughput_report(state, DAILY_TARGET or 3, TIMEZONE.key))


def choose(items, state):
    current = now()
    # The daily target caps new blog publishes only; a post already live
    # may still finish its reel the same day.
    at_cap = DAILY_TARGET > 0 and published_today(state) >= DAILY_TARGET
    for item in items:
        slug = item['slug']
        record = state['items'].setdefault(slug, {'status': 'pending', 'attempts': 0})
        if record.get('releaseReady'):
            continue
        if at_cap and not record.get('blogPublished'):
            continue
        due = record.get('retryAfter')
        if due and dt.datetime.fromisoformat(due) > current:
            continue
        return item, record
    return None, None


def main():
    if not QUEUE.exists():
        print(f'missing draft queue: {QUEUE}', file=sys.stderr)
        return 2
    try:
        LOCK.mkdir()
    except FileExistsError:
        if alive_lock(LOCK):
            log('SKIP: another coin-history draft run owns the lock')
            return 0
        LOCK.rename(LOCK.with_name(f'{LOCK.name}.stale.{int(time.time())}'))
        LOCK.mkdir()
    (LOCK / 'pid').write_text(str(os.getpid()))
    try:
        if alive_lock(Path('/tmp/fused-blog-publisher.lock')) or alive_lock(Path('/tmp/fused-remotion-render.lock')):
            log('DEFER: existing publisher or renderer owns heavy compute')
            return 0
        queue = json.loads(QUEUE.read_text())
        state = load_state()
        state.setdefault('items', {})
        refresh_operating_reports(queue, state)
        item, record = choose(queue['posts'], state)
        if not item:
            if DAILY_TARGET > 0 and published_today(state) >= DAILY_TARGET:
                log(f'CAP: daily target of {DAILY_TARGET} coin-history posts reached')
                return 0
            log('IDLE: no retry-ready coin-history drafts')
            return 0
        slug = item['slug']
        digest = ensure_final_question(slug)
        record.update(status='running', attempts=record.get('attempts', 0) + 1,
                      startedAt=now().isoformat(), transcriptSha256=digest, model=MODEL)
        record.pop('failure', None)
        record.pop('lastExitCode', None)
        record.pop('retryAfter', None)
        save(state)
        log(f'START: {slug} attempt={record["attempts"]} model={MODEL}')
        if not runtime_ready():
            raise RuntimeError('local Ollama service could not be restored')
        env = dict(os.environ)
        env.update({
            'PATH': '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
            'LOCAL_LLM': str(ROOT / 'scripts/ollama-local-no-think.sh'),
            'HERMES_TAKEOVER': '1', 'CLAUDE_ENABLED': '0',
            'HERMES_LOCAL_MODEL': MODEL, 'HERMES_ARTICLE_MODEL': MODEL,
            'HERMES_STRUCTURED_MODEL': MODEL, 'HERMES_QA_MODEL': MODEL,
            'HERMES_LOCAL_BASE_URL': 'http://127.0.0.1:11434/v1',
            'SEGMENTED_LOCAL_MODEL': MODEL, 'SEGMENTED_MODEL_ATTEMPTS': '3',
            'SEGMENTED_MODEL_TIMEOUT_MS': '420000',
        })
        title = item['keyword']
        if not record.get('blogQaPassed'):
            meta_path = ROOT / 'public/blog' / slug / 'meta.json'
            if meta_path.exists():
                meta = json.loads(meta_path.read_text())
                meta['date'] = dt.datetime.now(ZoneInfo('America/Los_Angeles')).date().isoformat()
                meta['modifiedDate'] = meta['date']
                meta_path.write_text(json.dumps(meta, indent=2) + '\n')
            command = ['/bin/bash', 'public/blog/scripts/build-post.sh', slug,
                       '--brand=silver', f'--keyword={title}']
            stage_started = begin_stage(state, record, 'blog_generation_and_qa')
            with LOG.open('a') as stream:
                result = subprocess.run(command, cwd=ROOT, env=env, stdout=stream,
                                        stderr=subprocess.STDOUT, timeout=4 * 60 * 60, check=False)
            qa_path = ROOT / 'public/blog' / slug / 'qa.json'
            status_path = ROOT / 'public/blog' / slug / '_status.json'
            qa = json.loads(qa_path.read_text()) if qa_path.exists() else {}
            stages = json.loads(status_path.read_text()).get('stages', []) if status_path.exists() else []
            passed = result.returncode == 0 and qa.get('pass') is True and qa.get('score', 0) >= 85 \
                and qa.get('mode') == 'coin-history-automated' \
                and {'qa-local-pass', 'qa-brain-pass'}.issubset(set(stages))
            finish_stage(state, record, stage_started, 'passed' if passed else 'failed')
            if not passed:
                blockers = qa.get('blockers', [])
                brain_deferred = 'qa-deferred' in stages
                if qa.get('mode') == 'coin-history-automated' and isinstance(blockers, list) and blockers:
                    plan_path = ROOT / 'public/blog' / slug / 'content-plan.json'
                    plan = json.loads(plan_path.read_text())
                    plan['generationRevision'] = record['attempts']
                    plan['qaFeedback'] = {
                        'previousScore': qa.get('score'),
                        'blockers': [str(value) for value in blockers],
                        'instruction': 'Rewrite only the relevant sections. Remove unsupported facts, remove repeated material, keep the exact title promise and align the reel to the approved narration.',
                    }
                    plan_path.write_text(json.dumps(plan, indent=2) + '\n')
                    save(state)
                record.update(status='retry_wait', lastExitCode=result.returncode,
                              failure=('local brain QA unavailable' if brain_deferred else
                                       qa.get('blockers') or 'draft or automated QA did not pass'))
                delay = (5 if brain_deferred else 30 if qa.get('mode') == 'coin-history-automated'
                         else min(6 * 60, 15 * (2 ** (record['attempts'] - 1))))
                record['retryAfter'] = (now() + dt.timedelta(minutes=delay)).isoformat()
                save(state)
                log(f'DEFER: {slug} exit={result.returncode} attempts={record["attempts"]} retryInMin={delay}')
                return 1
            record.update(blogQaPassed=True, blogQaAt=now().isoformat(), score=qa.get('score'), qaMode=qa.get('mode'))
            save(state)
            log(f'PASS: {slug} automated blog QA score={qa.get("score")}')

        if not record.get('blogPublished'):
            stage_started = begin_stage(state, record, 'blog_deploy_and_live_verification')
            deploy = subprocess.run(['node', 'scripts/deploy-approved-blog.mjs', f'--slug={slug}'],
                                    cwd=ROOT, env=env, timeout=1800, check=False)
            if deploy.returncode:
                raise RuntimeError(f'approved blog deployment failed with exit {deploy.returncode}')
            endpoint = f'https://fuseddistribution.com/blog/{slug}/'
            response = subprocess.run(['curl', '-fsS', '-o', os.devnull, '-w', '%{http_code}',
                                       '--max-time', '30', endpoint], cwd=ROOT, env=env,
                                      capture_output=True, text=True, check=False)
            if response.returncode or response.stdout.strip() != '200':
                raise RuntimeError(f'live blog verification failed ({response.stdout.strip() or response.returncode})')
            record.update(blogPublished=True, blogPublishedAt=now().isoformat(), liveUrl=endpoint)
            finish_stage(state, record, stage_started, 'passed')
            log(f'PASS: {slug} blog live and verified')

        if not record.get('releaseReady'):
            inputs_path = ROOT / 'public/blog' / slug / 'production-inputs.json'
            inputs = json.loads(inputs_path.read_text()) if inputs_path.exists() else {}
            if inputs.get('coinMediaGateVersion') == 1:
                stage_started = begin_stage(state, record, 'coin_image_relevance_double_check')
                check = subprocess.run(['node', 'video/scripts/coin-image-relevance.mjs', f'--slug={slug}'],
                                       cwd=ROOT, env=env, timeout=300, check=False)
                finish_stage(state, record, stage_started, 'passed' if check.returncode == 0 else 'failed')
                if check.returncode:
                    raise RuntimeError('coin image relevance double check did not pass')
            stage_started = begin_stage(state, record, 'reel_render_and_release_qa')
            render_env = dict(env, REEL_SLUG=slug, MAX_RENDERS_PER_RUN='1', REEL_GIT_COMMIT='0', TTS_AUTO_RECOVERY='1')
            with LOG.open('a') as stream:
                result = subprocess.run(['/bin/zsh', 'scripts/render-missing-reels.sh'], cwd=ROOT,
                                        env=render_env, stdout=stream, stderr=subprocess.STDOUT,
                                        timeout=5 * 60 * 60, check=False)
            qa_path = ROOT / 'video/out' / slug / 'release-qa.json'
            release = json.loads(qa_path.read_text()) if qa_path.exists() else {}
            finish_stage(state, record, stage_started, 'passed' if result.returncode == 0 and release.get('readyForPosting') is True else 'failed')
            if result.returncode or release.get('readyForPosting') is not True:
                raise RuntimeError(f'reel render or release QA failed: {release.get("blockers", "no passing release-qa.json")}')
            record.update(releaseReady=True, releaseReadyAt=now().isoformat(), releaseQa=release)
            save(state)
            log(f'PASS: {slug} rendered and release QA passed; existing Buffer refill can pick it up')
        record.update(status='release_ready', completedAt=now().isoformat())
        save(state)
        refresh_operating_reports(queue, state)
        return 0
    except Exception as error:
        state = load_state()
        slug = locals().get('slug')
        if slug:
            record = state.setdefault('items', {}).setdefault(slug, {})
            if record.get('currentStageStartedAt'):
                try:
                    started_at = dt.datetime.fromisoformat(record['currentStageStartedAt'])
                    elapsed = max(0, (now() - started_at).total_seconds())
                    record.setdefault('stageMetrics', [])[-1].update(finishedAt=now().isoformat(), elapsedSeconds=round(elapsed, 2), outcome='failed')
                except (ValueError, IndexError, KeyError):
                    pass
                record.pop('currentStage', None)
                record.pop('currentStageStartedAt', None)
            record.update(status='retry_wait', failure=str(error), lastFailureAt=now().isoformat())
            if 'reel render or release QA failed' in str(error):
                # Retry a blocked local voice or release gate with bounded
                # backoff; each recovery still must pass preflight and final QA.
                delay = min(6 * 60, 30 * (2 ** min(max(0, record.get('attempts', 1) - 1), 4)))
            else:
                delay = min(60, 10 * (2 ** max(0, record.get('attempts', 1) - 1)))
            record['retryAfter'] = (now() + dt.timedelta(minutes=delay)).isoformat()
            save(state)
            try:
                queue = json.loads(QUEUE.read_text())
                refresh_operating_reports(queue, state)
            except (OSError, json.JSONDecodeError):
                pass
        log(f'ERROR: {error}')
        print(error, file=sys.stderr)
        return 1
    finally:
        try:
            LOCK.rename(LOCK.with_name(f'{LOCK.name}.finished.{int(time.time())}'))
        except OSError:
            pass


if __name__ == '__main__':
    raise SystemExit(main())
