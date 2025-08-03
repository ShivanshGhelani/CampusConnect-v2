import { useEffect, useRef, useState } from 'react'
import { generateCompleteHTML } from './utils/boilerplateTemplates'

const PreviewPanel = ({ htmlCode, cssFramework, pageOrientation, onOpenInNewTab }) => {
  const iframeRef = useRef(null)
  const containerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [scale, setScale] = useState(0.6) // Default scale for optimal certificate view

  // Calculate optimal scale for A4 page with better certificate visibility
  const calculateScale = () => {
    if (!containerRef.current) return 0.6
    
    const container = containerRef.current
    const containerWidth = container.clientWidth - 32 // Account for padding (p-2 = 8px each side)
    const containerHeight = container.clientHeight - 32 // Account for py-4 = 16px each side
    
    // A4 dimensions in pixels (96 DPI)
    const a4Width = pageOrientation === 'portrait' ? 794 : 1123
    const a4Height = pageOrientation === 'portrait' ? 1123 : 794
    
    // For portrait mode, use a fixed optimal scale that matches the perfect view
    if (pageOrientation === 'portrait') {
      // Calculate what scale would fit nicely in the container
      const scaleX = containerWidth / a4Width
      const scaleY = containerHeight / a4Height
      const calculatedScale = Math.min(scaleX, scaleY)
      
      // Use a scale that provides the perfect view as shown in the screenshot
      // Ensure it's between 0.55-0.65 for optimal certificate visibility
      return Math.min(Math.max(calculatedScale, 0.55), 0.65)
    } else {
      // For landscape, use normal responsive scaling
      const scaleX = containerWidth / a4Width
      const scaleY = containerHeight / a4Height
      const optimalScale = Math.min(scaleX, scaleY)
      return Math.min(Math.max(optimalScale, 0.4), 0.9)
    }
  }

  // Update scale when orientation changes or container resizes
  useEffect(() => {
    const updateScale = () => {
      const newScale = calculateScale()
      console.log('Calculated scale:', newScale, 'for orientation:', pageOrientation)
      setScale(newScale)
    }
    
    // Small delay to ensure container is properly sized
    const timer = setTimeout(updateScale, 100)
    
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateScale, 100)
    })
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
    }
  }, [pageOrientation])

  // Generate complete HTML for preview
  useEffect(() => {
    const completeHTML = generateCompleteHTML(cssFramework, pageOrientation, htmlCode)
    
    // Add additional CSS to prevent overflow and scrollbars
    const enhancedHTML = completeHTML.replace(
      '</head>',
      `
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden !important;
          box-sizing: border-box;
        }
        
        body {
          ${pageOrientation === 'portrait' 
            ? 'max-width: 210mm; max-height: 297mm;' 
            : 'max-width: 297mm; max-height: 210mm;'
          }
          overflow: hidden !important;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        * {
          box-sizing: border-box;
        }
        
        /* Hide any scrollbars */
        ::-webkit-scrollbar {
          display: none;
        }
        
        /* Ensure content fits within page */
        .certificate-container {
          overflow: hidden !important;
          max-width: 100%;
          max-height: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100vw;
          height: 100vh;
        }
        
        .certificate {
          max-width: 100%;
          max-height: 100%;
          overflow: hidden;
        }
      </style>
      </head>`
    )
    
    setPreviewContent(enhancedHTML)
    
    // Store in global for new tab functionality - update immediately
    window.previewContent = enhancedHTML
    
    // Update any existing new tab windows
    if (window.previewWindows) {
      window.previewWindows.forEach(win => {
        if (!win.closed) {
          try {
            win.document.open()
            win.document.write(enhancedHTML)
            win.document.close()
          } catch (e) {
            // Window might be closed or from different origin
          }
        }
      })
    }
    
    // Update iframe content
    if (iframeRef.current) {
      setIsLoading(true)
      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow.document
      
      doc.open()
      doc.write(enhancedHTML)
      doc.close()
      
      // Handle iframe load and apply additional styles
      iframe.onload = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
          if (iframeDoc && iframeDoc.body) {
            // Apply inline styles to ensure no overflow
            iframeDoc.body.style.overflow = 'hidden'
            iframeDoc.documentElement.style.overflow = 'hidden'
            iframeDoc.body.style.margin = '0'
            iframeDoc.body.style.padding = '0'
          }
        } catch (e) {
          console.log('Cannot access iframe content due to security restrictions')
        }
        setIsLoading(false)
      }
    }
  }, [htmlCode, cssFramework, pageOrientation])

  // Handle opening preview in new tab
  const handleOpenInNewTab = () => {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(previewContent)
      newWindow.document.close()
      
      // Track the window for updates
      if (!window.previewWindows) {
        window.previewWindows = []
      }
      window.previewWindows.push(newWindow)
      
      // Clean up closed windows
      window.previewWindows = window.previewWindows.filter(win => !win.closed)
      
      onOpenInNewTab && onOpenInNewTab()
    }
  }

  // Handle zoom controls with improved functionality
  const handleZoomIn = () => {
    setScale(prevScale => {
      const newScale = Math.min(prevScale + 0.1, 2.0) // Allow up to 200%
      console.log('Zoom In: from', prevScale, 'to', newScale)
      return newScale
    })
  }

  const handleZoomOut = () => {
    setScale(prevScale => {
      const newScale = Math.max(prevScale - 0.1, 0.2) // Minimum 20%
      console.log('Zoom Out: from', prevScale, 'to', newScale)
      return newScale
    })
  }

  const handleZoomReset = () => {
    const newScale = calculateScale()
    console.log('Zoom Reset to:', newScale)
    setScale(newScale)
  }

  // Add keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault()
            handleZoomIn()
            break
          case '-':
            e.preventDefault()
            handleZoomOut()
            break
          case '0':
            e.preventDefault()
            handleZoomReset()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle refresh preview
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true)
      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow.document
      
      doc.open()
      doc.write(previewContent)
      doc.close()
      
      // Apply overflow hidden after load
      iframe.onload = () => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
          if (iframeDoc && iframeDoc.body) {
            iframeDoc.body.style.overflow = 'hidden'
            iframeDoc.documentElement.style.overflow = 'hidden'
          }
        } catch (e) {
          console.log('Cannot access iframe content due to security restrictions')
        }
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Preview Content - A4 Page View with proper scrolling */}
      <div 
        ref={containerRef}
        className="flex-1 bg-gray-200 overflow-auto p-2"
      >
        <div className="min-h-full flex items-start justify-center py-4">
          {/* A4 Page Container with proper dimensions and scrolling support */}
          <div 
            className="bg-white shadow-xl border border-gray-400 relative rounded overflow-hidden"
            style={{
              // A4 dimensions in pixels (at 96 DPI: 1mm = 3.78px)
              width: pageOrientation === 'portrait' ? '794px' : '1123px',
              height: pageOrientation === 'portrait' ? '1123px' : '794px',
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.3s ease-in-out',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)',
              flexShrink: 0,
              maxWidth: 'none',
              maxHeight: 'none',
              marginBottom: `${Math.max(50, 50 / scale)}px`, // Ensure minimum margin
            }}
          >
            {/* Page content iframe with no scrollbars */}
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0 block rounded"
              title="HTML Preview"
              sandbox="allow-scripts allow-same-origin"
              scrolling="no"
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
                backgroundColor: 'white',
                borderRadius: '4px',
                overflow: 'hidden',
                border: 'none',
              }}
            />
            
            {/* Page info overlay */}
            <div 
              className="absolute text-xs text-gray-600 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-gray-200"
              style={{
                top: `-${35 / scale}px`,
                left: '0',
                transform: `scale(${1 / scale})`,
                transformOrigin: 'left center',
                whiteSpace: 'nowrap',
              }}
            >
              A4 {pageOrientation} • {pageOrientation === 'portrait' ? '210×297mm' : '297×210mm'} • {Math.round(scale * 100)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreviewPanel
