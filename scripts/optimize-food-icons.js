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
const OUTPUT_BASE_DIR = path.join(__dirname, '../public/food-icons');

// Multiple sizes for different use cases
const SIZES = {
  thumb: { size: 64, quality: 85, dir: 'thumb' },      // Thumbnails, lists
  small: { size: 100, quality: 85, dir: 'small' },     // Cards, compact views
  medium: { size: 200, quality: 80, dir: 'medium' },   // Default display
  large: { size: 400, quality: 75, dir: 'large' }      // Detail views, zoom
};

// Create all output directories
Object.values(SIZES).forEach(config => {
  const dir = path.join(OUTPUT_BASE_DIR, config.dir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Optimize a single image to multiple sizes
async function optimizeImageToAllSizes(inputPath, filename) {
  const results = {};
  
  for (const [sizeName, config] of Object.entries(SIZES)) {
    const outputPath = path.join(OUTPUT_BASE_DIR, config.dir, filename.replace('.png', '.webp'));
    
    try {
      await sharp(inputPath)
        .resize(config.size, config.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .webp({ quality: config.quality })
        .toFile(outputPath);
      
      const outputStats = fs.statSync(outputPath);
      results[sizeName] = {
        success: true,
        size: outputStats.size,
        path: outputPath
      };
    } catch (error) {
      results[sizeName] = {
        success: false,
        error: error.message
      };
    }
  }
  
  return results;
}

// Main optimization function
async function optimizeAllIcons() {
  console.log('=== Multi-Size Image Optimization ===\n');
  console.log(`Input: ${INPUT_DIR}`);
  console.log(`Output: ${OUTPUT_BASE_DIR}`);
  console.log(`Sizes: ${Object.keys(SIZES).join(', ')}\n`);
  
  // Get all PNG files
  const files = fs.readdirSync(INPUT_DIR)
    .filter(file => file.endsWith('.png') && !file.includes('list'));
  
  if (files.length === 0) {
    console.log('No PNG files found to optimize.');
    console.log('Run scrape-all-food-icons.js first!');
    return;
  }
  
  console.log(`Found ${files.length} images to optimize\n`);
  
  let successCount = 0;
  let failCount = 0;
  const sizeStats = {};
  
  // Initialize size stats
  Object.keys(SIZES).forEach(size => {
    sizeStats[size] = { totalSize: 0, count: 0 };
  });
  
  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const inputStats = fs.statSync(inputPath);
    
    process.stdout.write(`Optimizing: ${file}... `);
    
    const results = await optimizeImageToAllSizes(inputPath, file);
    
    // Check if all sizes succeeded
    const allSuccess = Object.values(results).every(r => r.success);
    
    if (allSuccess) {
      successCount++;
      
      // Calculate total savings
      let totalOutputSize = 0;
      Object.entries(results).forEach(([sizeName, result]) => {
        sizeStats[sizeName].totalSize += result.size;
        sizeStats[sizeName].count++;
        totalOutputSize += result.size;
      });
      
      const avgOutputSize = totalOutputSize / Object.keys(SIZES).length;
      const savings = ((1 - avgOutputSize / inputStats.size) * 100).toFixed(1);
      
      console.log(`✓ (avg ${savings}% smaller)`);
    } else {
      failCount++;
      const errors = Object.entries(results)
        .filter(([_, r]) => !r.success)
        .map(([size, r]) => `${size}: ${r.error}`)
        .join(', ');
      console.log(`✗ ${errors}`);
    }
  }
  
  console.log('\n=== Optimization Complete ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  console.log('\nSize breakdown:');
  Object.entries(SIZES).forEach(([sizeName, config]) => {
    const stats = sizeStats[sizeName];
    const avgSize = stats.count > 0 ? (stats.totalSize / stats.count / 1024).toFixed(1) : 0;
    const totalMB = (stats.totalSize / 1024 / 1024).toFixed(2);
    console.log(`  ${sizeName} (${config.size}x${config.size}): ${stats.count} files, avg ${avgSize} KB, total ${totalMB} MB`);
  });
  
  // Update icons-list files to include all sizes
  const iconsListPath = path.join(INPUT_DIR, 'icons-list-complete.json');
  if (fs.existsSync(iconsListPath)) {
    const iconsList = JSON.parse(fs.readFileSync(iconsListPath, 'utf8'));
    const updatedList = iconsList.map(icon => ({
      ...icon,
      filename: icon.filename.replace('.png', '.webp'),
      sizes: {
        thumb: `thumb/${icon.filename.replace('.png', '.webp')}`,
        small: `small/${icon.filename.replace('.png', '.webp')}`,
        medium: `medium/${icon.filename.replace('.png', '.webp')}`,
        large: `large/${icon.filename.replace('.png', '.webp')}`
      },
      optimized: true
    }));
    
    fs.writeFileSync(iconsListPath, JSON.stringify(updatedList, null, 2));
    console.log(`\n✓ Updated icons-list-complete.json with all sizes`);
  }
  
  console.log('\n✓ All images optimized and ready to use!');
  console.log('\nUsage in app:');
  console.log('  - Thumbnails/Lists: /food-icons/thumb/{filename}.webp');
  console.log('  - Cards: /food-icons/small/{filename}.webp');
  console.log('  - Default: /food-icons/medium/{filename}.webp');
  console.log('  - Detail/Zoom: /food-icons/large/{filename}.webp');
}

// Run the script
optimizeAllIcons().catch(console.error);
