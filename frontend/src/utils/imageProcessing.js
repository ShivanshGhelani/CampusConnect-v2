/**
 * Image Processing Utilities
 * Consolidated image manipulation functions for background removal and processing
 */

/**
 * Basic white background removal
 * @param {string} imageSrc - Base64 image source
 * @param {number} tolerance - Color difference tolerance
 * @returns {Promise<string>} - Base64 image with transparent background
 */
export const removeWhiteBackground = (imageSrc, tolerance = 20) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Sample first pixel as background color
      const r0 = data[0], g0 = data[1], b0 = data[2];
      
      // Remove similar colors
      for (let i = 0; i < data.length; i += 4) {
        const diff = Math.sqrt(
          Math.pow(data[i] - r0, 2) + 
          Math.pow(data[i+1] - g0, 2) + 
          Math.pow(data[i+2] - b0, 2)
        );
        if (diff < tolerance) {
          data[i + 3] = 0; // Set alpha to transparent
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = reject;
    img.src = imageSrc;
  });
};

/**
 * Enhanced background removal with shadow detection
 * @param {string} imageSrc - Base64 image source
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Base64 image with transparent background
 */
export const enhancedBackgroundRemoval = (imageSrc, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      tolerance = 30,
      shadowTolerance = 40,
      edgeSmoothing = true,
      removeWhite = true,
      removeTransparent = true,
      removeShadows = true,
      customColor = null,
      shadowDetectionSensitivity = 0.7
    } = options;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Determine background color to remove
        let targetR, targetG, targetB;
        
        if (customColor) {
          [targetR, targetG, targetB] = customColor;
        } else {
          // Sample corners to determine background color
          const corners = [
            [0, 0], // top-left
            [canvas.width - 1, 0], // top-right
            [0, canvas.height - 1], // bottom-left
            [canvas.width - 1, canvas.height - 1] // bottom-right
          ];
          
          let totalR = 0, totalG = 0, totalB = 0;
          corners.forEach(([x, y]) => {
            const idx = (y * canvas.width + x) * 4;
            totalR += data[idx];
            totalG += data[idx + 1];
            totalB += data[idx + 2];
          });
          
          targetR = totalR / 4;
          targetG = totalG / 4;
          targetB = totalB / 4;
        }
        
        // Process pixels
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Calculate color difference
          const colorDiff = Math.sqrt(
            Math.pow(r - targetR, 2) +
            Math.pow(g - targetG, 2) +
            Math.pow(b - targetB, 2)
          );
          
          // Remove background
          if (removeWhite && colorDiff < tolerance) {
            data[i + 3] = 0;
          }
          // Remove transparent pixels
          else if (removeTransparent && a < 10) {
            data[i + 3] = 0;
          }
          // Remove shadows (gray-ish pixels)
          else if (removeShadows) {
            const brightness = (r + g + b) / 3;
            const colorVariance = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
            const isShadow = brightness < 150 && colorVariance < 30;
            
            if (isShadow && colorDiff < shadowTolerance * shadowDetectionSensitivity) {
              data[i + 3] = 0;
            }
          }
        }
        
        // Apply edge smoothing if enabled
        if (edgeSmoothing) {
          smoothEdges(data, canvas.width, canvas.height);
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = reject;
    img.src = imageSrc;
  });
};

/**
 * Smooth edges by blending alpha channel
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 */
const smoothEdges = (data, width, height) => {
  const tempData = new Uint8ClampedArray(data);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Check neighboring pixels
      const neighbors = [
        [(y-1) * width + x], // top
        [(y+1) * width + x], // bottom
        [y * width + (x-1)], // left
        [y * width + (x+1)]  // right
      ];
      
      let transparentCount = 0;
      let opaqueCount = 0;
      
      neighbors.forEach(([nIdx]) => {
        const alphaIdx = nIdx * 4 + 3;
        if (tempData[alphaIdx] === 0) transparentCount++;
        else if (tempData[alphaIdx] === 255) opaqueCount++;
      });
      
      // If pixel is on edge (mix of transparent and opaque neighbors)
      if (transparentCount > 0 && opaqueCount > 0 && tempData[idx + 3] > 0) {
        // Reduce alpha for smoother edge
        data[idx + 3] = Math.floor(tempData[idx + 3] * 0.7);
      }
    }
  }
};

// Make functions available globally for legacy code
if (typeof window !== 'undefined') {
  window.removeWhiteBackground = removeWhiteBackground;
  window.enhancedBackgroundRemoval = enhancedBackgroundRemoval;
}
