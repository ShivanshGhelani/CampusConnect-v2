import React, { useState } from 'react';
import { adminAPI } from '../../../api/admin';
import { Dropdown } from '../../ui';

const UploadForm = ({ 
  onUploadSuccess, 
  isUploading, 
  setIsUploading, 
  availableCategories, 
  formData: externalFormData,
  setFormData: externalSetFormData,
  isFloatingPanel = false
}) => {
  const [internalFormData, setInternalFormData] = useState({
    name: '',
    category: '',
    newCategory: '',
    tags: '',
    file: null
  });
  const [error, setError] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);

  // Use external form data if provided (floating panel), otherwise use internal state
  const formData = externalFormData || internalFormData;
  const setFormData = externalSetFormData || setInternalFormData;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.html')) {
        setError('Please select an HTML file (.html)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        file
      }));
      setError('');
    }
  };

  const handleCategoryToggle = () => {
    setIsNewCategory(!isNewCategory);
    setFormData(prev => ({
      ...prev,
      category: '',
      newCategory: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.file) {
      setError('Please select an HTML file to upload');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Please enter a template name');
      return;
    }
    
    const category = isNewCategory ? formData.newCategory : formData.category;
    if (!category.trim()) {
      setError('Please select or enter a category');
      return;
    }
    
    try {
      setIsUploading(true);
      setError('');
      
      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append('file', formData.file);
      uploadData.append('template_name', formData.name.trim());
      uploadData.append('category', category.trim());
      
      // Add description if provided
      if (formData.tags) {
        uploadData.append('description', formData.tags);
      }
      
      // Upload using the admin API
      const response = await adminAPI.uploadCertificateTemplate(uploadData);
      
      if (response.data.success) {
        // Create template metadata for the parent component
        const newTemplate = response.data.template;
        
        // Reset form
        setFormData({
          name: '',
          category: '',
          newCategory: '',
          tags: '',
          file: null
        });
        
        // Reset file input
        const fileInput = document.getElementById('certificate-file');
        if (fileInput) fileInput.value = '';
        
        onUploadSuccess(newTemplate);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      
      setError(error.response?.data?.message || error.message || 'Failed to upload certificate template');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 ${isFloatingPanel ? 'p-4' : 'p-6'}`}>
      {!isFloatingPanel && (
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <svg className="w-6 h-6 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.413V13H5.5z"/>
          </svg>
          Upload New Template
        </h2>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            {error}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className={`space-y-${isFloatingPanel ? '4' : '6'}`}>
        {/* File Upload */}
        <div>
          <label className={`block text-sm font-medium text-gray-700 ${isFloatingPanel ? 'mb-1' : 'mb-2'}`}>
            HTML Template File *
          </label>
          <div className="relative">
            <input
              id="certificate-file"
              type="file"
              accept=".html"
              onChange={handleFileChange}
              className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 file:cursor-pointer cursor-pointer border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isFloatingPanel ? 'text-xs' : ''}`}
            />
          </div>
          {formData.file && (
            <div className={`${isFloatingPanel ? 'mt-1' : 'mt-2'} flex items-center text-sm text-green-600`}>
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              <span className={isFloatingPanel ? 'text-xs' : ''}>
                {formData.file.name} ({(formData.file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}
        </div>
        
        {/* Template Name */}
        <div>
          <label className={`block text-sm font-medium text-gray-700 ${isFloatingPanel ? 'mb-1' : 'mb-2'}`}>
            Template Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Participation Certificate"
            className={`w-full px-${isFloatingPanel ? '3' : '4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isFloatingPanel ? 'text-sm' : ''}`}
          />
        </div>
        
        {/* Category */}
        <div>
          <label className={`block text-sm font-medium text-gray-700 ${isFloatingPanel ? 'mb-1' : 'mb-2'}`}>
            Category *
          </label>
          <div className={`space-y-${isFloatingPanel ? '2' : '3'}`}>
            <div className="flex items-center">
              <input
                type="radio"
                id="existing-category"
                checked={!isNewCategory}
                onChange={() => !isNewCategory || handleCategoryToggle()}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <label htmlFor="existing-category" className={`ml-2 text-sm text-gray-700 ${isFloatingPanel ? 'text-xs' : ''}`}>
                Use existing category
              </label>
            </div>
            
            {!isNewCategory && (
              <Dropdown
                placeholder="Select a category..."
                value={formData.category}
                onChange={(value) => handleInputChange({ target: { name: 'category', value } })}
                options={availableCategories.map(category => ({ 
                  value: category, 
                  label: category 
                }))}
                size={isFloatingPanel ? "sm" : "md"}
              />
            )}
            
            <div className="flex items-center">
              <input
                type="radio"
                id="new-category"
                checked={isNewCategory}
                onChange={() => isNewCategory || handleCategoryToggle()}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <label htmlFor="new-category" className={`ml-2 text-sm text-gray-700 ${isFloatingPanel ? 'text-xs' : ''}`}>
                Create new category
              </label>
            </div>
            
            {isNewCategory && (
              <input
                type="text"
                name="newCategory"
                value={formData.newCategory}
                onChange={handleInputChange}
                placeholder="e.g., TechFest 2025"
                className={`w-full px-${isFloatingPanel ? '3' : '4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isFloatingPanel ? 'text-sm' : ''}`}
              />
            )}
          </div>
        </div>
        
        {/* Tags */}
        <div>
          <label className={`block text-sm font-medium text-gray-700 ${isFloatingPanel ? 'mb-1' : 'mb-2'}`}>
            Tags (Optional)
          </label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            placeholder="e.g., 2025, event, participation (comma-separated)"
            className={`w-full px-${isFloatingPanel ? '3' : '4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${isFloatingPanel ? 'text-sm' : ''}`}
          />
          <p className={`${isFloatingPanel ? 'mt-1' : 'mt-1'} text-sm text-gray-500 ${isFloatingPanel ? 'text-xs' : ''}`}>
            Separate multiple tags with commas
          </p>
        </div>
        
        {/* Submit Button */}
        <div className={`flex space-x-3 ${isFloatingPanel ? 'pt-2' : 'pt-0'}`}>
          {isFloatingPanel && (
            <button
              type="button"
              onClick={() => {
                setFormData({
                  name: '',
                  category: '',
                  newCategory: '',
                  tags: '',
                  file: null
                });
                // Reset file input
                const fileInput = document.getElementById('certificate-file');
                if (fileInput) fileInput.value = '';
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={isUploading}
            className={`${isFloatingPanel ? 'flex-1' : 'w-full'} bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold py-${isFloatingPanel ? '2' : '3'} px-${isFloatingPanel ? '3' : '6'} rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${isFloatingPanel ? 'text-sm' : ''}`}
          >
            {isUploading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isFloatingPanel ? 'Uploading...' : 'Uploading...'}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.413V13H5.5z"/>
                </svg>
                {isFloatingPanel ? 'Upload' : 'Upload Template'}
              </div>
            )}
          </button>
        </div>
      </form>
      
      {/* Info Box - Only show in non-floating panel mode */}
      {!isFloatingPanel && (
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-purple-900 mb-2">💡 Template Guidelines</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• Upload only HTML files (.html)</li>
            <li>• File size should be less than 5MB</li>
            <li>• Use placeholder variables like {`{{name}}, {{event}}, {{date}}`}</li>
            <li>• Include CSS styles within the HTML file</li>
            <li>• Test template before uploading</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
