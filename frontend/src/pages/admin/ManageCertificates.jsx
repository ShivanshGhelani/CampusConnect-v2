import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import UploadForm from '../../components/admin/certificates/UploadForm';
import TemplateTable from '../../components/admin/certificates/TemplateTable';
import EditModal from '../../components/admin/certificates/EditModal';
import PreviewModal from '../../components/admin/certificates/PreviewModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { adminAPI } from '../../api/admin';
import { Dropdown, SearchBox } from '../../components/ui';

function ManageCertificates() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ field: 'uploaded_at', direction: 'desc' });
  const [stats, setStats] = useState({
    totalTemplates: 0,
    categoriesCount: 0,
    recentUploads: 0
  });

  // Floating panel states for upload form
  const [isFloatingPanelOpen, setIsFloatingPanelOpen] = useState(false);
  const [isFloatingPanelMinimized, setIsFloatingPanelMinimized] = useState(false);

  // Form data for new template upload
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    category: '',
    newCategory: '',
    tags: '',
    file: null
  });

  // Add/remove modal backdrop blur class
  useEffect(() => {
    const isModalOpen = isEditModalOpen || isPreviewModalOpen;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isEditModalOpen, isPreviewModalOpen]);

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Using certificate template API endpoint
      const response = await adminAPI.getCertificateTemplatesList();
      
      if (response.data.success) {
        const templatesData = response.data.templates || [];
        setTemplates(templatesData);
        
        // Calculate stats
        const categories = [...new Set(templatesData.map(t => t.category))];
        const recentCount = templatesData.filter(t => {
          const uploadDate = new Date(t.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return uploadDate > weekAgo;
        }).length;
        
        setStats({
          totalTemplates: templatesData.length,
          categoriesCount: categories.length,
          recentUploads: recentCount
        });
      } else {
        setError('Failed to fetch certificate templates');
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load certificate templates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setError('');
    } else {
      setError(message);
      setSuccessMessage('');
    }

    // Auto clear after 5 seconds
    setTimeout(() => {
      setSuccessMessage('');
      setError('');
    }, 5000);
  };

  const handleMigrateTemplates = async () => {
    if (window.confirm('This will migrate existing template files to the database. Continue?')) {
      try {
        setIsLoading(true);
        setError('');
        
        const response = await adminAPI.migrateCertificateTemplates();
        
        if (response.data.success) {
          const migratedCount = response.data.migrated_count || 0;
          showNotification(`Successfully migrated ${migratedCount} certificate templates to database.`, 'success');
          // Refresh the templates list
          await fetchTemplates();
        } else {
          setError('Failed to migrate templates');
        }
      } catch (error) {
        console.error('Error migrating templates:', error);
        setError('Failed to migrate templates. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUploadSuccess = (newTemplate) => {
    setTemplates(prev => [newTemplate, ...prev]);
    setStats(prev => ({
      ...prev,
      totalTemplates: prev.totalTemplates + 1,
      recentUploads: prev.recentUploads + 1
    }));
    setIsUploading(false);
    
    // Reset form and close panel
    setNewTemplateForm({
      name: '',
      category: '',
      newCategory: '',
      tags: '',
      file: null
    });
    setIsFloatingPanelOpen(false);
    setIsFloatingPanelMinimized(false);
    
    showNotification('Certificate template uploaded successfully!', 'success');
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setIsEditModalOpen(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        setIsLoading(true);
        
        // Call delete API
        await adminAPI.deleteCertificateTemplate(templateId);
        
        // Remove from local state
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        setStats(prev => ({
          ...prev,
          totalTemplates: prev.totalTemplates - 1
        }));
        
        showNotification('Certificate template deleted successfully!', 'success');
      } catch (error) {
        console.error('Error deleting template:', error);
        showNotification('Failed to delete template. Please try again.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdateTemplate = (updatedTemplate) => {
    setTemplates(prev => 
      prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
    );
    setIsEditModalOpen(false);
    setSelectedTemplate(null);
  };

  const handlePreviewTemplate = (template) => {
    setPreviewTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.tags && template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesCategory = !categoryFilter || template.category === categoryFilter;
    const matchesTag = !tagFilter || (template.tags && template.tags.includes(tagFilter));
    
    return matchesSearch && matchesCategory && matchesTag;
  }).sort((a, b) => {
    if (!sortConfig || !sortConfig.field) return 0;
    
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Get unique categories and tags for filters
  const availableCategories = [...new Set(templates.map(t => t.category))];
  const availableTags = [...new Set(templates.flatMap(t => t.tags || []))];

  return (
    <>
      <AdminLayout pageTitle="Certificate Template Manager">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Certificate Template Management</h1>
                <p className="mt-1 text-sm text-gray-600">Manage and organize certificate templates</p>
              </div>
              
              {/* Upload Template Button */}
              <button
                onClick={() => {
                  setIsFloatingPanelOpen(true);
                  setIsFloatingPanelMinimized(false);
                }}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <i className="fas fa-plus mr-2"></i>
                Upload Template
              </button>
            </div>
          </div>
          {/* Flash Messages */}
          {(successMessage || error) && (
            <div className="mb-6">
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center">
                  <i className="fas fa-check-circle mr-2 text-green-600"></i>
                  {successMessage}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-center">
                  <i className="fas fa-exclamation-circle mr-2 text-red-600"></i>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-file-alt text-blue-600"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Templates</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.totalTemplates}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-layer-group text-green-600"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.categoriesCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-clock text-purple-600"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Recent Uploads</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.recentUploads}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <i className="fas fa-search mr-2 text-blue-600"></i>
              Search & Filter Templates
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <SearchBox
                  placeholder="Search by name or tags..."
                  value={searchTerm}
                  onChange={(value) => setSearchTerm(value)}
                  showFilters={false}
                  size="md"
                />
              </div>
              
              <div>
                <Dropdown
                  label="Category"
                  placeholder="All Categories"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  clearable
                  options={availableCategories.map(category => ({ 
                    label: category, 
                    value: category,
                    icon: <i className="fas fa-folder text-xs"></i>
                  }))}
                  icon={<i className="fas fa-layer-group text-xs"></i>}
                />
              </div>
              
              <div>
                <Dropdown
                  label="Tag"
                  placeholder="All Tags"
                  value={tagFilter}
                  onChange={setTagFilter}
                  clearable
                  options={availableTags.map(tag => ({ 
                    label: tag, 
                    value: tag,
                    icon: <i className="fas fa-tag text-xs"></i>
                  }))}
                  icon={<i className="fas fa-tags text-xs"></i>}
                />
              </div>
            </div>
            
            {(searchTerm || categoryFilter || tagFilter) && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {filteredTemplates.length} of {templates.length} templates
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('');
                    setTagFilter('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          
          {/* Templates Table */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 mt-4">Loading templates...</p>
            </div>
          ) : (
            <TemplateTable
              templates={filteredTemplates}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              onPreview={handlePreviewTemplate}
              sortConfig={sortConfig}
              onSort={handleSort}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          )}
        </div>
      </AdminLayout>
      
      {/* Floating Upload Template Panel */}
      {isFloatingPanelOpen && createPortal(
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out ${
          isFloatingPanelMinimized 
            ? 'w-80 h-12' 
            : 'w-96 h-auto max-h-[80vh]'
        }`}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            {/* Panel Header */}
            <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
                 onClick={() => setIsFloatingPanelMinimized(!isFloatingPanelMinimized)}>
              <div className="flex items-center">
                <i className="fas fa-upload mr-2"></i>
                <span className="font-medium text-sm">Upload New Template</span>
                {newTemplateForm.name && (
                  <span className="ml-2 text-blue-200 text-xs">
                    - {newTemplateForm.name}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFloatingPanelMinimized(!isFloatingPanelMinimized);
                  }}
                  className="text-blue-200 hover:text-white p-1"
                  title={isFloatingPanelMinimized ? "Restore" : "Minimize"}
                >
                  <i className={`fas fa-${isFloatingPanelMinimized ? 'window-maximize' : 'window-minimize'} text-xs`}></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFloatingPanelOpen(false);
                    setIsFloatingPanelMinimized(false);
                    // Reset form when closing
                    setNewTemplateForm({
                      name: '',
                      category: '',
                      newCategory: '',
                      tags: '',
                      file: null
                    });
                  }}
                  className="text-blue-200 hover:text-white p-1"
                  title="Close"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
            </div>

            {/* Panel Content */}
            {!isFloatingPanelMinimized && (
              <div className="max-h-[calc(80vh-48px)] overflow-y-auto">
                <UploadForm 
                  onUploadSuccess={handleUploadSuccess}
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                  availableCategories={availableCategories}
                  formData={newTemplateForm}
                  setFormData={setNewTemplateForm}
                  isFloatingPanel={true}
                />
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      {/* Edit Modal */}
      {isEditModalOpen && selectedTemplate && (
        <EditModal
          template={selectedTemplate}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTemplate(null);
          }}
          onUpdate={handleUpdateTemplate}
          availableCategories={availableCategories}
          availableTags={availableTags}
        />
      )}
      
      {/* Preview Modal */}
      <PreviewModal
        template={previewTemplate}
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewTemplate(null);
        }}
      />
    </>
  );
}

export default ManageCertificates;
