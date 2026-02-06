#!/usr/bin/env node

/**
 * Convert SVG icons to PNG using sharp library
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [16, 48, 128];

console.log('Converting SVG icons to PNG...\n');

async function convertSVGtoPNG() {
  for (const size of sizes) {
    const svgPath = join(__dirname, '..', 'public', 'icons', `icon${size}.svg`);
    const pngPath = join(__dirname, '..', 'public', 'icons', `icon${size}.png`);

    if (!existsSync(svgPath)) {
      console.error(`✗ SVG not found: icon${size}.svg`);
      console.log(`  Run 'npm run generate-icons' first to create SVG files`);
      continue;
    }

    try {
      const svgBuffer = readFileSync(svgPath);

      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(pngPath);

      console.log(`✓ Created icon${size}.png (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to convert icon${size}.svg:`, error.message);
    }
  }

  console.log('\nPNG icons created successfully!');
}

convertSVGtoPNG().catch(console.error);
