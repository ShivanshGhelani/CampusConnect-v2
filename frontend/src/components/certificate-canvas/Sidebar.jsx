import React, { useState, useEffect } from 'react';
import DimensionSelector from './DimensionSelector';

const Sidebar = ({ onTemplateLoad }) => {
    const [selectedDimension, setSelectedDimension] = useState('landscape');

    // Listen for dimension changes
    useEffect(() => {
        const handleDimensionChange = (event) => {
            // Handle both possible event structures
            const newDimension = event.detail.dimension || event.detail.id || event.detail.orientation;
            if (newDimension) {
                console.log('📋 Sidebar updating dimension to:', newDimension);
                setSelectedDimension(newDimension);
            }
        };

        const handleDimensionUpdate = (event) => {
            const { selectedDimension: newDimension } = event.detail;
            if (newDimension) {
                console.log('📋 Sidebar updating dimension via updateDimensionSelector to:', newDimension);
                setSelectedDimension(newDimension);
            }
        };

        window.addEventListener('dimensionChanged', handleDimensionChange);
        window.addEventListener('updateDimensionSelector', handleDimensionUpdate);
        
        return () => {
            window.removeEventListener('dimensionChanged', handleDimensionChange);
            window.removeEventListener('updateDimensionSelector', handleDimensionUpdate);
        };
    }, []);

    return (
        <div className='w-90 h-screen bg-white border-r border-gray-200 flex flex-col overflow-hidden'>
            {/* Header */}
            <div className='p-4 border-b border-gray-200 flex items-center justify-start'>
                <div className="flex items-center space-x-3">
                    <img
                        src="/logo/ksv.png"
                        alt="KSV Logo"
                        className="h-8 w-8 object-contain"
                    />
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            Campus<span className="text-blue-600">Connect</span>
                        </h1>
                        <p className="text-sm text-gray-500">
                            DesignMyCert
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <DimensionSelector />
                
                {/* Template Guidelines */}
                <div className="p-4">
                    <div className="flex items-center mb-4">
                        <div className="bg-green-100 p-2 rounded-lg mr-3">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Template Guidelines</h2>
                    </div>
                    
                    <div className="space-y-4">
                        {/* Required Placeholders */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                Required Placeholders
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">[Event Name]</code>
                                    <span className="text-gray-600">- Will be replaced with the actual event name</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">[Participant Name]</code>
                                    <span className="text-gray-600">- Will be replaced with participant's name</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">[Team Name]</code>
                                    <span className="text-gray-600">- Will be replaced with team name (for team-based events)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">[Event Date]</code>
                                    <span className="text-gray-600">- Will be replaced with event date</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">[Organization]</code>
                                    <span className="text-gray-600">- Will be replaced with organizing department</span>
                                </div>
                            </div>
                        </div>

                        {/* Optional Placeholders */}
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h3 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                                Optional Placeholders
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <code className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-mono">[Certificate ID]</code>
                                    <span className="text-gray-600">- Unique certificate identifier</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-mono">[Issue Date]</code>
                                    <span className="text-gray-600">- Certificate generation date</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-mono">[Event Duration]</code>
                                    <span className="text-gray-600">- Event duration or hours</span>
                                </div>
                            </div>
                        </div>

                        {/* Bracket Types Info */}
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h3 className="text-sm font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                                Supported Bracket Types
                            </h3>
                            <div className="text-sm text-gray-600">
                                <p className="mb-2">You can use any of these bracket types for placeholders:</p>
                                <div className="flex flex-wrap gap-2">
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-mono">[text]</code>
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-mono">{'{{text}}'}</code>
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-mono">{'{ text }'}</code>
                                    <code className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-mono">(text)</code>
                                </div>
                                <p className="text-xs text-yellow-700 mt-2 italic">All bracket types will be automatically detected and replaced</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
