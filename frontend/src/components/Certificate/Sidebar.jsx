import { useState } from 'react'

const Sidebar = ({ cssFramework, pageOrientation, onFrameworkChange, onOrientationChange }) => {
  return (
    <div className="w-64 bg-gray-800 text-white shadow-lg border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white">HTML Editor</h2>
        <p className="text-sm text-gray-400 mt-1">Configure your document</p>
      </div>

      {/* Controls */}
      <div className="flex-1 p-4 space-y-6">
        {/* CSS Framework Toggle */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
            </svg>
            CSS Framework
          </h3>
          
          <div className="bg-gray-700 rounded-lg p-1 flex">
            <button
              onClick={() => onFrameworkChange('tailwind')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                cssFramework === 'tailwind'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              Tailwind
            </button>
            <button
              onClick={() => onFrameworkChange('bootstrap')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                cssFramework === 'bootstrap'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              Bootstrap
            </button>
          </div>
        </div>

        {/* Page Orientation Toggle */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center">
            <svg className="w-4 h-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            Page Orientation
          </h3>
          
          <div className="bg-gray-700 rounded-lg p-1 flex">
            <button
              onClick={() => onOrientationChange('portrait')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                pageOrientation === 'portrait'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z" clipRule="evenodd" />
              </svg>
              Portrait
            </button>
            <button
              onClick={() => onOrientationChange('landscape')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                pageOrientation === 'landscape'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              <svg className="w-3 h-3 mr-1 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z" clipRule="evenodd" />
              </svg>
              Landscape
            </button>
          </div>
        </div>

        {/* Page Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center">
            <svg className="w-4 h-4 mr-2 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Document Info
          </h3>
          
          <div className="bg-gray-700 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Page Size:</span>
              <span className="font-medium text-gray-200">A4</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Orientation:</span>
              <span className="font-medium text-gray-200 capitalize">{pageOrientation}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Dimensions:</span>
              <span className="font-medium text-gray-200">
                {pageOrientation === 'portrait' ? '210×297mm' : '297×210mm'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Framework:</span>
              <span className="font-medium text-gray-200 capitalize">{cssFramework}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 text-center">
          HTML Code Editor
          <br />
          <span className="text-blue-400">Ready to code!</span>
        </div>
      </div>
    </div>
  )
}

export default Sidebar