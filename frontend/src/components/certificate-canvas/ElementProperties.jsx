import React, { useEffect, useMemo, useState } from 'react';
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaTrash,
  FaTextHeight,
} from 'react-icons/fa';

// Convert computed rgb/rgba color to hex for the color input
function rgbToHex(rgb) {
  if (!rgb) return '#000000';
  if (rgb.startsWith('#')) return rgb;
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return '#000000';
  const toHex = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
}

// Font collection organized by category (50+ fonts)
const FONTS = {
  'Sans Serif': [
    'Arial',
    'Helvetica',
    'Verdana',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Raleway',
    'Ubuntu',
    'Nunito',
    'Source Sans Pro',
    'PT Sans',
    'Work Sans',
    'Mulish',
    'Quicksand',
    'Barlow',
    'Oxygen',
    'Karla',
    'Inter',
  ],
  'Serif': [
    'Times New Roman',
    'Georgia',
    'Playfair Display',
    'Merriweather',
    'Lora',
    'Libre Baskerville',
    'Cormorant Garamond',
    'EB Garamond',
    'Crimson Text',
    'Bitter',
    'Cardo',
    'Vollkorn',
    'Domine',
    'Spectral',
    'Arvo',
  ],
  'Display': [
    'Bebas Neue',
    'Righteous',
    'Abril Fatface',
    'Archivo Black',
    'Comfortaa',
    'Fredoka',
    'Passion One',
    'Fjalla One',
    'Anton',
    'Alfa Slab One',
  ],
  'Handwriting': [
    'Dancing Script',
    'Great Vibes',
    'Allura',
    'Parisienne',
    'Sacramento',
    'Tangerine',
    'Satisfy',
    'Kaushan Script',
    'Cookie',
    'Caveat',
    'Patrick Hand',
    'Indie Flower',
    'Shadows Into Light',
    'Amatic SC',
  ],
  'Elegant': [
    'Cinzel',
    'Playfair Display',
    'Bodoni Moda',
    'Unna',
    'Italiana',
    'Philosopher',
  ]
};

const ElementProperties = ({ selectedElement }) => {
  const [styleState, setStyleState] = useState({
    fontSize: 16,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    color: '#000000',
    textTransform: 'none',
    lineHeight: 1.2,
    letterSpacing: 0,
  });

  // Initialize from computed style when selection changes
  useEffect(() => {
    if (!selectedElement) return;
    const cs = getComputedStyle(selectedElement);
    setStyleState({
      fontSize: parseInt(cs.fontSize) || 16,
      fontFamily: (cs.fontFamily?.split(',')[0] || 'Arial').replace(/"/g, ''),
      fontWeight: cs.fontWeight || 'normal',
      fontStyle: cs.fontStyle || 'normal',
      textDecoration: cs.textDecoration || 'none',
      textAlign: cs.textAlign || 'left',
      color: rgbToHex(cs.color),
      textTransform: cs.textTransform || 'none',
      lineHeight: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) || 1.2,
      letterSpacing: parseFloat(cs.letterSpacing) || 0,
    });
  }, [selectedElement]);

  const isText = useMemo(() => {
    if (!selectedElement) return false;
    // Check if it's an IMG first
    if (selectedElement.tagName === 'IMG') return false;
    // For all other elements, assume they can have text
    return true;
  }, [selectedElement]);

  const apply = (prop, value) => {
    if (!selectedElement) return;
    selectedElement.style[prop] = value;
    setStyleState((s) => ({ ...s, [prop]: value }));
  };


  const incFont = (delta) => {
    const next = Math.max(6, (Number(styleState.fontSize) || 16) + delta);
    apply('fontSize', `${next}px`);
    setStyleState((s) => ({ ...s, fontSize: next }));
  };

  const toggleTextDecoration = (part) => {
    const parts = new Set((styleState.textDecoration || 'none').split(/\s+/).filter(Boolean));
    if (parts.has('none')) parts.delete('none');
    parts.has(part) ? parts.delete(part) : parts.add(part);
    if (parts.size === 0) parts.add('none');
    const next = Array.from(parts).join(' ');
    apply('textDecoration', next);
  };

  const cycleCase = () => {
    const order = ['none', 'uppercase', 'lowercase', 'capitalize'];
    const idx = order.indexOf(styleState.textTransform);
    const next = order[(idx + 1) % order.length];
    apply('textTransform', next);
  };

  const setAlign = (val) => {
    if (!selectedElement) return;
    
    // For contentEditable elements using flexbox, we need to adjust justify-content
    const display = window.getComputedStyle(selectedElement).display;
    
    if (display === 'flex') {
      // Using flexbox - set justify-content for horizontal alignment
      const justifyMap = {
        'left': 'flex-start',
        'center': 'center',
        'right': 'flex-end',
        'justify': 'space-between'
      };
      selectedElement.style.justifyContent = justifyMap[val] || 'flex-start';
    }
    
    // Also set textAlign for text content
    selectedElement.style.textAlign = val;
    
    // Update state
    setStyleState(s => ({ ...s, textAlign: val }));
    
    // Force a repaint
    selectedElement.offsetHeight;
  };

  const setLineHeight = (val) => {
    // line-height can be unitless multiplier
    apply('lineHeight', String(val));
    setStyleState((s) => ({ ...s, lineHeight: Number(val) }));
  };

  const setLetterSpacing = (val) => {
    apply('letterSpacing', `${val}px`);
    setStyleState((s) => ({ ...s, letterSpacing: Number(val) }));
  };

  const onColor = (hex) => apply('color', hex);

  const deleteElement = () => {
    if (!selectedElement) return;
    selectedElement.remove();
  };

  // Only show the toolbar for text elements that are properly selected AND have text content
  // Template elements get their own special properties panel
  if (!selectedElement || 
      selectedElement.tagName === 'IMG' || 
      (selectedElement.dataset?.type !== 'text' && !selectedElement.classList?.contains('template-element')) ||
      !selectedElement.isConnected ||
      (selectedElement.dataset?.type === 'text' && (selectedElement.textContent.trim() === '' || selectedElement.textContent.trim() === 'Text must be present'))) {
    
    // Show template-specific properties for template elements
    if (selectedElement?.classList?.contains('template-element')) {
      return (
        <div className="w-full bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-full px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              <h3 className="text-sm font-semibold text-gray-700">Template Properties</h3>
              
              {/* Opacity Slider */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  defaultValue="1"
                  className="w-20"
                  onChange={(e) => {
                    if (selectedElement) {
                      selectedElement.style.opacity = e.target.value;
                    }
                  }}
                />
              </div>

              {/* Z-Index Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Layer:</span>
                <button
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => {
                    if (selectedElement) {
                      selectedElement.style.zIndex = '999';
                    }
                  }}
                >
                  Front
                </button>
                <button
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  onClick={() => {
                    if (selectedElement) {
                      selectedElement.style.zIndex = '1';
                    }
                  }}
                >
                  Back
                </button>
              </div>

              {/* Replace Template Button */}
              <button
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                onClick={() => {
                  if (selectedElement && window.templateManager) {
                    window.templateManager.replaceTemplateBackground(selectedElement);
                  }
                }}
              >
                Replace Template
              </button>

              {/* Delete Template Button */}
              <button
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => {
                  if (selectedElement && window.templateManager) {
                    window.templateManager.removeTemplateElement(selectedElement);
                  }
                }}
              >
                <FaTrash className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  }

  return (
    <div className="w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-full px-4 py-3">
        <div className="flex items-center justify-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Font family with preview */}
          <select
            className="h-8 rounded border border-gray-300 px-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[160px]"
            style={{ fontFamily: styleState.fontFamily }}
            value={styleState.fontFamily}
            onChange={(e) => apply('fontFamily', e.target.value)}
          >
            {Object.entries(FONTS).map(([category, fonts]) => (
              <optgroup key={category} label={category}>
                {fonts.map(font => (
                  <option 
                    key={font} 
                    value={font}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

              {/* Size stepper */}
              <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-gray-300">
                <button
                  className="px-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => incFont(-1)}
                >
                  −
                </button>
                <input
                  type="number"
                  className="w-14 border-x border-gray-300 text-center text-sm outline-none"
                  value={styleState.fontSize}
                  onChange={(e) => {
                    const v = Math.max(6, Number(e.target.value || 0));
                    apply('fontSize', `${v}px`);
                    setStyleState((s) => ({ ...s, fontSize: v }));
                  }}
                />
                <button
                  className="px-2 text-gray-700 hover:bg-gray-100"
                  onClick={() => incFont(1)}
                >
                  +
                </button>
              </div>

              {/* Color (A with active color underline) */}
              <label className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer">
                <span className="text-base font-semibold" style={{ color: styleState.color }}>A</span>
                <span 
                  className="pointer-events-none absolute -bottom-0.5 h-1 w-5 rounded-full"
                  style={{ backgroundColor: styleState.color }}
                />
                <input
                  type="color"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  value={styleState.color}
                  onChange={(e) => onColor(e.target.value)}
                />
              </label>

              {/* B I U S */}
              <div className="mx-1 h-6 w-px bg-gray-200" />
              <button
                className={`h-9 rounded-md px-2 transition-colors ${Number(styleState.fontWeight) >= 700 || styleState.fontWeight === 'bold' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'hover:bg-gray-100'}`}
                onClick={() => apply('fontWeight', Number(styleState.fontWeight) >= 700 || styleState.fontWeight === 'bold' ? '400' : '700')}
                title="Bold"
              >
                <FaBold />
              </button>
              <button
                className={`h-9 rounded-md px-2 transition-colors ${styleState.fontStyle === 'italic' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'hover:bg-gray-100'}`}
                onClick={() => apply('fontStyle', styleState.fontStyle === 'italic' ? 'normal' : 'italic')}
                title="Italic"
              >
                <FaItalic />
              </button>
              <button
                className={`h-9 rounded-md px-2 transition-colors ${styleState.textDecoration.includes('underline') ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'hover:bg-gray-100'}`}
                onClick={() => toggleTextDecoration('underline')}
                title="Underline"
              >
                <FaUnderline />
              </button>
              <button
                className={`h-9 rounded-md px-2 transition-colors ${styleState.textDecoration.includes('line-through') ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'hover:bg-gray-100'}`}
                onClick={() => toggleTextDecoration('line-through')}
                title="Strikethrough"
              >
                <FaStrikethrough />
              </button>

              {/* aA (case) */}
              <button
                className={`h-9 rounded-md px-2 text-sm font-semibold transition-colors ${styleState.textTransform !== 'none' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'hover:bg-gray-100'}`}
                onClick={cycleCase}
                title="Text case"
              >
                aA
              </button>

              {/* Alignment */}
              <div className="mx-1 h-6 w-px bg-gray-200" />
              <button 
                className={`h-9 rounded-md px-2 transition-colors ${styleState.textAlign === 'left' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'hover:bg-gray-100'}`} 
                onClick={() => setAlign('left')} 
                title="Align left"
              >
                <FaAlignLeft />
              </button>
              <button 
                className={`h-9 rounded-md px-2 transition-colors ${styleState.textAlign === 'center' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'hover:bg-gray-100'}`} 
                onClick={() => setAlign('center')} 
                title="Align center"
              >
                <FaAlignCenter />
              </button>
              <button 
                className={`h-9 rounded-md px-2 transition-colors ${styleState.textAlign === 'right' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'hover:bg-gray-100'}`} 
                onClick={() => setAlign('right')} 
                title="Align right"
              >
                <FaAlignRight />
              </button>
              <button 
                className={`h-9 rounded-md px-2 transition-colors ${styleState.textAlign === 'justify' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'hover:bg-gray-100'}`} 
                onClick={() => setAlign('justify')} 
                title="Justify"
              >
                <FaAlignJustify />
              </button>

              {/* Line height & Letter spacing */}
              <div className="mx-1 h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-1">
                <FaTextHeight className="text-gray-500" />
                <select
                  className="h-9 rounded-md border border-gray-300 px-1 text-sm outline-none hover:bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={Number(styleState.lineHeight).toFixed(1)}
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                >
                  {[0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0].map((v) => (
                    <option key={v} value={v}>{v.toFixed(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">LS</span>
                <div className="flex items-center gap-1 bg-gray-100 rounded-md px-2 py-1">
                  <button
                    className="w-6 h-6 text-xs text-gray-600 hover:bg-gray-200 rounded flex items-center justify-center"
                    onClick={() => setLetterSpacing(Math.max(-2, styleState.letterSpacing - 0.5))}
                  >
                    −
                  </button>
                  <span className="text-xs font-mono w-8 text-center">
                    {styleState.letterSpacing.toFixed(1)}
                  </span>
                  <button
                    className="w-6 h-6 text-xs text-gray-600 hover:bg-gray-200 rounded flex items-center justify-center"
                    onClick={() => setLetterSpacing(Math.min(10, styleState.letterSpacing + 0.5))}
                  >
                    +
                  </button>
                </div>
              </div>
          {/* Delete */}
          <div className="mx-1 h-6 w-px bg-gray-200" />
          <button className="h-9 rounded-md px-2 text-red-500 hover:bg-red-50" onClick={deleteElement} title="Delete"><FaTrash /></button>
        </div>
      </div>
    </div>
  );
};

export default ElementProperties;