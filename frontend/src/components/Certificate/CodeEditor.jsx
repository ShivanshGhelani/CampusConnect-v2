import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { generateBoilerplate } from '../../utils/boilerplateTemplates'

const CodeEditor = ({ htmlCode, onCodeChange, cssFramework, pageOrientation, editorSettings }) => {
  const editorRef = useRef(null)
  const listenerRef = useRef(null)
  const [protectedLineCount, setProtectedLineCount] = useState(0)
  const [isEditorReady, setIsEditorReady] = useState(false)

  // Update editor settings when props change
  const updateEditorSettings = (newSettings) => {
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
        fontFamily: editorSettings.fontFamily,
        // Enhanced settings
        autoIndent: editorSettings.autoIndent || 'full',
        formatOnPaste: editorSettings.formatOnPaste !== undefined ? editorSettings.formatOnPaste : true,
        formatOnType: editorSettings.formatOnType !== undefined ? editorSettings.formatOnType : true,
        bracketMatching: editorSettings.bracketMatching || 'always',
        folding: editorSettings.folding !== undefined ? editorSettings.folding : true,
        smoothScrolling: editorSettings.smoothScrolling !== undefined ? editorSettings.smoothScrolling : true,
        cursorSmoothCaretAnimation: editorSettings.cursorSmoothCaretAnimation !== undefined ? editorSettings.cursorSmoothCaretAnimation : true,
        renderWhitespace: editorSettings.renderWhitespace || 'none',
        renderControlCharacters: editorSettings.renderControlCharacters !== undefined ? editorSettings.renderControlCharacters : false,
        showFoldingControls: editorSettings.showFoldingControls || 'always',
        matchBrackets: editorSettings.matchBrackets || 'always',
        autoClosingBrackets: editorSettings.autoClosingBrackets || 'always',
        autoClosingQuotes: editorSettings.autoClosingQuotes || 'always',
        autoSurround: editorSettings.autoSurround || 'languageDefined',
        snippetSuggestions: editorSettings.snippetSuggestions || 'top',
        suggestOnTriggerCharacters: editorSettings.suggestOnTriggerCharacters !== undefined ? editorSettings.suggestOnTriggerCharacters : true,
        acceptSuggestionOnEnter: editorSettings.acceptSuggestionOnEnter || 'on',
        acceptSuggestionOnCommitCharacter: editorSettings.acceptSuggestionOnCommitCharacter !== undefined ? editorSettings.acceptSuggestionOnCommitCharacter : true,
        wordBasedSuggestions: editorSettings.wordBasedSuggestions !== undefined ? editorSettings.wordBasedSuggestions : true,
        parameterHints: editorSettings.parameterHints !== undefined ? editorSettings.parameterHints : true,
        codeLens: editorSettings.codeLens !== undefined ? editorSettings.codeLens : true,
        colorDecorators: editorSettings.colorDecorators !== undefined ? editorSettings.colorDecorators : true,
        linkedEditing: editorSettings.linkedEditing !== undefined ? editorSettings.linkedEditing : true,
        multiCursorModifier: editorSettings.multiCursorModifier || 'alt',
        selectionHighlight: editorSettings.selectionHighlight !== undefined ? editorSettings.selectionHighlight : true,
        occurrencesHighlight: editorSettings.occurrencesHighlight !== undefined ? editorSettings.occurrencesHighlight : true,
        renderLineHighlightOnlyWhenFocus: editorSettings.renderLineHighlightOnlyWhenFocus !== undefined ? editorSettings.renderLineHighlightOnlyWhenFocus : false,
        hideCursorInOverviewRuler: editorSettings.hideCursorInOverviewRuler !== undefined ? editorSettings.hideCursorInOverviewRuler : false,
        scrollbar: editorSettings.scrollbar || {
          vertical: 'auto',
          horizontal: 'auto',
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          handleMouseWheel: true
        },
        find: editorSettings.find || {
          autoFindInSelection: 'never',
          seedSearchStringFromSelection: 'always',
          addExtraSpaceOnTop: true
        }
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
      theme: editorSettings.theme,
      // Enhanced settings
      autoIndent: editorSettings.autoIndent || 'full',
      formatOnPaste: editorSettings.formatOnPaste !== undefined ? editorSettings.formatOnPaste : true,
      formatOnType: editorSettings.formatOnType !== undefined ? editorSettings.formatOnType : true,
      bracketMatching: editorSettings.bracketMatching || 'always',
      folding: editorSettings.folding !== undefined ? editorSettings.folding : true,
      smoothScrolling: editorSettings.smoothScrolling !== undefined ? editorSettings.smoothScrolling : true,
      cursorSmoothCaretAnimation: editorSettings.cursorSmoothCaretAnimation !== undefined ? editorSettings.cursorSmoothCaretAnimation : true,
      renderWhitespace: editorSettings.renderWhitespace || 'none',
      renderControlCharacters: editorSettings.renderControlCharacters !== undefined ? editorSettings.renderControlCharacters : false,
      showFoldingControls: editorSettings.showFoldingControls || 'always',
      matchBrackets: editorSettings.matchBrackets || 'always',
      autoClosingBrackets: editorSettings.autoClosingBrackets || 'always',
      autoClosingQuotes: editorSettings.autoClosingQuotes || 'always',
      autoSurround: editorSettings.autoSurround || 'languageDefined',
      snippetSuggestions: editorSettings.snippetSuggestions || 'top',
      suggestOnTriggerCharacters: editorSettings.suggestOnTriggerCharacters !== undefined ? editorSettings.suggestOnTriggerCharacters : true,
      acceptSuggestionOnEnter: editorSettings.acceptSuggestionOnEnter || 'on',
      acceptSuggestionOnCommitCharacter: editorSettings.acceptSuggestionOnCommitCharacter !== undefined ? editorSettings.acceptSuggestionOnCommitCharacter : true,
      wordBasedSuggestions: editorSettings.wordBasedSuggestions !== undefined ? editorSettings.wordBasedSuggestions : true,
      parameterHints: editorSettings.parameterHints !== undefined ? editorSettings.parameterHints : true,
      codeLens: editorSettings.codeLens !== undefined ? editorSettings.codeLens : true,
      colorDecorators: editorSettings.colorDecorators !== undefined ? editorSettings.colorDecorators : true,
      linkedEditing: editorSettings.linkedEditing !== undefined ? editorSettings.linkedEditing : true,
      multiCursorModifier: editorSettings.multiCursorModifier || 'alt',
      selectionHighlight: editorSettings.selectionHighlight !== undefined ? editorSettings.selectionHighlight : true,
      occurrencesHighlight: editorSettings.occurrencesHighlight !== undefined ? editorSettings.occurrencesHighlight : true,
      renderLineHighlightOnlyWhenFocus: editorSettings.renderLineHighlightOnlyWhenFocus !== undefined ? editorSettings.renderLineHighlightOnlyWhenFocus : false,
      hideCursorInOverviewRuler: editorSettings.hideCursorInOverviewRuler !== undefined ? editorSettings.hideCursorInOverviewRuler : false,
      scrollbar: editorSettings.scrollbar || {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        handleMouseWheel: true
      },
      find: editorSettings.find || {
        autoFindInSelection: 'never',
        seedSearchStringFromSelection: 'always',
        addExtraSpaceOnTop: true
      }
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
    <div className="h-full w-full relative">
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
          folding: editorSettings.folding !== undefined ? editorSettings.folding : true,
          bracketMatching: editorSettings.bracketMatching || 'always',
          autoIndent: editorSettings.autoIndent || 'full',
          formatOnPaste: editorSettings.formatOnPaste !== undefined ? editorSettings.formatOnPaste : true,
          formatOnType: editorSettings.formatOnType !== undefined ? editorSettings.formatOnType : true,
          padding: { top: 10, bottom: 10 },
          smoothScrolling: editorSettings.smoothScrolling !== undefined ? editorSettings.smoothScrolling : true,
          cursorSmoothCaretAnimation: editorSettings.cursorSmoothCaretAnimation !== undefined ? editorSettings.cursorSmoothCaretAnimation : true,
          cursorStyle: editorSettings.cursorStyle,
          fontFamily: editorSettings.fontFamily,
          renderWhitespace: editorSettings.renderWhitespace || 'none',
          renderControlCharacters: editorSettings.renderControlCharacters !== undefined ? editorSettings.renderControlCharacters : false,
          showFoldingControls: editorSettings.showFoldingControls || 'always',
          matchBrackets: editorSettings.matchBrackets || 'always',
          autoClosingBrackets: editorSettings.autoClosingBrackets || 'always',
          autoClosingQuotes: editorSettings.autoClosingQuotes || 'always',
          autoSurround: editorSettings.autoSurround || 'languageDefined',
          snippetSuggestions: editorSettings.snippetSuggestions || 'top',
          suggestOnTriggerCharacters: editorSettings.suggestOnTriggerCharacters !== undefined ? editorSettings.suggestOnTriggerCharacters : true,
          acceptSuggestionOnEnter: editorSettings.acceptSuggestionOnEnter || 'on',
          acceptSuggestionOnCommitCharacter: editorSettings.acceptSuggestionOnCommitCharacter !== undefined ? editorSettings.acceptSuggestionOnCommitCharacter : true,
          wordBasedSuggestions: editorSettings.wordBasedSuggestions !== undefined ? editorSettings.wordBasedSuggestions : true,
          parameterHints: { enabled: editorSettings.parameterHints !== undefined ? editorSettings.parameterHints : true },
          codeLens: editorSettings.codeLens !== undefined ? editorSettings.codeLens : true,
          colorDecorators: editorSettings.colorDecorators !== undefined ? editorSettings.colorDecorators : true,
          linkedEditing: editorSettings.linkedEditing !== undefined ? editorSettings.linkedEditing : true,
          multiCursorModifier: editorSettings.multiCursorModifier || 'alt',
          selectionHighlight: editorSettings.selectionHighlight !== undefined ? editorSettings.selectionHighlight : true,
          occurrencesHighlight: editorSettings.occurrencesHighlight !== undefined ? editorSettings.occurrencesHighlight : true,
          renderLineHighlightOnlyWhenFocus: editorSettings.renderLineHighlightOnlyWhenFocus !== undefined ? editorSettings.renderLineHighlightOnlyWhenFocus : false,
          hideCursorInOverviewRuler: editorSettings.hideCursorInOverviewRuler !== undefined ? editorSettings.hideCursorInOverviewRuler : false,
          scrollbar: editorSettings.scrollbar || {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            handleMouseWheel: true
          },
          find: editorSettings.find || {
            autoFindInSelection: 'never',
            seedSearchStringFromSelection: 'always',
            addExtraSpaceOnTop: true
          }
        }}
      />
    </div>
  )
}

export default CodeEditor