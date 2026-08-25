#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_DIR"

chmod +x .githooks/pre-commit .githooks/post-commit .githooks/pre-push
git config core.hooksPath .githooks
echo "Installed Fused Distribution Git hooks from .githooks/"
