#!/usr/bin/env node

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function chunkMapWithCanvas() {
  const inputPath = '../public/maps/finalmap.png';
  const outputDir = '../public/maps/chunks';
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('Loading map image...');
  
  // Load image
  const image = await loadImage(inputPath);
  console.log(`Image dimensions: ${image.width}x${image.height}`);
  
  // Use 8x8 grid for smaller chunks
  const gridSize = 8;
  const chunkWidth = Math.floor(image.width / gridSize);
  const chunkHeight = Math.floor(image.height / gridSize);
  
  console.log(`Using ${gridSize}x${gridSize} grid`);
  console.log(`Chunk dimensions: ${chunkWidth}x${chunkHeight}`);
  
  const chunks = [];
  
  // Create chunks
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const chunkId = `${col}_${row}`;
      const left = col * chunkWidth;
      const top = row * chunkHeight;
      
      // Calculate actual dimensions (handle edge chunks)
      let width = chunkWidth;
      let height = chunkHeight;
      
      // For the last column, use remaining width
      if (col === gridSize - 1) {
        width = image.width - left;
      }
      
      // For the last row, use remaining height
      if (row === gridSize - 1) {
        height = image.height - top;
      }
      
      console.log(`Creating chunk ${chunkId} at (${left}, ${top}) size ${width}x${height}`);
      
      try {
        // Create canvas for this chunk
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Draw the chunk from the source image
        ctx.drawImage(
          image,
          left, top, width, height,  // source rectangle
          0, 0, width, height        // destination rectangle
        );
        
        // Save as PNG
        const buffer = canvas.toBuffer('image/png');
        const outputPath = path.join(outputDir, `${chunkId}.png`);
        fs.writeFileSync(outputPath, buffer);
        
        // Store chunk metadata
        chunks.push({
          id: chunkId,
          x: col,
          y: row,
          pixelX: left,
          pixelY: top,
          width: width,
          height: height,
          filename: `${chunkId}.png`
        });
        
        console.log(`✓ Chunk ${chunkId} created`);
      } catch (error) {
        console.error(`✗ Failed to create chunk ${chunkId}:`, error.message);
      }
    }
  }
  
  // Generate metadata file
  const metadata_obj = {
    version: 1,
    totalWidth: image.width,
    totalHeight: image.height,
    chunkWidth: chunkWidth,
    chunkHeight: chunkHeight,
    chunksX: gridSize,
    chunksY: gridSize,
    chunks: chunks
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata_obj, null, 2)
  );
  
  console.log('✓ Metadata file created');
  console.log('✓ Map chunking complete!');
  
  // Calculate size reduction
  const originalSize = fs.statSync(inputPath).size;
  const chunksSize = chunks.reduce((total, chunk) => {
    const chunkPath = path.join(outputDir, chunk.filename);
    return total + (fs.existsSync(chunkPath) ? fs.statSync(chunkPath).size : 0);
  }, 0);
  
  console.log(`Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Chunks total size: ${(chunksSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Size difference: ${((chunksSize - originalSize) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Successfully created ${chunks.length} chunks`);
}

if (require.main === module) {
  chunkMapWithCanvas().catch(console.error);
}

module.exports = { chunkMapWithCanvas };