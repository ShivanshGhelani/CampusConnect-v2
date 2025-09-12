/**
 * WebP Support Testing Utility
 * Quick test to verify WebP functionality
 */

export const testWebPSupport = async () => {
  try {
    
    
    // Test WebP support using same method as service
    const webP = new Image();
    const webpSupported = await new Promise((resolve) => {
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==';
    });
    
    
    
    // Test canvas WebP conversion
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Draw a simple shape
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, 100, 100);
    
    // Try to convert to WebP
    const webpBlob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.9);
    });
    
    console.log('🎨 Canvas WebP conversion:', {
      success: !!webpBlob,
      size: webpBlob?.size,
      type: webpBlob?.type
    });
    
    return {
      webpSupported,
      canvasWebP: !!webpBlob,
      blobSize: webpBlob?.size,
      blobType: webpBlob?.type
    };
    
  } catch (error) {
    
    return {
      webpSupported: false,
      canvasWebP: false,
      error: error.message
    };
  }
};

// Test function that can be called from console
window.testWebP = testWebPSupport;
