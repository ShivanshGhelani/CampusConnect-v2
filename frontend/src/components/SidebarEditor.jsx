import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { parseStyles, stringifyStyles } from '../utils/domUtils';

const SidebarEditor = ({ 
  selectedField, 
  onFieldUpdate, 
  onExport 
}) => {
  const [fieldContent, setFieldContent] = useState('');
  const [fieldStyles, setFieldStyles] = useState({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (selectedField) {
      setFieldContent(selectedField.content || '');
      setFieldStyles(parseStyles(selectedField.styles || ''));
    } else {
      setFieldContent('');
      setFieldStyles({});
    }
  }, [selectedField]);

  const handleContentChange = (value) => {
    setFieldContent(value);
    updateField({ content: value });
  };

  const handleStyleChange = (property, value) => {
    const newStyles = { ...fieldStyles, [property]: value };
    setFieldStyles(newStyles);
    updateField({ styles: stringifyStyles(newStyles) });
  };

  const updateField = (updates) => {
    if (selectedField && onFieldUpdate) {
      onFieldUpdate(selectedField.id, updates);
    }
  };

  const handleExport = async (format) => {
    if (!onExport) return;
    
    setIsExporting(true);
    try {
      await onExport(format);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getFontSizeNumber = (fontSize) => {
    if (!fontSize) return 16;
    return parseInt(fontSize.replace('px', '')) || 16;
  };

  const formatFontSize = (size) => {
    return `${size}px`;
  };

  const commonColors = [
    '#000000', '#333333', '#666666', '#999999',
    '#FFFFFF', '#F3F4F6', '#E5E7EB', '#D1D5DB',
    '#EF4444', '#F97316', '#EAB308', '#22C55E',
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'
  ];

  if (!selectedField) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <i className="fas fa-edit text-blue-600 mr-3"></i>
          Field Editor
        </h3>
        
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-mouse-pointer text-2xl text-gray-400"></i>
          </div>
          <h4 className="text-base font-medium text-gray-900 mb-2">No Field Selected</h4>
          <p className="text-sm text-gray-600">
            Click on any editable text in the certificate preview to start editing.
          </p>
        </div>

        {/* Export Section - Always Available */}
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-download text-green-600 mr-2"></i>
            Export Certificate
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="png">PNG Image</option>
                <option value="pdf">PDF Document</option>
              </select>
            </div>
            
            <button
              onClick={() => handleExport(exportFormat)}
              disabled={isExporting}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                isExporting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isExporting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Exporting...
                </>
              ) : (
                <>
                  <i className="fas fa-download mr-2"></i>
                  Export as {exportFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <i className="fas fa-edit text-blue-600 mr-3"></i>
        Field Editor
      </h3>

      {/* Field Info */}
      <div className="bg-blue-50 rounded-lg p-3 mb-6">
        <div className="flex items-center">
          <i className="fas fa-tag text-blue-600 mr-2"></i>
          <span className="text-sm font-medium text-blue-900">
            Editing: {selectedField.id}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Content Editor */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Text Content
          </label>
          <textarea
            value={fieldContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Enter text content..."
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Font Size
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="8"
              max="72"
              value={getFontSizeNumber(fieldStyles['font-size'])}
              onChange={(e) => handleStyleChange('font-size', formatFontSize(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium text-gray-700 w-12">
              {getFontSizeNumber(fieldStyles['font-size'])}px
            </span>
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Text Color
          </label>
          
          {/* Common Colors */}
          <div className="grid grid-cols-8 gap-2 mb-3">
            {commonColors.map((color) => (
              <button
                key={color}
                onClick={() => handleStyleChange('color', color)}
                className={`w-6 h-6 rounded border-2 transition-all duration-150 ${
                  fieldStyles.color === color
                    ? 'border-blue-500 scale-110'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>

          {/* Custom Color Picker Toggle */}
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            <i className="fas fa-palette mr-2"></i>
            Custom Color
          </button>

          {/* Color Picker */}
          {showColorPicker && (
            <div className="mt-3">
              <HexColorPicker
                color={fieldStyles.color || '#000000'}
                onChange={(color) => handleStyleChange('color', color)}
                className="w-full"
              />
              <div className="mt-2 flex items-center space-x-2">
                <input
                  type="text"
                  value={fieldStyles.color || '#000000'}
                  onChange={(e) => handleStyleChange('color', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="#000000"
                />
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Font Weight */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Font Weight
          </label>
          <select
            value={fieldStyles['font-weight'] || 'normal'}
            onChange={(e) => handleStyleChange('font-weight', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
            <option value="lighter">Light</option>
            <option value="100">Thin (100)</option>
            <option value="300">Light (300)</option>
            <option value="400">Regular (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi Bold (600)</option>
            <option value="700">Bold (700)</option>
            <option value="900">Black (900)</option>
          </select>
        </div>

        {/* Text Align */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Text Alignment
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: 'left', icon: 'fa-align-left' },
              { value: 'center', icon: 'fa-align-center' },
              { value: 'right', icon: 'fa-align-right' },
              { value: 'justify', icon: 'fa-align-justify' }
            ].map((align) => (
              <button
                key={align.value}
                onClick={() => handleStyleChange('text-align', align.value)}
                className={`py-2 px-3 border rounded-lg transition-colors duration-200 ${
                  fieldStyles['text-align'] === align.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <i className={`fas ${align.icon}`}></i>
              </button>
            ))}
          </div>
        </div>

        {/* Export Section */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-download text-green-600 mr-2"></i>
            Export Certificate
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="png">PNG Image</option>
                <option value="pdf">PDF Document</option>
              </select>
            </div>
            
            <button
              onClick={() => handleExport(exportFormat)}
              disabled={isExporting}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                isExporting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isExporting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Exporting...
                </>
              ) : (
                <>
                  <i className="fas fa-download mr-2"></i>
                  Export as {exportFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarEditor;
