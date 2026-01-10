#!/bin/bash

cd "$(dirname "$0")/.." || exit

if [ ! -d "venv" ]; then
    echo "Creating Python local environment..."
    python3 -m venv venv
    echo "Installing Python dependencies..."
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

python3 api/flask_dev.py

