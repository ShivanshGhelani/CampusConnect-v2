import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../ui/Alert';
import Dropdown from '../../ui/Dropdown';
import dropdownOptionsService from '../../../services/dropdownOptionsService';
import AdminLayout from '../AdminLayout';

const DropdownManagement = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [selectedCategory, setSelectedCategory] = useState('student');
  const [selectedType, setSelectedType] = useState('departments');
  const [options, setOptions] = useState([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [newOption, setNewOption] = useState({ value: '', label: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportExport, setShowImportExport] = useState(false);
  const [importData, setImportData] = useState('');

  const schema = dropdownOptionsService.getSchema();

  // Check if user is super admin
  if (!user || user.role !== 'super_admin') {
    return (
      <AdminLayout pageTitle="Dropdown Management">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12 max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m11-7a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">Only Super Administrators can manage dropdown options.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Load options when category/type changes
  useEffect(() => {
    loadOptions();
  }, [selectedCategory, selectedType]);

  const loadOptions = () => {
    const currentOptions = dropdownOptionsService.getOptions(selectedCategory, selectedType);
    setOptions(currentOptions);
  };

  const handleAddNew = () => {
    if (!newOption.value.trim() || !newOption.label.trim()) {
      addToast('Please provide both value and label', 'error');
      return;
    }

    const success = dropdownOptionsService.addOption(selectedCategory, selectedType, {
      value: newOption.value.trim(),
      label: newOption.label.trim(),
      description: newOption.description.trim() || undefined
    });

    if (success) {
      addToast('Option added successfully', 'success');
      setNewOption({ value: '', label: '', description: '' });
      setIsAddingNew(false);
      loadOptions();
    } else {
      addToast('Option already exists', 'error');
    }
  };

  const handleEdit = (option) => {
    setEditingOption({ ...option, originalValue: option.value });
  };

  const handleSaveEdit = () => {
    if (!editingOption.value.trim() || !editingOption.label.trim()) {
      addToast('Please provide both value and label', 'error');
      return;
    }

    const success = dropdownOptionsService.updateOption(
      selectedCategory, 
      selectedType, 
      editingOption.originalValue,
      {
        value: editingOption.value.trim(),
        label: editingOption.label.trim(),
        description: editingOption.description?.trim() || undefined
      }
    );

    if (success) {
      addToast('Option updated successfully', 'success');
      setEditingOption(null);
      loadOptions();
    } else {
      addToast('Failed to update option', 'error');
    }
  };

  const handleDelete = (value) => {
    if (window.confirm('Are you sure you want to delete this option?')) {
      const success = dropdownOptionsService.deleteOption(selectedCategory, selectedType, value);
      
      if (success) {
        addToast('Option deleted successfully', 'success');
        loadOptions();
      } else {
        addToast('Failed to delete option', 'error');
      }
    }
  };

  const handleImport = () => {
    try {
      const importedOptions = JSON.parse(importData);
      const success = dropdownOptionsService.importOptions(importedOptions);
      
      if (success) {
        addToast('Options imported successfully', 'success');
        setImportData('');
        setShowImportExport(false);
        loadOptions();
      } else {
        addToast('Failed to import options', 'error');
      }
    } catch (error) {
      addToast('Invalid JSON format', 'error');
    }
  };

  const handleExport = () => {
    const exportData = dropdownOptionsService.exportOptions();
    navigator.clipboard.writeText(exportData).then(() => {
      addToast('Options copied to clipboard', 'success');
    });
  };

  const handleResetToDefault = () => {
    if (window.confirm('Are you sure you want to reset all options to default? This cannot be undone.')) {
      dropdownOptionsService.resetToDefault();
      addToast('Options reset to default', 'success');
      loadOptions();
    }
  };

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryOptions = Object.keys(schema).map(key => ({
    value: key,
    label: schema[key].name
  }));

  const typeOptions = selectedCategory ? Object.keys(schema[selectedCategory].types).map(key => ({
    value: key,
    label: schema[selectedCategory].types[key]
  })) : [];

  return (
    <AdminLayout pageTitle="Dropdown Management">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dropdown Options</h1>
            <p className="text-gray-600 mt-1">Manage form dropdown options across the platform</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImportExport(!showImportExport)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import/Export
            </button>
            <button
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset to Default
            </button>
          </div>
        </div>

        {/* Import/Export Panel */}
        {showImportExport && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import/Export Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Export Current Options</h4>
                <button
                  onClick={handleExport}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to Clipboard
                </button>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Import Options</h4>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Paste JSON data here..."
                  className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <button
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Import Options
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex">
            {/* Sidebar Navigation */}
            <div className="w-80 border-r border-gray-200 bg-gray-50">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories & Types</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <Dropdown
                      options={categoryOptions}
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      placeholder="Select category"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <Dropdown
                      options={typeOptions}
                      value={selectedType}
                      onChange={setSelectedType}
                      placeholder="Select type"
                      disabled={!selectedCategory}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              {selectedCategory && selectedType && (
                <div className="px-6 pb-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Options</span>
                      <span className="text-lg font-semibold text-gray-900">{options.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {schema[selectedCategory]?.types[selectedType] || 'Select Category & Type'}
                    </h3>
                    {selectedCategory && selectedType && (
                      <p className="text-sm text-gray-600 mt-1">
                        Manage {schema[selectedCategory]?.types[selectedType]?.toLowerCase()} for {schema[selectedCategory]?.name?.toLowerCase()}
                      </p>
                    )}
                  </div>
                  
                  {selectedCategory && selectedType && (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search options..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={() => setIsAddingNew(!isAddingNew)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Option
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Form */}
              {isAddingNew && (
                <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Add New Option</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                      <input
                        type="text"
                        value={newOption.value}
                        onChange={(e) => setNewOption({...newOption, value: e.target.value})}
                        placeholder="e.g., computer_science"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                      <input
                        type="text"
                        value={newOption.label}
                        onChange={(e) => setNewOption({...newOption, label: e.target.value})}
                        placeholder="e.g., Computer Science"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={newOption.description}
                        onChange={(e) => setNewOption({...newOption, description: e.target.value})}
                        placeholder="Optional description"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAddNew}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Option
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewOption({ value: '', label: '', description: '' });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Options List */}
              <div className="p-6">
                {!selectedCategory || !selectedType ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select Category & Type</h3>
                    <p className="text-gray-600">Choose a category and type from the sidebar to manage dropdown options.</p>
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Options Found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm ? `No options match "${searchTerm}". Try a different search term.` : 'No options available for this category and type.'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setIsAddingNew(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add First Option
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOptions.map((option, index) => (
                      <div
                        key={option.value}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          {editingOption && editingOption.originalValue === option.value ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <input
                                  type="text"
                                  value={editingOption.value}
                                  onChange={(e) => setEditingOption({...editingOption, value: e.target.value})}
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Value"
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={editingOption.label}
                                  onChange={(e) => setEditingOption({...editingOption, label: e.target.value})}
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Label"
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={editingOption.description || ''}
                                  onChange={(e) => setEditingOption({...editingOption, description: e.target.value})}
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Description"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-gray-900">{option.label}</span>
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-200 text-gray-800 rounded-full">
                                    {option.value}
                                  </span>
                                </div>
                                {option.description && (
                                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {editingOption && editingOption.originalValue === option.value ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setEditingOption(null)}
                                className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(option)}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(option.value)}
                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DropdownManagement;
