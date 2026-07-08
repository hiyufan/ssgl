#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/frontend-vue"
pnpm install
pnpm build
echo "BUILD DONE"
