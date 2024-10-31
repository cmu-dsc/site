import os
from pathlib import Path

from PIL import Image

# Configuration
INPUT_DIR = "public/images/board"
OUTPUT_DIR = "public/optimized-images/board"
TARGET_SIZE = (600, 600)  # This is larger than needed (300x300) to account for high-DPI displays


def optimize_image(input_path, output_path):
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with Image.open(input_path) as img:
        # Keep transparency for RGBA images
        # Calculate dimensions maintaining aspect ratio
        width, height = img.size

        # Calculate new dimensions where smaller side is TARGET_SIZE
        if width < height:
            new_width = TARGET_SIZE[0]
            new_height = int(height * (TARGET_SIZE[0] / width))
        else:
            new_height = TARGET_SIZE[1]
            new_width = int(width * (TARGET_SIZE[1] / height))

        # Resize image
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Save as WebP, preserving transparency if present
        img.save(output_path, "WEBP", quality=85)


def main():
    input_dir = Path(INPUT_DIR)
    output_dir = Path(OUTPUT_DIR)

    # Create output directory if it doesn't exist
    output_dir.mkdir(parents=True, exist_ok=True)

    # Process all images in input directory
    for input_path in input_dir.glob("*"):
        if input_path.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif", ".webp"):
            output_path = output_dir / f"{input_path.stem}.webp"
            print(f"Processing: {input_path.name}")
            optimize_image(str(input_path), str(output_path))
            print(f"Saved to: {output_path.name}")


if __name__ == "__main__":
    main()
