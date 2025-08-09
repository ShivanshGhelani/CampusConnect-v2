import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../../api/admin';

const EditModal = ({ template, isOpen, onClose, onUpdate, availableCategories }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    newCategory: '',
    tags: '',
    isActive: true
  });
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (template) {
      const tagsString = Array.isArray(template.tags) 
        ? template.tags.join(', ')
        : '';
      
      setFormData({
        name: template.name || '',
        category: template.category || '',
        newCategory: '',
        tags: tagsString,
        isActive: template.isActive !== false
      });
      
      // Check if category exists in available categories
      const categoryExists = availableCategories.includes(template.category);
      setIsNewCategory(!categoryExists && template.category);
      
      if (!categoryExists && template.category) {
        setFormData(prev => ({
          ...prev,
          newCategory: template.category,
          category: ''
        }));
      }
    }
  }, [template, availableCategories]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
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
    
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }
    
    const category = isNewCategory ? formData.newCategory : formData.category;
    if (!category.trim()) {
      setError('Category is required');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // Parse tags
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      const updateData = {
        name: formData.name.trim(),
        category: category.trim(),
        tags: tagsArray,
        isActive: formData.isActive
      };
      
      // Call the update API
      const response = await adminAPI.put(`/certificates/${template.id}`, updateData);
      
      if (response.data.success) {
        // Create updated template object for parent component
        const updatedTemplate = {
          ...template,
          ...updateData,
          updated_at: new Date().toISOString()
        };
        
        onUpdate(updatedTemplate);
        onClose();
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
    } catch (error) {
      console.error('Update error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to update template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-0 border w-full max-w-md shadow-lg rounded-xl bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Edit Template</h3>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Template Info</h4>
              <div className="text-sm text-gray-600">
                <p><span className="font-medium">File:</span> {template?.file_name || 'template.html'}</p>
                <p><span className="font-medium">Size:</span> {template?.file_size ? (template.file_size / 1024).toFixed(1) + ' KB' : 'Unknown'}</p>
                <p><span className="font-medium">Created:</span> {template?.created_at ? new Date(template.created_at).toLocaleDateString() : 'Unknown'}</p>
              </div>
            </div>

            {/* Template Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Participation Certificate"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="edit-existing-category"
                    checked={!isNewCategory}
                    onChange={() => !isNewCategory || handleCategoryToggle()}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <label htmlFor="edit-existing-category" className="ml-2 text-sm text-gray-700">
                    Use existing category
                  </label>
                </div>
                
                {!isNewCategory && (
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select a category...</option>
                    {availableCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                )}
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="edit-new-category"
                    checked={isNewCategory}
                    onChange={() => isNewCategory || handleCategoryToggle()}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <label htmlFor="edit-new-category" className="ml-2 text-sm text-gray-700">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="e.g., 2025, event, participation (comma-separated)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Separate multiple tags with commas
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Active template (can be used for certificate generation)
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </div>
                ) : (
                  'Update Template'
                )}
              </button>
              
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Preview Button */}
        <div className="px-6 pb-6">
          <button
            onClick={() => window.open(template?.url, '_blank')}
            className="w-full bg-blue-50 text-blue-700 font-medium py-2 px-4 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
