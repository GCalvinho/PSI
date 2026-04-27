#!/bin/bash
# Wrapper para o PSI Fetcher — chamado pelo cron
PYTHON="/Library/Developer/CommandLineTools/usr/bin/python3"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$SCRIPT_DIR"
$PYTHON "$SCRIPT_DIR/fetcher.py" >> "$SCRIPT_DIR/fetcher.log" 2>&1
