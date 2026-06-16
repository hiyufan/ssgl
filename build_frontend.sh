#!/bin/bash
set -e
cd /tmp/ssgl/frontend-vite
node node_modules/.bin/tsc -b 2>&1
node node_modules/.bin/vite build 2>&1
echo "BUILD DONE"
