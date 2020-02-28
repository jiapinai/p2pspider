#!/usr/bin/env sh
SCRIPT_PATH="$(dirname $0)"
cd "$SCRIPT_PATH"
chmod +x p2pspider-linux-amd64-1.0

./p2pspider-linux-amd64-1.0  -p 6884 -d /data

