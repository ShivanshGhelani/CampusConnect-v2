import React, { useState, useRef, useCallback } from 'react';
import { sanitizeHtml } from '../utils/sanitizer';

const RichTextEditor = ({ 
  value = '', 
  onChange, 
  placeholder = 'Enter your text here...', 
  className = '',
  error = false,
  rows = 6,
  maxLength = null,
  allowFullscreen = false 
}) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Undo/Redo state
  const [history, setHistory] = useState([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);

  // Format detection and conversion functions
  const detectAndFormatText = useCallback((text) => {
    if (!text) return '';
    
    // Convert common markdown-like patterns to HTML-like formatting
    let formatted = text
      // Bold text: **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      
      // Italic text: *text* or _text_
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>')
      
      // Code blocks: `text`
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      
      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Unordered lists: - item or * item
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      
      // Numbered lists: 1. item
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      
      // Headers: # Header, ## Header, ### Header
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      
      // Line breaks: double line breaks become paragraphs
      .replace(/\n\n/g, '</p><p>')
      
      // Single line breaks
      .replace(/\n/g, '<br>');

    // Wrap in paragraph tags if not already wrapped in block elements
    if (!formatted.includes('<h1>') && !formatted.includes('<h2>') && !formatted.includes('<h3>') && 
        !formatted.includes('<li>') && !formatted.includes('<p>')) {
      formatted = `<p>${formatted}</p>`;
    }

    // Wrap consecutive list items in ul/ol tags
    formatted = formatted
      .replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/g, (match) => {
        return `<ul>${match}</ul>`;
      });

    return formatted;
  }, []);

  // Render preview HTML from markdown text
  const renderPreview = useCallback((text) => {
    if (!text) return '';
    
    let html = text
      // Horizontal rule: --- or *** or ___ (must be on its own line)
      .replace(/^---+$/gm, '<hr class="my-4 border-t-2 border-gray-300" />')
      .replace(/^\*\*\*+$/gm, '<hr class="my-4 border-t-2 border-gray-300" />')
      .replace(/^___+$/gm, '<hr class="my-4 border-t-2 border-gray-300" />')
      
      // Badge pattern: [![alt](img-url)](link-url) - MUST be FIRST before any other processing
      .replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g, (match, alt, imgUrl, linkUrl) => {
        // Encode special characters in URLs properly
        return `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="inline-block hover:opacity-80 transition-opacity"><img src="${imgUrl}" alt="${alt}" class="inline-block h-5" style="display: inline-block; vertical-align: middle;" /></a>`;
      })
      
      // Images: ![alt text](url) - standalone images, BEFORE code blocks to avoid interference
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
        return `<img src="${url}" alt="${alt}" class="inline-block max-h-6 align-middle" style="display: inline-block; vertical-align: middle;" />`;
      })
      
      // Bold text: **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      
      // Italic text: *text* or _text_
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic text-gray-800">$1</em>')
      .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="italic text-gray-800">$1</em>')
      
      // Code blocks: `text`
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>')
      
      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1">$1 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>')
      
      // Headers: # Header, ## Header, ### Header
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-3 mb-2 text-gray-900 border-b border-gray-200 pb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2 text-gray-900 border-b-2 border-gray-300 pb-1">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-3 text-gray-900 border-b-2 border-blue-300 pb-2">$1</h1>')
      
      // Unordered lists: - item or * item
      .replace(/^[-*] (.+)$/gm, '<li class="ml-4 mb-1 flex items-start"><span class="text-blue-500 mr-2">•</span><span>$1</span></li>')
      
      // Numbered lists: 1. item
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>');

    // Handle paragraphs and line breaks
    const lines = html.split('\n');
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '') {
        if (processedLines.length > 0) {
          processedLines.push('<div class="h-3"></div>');
        }
      } else if (line.startsWith('<h') || line.startsWith('<li')) {
        processedLines.push(line);
      } else {
        processedLines.push(`<p class="text-gray-700 leading-relaxed mb-2">${line}</p>`);
      }
    }

    return processedLines.join('\n');
  }, []);

  // Handle file import
  const handleFileImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (typeof content === 'string') {
        onChange(content);
      }
    };
    
    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      alert('Please select a text file (.txt, .md) or markdown file.');
    }
    
    // Reset input
    e.target.value = '';
  }, [onChange]);

  // Convert HTML back to markdown-like format for editing
  const htmlToMarkdown = useCallback((html) => {
    if (!html) return '';
    
    return html
      // Convert HTML tags back to markdown
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<h1>(.*?)<\/h1>/g, '# $1')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1')
      .replace(/<ul><li>(.*?)<\/li><\/ul>/g, (match, content) => {
        return content.split('</li><li>').map(item => `- ${item}`).join('\n');
      })
      .replace(/<li>(.*?)<\/li>/g, '- $1')
      .replace(/<br>/g, '\n')
      .replace(/<\/p><p>/g, '\n\n')
      .replace(/<\/?p>/g, '')
      .trim();
  }, []);

  // Handle text change
  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Allow the change if:
    // 1. No max length set
    // 2. New value is within max length
    // 3. New value is shorter than or equal to current (deletion/replacement)
    if (!maxLength || newValue.length <= maxLength || newValue.length <= value.length) {
      onChange(newValue);
      
      // Update history for undo/redo (only if not an undo/redo operation)
      if (!isUndoRedoRef.current) {
        setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(newValue);
          // Keep only last 50 states
          return newHistory.slice(-50);
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
      }
    }
    // Only block if trying to add more characters beyond max length
  };

  // Insert formatting at cursor position
  const insertFormatting = useCallback((beforeText, afterText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + beforeText + selectedText + afterText + value.substring(end);
    
    onChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + beforeText.length, 
        end + beforeText.length
      );
    }, 0);
  }, [value, onChange]);

  // Undo/Redo functions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
      setTimeout(() => { isUndoRedoRef.current = false; }, 0);
    }
  }, [historyIndex, history, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
      setTimeout(() => { isUndoRedoRef.current = false; }, 0);
    }
  }, [historyIndex, history, onChange]);

  // Toolbar actions
  const makeBold = () => insertFormatting('**', '**');
  const makeItalic = () => insertFormatting('*', '*');
  const makeCode = () => insertFormatting('`', '`');
  const makeHeader = (level) => {
    const headerPrefix = '#'.repeat(level) + ' ';
    insertFormatting(headerPrefix, '');
  };
  const makeList = () => insertFormatting('- ', '');
  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      insertFormatting('[', `](${url})`);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          makeBold();
          break;
        case 'i':
          e.preventDefault();
          makeItalic();
          break;
        case 'k':
          e.preventDefault();
          insertLink();
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          break;
        case 'y':
          e.preventDefault();
          handleRedo();
          break;
        default:
          break;
      }
    }
  };

  const characterCount = value ? value.length : 0;
  const isOverLimit = maxLength && characterCount > maxLength;

  // Render fullscreen modal
  if (isFullscreen) {
    return (
      <div 
        className="fixed inset-0 z-[9999] bg-white/200 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        style={{
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-screen flex flex-col border border-gray-200 animate-scaleIn"
          style={{
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
              Rich Text Editor (Fullscreen)
            </h3>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Exit Fullscreen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={handleUndo} 
                disabled={historyIndex <= 0}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" 
                title="Undo (Ctrl+Z)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6"></path>
                  <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path>
                </svg>
              </button>
              <button 
                type="button" 
                onClick={handleRedo} 
                disabled={historyIndex >= history.length - 1}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed" 
                title="Redo (Ctrl+Y)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 7v6h-6"></path>
                  <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"></path>
                </svg>
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button type="button" onClick={makeBold} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg font-bold" title="Bold (Ctrl+B)">
                <strong>B</strong>
              </button>
              <button type="button" onClick={makeItalic} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg italic" title="Italic (Ctrl+I)">
                <em>I</em>
              </button>
              <button type="button" onClick={makeCode} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg font-mono" title="Code">
                &lt;/&gt;
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button type="button" onClick={() => makeHeader(1)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg font-bold" title="Header 1">H1</button>
              <button type="button" onClick={() => makeHeader(2)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg font-bold" title="Header 2">H2</button>
              <button type="button" onClick={() => makeHeader(3)} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg font-bold" title="Header 3">H3</button>
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <button type="button" onClick={makeList} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg" title="Bullet List">•</button>
              <button type="button" onClick={insertLink} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg" title="Link (Ctrl+K)">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleFileImport} className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Import from file">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" /></svg>
              </button>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 border-r border-gray-200 flex flex-col">
              <div className="px-6 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
                Write
              </div>
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 w-full px-6 py-4 resize-none focus:outline-none text-base leading-relaxed font-mono"
              />
            </div>
            <div className="w-1/2 flex flex-col">
              <div className="px-6 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 text-sm font-semibold text-gray-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Preview
              </div>
              <div className="flex-1 px-6 py-4 overflow-y-auto bg-gray-50">
                {value ? (
                  <div className="prose prose-base max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderPreview(value)) }} />
                ) : (
                  <div className="text-gray-400 italic text-center mt-8">Preview will appear here as you type...</div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 text-sm rounded-b-lg">
            <div className="text-gray-600">Supports: **bold** *italic* `code` # headers - lists [links](url)</div>
            <div className="flex items-center gap-4">
              {maxLength && (
                <div className={`${isOverLimit ? 'text-red-600' : characterCount > maxLength * 0.9 ? 'text-yellow-600' : 'text-gray-500'}`}>
                  {characterCount}{maxLength && ` / ${maxLength}`}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative border rounded-md ${error ? 'border-red-300' : 'border-gray-300'} ${isFocused ? 'ring-2 ring-blue-500' : ''} ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-md">
        <div className="flex items-center gap-1">
          <button 
            type="button" 
            onClick={handleUndo} 
            disabled={historyIndex <= 0}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed" 
            title="Undo (Ctrl+Z)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6"></path>
              <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path>
            </svg>
          </button>
          <button 
            type="button" 
            onClick={handleRedo} 
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed" 
            title="Redo (Ctrl+Y)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6"></path>
              <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"></path>
            </svg>
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={makeBold}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-sm font-bold"
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
        <button
          type="button"
          onClick={makeItalic}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-sm italic"
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={makeCode}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-sm font-mono"
          title="Code"
        >
          &lt;/&gt;
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => makeHeader(1)}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-sm font-bold"
          title="Header 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => makeHeader(2)}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-sm font-bold"
          title="Header 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => makeHeader(3)}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-sm font-bold"
          title="Header 3"
        >
          H3
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={makeList}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-sm"
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={insertLink}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-sm"
          title="Link (Ctrl+K)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1">
          {/* Floating Info Button */}
          <div className="relative group">
            <button
              type="button"
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded text-sm transition-colors"
              title="Formatting Help"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
            
            {/* Floating Help Tooltip */}
            <div className="absolute right-0 top-8 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-yellow-500">
                  <path d="M12 2v20M17 7l-5-5-5 5M7 17l5 5 5-5"></path>
                </svg>
                Rich Text Formatting Guide
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs text-gray-700 mb-3">
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-1 rounded">**text**</code>
                  <span>→</span>
                  <strong>Bold text</strong>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-1 rounded">*text*</code>
                  <span>→</span>
                  <em>Italic text</em>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-1 rounded">`code`</code>
                  <span>→</span>
                  <code className="bg-gray-100 px-1 rounded">Inline code</code>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-1 rounded"># Header</code>
                  <span>→</span>
                  <strong className="text-lg">Large Header</strong>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-1 rounded">- Item</code>
                  <span>→</span>
                  <span>• List item</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-1 rounded">[Link](url)</code>
                  <span>→</span>
                  <span className="text-blue-600 underline">Link text</span>
                </div>
              </div>
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                <div className="flex items-start gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                  <div>
                    <strong>Pro Tips:</strong><br/>
                    • Use Ctrl+B for bold, Ctrl+I for italic<br/>
                    • Import .md or .txt files with the folder button<br/>
                    • Click preview to see formatted result
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleFileImport}
            className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded text-sm transition-colors"
            title="Import from file (.txt, .md)"
          >
            <svg  xmlns="http://www.w3.org/2000/svg"  width="18"  height="18"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  strokeWidth="2"  strokeLinecap="round"  strokeLinejoin="round"  className="icon icon-tabler icons-tabler-outline icon-tabler-folder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" /></svg>
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`p-1.5 rounded text-sm transition-colors ${showPreview ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
            title="Toggle Preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          {allowFullscreen && (
            <button
              type="button"
              onClick={() => {
                setIsFullscreen(true);
              }}
              className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded text-sm transition-colors"
              title="Expand to Fullscreen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Editor Area */}
      <div className="flex">
        {/* Write Tab */}
        <div className={`${showPreview ? 'w-1/2 border-r border-gray-200' : 'w-full'}`}>
          {showPreview && (
            <div className="px-3 py-1 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-700 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
              Write
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-3 py-3 resize-none focus:outline-none text-sm leading-relaxed font-mono"
          />
        </div>

        {/* Preview Tab */}
        {showPreview && (
          <div className="w-1/2">
            <div className="px-3 py-1 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-700 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Preview
            </div>
            <div 
              className="px-3 py-3 min-h-[200px] overflow-y-auto text-sm leading-relaxed"
              style={{ height: `${(rows * 1.5) + 1.5}em` }}
            >
              {value ? (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderPreview(value)) }} 
                />
              ) : (
                <div className="text-gray-400 italic">Preview will appear here as you type...</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer with character count and formatting help */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Supports: **bold** *italic* `code` # headers - lists [links](url)</span>
          {value && (
            <span className="text-blue-600 flex items-center gap-1">
              • Click
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              for full preview
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {maxLength && (
            <div className={`${isOverLimit ? 'text-red-600' : characterCount > maxLength * 0.9 ? 'text-yellow-600' : 'text-gray-500'}`}>
              {characterCount}{maxLength && ` / ${maxLength}`}
            </div>
          )}
        </div>
      </div>

      {/* Animation Styles */}
      <style jsx="true">{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;