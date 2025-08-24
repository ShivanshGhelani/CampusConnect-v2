/**
 * Image Optimization Service
 * Handles image format conversion to WebP with optimization
 * Maintains quality while reducing file size
 */

class ImageOptimizationService {
  constructor() {
    this.defaultQuality = 0.92; // High quality (92%) - no noticeable quality loss
    this.maxWidth = 800; // Maximum width for avatars
    this.maxHeight = 800; // Maximum height for avatars
  }

  /**
   * Check if WebP is supported by the browser
   * @returns {Promise<boolean>}
   */
  isWebPSupported() {
    return new Promise((resolve) => {
      console.log('🔍 Checking WebP support...');
      
      // Check user agent for modern browsers that support WebP
      const userAgent = navigator.userAgent;
      console.log(`🌐 User Agent: ${userAgent}`);
      
      // Chrome 23+, Firefox 65+, Edge 18+, Safari 14+, Opera 12+ support WebP
      const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
      const isFirefox = /Firefox/.test(userAgent);
      const isEdge = /Edg/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isOpera = /OPR/.test(userAgent);
      
      console.log(`� Browser detection: Chrome=${isChrome}, Firefox=${isFirefox}, Edge=${isEdge}, Safari=${isSafari}, Opera=${isOpera}`);
      
      // For Chrome, Firefox, Edge, Opera - force enable WebP
      if (isChrome || isFirefox || isEdge || isOpera) {
        console.log('✅ Modern browser detected - WebP supported');
        console.log('📊 WebP Support Result: true (modern browser)');
        resolve(true);
        return;
      }
      
      // For Safari and others, test with canvas
      console.log('🧪 Testing WebP support with canvas...');
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      const ctx = canvas.getContext('2d');
      
      // Draw a simple pattern
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(0, 0, 2, 2);
      
      try {
        canvas.toBlob((blob) => {
          const canvasSupported = blob && blob.type === 'image/webp' && blob.size > 0;
          console.log(`🎨 Canvas WebP test:`, blob ? {type: blob.type, size: blob.size} : 'No blob created');
          console.log(`📊 WebP Support Result: ${canvasSupported} (canvas test)`);
          resolve(canvasSupported);
        }, 'image/webp', 0.8);
      } catch (error) {
        console.log('❌ Canvas WebP test failed:', error);
        console.log('📊 WebP Support Result: false (canvas failed)');
        resolve(false);
      }
    });
  }

  /**
   * Convert image to WebP format with optimization
   * @param {File|Blob} imageFile - Input image file
   * @param {Object} options - Optimization options
   * @returns {Promise<{file: File, originalSize: number, optimizedSize: number, compressionRatio: string}>}
   */
  async convertToWebP(imageFile, options = {}) {
    const {
      quality = this.defaultQuality,
      maxWidth = this.maxWidth,
      maxHeight = this.maxHeight,
      maintainAspectRatio = true
    } = options;

    return new Promise((resolve, reject) => {
      try {
        const originalSize = imageFile.size;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          try {
            let { width, height } = img;

            // Calculate optimized dimensions while maintaining aspect ratio
            if (maintainAspectRatio) {
              const aspectRatio = width / height;
              
              if (width > maxWidth || height > maxHeight) {
                if (width > height) {
                  width = maxWidth;
                  height = width / aspectRatio;
                } else {
                  height = maxHeight;
                  width = height * aspectRatio;
                }
              }
            } else {
              width = Math.min(width, maxWidth);
              height = Math.min(height, maxHeight);
            }

            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw and resize image
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to WebP with high quality
            console.log('🎨 Converting canvas to WebP blob...');
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  console.error('❌ Canvas toBlob failed - no blob created');
                  reject(new Error('Failed to convert image to WebP'));
                  return;
                }

                console.log('✅ WebP blob created:', {
                  size: blob.size,
                  type: blob.type
                });

                const optimizedSize = blob.size;
                const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100);
                const compressionText = compressionRatio >= 0 
                  ? `${compressionRatio.toFixed(1)}% smaller` 
                  : `${Math.abs(compressionRatio).toFixed(1)}% larger`;

                // Create optimized file
                const webpFileName = this.generateWebPFileName(imageFile.name);
                console.log('📁 Creating WebP file:', webpFileName);
                
                const optimizedFile = new File(
                  [blob], 
                  webpFileName,
                  { 
                    type: 'image/webp',
                    lastModified: Date.now()
                  }
                );

                console.log('📊 Optimization results:', {
                  originalSize: originalSize,
                  optimizedSize: optimizedSize,
                  compressionRatio: compressionText,
                  dimensions: { width: Math.round(width), height: Math.round(height) },
                  fileName: webpFileName,
                  sizeDifference: optimizedSize - originalSize
                });

                resolve({
                  file: optimizedFile,
                  originalSize,
                  optimizedSize,
                  compressionRatio: compressionText,
                  dimensions: { width: Math.round(width), height: Math.round(height) }
                });
              },
              'image/webp',
              quality
            );
          } catch (error) {
            reject(new Error(`Canvas processing failed: ${error.message}`));
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image for conversion'));
        };

        // Load image from file/blob
        if (imageFile instanceof File || imageFile instanceof Blob) {
          const reader = new FileReader();
          reader.onload = (e) => {
            img.src = e.target.result;
          };
          reader.onerror = () => {
            reject(new Error('Failed to read image file'));
          };
          reader.readAsDataURL(imageFile);
        } else {
          reject(new Error('Invalid input: Expected File or Blob'));
        }
      } catch (error) {
        reject(new Error(`Image conversion failed: ${error.message}`));
      }
    });
  }

  /**
   * Optimize avatar image specifically for upload
   * @param {File|Blob} avatarFile - Avatar image file
   * @returns {Promise<{file: File, stats: Object}>}
   */
  async optimizeAvatar(avatarFile) {
    try {
      console.log('🚀 Starting avatar optimization...');
      console.log('📋 Input file:', {
        name: avatarFile.name,
        size: avatarFile.size,
        type: avatarFile.type
      });
      
      // Check WebP support
      const webpSupported = await this.isWebPSupported();
      console.log('🖼️ WebP supported:', webpSupported);
      
      if (!webpSupported) {
        console.warn('⚠️ WebP not supported, falling back to original format');
        return {
          file: avatarFile,
          stats: {
            originalSize: avatarFile.size,
            optimizedSize: avatarFile.size,
            compressionRatio: '0%',
            format: 'original',
            webpSupported: false
          }
        };
      }

      // Avatar-specific optimization settings
      const avatarOptions = {
        quality: 0.85, // Reduce quality from 95% to 85% for better compression
        maxWidth: 400,  // Optimal size for avatars
        maxHeight: 400,
        maintainAspectRatio: true
      };

      console.log('🔧 Converting to WebP with options:', avatarOptions);
      const result = await this.convertToWebP(avatarFile, avatarOptions);
      console.log('✅ WebP conversion completed successfully');

      return {
        file: result.file,
        stats: {
          originalSize: result.originalSize,
          optimizedSize: result.optimizedSize,
          compressionRatio: result.compressionRatio,
          dimensions: result.dimensions,
          format: 'webp',
          webpSupported: true
        }
      };
    } catch (error) {
      console.error('❌ Avatar optimization failed:', error);
      console.error('📚 Error stack:', error.stack);
      throw new Error(`Failed to optimize avatar: ${error.message}`);
    }
  }

  /**
   * Generate WebP filename from original filename
   * @param {string} originalName - Original filename
   * @returns {string} WebP filename
   */
  generateWebPFileName(originalName) {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    return `${nameWithoutExt}_optimized_${timestamp}.webp`;
  }

  /**
   * Batch optimize multiple images
   * @param {File[]} imageFiles - Array of image files
   * @param {Object} options - Optimization options
   * @returns {Promise<Array>} Array of optimization results
   */
  async batchOptimize(imageFiles, options = {}) {
    const results = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      try {
        const result = await this.convertToWebP(imageFiles[i], options);
        results.push({
          index: i,
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message,
          originalFile: imageFiles[i]
        });
      }
    }

    return results;
  }

  /**
   * Get image information without conversion
   * @param {File|Blob} imageFile - Image file
   * @returns {Promise<Object>} Image information
   */
  async getImageInfo(imageFile) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: imageFile.size,
          type: imageFile.type,
          name: imageFile.name || 'blob'
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for analysis'));
      };

      if (imageFile instanceof File || imageFile instanceof Blob) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
        };
        reader.readAsDataURL(imageFile);
      }
    });
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create and export singleton instance
const imageOptimizationService = new ImageOptimizationService();

// Export both the service instance and the class
export default imageOptimizationService;
export { ImageOptimizationService };

// Export individual methods for convenience
export const {
  convertToWebP,
  optimizeAvatar,
  isWebPSupported,
  getImageInfo,
  formatFileSize,
  batchOptimize
} = imageOptimizationService;
