#!/bin/zsh
cd "$(dirname "$0")"
python3 -m http.server 5173 --bind 127.0.0.1
