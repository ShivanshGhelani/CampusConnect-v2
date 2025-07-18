import React, { useState, useRef, useEffect } from 'react'
import CodeEditor from './CodeEditor'
import PreviewPanel from './PreviewPanel'

const MainPanel = ({
  currentView,
  htmlCode,
  cssFramework,
  pageOrientation,
  onViewChange,
  onCodeChange,
  onFrameworkChange,
  onOrientationChange
}) => {
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const dropdownRef = useRef(null)

  // Editor settings state
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    theme: 'vs-light',
    tabSize: 4,
    wordWrap: 'on',
    minimap: true,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    cursorStyle: 'line',
    fontFamily: 'SF Mono, Monaco, Menlo, monospace'
  })

  // Theme options
  const themes = [
    { value: 'vs-light', label: 'Light' },
    { value: 'vs-dark', label: 'Dark' },
    { value: 'hc-black', label: 'High Contrast' },
    { value: 'github', label: 'GitHub' }
  ]

  const fontFamilies = [
    { value: 'SF Mono, Monaco, Menlo, monospace', label: 'SF Mono' },
    { value: 'Consolas, Monaco, monospace', label: 'Consolas' },
    { value: 'Fira Code, monospace', label: 'Fira Code' },
    { value: 'JetBrains Mono, monospace', label: 'JetBrains Mono' }
  ]

  const cursorStyles = [
    { value: 'line', label: 'Line' },
    { value: 'block', label: 'Block' },
    { value: 'underline', label: 'Underline' }
  ]

  const updateEditorSettings = (newSettings) => {
    setEditorSettings(prev => ({ ...prev, ...newSettings }))
  }

  const handleViewToggle = (view) => {
    if (view === currentView) return
    
    setIsToggling(true)
    setTimeout(() => {
      onViewChange(view)
      setIsToggling(false)
    }, 150)
  }

  const handleBack = () => {
    window.history.back()
  }

  const handleOpenInNewTab = () => {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(htmlCode)
      newWindow.document.close()
    }
  }

  const handleExportPDF = () => {
    console.log('Export as PDF')
    setShowExportDropdown(false)
  }

  const handleExportPNG = () => {
    console.log('Export as PNG')
    setShowExportDropdown(false)
  }

  const handleExportHTML = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'certificate.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportDropdown(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Modern Clean Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left - Navigation & Branding */}
          <div className="flex items-center space-x-6">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Certificate Studio</h1>
                <p className="text-sm text-gray-500">Design professional certificates</p>
              </div>
            </div>
          </div>

          {/* Center - View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => handleViewToggle('editor')}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentView === 'editor'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Code Editor</span>
              </div>
            </button>
            <button
              onClick={() => handleViewToggle('preview')}
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentView === 'preview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
                <span>Live Preview</span>
              </div>
            </button>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleOpenInNewTab}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open in New Tab"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium flex items-center space-x-2 shadow-lg shadow-blue-600/25"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>Export</span>
                <svg className={`w-3 h-3 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {showExportDropdown && (
                <div className="absolute top-full right-0 mt-3 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                  <div className="py-2">
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Export as PDF</div>
                        <div className="text-xs text-gray-500">High quality document</div>
                      </div>
                    </button>
                    <button
                      onClick={handleExportPNG}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Export as PNG</div>
                        <div className="text-xs text-gray-500">Image format</div>
                      </div>
                    </button>
                    <button
                      onClick={handleExportHTML}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Export as HTML</div>
                        <div className="text-xs text-gray-500">Web format</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Editor Settings"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Modern Properties Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Properties</h2>
            <p className="text-sm text-gray-600 mt-1">Configure your certificate design</p>
          </div>

          {/* Properties Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Framework Selection */}
            <div className="space-y-4">
              <label className="text-gray-900 text-sm font-semibold uppercase tracking-wider">CSS Framework</label>
              <div className="space-y-3">
                <button
                  onClick={() => onFrameworkChange('tailwind')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    cssFramework === 'tailwind'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C7.666,17.818,9.027,19.2,12.001,19.2c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C10.337,13.382,8.976,12,6.001,12z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Tailwind CSS</div>
                      <div className="text-sm text-gray-600">Utility-first framework</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => onFrameworkChange('bootstrap')}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    cssFramework === 'bootstrap'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6.002,4.546L3.78,6.768c-0.291,0.291-0.291,0.762,0,1.053l2.222,2.222c0.291,0.291,0.762,0.291,1.053,0l2.222-2.222 c0.291-0.291,0.291-0.762,0-1.053L7.055,4.546C6.764,4.255,6.293,4.255,6.002,4.546z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Bootstrap</div>
                      <div className="text-sm text-gray-600">Component library</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Page Format */}
            <div className="space-y-4">
              <label className="text-gray-900 text-sm font-semibold uppercase tracking-wider">Page Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onOrientationChange('portrait')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    pageOrientation === 'portrait'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-10 border-2 border-current rounded-lg"></div>
                    <span className="text-sm font-medium text-gray-900">Portrait</span>
                  </div>
                </button>
                <button
                  onClick={() => onOrientationChange('landscape')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    pageOrientation === 'landscape'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-10 h-8 border-2 border-current rounded-lg"></div>
                    <span className="text-sm font-medium text-gray-900">Landscape</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <label className="text-gray-900 text-sm font-semibold uppercase tracking-wider">Quick Actions</label>
              <div className="space-y-3">
                <button
                  onClick={handleOpenInNewTab}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-xl transition-all text-gray-900 text-left"
                >
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    </svg>
                    <span className="font-medium">Open in New Tab</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden">
          {/* Canvas Content */}
          <div className={`h-full transition-all duration-300 ${isToggling ? 'opacity-70' : 'opacity-100'}`}>
            {/* Editor View */}
            <div className={`h-full ${currentView === 'editor' ? 'block' : 'hidden'}`}>
              <div className="h-full bg-white">
                <CodeEditor
                  htmlCode={htmlCode}
                  onCodeChange={onCodeChange}
                  cssFramework={cssFramework}
                  pageOrientation={pageOrientation}
                  editorSettings={editorSettings}
                />
              </div>
            </div>

            {/* Preview View */}
            <div className={`h-full ${currentView === 'preview' ? 'block' : 'hidden'}`}>
              <div className="h-full bg-gray-100 flex items-center justify-center p-8">
                <div className="bg-white rounded-xl shadow-2xl overflow-hidden" style={{
                  width: pageOrientation === 'portrait' ? '595px' : '842px',
                  height: pageOrientation === 'portrait' ? '842px' : '595px',
                  maxWidth: '90%',
                  maxHeight: '90%'
                }}>
                  <PreviewPanel
                    htmlCode={htmlCode}
                    cssFramework={cssFramework}
                    pageOrientation={pageOrientation}
                    onOpenInNewTab={handleOpenInNewTab}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Editor Settings</h3>
                  <p className="text-sm text-gray-500">Customize your coding experience</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* Theme */}
              <div className="space-y-3">
                <label className="text-gray-900 text-sm font-semibold">Editor Theme</label>
                <select
                  value={editorSettings.theme}
                  onChange={(e) => updateEditorSettings({ theme: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {themes.map(theme => (
                    <option key={theme.value} value={theme.value}>{theme.label}</option>
                  ))}
                </select>
              </div>

              {/* Font Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-gray-900 text-sm font-semibold">Font Size</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">{editorSettings.fontSize}px</span>
                      <input
                        type="range"
                        min="10"
                        max="24"
                        value={editorSettings.fontSize}
                        onChange={(e) => updateEditorSettings({ fontSize: parseInt(e.target.value) })}
                        className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-gray-900 text-sm font-semibold">Tab Size</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">{editorSettings.tabSize}</span>
                      <input
                        type="range"
                        min="2"
                        max="8"
                        value={editorSettings.tabSize}
                        onChange={(e) => updateEditorSettings({ tabSize: parseInt(e.target.value) })}
                        className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Font Family */}
              <div className="space-y-3">
                <label className="text-gray-900 text-sm font-semibold">Font Family</label>
                <select
                  value={editorSettings.fontFamily}
                  onChange={(e) => updateEditorSettings({ fontFamily: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {fontFamilies.map(font => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>

              {/* Editor Options */}
              <div className="space-y-4">
                <h4 className="text-gray-900 text-sm font-semibold">Editor Options</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-700 text-sm font-medium">Word Wrap</span>
                    <button
                      onClick={() => updateEditorSettings({ wordWrap: editorSettings.wordWrap === 'on' ? 'off' : 'on' })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editorSettings.wordWrap === 'on' ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editorSettings.wordWrap === 'on' ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-700 text-sm font-medium">Minimap</span>
                    <button
                      onClick={() => updateEditorSettings({ minimap: !editorSettings.minimap })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editorSettings.minimap ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editorSettings.minimap ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-700 text-sm font-medium">Line Numbers</span>
                    <button
                      onClick={() => updateEditorSettings({ lineNumbers: editorSettings.lineNumbers === 'on' ? 'off' : 'on' })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editorSettings.lineNumbers === 'on' ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editorSettings.lineNumbers === 'on' ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-700 text-sm font-medium">Cursor Style</span>
                    <select
                      value={editorSettings.cursorStyle}
                      onChange={(e) => updateEditorSettings({ cursorStyle: e.target.value })}
                      className="bg-gray-100 border border-gray-200 rounded-lg text-gray-900 text-sm px-2 py-1"
                    >
                      {cursorStyles.map(style => (
                        <option key={style.value} value={style.value}>{style.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-5 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => {
                  const defaultSettings = {
                    fontSize: 14,
                    theme: 'vs-light',
                    tabSize: 4,
                    wordWrap: 'on',
                    minimap: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    cursorStyle: 'line',
                    fontFamily: 'SF Mono, Monaco, Menlo, monospace'
                  }
                  updateEditorSettings(defaultSettings)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Reset Defaults
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MainPanel
