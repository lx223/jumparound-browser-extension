#!/usr/bin/env node

/**
 * Simple icon generator - creates colored placeholder icons
 * For production, replace with actual icon designs
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [16, 48, 128];
const color = '#4285f4'; // Google Blue

function createSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.2}"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${size * 0.6}" fill="white"
        text-anchor="middle" dominant-baseline="central" font-weight="bold">J</text>
</svg>`;
}

sizes.forEach(size => {
  const svg = createSVG(size);
  const outputPath = join(__dirname, '..', 'public', 'icons', `icon${size}.png`);

  console.log(`Note: Generated SVG for ${size}x${size}. Convert to PNG using:`);
  console.log(`  inkscape icon${size}.svg --export-filename=icon${size}.png`);
  console.log(`  or use an online converter\n`);

  writeFileSync(
    join(__dirname, '..', 'public', 'icons', `icon${size}.svg`),
    svg
  );
});

console.log('SVG icons generated in public/icons/');
console.log('Convert them to PNG or add your own icon designs.');
