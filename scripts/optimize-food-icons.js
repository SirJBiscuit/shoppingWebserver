/**
 * Script to optimize downloaded food icons
 * Converts 400x400 PNG to 200x200 WebP for better performance
 * 
 * Usage: npm install sharp (if not installed)
 *        node scripts/optimize-food-icons.js
 */

const fs = require('fs');
const path = require('path');

// Try to require sharp, provide helpful error if not installed
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('ERROR: sharp module not found!');
  console.error('Please install it with: npm install sharp');
  process.exit(1);
}

// Configuration
const INPUT_DIR = path.join(__dirname, '../public/food-icons');
const OUTPUT_DIR = path.join(__dirname, '../public/food-icons/optimized');
const TARGET_SIZE = 200; // 200x200 pixels
const QUALITY = 80; // WebP quality (0-100)

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created directory: ${OUTPUT_DIR}`);
}

// Optimize a single image
async function optimizeImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .resize(TARGET_SIZE, TARGET_SIZE, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
      })
      .webp({ quality: QUALITY })
      .toFile(outputPath);
    
    const inputStats = fs.statSync(inputPath);
    const outputStats = fs.statSync(outputPath);
    const savings = ((1 - outputStats.size / inputStats.size) * 100).toFixed(1);
    
    return {
      success: true,
      inputSize: inputStats.size,
      outputSize: outputStats.size,
      savings: savings
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Main optimization function
async function optimizeAllIcons() {
  console.log('Starting image optimization...');
  console.log(`Input: ${INPUT_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Target size: ${TARGET_SIZE}x${TARGET_SIZE}`);
  console.log(`Quality: ${QUALITY}%\n`);
  
  // Get all PNG files
  const files = fs.readdirSync(INPUT_DIR)
    .filter(file => file.endsWith('.png') && file !== 'icons-list.json');
  
  if (files.length === 0) {
    console.log('No PNG files found to optimize.');
    console.log('Run download-food-icons.js first!');
    return;
  }
  
  console.log(`Found ${files.length} images to optimize\n`);
  
  let successCount = 0;
  let failCount = 0;
  let totalInputSize = 0;
  let totalOutputSize = 0;
  
  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputFilename = file.replace('.png', '.webp');
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    
    process.stdout.write(`Optimizing: ${file}... `);
    
    const result = await optimizeImage(inputPath, outputPath);
    
    if (result.success) {
      successCount++;
      totalInputSize += result.inputSize;
      totalOutputSize += result.outputSize;
      console.log(`✓ (${result.savings}% smaller)`);
    } else {
      failCount++;
      console.log(`✗ ${result.error}`);
    }
  }
  
  const totalSavings = ((1 - totalOutputSize / totalInputSize) * 100).toFixed(1);
  
  console.log('\n=== Optimization Complete ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total input size: ${(totalInputSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total output size: ${(totalOutputSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total savings: ${totalSavings}%`);
  
  // Update icons-list.json to use WebP filenames
  const iconsListPath = path.join(INPUT_DIR, 'icons-list.json');
  if (fs.existsSync(iconsListPath)) {
    const iconsList = JSON.parse(fs.readFileSync(iconsListPath, 'utf8'));
    const updatedList = iconsList.map(icon => ({
      ...icon,
      filename: icon.filename.replace('.png', '.webp'),
      optimized: true
    }));
    
    fs.writeFileSync(iconsListPath, JSON.stringify(updatedList, null, 2));
    console.log(`\nUpdated icons-list.json with WebP filenames`);
  }
}

// Run the script
optimizeAllIcons().catch(console.error);
