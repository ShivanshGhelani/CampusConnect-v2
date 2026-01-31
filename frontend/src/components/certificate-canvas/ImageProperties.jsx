import React, { useEffect, useMemo, useState } from 'react';
import { FaArrowsAltH, FaArrowsAltV, FaSun, FaAdjust, FaTint, FaEraser, FaCrop, FaTrash } from 'react-icons/fa';

const parseFilter = (filterStr) => {
  const d = { brightness: 100, contrast: 100, saturate: 100, grayscale: 0 };
  if (!filterStr || filterStr === 'none') return d;
  const m = {
    brightness: /brightness\(([^)]+)\)/,
    contrast: /contrast\(([^)]+)\)/,
    saturate: /saturate\(([^)]+)\)/,
    grayscale: /grayscale\(([^)]+)\)/,
  };
  for (const k of Object.keys(m)) {
    const r = filterStr.match(m[k]);
    if (r) {
      const v = r[1].trim();
      d[k] = v.endsWith('%') ? parseFloat(v) : parseFloat(v) * 100; // support 0-1 and %
    }
  }
  return d;
};

const buildFilter = ({ brightness, contrast, saturate, grayscale }) => {
  const parts = [];
  parts.push(`brightness(${brightness}%)`);
  parts.push(`contrast(${contrast}%)`);
  parts.push(`saturate(${saturate}%)`);
  if (grayscale > 0) parts.push(`grayscale(${grayscale}%)`);
  return parts.join(' ');
};

const parseClipPath = (cp) => {
  // Expecting inset(T% R% B% L%)
  const d = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!cp || cp === 'none') return d;
  const m = cp.match(/inset\(([^)]+)\)/);
  if (!m) return d;
  const parts = m[1].split(/\s+/);
  const vals = parts.map((p) => (p.endsWith('%') ? parseFloat(p) : parseFloat(p)) || 0);
  if (vals.length === 4) {
    return { top: vals[0], right: vals[1], bottom: vals[2], left: vals[3] };
  }
  return d;
};

const ImageProperties = ({ selectedElement }) => {
  const [transform, setTransform] = useState('none');
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0 });
  const [crop, setCrop] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [showCrop, setShowCrop] = useState(false);

  const isImage = useMemo(() => selectedElement?.tagName === 'IMG', [selectedElement]);

  useEffect(() => {
    if (!selectedElement || !isImage) return;
    const cs = getComputedStyle(selectedElement);
    setTransform(cs.transform === 'none' ? 'none' : cs.transform);
    setFilters(parseFilter(cs.filter));
    setCrop(parseClipPath(cs.clipPath));
  }, [selectedElement, isImage]);

  if (!selectedElement || !isImage) return null;

  const applyTransform = (next) => {
    selectedElement.style.transform = next || 'none';
    setTransform(next || 'none');
  };

  const toggleFlip = (axis) => {
    const t = transform === 'none' ? '' : transform;
    const token = axis === 'x' ? 'scaleX(-1)' : 'scaleY(-1)';
    const has = t.includes(token);
    const cleaned = t.replace(/scaleX\(-1\)/g, '').replace(/scaleY\(-1\)/g, '').trim();
    const next = has ? cleaned || 'none' : `${cleaned} ${token}`.trim();
    applyTransform(next);
  };

  const applyFilters = (next) => {
    const str = buildFilter(next);
    selectedElement.style.filter = str;
    setFilters(next);
  };

  const updateFilter = (key, val) => {
    const next = { ...filters, [key]: val };
    applyFilters(next);
  };

  const resetFilters = () => applyFilters({ brightness: 100, contrast: 100, saturate: 100, grayscale: 0 });

  const applyCrop = (next) => {
    const { top, right, bottom, left } = next;
    const str = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
    selectedElement.style.clipPath = str;
    setCrop(next);
  };

  const updateCrop = (side, val) => applyCrop({ ...crop, [side]: val });

  const deleteElement = () => selectedElement?.remove();

  return (
    <div className="sticky top-0 z-30 w-full bg-transparent">
      <div className="mx-auto my-2 w-fit max-w-full rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-md">
        <div className="inline-flex max-w-full items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Flip */}
          <button className="h-9 rounded-md px-3 text-sm hover:bg-gray-100" onClick={() => toggleFlip('x')} title="Flip horizontal"><FaArrowsAltH /></button>
          <button className="h-9 rounded-md px-3 text-sm hover:bg-gray-100" onClick={() => toggleFlip('y')} title="Flip vertical"><FaArrowsAltV /></button>

          <div className="mx-1 h-6 w-px bg-gray-200" />

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-600" title="Brightness">
              <FaSun className="text-gray-500" />
              <input type="range" min={0} max={200} value={filters.brightness} onChange={(e) => updateFilter('brightness', parseInt(e.target.value))} />
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600" title="Contrast">
              <FaAdjust className="text-gray-500" />
              <input type="range" min={0} max={200} value={filters.contrast} onChange={(e) => updateFilter('contrast', parseInt(e.target.value))} />
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600" title="Saturation">
              <FaTint className="text-gray-500" />
              <input type="range" min={0} max={200} value={filters.saturate} onChange={(e) => updateFilter('saturate', parseInt(e.target.value))} />
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600" title="Grayscale">
              <span className="text-xs text-gray-500">GS</span>
              <input type="range" min={0} max={100} value={filters.grayscale} onChange={(e) => updateFilter('grayscale', parseInt(e.target.value))} />
            </div>
            <button className="h-9 rounded-md px-3 text-sm hover:bg-gray-100" onClick={resetFilters} title="Reset filters"><FaEraser /></button>
          </div>

          <div className="mx-1 h-6 w-px bg-gray-200" />

          {/* Crop (clip-path) */}
          <button className="h-9 rounded-md px-3 text-sm hover:bg-gray-100" onClick={() => setShowCrop((v) => !v)} title="Crop">
            <FaCrop />
          </button>
          {showCrop && (
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <span>T</span>
              <input type="range" min={0} max={90} value={crop.top} onChange={(e) => updateCrop('top', parseInt(e.target.value))} />
              <span>R</span>
              <input type="range" min={0} max={90} value={crop.right} onChange={(e) => updateCrop('right', parseInt(e.target.value))} />
              <span>B</span>
              <input type="range" min={0} max={90} value={crop.bottom} onChange={(e) => updateCrop('bottom', parseInt(e.target.value))} />
              <span>L</span>
              <input type="range" min={0} max={90} value={crop.left} onChange={(e) => updateCrop('left', parseInt(e.target.value))} />
            </div>
          )}

          {/* Delete */}
          <div className="mx-1 h-6 w-px bg-gray-200" />
          <button className="h-9 rounded-md px-2 text-red-500 hover:bg-red-50" onClick={() => deleteElement()} title="Delete"><FaTrash /></button>
        </div>
      </div>
    </div>
  );
};

export default ImageProperties;
