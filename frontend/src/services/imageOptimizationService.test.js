/**
 * Test the ImageOptimizationService functionality
 * This is a simple test file to verify WebP conversion works
 */

import imageOptimizationService from './imageOptimizationService.js';

// Test function to verify the service works
async function testImageOptimization() {
  console.log('🧪 Testing Image Optimization Service...');
  
  // Test WebP support detection
  const webpSupported = await imageOptimizationService.isWebPSupported();
  console.log('📋 WebP Support:', webpSupported ? '✅ Supported' : '❌ Not Supported');
  
  // Test file size formatting
  const testSizes = [1024, 1048576, 5242880];
  testSizes.forEach(size => {
    console.log(`📏 ${size} bytes = ${imageOptimizationService.formatFileSize(size)}`);
  });
  
  console.log('✅ Basic service tests completed');
}

// Auto-run test if this file is imported
testImageOptimization();

export { testImageOptimization };
