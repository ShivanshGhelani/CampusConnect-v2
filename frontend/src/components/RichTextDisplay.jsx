import React from 'react';
import { sanitizeHtml } from '../utils/sanitizer';

const RichTextDisplay = ({ 
  content, 
  className = '',
  maxLength = null,
  showReadMore = true 
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!content) return null;

  // Convert markdown-like formatting to HTML
  const formatContent = (text) => {
    if (!text) return '';
    
    let formatted = text
      // Bold text: **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      
      // Italic text: *text* or _text_
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      .replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>')
      
      // Code blocks: `text`
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      
      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
      
      // Headers: # Header, ## Header, ### Header
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-900">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2 text-gray-900">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-3 text-gray-900">$1</h1>')
      
      // Unordered lists: - item or * item
      .replace(/^[-*] (.+)$/gm, '<li class="ml-4 mb-1">• $1</li>')
      
      // Numbered lists: 1. item (simplified)
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>');

    // Handle line breaks and paragraphs
    const lines = formatted.split('\n');
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '') {
        // Empty line - add paragraph break if previous line wasn't a header or list item
        if (processedLines.length > 0 && 
            !processedLines[processedLines.length - 1].includes('<h') &&
            !processedLines[processedLines.length - 1].includes('<li')) {
          processedLines.push('<br class="block mt-3">');
        }
      } else if (line.startsWith('<h') || line.startsWith('<li')) {
        // Headers and list items - add as is
        processedLines.push(line);
      } else {
        // Regular text - wrap in paragraph
        processedLines.push(`<p class="text-gray-700 leading-relaxed mb-2">${line}</p>`);
      }
    }

    return processedLines.join('\n');
  };

  const formattedContent = formatContent(content);
  
  // Handle content truncation
  const shouldTruncate = maxLength && content.length > maxLength && !isExpanded;
  const displayContent = shouldTruncate 
    ? formatContent(content.substring(0, maxLength) + '...') 
    : formattedContent;

  // Sanitize HTML to prevent XSS attacks using DOMPurify
  // sanitizeHtml() wraps DOMPurify.sanitize() with strict configuration
  // This removes all potentially malicious HTML/JavaScript before rendering
  const safeContent = sanitizeHtml(displayContent);

  return (
    <div className={`rich-text-content ${className}`}>
      {/* Content is sanitized with DOMPurify before rendering - XSS protected */}
      <div 
        dangerouslySetInnerHTML={{ __html: safeContent }}
        className="prose prose-sm max-w-none"
      />
      
      {/* Read more/less toggle */}
      {maxLength && content.length > maxLength && showReadMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none focus:underline"
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
};

export default RichTextDisplay;