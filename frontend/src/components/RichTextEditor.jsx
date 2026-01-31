import React, { useState, useRef, useCallback } from 'react';
import { sanitizeHtml } from '../utils/sanitizer';

const RichTextEditor = ({ 
  value = '', 
  onChange, 
  placeholder = 'Enter your text here...', 
  className = '',
  error = false,
  rows = 6,
  maxLength = null 
}) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
      // Bold text: **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/__(.*?)__/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      
      // Italic text: *text* or _text_
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic text-gray-800">$1</em>')
      .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="italic text-gray-800">$1</em>')
      
      // Code blocks: `text`
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>')
      
      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1 🔗</a>')
      
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
    
    if (maxLength && newValue.length > maxLength) {
      return; // Don't allow exceeding max length
    }
    
    onChange(newValue);
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
      switch (e.key) {
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
        default:
          break;
      }
    }
  };

  const characterCount = value ? value.length : 0;
  const isOverLimit = maxLength && characterCount > maxLength;

  return (
    <div className={`relative border rounded-md ${error ? 'border-red-300' : 'border-gray-300'} ${isFocused ? 'ring-2 ring-blue-500' : ''} ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-md">
        <div className="flex items-center gap-1">
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
          🔗
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
              ℹ️
            </button>
            
            {/* Floating Help Tooltip */}
            <div className="absolute right-0 top-8 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">✨</span>
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
                <strong>💡 Pro Tips:</strong><br/>
                • Use Ctrl+B for bold, Ctrl+I for italic<br/>
                • Import .md or .txt files with the folder button<br/>
                • Click preview to see formatted result
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleFileImport}
            className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded text-sm transition-colors"
            title="Import from file (.txt, .md)"
          >
            <svg  xmlns="http://www.w3.org/2000/svg"  width="18"  height="18"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-folder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" /></svg>
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`p-1.5 rounded text-sm transition-colors ${showPreview ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`}
            title="Toggle Preview"
          >
            👁️
          </button>
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
            <div className="px-3 py-1 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-700">
              ✏️ Write
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
            <div className="px-3 py-1 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-700">
              👁️ Preview
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
            <span className="text-blue-600">• Click 👁️ for full preview</span>
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
    </div>
  );
};

export default RichTextEditor;