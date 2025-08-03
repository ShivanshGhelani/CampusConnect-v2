import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { generateBoilerplate } from './utils/boilerplateTemplates'

const CodeEditor = ({ 
  htmlCode, 
  onCodeChange, 
  cssFramework, 
  pageOrientation, 
  editorSettings,
  onEditorSettingsChange,
  themes,
  fontFamilies,
  cursorStyles
}) => {
  const editorRef = useRef(null)
  const listenerRef = useRef(null)
  const [protectedLineCount, setProtectedLineCount] = useState(0)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [activeTab, setActiveTab] = useState('html')

  // Remove the auto-switching effect - let users navigate freely between tabs

  const updateEditorSettings = (newSettings) => {
    onEditorSettingsChange(newSettings)
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: newSettings.fontSize || editorSettings.fontSize,
        theme: newSettings.theme || editorSettings.theme,
        tabSize: newSettings.tabSize || editorSettings.tabSize,
        wordWrap: newSettings.wordWrap || editorSettings.wordWrap,
        minimap: { enabled: newSettings.minimap !== undefined ? newSettings.minimap : editorSettings.minimap },
        lineNumbers: newSettings.lineNumbers || editorSettings.lineNumbers,
        renderLineHighlight: newSettings.renderLineHighlight || editorSettings.renderLineHighlight,
        cursorStyle: newSettings.cursorStyle || editorSettings.cursorStyle,
        fontFamily: newSettings.fontFamily || editorSettings.fontFamily
      })
    }
  }

  // Update editor when settings change
  useEffect(() => {
    if (isEditorReady && editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: editorSettings.fontSize,
        theme: editorSettings.theme,
        tabSize: editorSettings.tabSize,
        wordWrap: editorSettings.wordWrap,
        minimap: { enabled: editorSettings.minimap },
        lineNumbers: editorSettings.lineNumbers,
        renderLineHighlight: editorSettings.renderLineHighlight,
        cursorStyle: editorSettings.cursorStyle,
        fontFamily: editorSettings.fontFamily
      })
    }
  }, [editorSettings, isEditorReady])

  // Generate the protected boilerplate content
  const getBoilerplateContent = () => {
    return generateBoilerplate(cssFramework, pageOrientation)
  }

  // Calculate the number of protected lines in the boilerplate
  const calculateProtectedLines = (boilerplate) => {
    return boilerplate.split('\n').length
  }

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    setIsEditorReady(true)

    const boilerplate = getBoilerplateContent()
    const protectedLines = calculateProtectedLines(boilerplate)
    setProtectedLineCount(protectedLines)

    // Set initial content with boilerplate + user content or empty
    const initialContent = boilerplate + (htmlCode || '\n    <!-- Start writing your HTML here -->\n    \n')
    editor.setValue(initialContent)

    // Configure editor settings
    editor.updateOptions({
      fontSize: editorSettings.fontSize,
      tabSize: editorSettings.tabSize,
      insertSpaces: true,
      wordWrap: editorSettings.wordWrap,
      minimap: { enabled: editorSettings.minimap },
      lineNumbers: editorSettings.lineNumbers,
      renderLineHighlight: editorSettings.renderLineHighlight,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      cursorStyle: editorSettings.cursorStyle,
      fontFamily: editorSettings.fontFamily,
      theme: editorSettings.theme
    })

    // Set up protected regions
    setupProtectedRegions(editor, monaco, protectedLines)

    // Position cursor after boilerplate in editable area
    const position = { lineNumber: protectedLines + 1, column: 1 }
    editor.setPosition(position)
    editor.focus()

    // Add keyboard handler to prevent editing in protected region
    editor.onKeyDown((e) => {
      const position = editor.getPosition()
      if (position && position.lineNumber <= protectedLines) {
        // Allow navigation keys but prevent editing
        const allowedKeys = [
          monaco.KeyCode.DownArrow,
          monaco.KeyCode.UpArrow,
          monaco.KeyCode.LeftArrow,
          monaco.KeyCode.RightArrow,
          monaco.KeyCode.PageDown,
          monaco.KeyCode.PageUp,
          monaco.KeyCode.Home,
          monaco.KeyCode.End,
          monaco.KeyCode.Escape,
          monaco.KeyCode.Tab
        ]
        
        if (!allowedKeys.includes(e.keyCode)) {
          e.preventDefault()
          e.stopPropagation()
          // Move cursor to editable area and ensure there's content to edit
          ensureEditableArea(editor, protectedLines)
        }
      }
    })

    // Add click handler to prevent cursor getting stuck in protected region
    editor.onMouseDown((e) => {
      setTimeout(() => {
        const position = editor.getPosition()
        if (position && position.lineNumber <= protectedLines) {
          ensureEditableArea(editor, protectedLines)
        }
      }, 0)
    })

    // Helper function to ensure there's always an editable area
    const ensureEditableArea = (editor, protectedLines) => {
      const model = editor.getModel()
      const totalLines = model.getLineCount()
      
      // If cursor is in protected area or there's no content after protected lines
      if (totalLines <= protectedLines) {
        // Add some editable content
        const newContent = '\n    <!-- Start writing your HTML here -->\n    \n'
        const insertPosition = { lineNumber: protectedLines, column: Number.MAX_SAFE_INTEGER }
        const range = new monaco.Range(
          insertPosition.lineNumber, insertPosition.column,
          insertPosition.lineNumber, insertPosition.column
        )
        editor.executeEdits('ensure-editable', [{
          range: range,
          text: newContent
        }])
      }
      
      // Move cursor to safe editable position
      const safePosition = { lineNumber: protectedLines + 1, column: 1 }
      editor.setPosition(safePosition)
      editor.focus()
    }
  }

  // Set up protected regions that cannot be edited
  const setupProtectedRegions = (editor, monaco, protectedLines) => {
    // Clean up existing listener first
    if (listenerRef.current) {
      listenerRef.current.dispose()
      listenerRef.current = null
    }
    
    // Clear any existing decorations first
    const existingDecorations = editor.getModel().getAllDecorations()
    if (existingDecorations.length > 0) {
      editor.deltaDecorations(existingDecorations.map(d => d.id), [])
    }
    
    // Add decorations to highlight protected region
    editor.deltaDecorations([], [
      {
        range: new monaco.Range(1, 1, protectedLines, Number.MAX_SAFE_INTEGER),
        options: {
          isWholeLine: true,
          className: 'protected-line',
          glyphMarginClassName: 'protected-glyph',
          hoverMessage: { value: '**Protected boilerplate** - This section cannot be edited' }
        }
      }
    ])

    // Smart content change handler - protects boundary and saves user content
    const handleContentChange = (event) => {
      const model = editor.getModel()
      if (!model || model.isDisposed()) return
      
      const content = model.getValue()
      const lines = content.split('\n')
      
      // Ensure we don't lose the boundary between protected and editable content
      if (lines.length <= protectedLines) {
        // If content got deleted too much, restore minimum structure
        setTimeout(() => {
          const boilerplate = getBoilerplateContent()
          const minContent = boilerplate + '\n    <!-- Start writing your HTML here -->\n    \n'
          editor.setValue(minContent)
          const safePosition = { lineNumber: protectedLines + 1, column: 1 }
          editor.setPosition(safePosition)
        }, 0)
        return
      }
      
      const userContent = extractUserContent(content, protectedLines)
      onCodeChange(userContent)
    }

    // Store new listener reference for cleanup
    listenerRef.current = editor.onDidChangeModelContent(handleContentChange)
  }

  // Extract user content from the complete editor content
  const extractUserContent = (fullContent, protectedLines) => {
    const lines = fullContent.split('\n')
    const userLines = lines.slice(protectedLines)
    
    // Remove empty lines at the beginning to avoid losing user content
    while (userLines.length > 0 && userLines[0].trim() === '') {
      userLines.shift()
    }
    
    // If no user content, return empty string
    if (userLines.length === 0) {
      return ''
    }
    
    // Join back with proper spacing
    return '\n' + userLines.join('\n')
  }

  // Update editor when framework or orientation changes - immediate update
  useEffect(() => {
    if (editorRef.current && isEditorReady) {
      const editor = editorRef.current
      const model = editor.getModel()
      
      // Ensure model exists and isn't disposed
      if (!model || model.isDisposed()) return
      
      // Get current cursor position to restore later
      const currentPosition = editor.getPosition()
      
      // Get current user content (preserve user's work) - be more careful
      const currentContent = model.getValue()
      let userContent = extractUserContent(currentContent, protectedLineCount)
      
      // If no user content, preserve the default comment
      if (!userContent || userContent.trim() === '') {
        userContent = '\n    <!-- Start writing your HTML here -->\n    \n'
      }
      
      // Generate new boilerplate immediately
      const newBoilerplate = getBoilerplateContent()
      const newProtectedLines = calculateProtectedLines(newBoilerplate)
      
      // Update content with new boilerplate + preserved user content
      const newContent = newBoilerplate + userContent
      
      // Push an undo stop to separate this from user edits
      editor.pushUndoStop()
      
      // Set new content
      editor.setValue(newContent)
      
      // Update protected line count AFTER setting content
      setProtectedLineCount(newProtectedLines)
      
      // Re-setup protected regions immediately
      const monaco = window.monaco
      if (monaco) {
        // Small delay to ensure editor has updated
        setTimeout(() => {
          setupProtectedRegions(editor, monaco, newProtectedLines)
          
          // Restore cursor position or place in safe area
          const safePosition = currentPosition && currentPosition.lineNumber > newProtectedLines 
            ? currentPosition 
            : { lineNumber: newProtectedLines + 2, column: 1 } // Position after comment line
          
          editor.setPosition(safePosition)
          editor.focus()
        }, 10)
      }
    }
  }, [cssFramework, pageOrientation, isEditorReady])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        listenerRef.current.dispose()
        listenerRef.current = null
      }
    }
  }, [])

  return (
    <div className="h-full w-full flex flex-col">
      {/* Tab Header */}
      <div className="bg-gray-100 border-b border-gray-200 flex">
        <button
          onClick={() => setActiveTab('html')}
          className={`px-4 py-2 text-sm font-medium border-r border-gray-200 transition-colors ${
            activeTab === 'html'
              ? 'bg-white text-gray-900 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>HTML Editor</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-white text-gray-900 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <span>Editor Settings</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 relative">
        {/* HTML Editor Tab */}
        <div className={`h-full absolute inset-0 ${activeTab === 'html' ? 'block' : 'hidden'}`}>
          <Editor
            height="100%"
            width="100%"
            defaultLanguage="html"
            theme={editorSettings.theme}
            onMount={handleEditorDidMount}
            options={{
              fontSize: editorSettings.fontSize,
              tabSize: editorSettings.tabSize,
              insertSpaces: true,
              wordWrap: editorSettings.wordWrap,
              minimap: { enabled: editorSettings.minimap },
              lineNumbers: editorSettings.lineNumbers,
              renderLineHighlight: editorSettings.renderLineHighlight,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              folding: true,
              bracketMatching: 'always',
              autoIndent: 'full',
              formatOnPaste: true,
              formatOnType: true,
              padding: { top: 10, bottom: 10 },
              smoothScrolling: true,
              cursorSmoothCaretAnimation: true,
              cursorStyle: editorSettings.cursorStyle,
              fontFamily: editorSettings.fontFamily,
            }}
          />
        </div>

        {/* Settings Tab */}
        <div className={`h-full absolute inset-0 ${activeTab === 'settings' ? 'block' : 'hidden'}`}>
          <div className="h-full bg-white p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-900">Editor Settings</h2>
                <p className="text-sm text-gray-600 mt-1">Customize your Monaco Editor experience</p>
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Font Size</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="10"
                    max="24"
                    value={editorSettings.fontSize}
                    onChange={(e) => updateEditorSettings({ fontSize: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-lg font-medium text-gray-900 w-12 text-center">{editorSettings.fontSize}px</span>
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Theme</label>
                <select
                  value={editorSettings.theme}
                  onChange={(e) => updateEditorSettings({ theme: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {themes.map(theme => (
                    <option key={theme.value} value={theme.value}>{theme.label}</option>
                  ))}
                </select>
              </div>

              {/* Font Family */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Font Family</label>
                <select
                  value={editorSettings.fontFamily}
                  onChange={(e) => updateEditorSettings({ fontFamily: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {fontFamilies.map(font => (
                    <option key={font.value} value={font.value}>{font.label}</option>
                  ))}
                </select>
              </div>

              {/* Tab Size */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Tab Size</label>
                <div className="grid grid-cols-3 gap-3">
                  {[2, 4, 8].map(size => (
                    <button
                      key={size}
                      onClick={() => updateEditorSettings({ tabSize: size })}
                      className={`py-3 px-4 text-base font-medium rounded-lg transition-all duration-200 ${
                        editorSettings.tabSize === size
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {size} spaces
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Editor Options</h3>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <label className="text-base font-medium text-gray-900">Word Wrap</label>
                    <p className="text-sm text-gray-600">Wrap long lines to fit the editor width</p>
                  </div>
                  <button
                    onClick={() => updateEditorSettings({ wordWrap: editorSettings.wordWrap === 'on' ? 'off' : 'on' })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      editorSettings.wordWrap === 'on' ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editorSettings.wordWrap === 'on' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <label className="text-base font-medium text-gray-900">Minimap</label>
                    <p className="text-sm text-gray-600">Show code overview in the editor sidebar</p>
                  </div>
                  <button
                    onClick={() => updateEditorSettings({ minimap: !editorSettings.minimap })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      editorSettings.minimap ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editorSettings.minimap ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <label className="text-base font-medium text-gray-900">Line Numbers</label>
                    <p className="text-sm text-gray-600">Display line numbers in the editor</p>
                  </div>
                  <button
                    onClick={() => updateEditorSettings({ lineNumbers: editorSettings.lineNumbers === 'on' ? 'off' : 'on' })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      editorSettings.lineNumbers === 'on' ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editorSettings.lineNumbers === 'on' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Cursor Style */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Cursor Style</label>
                <select
                  value={editorSettings.cursorStyle}
                  onChange={(e) => updateEditorSettings({ cursorStyle: e.target.value })}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {cursorStyles.map(style => (
                    <option key={style.value} value={style.value}>{style.label}</option>
                  ))}
                </select>
              </div>

              {/* Reset Button */}
              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={() => updateEditorSettings({
                    fontSize: 14,
                    theme: 'vs-dark',
                    tabSize: 4,
                    wordWrap: 'on',
                    minimap: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    cursorStyle: 'line',
                    fontFamily: 'Consolas, Monaco, monospace'
                  })}
                  className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeEditor
