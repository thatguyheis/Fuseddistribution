"""Bootstrap an explicit RunAtLoad job without launchctl submit restart behavior."""
import argparse
import os
import pathlib
import plistlib
import re
import subprocess


def job_config(label, command, log):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+', label) or not command:
        raise ValueError('A safe label and command are required')
    return {'Label': label, 'ProgramArguments': command, 'RunAtLoad': True,
            'KeepAlive': False, 'ProcessType': 'Background',
            'StandardOutPath': log, 'StandardErrorPath': log,
            'EnvironmentVariables': {'PATH': '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--label', required=True)
    parser.add_argument('--log', required=True)
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ['--'] else args.command
    config = job_config(args.label, command, args.log)
    folder = pathlib.Path(__file__).resolve().parent.parent / '.workflow-state/one-shot-jobs'
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / (args.label + '.plist')
    # Preserve a prior job rather than overwrite an unknown owner.
    with path.open('xb') as handle:
        plistlib.dump(config, handle)
    subprocess.run(['launchctl', 'bootstrap', f'gui/{os.getuid()}', str(path)], check=True, timeout=30)


if __name__ == '__main__':
    main()
