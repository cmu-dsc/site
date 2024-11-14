#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: ./convert_audio.sh <input_audio_file>"
    exit 1
fi

input_file="$1"
output_dir="public/audio"
filename=$(basename "$input_file")
filename_no_ext="${filename%.*}"

# Create output directory if it doesn't exist
mkdir -p "$output_dir"

# Convert to opus
opusenc --bitrate 20k --speech --comp 10 "$input_file" "$output_dir/$filename_no_ext.opus"