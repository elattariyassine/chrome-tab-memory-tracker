import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [16, 48, 128];
const inputFile = join(__dirname, '../public/icons/icon.svg');
const outputDir = join(__dirname, '../dist/icons');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Convert SVG to PNG for each size
sizes.forEach(size => {
  sharp(inputFile)
    .resize(size, size)
    .png()
    .toFile(join(outputDir, `icon${size}.png`))
    .then(() => console.log(`Generated ${size}x${size} icon`))
    .catch(err => console.error(`Error generating ${size}x${size} icon:`, err));
}); 