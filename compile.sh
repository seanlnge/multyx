#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Change to the script's directory
cd "$SCRIPT_DIR"

# Compile client
cd client && npm run build

# Compile server
cd ../server && npm run build

# Return to original directory
cd "$SCRIPT_DIR" 