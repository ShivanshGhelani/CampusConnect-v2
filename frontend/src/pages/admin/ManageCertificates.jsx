import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import UploadForm from '../../components/admin/certificates/UploadForm';
import TemplateTable from '../../components/admin/certificates/TemplateTable';
import EditModal from '../../components/admin/certificates/EditModal';
import PreviewModal from '../../components/admin/certificates/PreviewModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { adminAPI } from '../../api/axios';

function ManageCertificates() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
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

  const handleMigrateTemplates = async () => {
    if (window.confirm('This will migrate existing template files to the database. Continue?')) {
      try {
        setIsLoading(true);
        setError('');
        
        const response = await adminAPI.migrateCertificateTemplates();
        
        if (response.data.success) {
          const migratedCount = response.data.migrated_count || 0;
          alert(`Successfully migrated ${migratedCount} certificate templates to database.`);
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
        
        setError('');
      } catch (error) {
        console.error('Error deleting template:', error);
        setError('Failed to delete template. Please try again.');
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
    <AdminLayout pageTitle="Certificate Template Manager">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Certificate Templates
                </h1>
                <p className="text-gray-600 mt-1 text-lg">Manage and organize certificate templates</p>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Templates</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalTemplates}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Categories</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.categoriesCount}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl p-4 shadow-sm">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Recent Uploads</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.recentUploads}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Migration Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleMigrateTemplates}
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                </svg>
                <span>Migrate Existing Templates</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Form */}
            <div className="lg:col-span-1">
              <UploadForm 
                onUploadSuccess={handleUploadSuccess}
                isUploading={isUploading}
                setIsUploading={setIsUploading}
                availableCategories={availableCategories}
              />
            </div>
            
            {/* Templates Table */}
            <div className="lg:col-span-2">
              {/* Search and Filters */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter Templates</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or tags..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">All Categories</option>
                      {availableCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
                    <select
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">All Tags</option>
                      {availableTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
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
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
              
              {isLoading ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
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
          </div>
        </div>
      </div>
      
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
    </AdminLayout>
  );
}

export default ManageCertificates;
