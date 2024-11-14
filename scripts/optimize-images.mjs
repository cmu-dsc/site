import { access, mkdir, readdir } from 'fs/promises';
import { join, parse } from 'path';
import sharp from 'sharp';

const INPUT_DIR = 'public/images/board';
const OUTPUT_DIR = 'public/optimized-images/board';
const TARGET_SIZE = 600;

async function fileExists (path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function optimizeImage (inputPath, outputPath) {
  try {
    if (await fileExists(outputPath)) {
      return;
    }

    const image = sharp(inputPath);
    const metadata = await image.metadata();

    const { width, height } = metadata;
    const newDimensions = width < height
      ? { width: TARGET_SIZE, height: Math.round(height * (TARGET_SIZE / width)) }
      : { width: Math.round(width * (TARGET_SIZE / height)), height: TARGET_SIZE };

    await image
      .resize(newDimensions)
      .webp({ quality: 85 })
      .toFile(outputPath);

    console.log(`✓ Saved: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error processing ${inputPath}:`, error);
  }
}

async function main () {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });

    const files = await readdir(INPUT_DIR);
    const imageFiles = files.filter(file =>
      /\.(jpg|jpeg|png|webp|gif)$/i.test(file)
    );

    for (const file of imageFiles) {
      const inputPath = join(INPUT_DIR, file);
      const { name } = parse(file);
      const outputPath = join(OUTPUT_DIR, `${name}.webp`);

      await optimizeImage(inputPath, outputPath);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();