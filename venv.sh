#!/bin/bash

export VENV_NAME=".venv"

echo "[1] Creating virtual environment..."
python -m venv $VENV_NAME

echo "[2] Activating virtual environment..."
source $VENV_NAME/bin/activate

echo "[3] Installing pakcages..."
pip install -r requirements.txt

echo "Environment ready."