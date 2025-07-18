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
  const [isToggling, setIsToggling] = useState(false)
  const [activeTab, setActiveTab] = useState('code') // 'code', 'settings'
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
    fontFamily: 'SF Mono, Monaco, Menlo, monospace',
    // Additional VS Code-like settings
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: true,
    bracketMatching: 'always',
    folding: true,
    smoothScrolling: true,
    cursorSmoothCaretAnimation: true,
    renderWhitespace: 'none',
    renderControlCharacters: false,
    showFoldingControls: 'always',
    matchBrackets: 'always',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoSurround: 'languageDefined',
    snippetSuggestions: 'top',
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    acceptSuggestionOnCommitCharacter: true,
    wordBasedSuggestions: true,
    parameterHints: true,
    codeLens: true,
    colorDecorators: true,
    linkedEditing: true,
    multiCursorModifier: 'alt',
    selectionHighlight: true,
    occurrencesHighlight: true,
    renderLineHighlightOnlyWhenFocus: false,
    hideCursorInOverviewRuler: false,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      handleMouseWheel: true
    },
    find: {
      autoFindInSelection: 'never',
      seedSearchStringFromSelection: 'always',
      addExtraSpaceOnTop: true
    }
  })

  // Theme options
  const themes = [
    { value: 'vs-light', label: 'Light (Visual Studio)' },
    { value: 'vs-dark', label: 'Dark (Visual Studio)' },
    { value: 'hc-black', label: 'High Contrast Dark' },
    { value: 'hc-light', label: 'High Contrast Light' }
  ]

  const fontFamilies = [
    { value: 'SF Mono, Monaco, Menlo, monospace', label: 'SF Mono' },
    { value: 'Consolas, "Courier New", monospace', label: 'Consolas' },
    { value: 'Fira Code, monospace', label: 'Fira Code (Ligatures)' },
    { value: 'JetBrains Mono, monospace', label: 'JetBrains Mono' },
    { value: 'Source Code Pro, monospace', label: 'Source Code Pro' },
    { value: 'Menlo, Monaco, "Courier New", monospace', label: 'Menlo' },
    { value: '"Cascadia Code", monospace', label: 'Cascadia Code' }
  ]

  const cursorStyles = [
    { value: 'line', label: 'Line' },
    { value: 'block', label: 'Block' },
    { value: 'underline', label: 'Underline' },
    { value: 'line-thin', label: 'Line (Thin)' },
    { value: 'block-outline', label: 'Block Outline' },
    { value: 'underline-thin', label: 'Underline (Thin)' }
  ]

  const whitespaceOptions = [
    { value: 'none', label: 'None' },
    { value: 'boundary', label: 'Boundary' },
    { value: 'selection', label: 'Selection' },
    { value: 'trailing', label: 'Trailing' },
    { value: 'all', label: 'All' }
  ]

  const lineHighlightOptions = [
    { value: 'none', label: 'None' },
    { value: 'gutter', label: 'Gutter' },
    { value: 'line', label: 'Line' },
    { value: 'all', label: 'All' }
  ]

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

  const handleViewToggle = (view) => {
    if (view === currentView) return
    
    setIsToggling(true)
    setActiveTab('code') // Reset to code tab when switching views
    setTimeout(() => {
      onViewChange(view)
      setIsToggling(false)
    }, 150)
  }

  const handleOpenSettings = () => {
    if (currentView !== 'editor') {
      onViewChange('editor')
    }
    setActiveTab('settings')
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

  const updateEditorSettings = (newSettings) => {
    setEditorSettings(prev => ({ ...prev, ...newSettings }))
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
    <div className="flex flex-col h-screen w-full bg-white">
      {/* Clean Header */}
      <div className="border-b border-gray-200 bg-white w-full">
        <div className="flex items-center justify-between px-4 py-3 w-full">
          {/* Left - Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Certificate Editor</h1>
              </div>
            </div>
          </div>

          {/* Center - View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => handleViewToggle('editor')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentView === 'editor'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => handleViewToggle('preview')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                currentView === 'preview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center space-x-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
              >
                Export
              </button>

              {showExportDropdown && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      PDF
                    </button>
                    <button
                      onClick={handleExportPNG}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      PNG
                    </button>
                    <button
                      onClick={handleExportHTML}
                      className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      HTML
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleOpenSettings}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden w-full">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">Properties</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Framework Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Framework</label>
              <div className="space-y-1">
                <button
                  onClick={() => onFrameworkChange('tailwind')}
                  className={`w-full px-3 py-2 text-left text-sm rounded-md border ${
                    cssFramework === 'tailwind'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Tailwind CSS
                </button>
                <button
                  onClick={() => onFrameworkChange('bootstrap')}
                  className={`w-full px-3 py-2 text-left text-sm rounded-md border ${
                    cssFramework === 'bootstrap'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Bootstrap
                </button>
              </div>
            </div>

            {/* Page Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onOrientationChange('portrait')}
                  className={`px-3 py-2 text-sm rounded-md border ${
                    pageOrientation === 'portrait'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Portrait
                </button>
                <button
                  onClick={() => onOrientationChange('landscape')}
                  className={`px-3 py-2 text-sm rounded-md border ${
                    pageOrientation === 'landscape'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Landscape
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Actions</label>
              <button
                onClick={handleOpenInNewTab}
                className="w-full px-3 py-2 text-left text-sm border border-gray-200 rounded-md hover:border-gray-300 hover:bg-gray-50"
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white w-full min-w-0">
          <div className={`h-full w-full ${currentView === 'editor' ? 'flex flex-col' : 'hidden'}`}>
            {/* Editor Tabs */}
            <div className="flex items-center border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm border-b-2 transition-colors ${
                  activeTab === 'code'
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span>certificate.html</span>
              </button>
              
              {activeTab === 'settings' && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center space-x-2 px-4 py-2 text-sm border-b-2 border-blue-500 text-blue-600 bg-white"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <span>Settings</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTab('code')
                    }}
                    className="ml-1 p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 h-full">
              {activeTab === 'code' && (
                <CodeEditor
                  htmlCode={htmlCode}
                  onCodeChange={onCodeChange}
                  cssFramework={cssFramework}
                  pageOrientation={pageOrientation}
                  editorSettings={editorSettings}
                />
              )}

              {activeTab === 'settings' && (
                <div className="h-full bg-white overflow-y-auto">
                  <div className="max-w-4xl mx-auto p-6">
                    <div className="mb-6">
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
                      <p className="text-gray-600">Configure your editor preferences</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Text Editor Settings */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            Text Editor
                          </h3>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                              <select
                                value={editorSettings.theme}
                                onChange={(e) => updateEditorSettings({ theme: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {themes.map(theme => (
                                  <option key={theme.value} value={theme.value}>{theme.label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                                <input
                                  type="number"
                                  min="10"
                                  max="28"
                                  value={editorSettings.fontSize}
                                  onChange={(e) => updateEditorSettings({ fontSize: parseInt(e.target.value) })}
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tab Size</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="8"
                                  value={editorSettings.tabSize}
                                  onChange={(e) => updateEditorSettings({ tabSize: parseInt(e.target.value) })}
                                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                              <select
                                value={editorSettings.fontFamily}
                                onChange={(e) => updateEditorSettings({ fontFamily: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {fontFamilies.map(font => (
                                  <option key={font.value} value={font.value}>{font.label}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Cursor Style</label>
                              <select
                                value={editorSettings.cursorStyle}
                                onChange={(e) => updateEditorSettings({ cursorStyle: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {cursorStyles.map(cursor => (
                                  <option key={cursor.value} value={cursor.value}>{cursor.label}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Render Whitespace</label>
                              <select
                                value={editorSettings.renderWhitespace}
                                onChange={(e) => updateEditorSettings({ renderWhitespace: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {whitespaceOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Line Highlight</label>
                              <select
                                value={editorSettings.renderLineHighlight}
                                onChange={(e) => updateEditorSettings({ renderLineHighlight: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {lineHighlightOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Editor Features */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            Editor Features
                          </h3>

                          <div className="space-y-3">
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.wordWrap === 'on'}
                                onChange={(e) => updateEditorSettings({ wordWrap: e.target.checked ? 'on' : 'off' })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Word Wrap</span>
                                <p className="text-xs text-gray-500">Wrap long lines to fit in the editor</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.minimap}
                                onChange={(e) => updateEditorSettings({ minimap: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Minimap</span>
                                <p className="text-xs text-gray-500">Show minimap scrollbar on the right</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.lineNumbers === 'on'}
                                onChange={(e) => updateEditorSettings({ lineNumbers: e.target.checked ? 'on' : 'off' })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Line Numbers</span>
                                <p className="text-xs text-gray-500">Show line numbers in the gutter</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.folding}
                                onChange={(e) => updateEditorSettings({ folding: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Code Folding</span>
                                <p className="text-xs text-gray-500">Enable collapsing of code blocks</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.bracketMatching === 'always'}
                                onChange={(e) => updateEditorSettings({ bracketMatching: e.target.checked ? 'always' : 'never' })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Bracket Matching</span>
                                <p className="text-xs text-gray-500">Highlight matching brackets</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.autoIndent === 'full'}
                                onChange={(e) => updateEditorSettings({ autoIndent: e.target.checked ? 'full' : 'none' })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Auto Indent</span>
                                <p className="text-xs text-gray-500">Automatically indent new lines</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.formatOnPaste}
                                onChange={(e) => updateEditorSettings({ formatOnPaste: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Format On Paste</span>
                                <p className="text-xs text-gray-500">Format content when pasting</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.formatOnType}
                                onChange={(e) => updateEditorSettings({ formatOnType: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Format On Type</span>
                                <p className="text-xs text-gray-500">Format content while typing</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.smoothScrolling}
                                onChange={(e) => updateEditorSettings({ smoothScrolling: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Smooth Scrolling</span>
                                <p className="text-xs text-gray-500">Enable smooth scrolling animations</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.cursorSmoothCaretAnimation}
                                onChange={(e) => updateEditorSettings({ cursorSmoothCaretAnimation: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Smooth Caret Animation</span>
                                <p className="text-xs text-gray-500">Animate cursor movement</p>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* IntelliSense & Suggestions */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L3 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.734.99A.996.996 0 0118 6v2a1 1 0 11-2 0v-.277l-1.254.145a1 1 0 11-.992-1.736L14.984 6l-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.723V12a1 1 0 11-2 0v-1.277l-1.246-.855a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.277l1.234.566a1 1 0 11-.468 1.946l-2-.933A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.766.97l-2 .933a1 1 0 11-.468-1.946L16 13.277V12a1 1 0 011-1zM9.504 14.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 16.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1z" clipRule="evenodd" />
                            </svg>
                            IntelliSense & Suggestions
                          </h3>

                          <div className="space-y-3">
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.suggestOnTriggerCharacters}
                                onChange={(e) => updateEditorSettings({ suggestOnTriggerCharacters: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Trigger Characters</span>
                                <p className="text-xs text-gray-500">Show suggestions when typing trigger characters</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.wordBasedSuggestions}
                                onChange={(e) => updateEditorSettings({ wordBasedSuggestions: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Word Based Suggestions</span>
                                <p className="text-xs text-gray-500">Suggest words from the current document</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.parameterHints}
                                onChange={(e) => updateEditorSettings({ parameterHints: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Parameter Hints</span>
                                <p className="text-xs text-gray-500">Show parameter hints for functions</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.autoClosingBrackets === 'always'}
                                onChange={(e) => updateEditorSettings({ autoClosingBrackets: e.target.checked ? 'always' : 'never' })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Auto Closing Brackets</span>
                                <p className="text-xs text-gray-500">Automatically close brackets when typing</p>
                              </div>
                            </label>

                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={editorSettings.autoClosingQuotes === 'always'}
                                onChange={(e) => updateEditorSettings({ autoClosingQuotes: e.target.checked ? 'always' : 'never' })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700">Auto Closing Quotes</span>
                                <p className="text-xs text-gray-500">Automatically close quotes when typing</p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reset Settings */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
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
                            fontFamily: 'SF Mono, Monaco, Menlo, monospace',
                            autoIndent: 'full',
                            formatOnPaste: true,
                            formatOnType: true,
                            bracketMatching: 'always',
                            folding: true,
                            smoothScrolling: true,
                            cursorSmoothCaretAnimation: true,
                            renderWhitespace: 'none',
                            suggestOnTriggerCharacters: true,
                            wordBasedSuggestions: true,
                            parameterHints: true,
                            autoClosingBrackets: 'always',
                            autoClosingQuotes: 'always'
                          }
                          setEditorSettings(defaultSettings)
                        }}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                      >
                        Reset to Defaults
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`h-full w-full ${currentView === 'preview' ? 'block' : 'hidden'}`}>
            <div className="h-full w-full bg-gray-50 flex items-center justify-center p-6">
              <div className="bg-white shadow border border-gray-200" style={{
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
  )
}

export default MainPanel
