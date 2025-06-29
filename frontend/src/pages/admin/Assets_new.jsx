import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/axios';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

function Assets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);

  useEffect(() => {
    fetchAssets();
    fetchStatistics();
  }, [currentFilter]);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getAssets(currentFilter !== 'all' ? currentFilter : null);
      
      if (response.data.success) {
        const assetsData = response.data.data.assets || [];
        setAssets(assetsData);
        setError('');
      } else {
        throw new Error(response.data.message || 'Failed to fetch assets');
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      setError('Failed to load assets');
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await adminAPI.getAssetStatistics();
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleDeleteAsset = async (asset) => {
    try {
      await adminAPI.deleteAsset(asset.id, asset.path);
      await fetchAssets();
      await fetchStatistics();
      setShowDeleteModal(false);
      setAssetToDelete(null);
    } catch (error) {
      console.error('Error deleting asset:', error);
      setError('Failed to delete asset');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (extension) => {
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];
    const docExts = ['.pdf', '.doc', '.docx'];
    
    if (imageExts.includes(extension)) {
      return 'fas fa-image text-green-500';
    } else if (docExts.includes(extension)) {
      return 'fas fa-file-alt text-blue-500';
    }
    return 'fas fa-file text-gray-500';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      logo: 'fas fa-crown text-yellow-500',
      signature: 'fas fa-signature text-purple-500',
      certificates: 'fas fa-certificate text-blue-500',
      images: 'fas fa-images text-green-500',
      documents: 'fas fa-file-alt text-red-500'
    };
    return icons[category] || 'fas fa-file text-gray-500';
  };

  const getCategoryColor = (category) => {
    const colors = {
      logo: 'bg-yellow-100 text-yellow-800',
      signature: 'bg-purple-100 text-purple-800',
      certificates: 'bg-blue-100 text-blue-800',
      images: 'bg-green-100 text-green-800',
      documents: 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading && assets.length === 0) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Assets Management">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <i className="fas fa-images text-amber-600 mr-3"></i>
                Assets Management
              </h1>
              <p className="text-gray-600">
                Manage and organize your digital assets, images, documents, and media files
              </p>
            </div>
            
            {/* Upload Button */}
            {user && ['super_admin', 'executive_admin', 'content_admin'].includes(user.role) && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/admin/assets/upload')}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-3 rounded-lg inline-flex items-center font-semibold transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  <i className="fas fa-upload mr-2"></i>
                  Upload Assets
                </button>
              </div>
            )}
          </div>
          
          {/* Statistics */}
          {statistics.total_assets > 0 && (
            <div className="mt-6 pt-6 border-t border-amber-200">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{statistics.total_assets}</div>
                  <div className="text-sm text-gray-600">Total Assets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{statistics.by_category?.logo || 0}</div>
                  <div className="text-sm text-gray-600">Logos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{statistics.by_category?.signature || 0}</div>
                  <div className="text-sm text-gray-600">Signatures</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.by_category?.certificates || 0}</div>
                  <div className="text-sm text-gray-600">Certificates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{statistics.by_category?.images || 0}</div>
                  <div className="text-sm text-gray-600">Images</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{statistics.by_category?.documents || 0}</div>
                  <div className="text-sm text-gray-600">Documents</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-500">Total Size: </span>
                <span className="text-sm font-semibold text-gray-700">{statistics.total_size_formatted}</span>
              </div>
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Filter by Category:</span>
            {[
              { key: 'all', label: 'All Assets', icon: 'fas fa-th-large' },
              { key: 'logo', label: 'Logos', icon: 'fas fa-crown' },
              { key: 'signature', label: 'Signatures', icon: 'fas fa-signature' },
              { key: 'certificates', label: 'Certificates', icon: 'fas fa-certificate' },
              { key: 'images', label: 'Images', icon: 'fas fa-images' },
              { key: 'documents', label: 'Documents', icon: 'fas fa-file-alt' }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setCurrentFilter(filter.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentFilter === filter.key 
                    ? 'bg-amber-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <i className={`${filter.icon} mr-1`}></i> {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assets Grid */}
        {error ? (
          <div className="text-center py-16 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
            <div className="w-20 h-20 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
            </div>
            <h3 className="text-xl font-bold text-red-700 mb-3">Error Loading Assets</h3>
            <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => {
                fetchAssets();
                fetchStatistics();
              }}
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              <i className="fas fa-sync mr-2"></i>Try Again
            </button>
          </div>
        ) : assets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col">
                {/* Asset Preview */}
                <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
                  {asset.extension && ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(asset.extension) ? (
                    <img
                      src={asset.url}
                      alt={asset.filename}
                      className="max-w-full max-h-full object-contain rounded-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <i className={`${getFileIcon(asset.extension)} text-4xl mb-2`}></i>
                      <span className="text-xs font-medium">{asset.extension?.toUpperCase() || 'FILE'}</span>
                    </div>
                  )}
                  <div className="hidden flex-col items-center justify-center text-gray-400">
                    <i className={`${getFileIcon(asset.extension)} text-4xl mb-2`}></i>
                    <span className="text-xs font-medium">{asset.extension?.toUpperCase() || 'FILE'}</span>
                  </div>
                </div>
                
                {/* Asset Info */}
                <div className="p-4 flex-grow flex flex-col">
                  {/* Category Badge */}
                  <div className="mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(asset.category)}`}>
                      <i className={`${getCategoryIcon(asset.category)} mr-1`}></i>
                      {asset.category}
                    </span>
                  </div>
                  
                  {/* Filename */}
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm truncate" title={asset.filename}>
                    {asset.filename}
                  </h3>
                  
                  {/* File Details */}
                  <div className="space-y-1 mb-4 flex-grow">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Size:</span>
                      <span className="font-medium">{asset.size_formatted}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Modified:</span>
                      <span className="font-medium">
                        {new Date(asset.modified).toLocaleDateString()}
                      </span>
                    </div>
                    {asset.signature_type && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Type:</span>
                        <span className="font-medium capitalize">{asset.signature_type}</span>
                      </div>
                    )}
                    {asset.department && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Dept:</span>
                        <span className="font-medium">{asset.department}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 mt-auto">
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center py-2 px-3 rounded-lg font-medium transition-all duration-200 text-xs"
                    >
                      <i className="fas fa-eye mr-1"></i>View
                    </a>
                    <a
                      href={asset.url}
                      download={asset.filename}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-center py-2 px-3 rounded-lg font-medium transition-all duration-200 text-xs"
                    >
                      <i className="fas fa-download mr-1"></i>Download
                    </a>
                    {user && ['super_admin', 'executive_admin'].includes(user.role) && (
                      <button
                        onClick={() => {
                          setAssetToDelete(asset);
                          setShowDeleteModal(true);
                        }}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 px-3 rounded-lg font-medium transition-all duration-200 text-xs"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-images text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-3">No Assets Found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {currentFilter === 'all' 
                ? 'No assets have been uploaded yet. Start by uploading your first asset.'
                : `No ${currentFilter} assets found. Try selecting a different category or upload new assets.`
              }
            </p>
            <div className="space-x-3">
              {user && ['super_admin', 'executive_admin', 'content_admin'].includes(user.role) && (
                <button
                  onClick={() => navigate('/admin/assets/upload')}
                  className="inline-block px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold"
                >
                  <i className="fas fa-upload mr-2"></i>Upload Assets
                </button>
              )}
              {currentFilter !== 'all' && (
                <button
                  onClick={() => setCurrentFilter('all')}
                  className="inline-block px-6 py-3 border-2 border-amber-600 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors font-semibold"
                >
                  <i className="fas fa-th-large mr-2"></i>View All Assets
                </button>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && assetToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <i className="fas fa-trash text-red-600 text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Asset</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "<strong>{assetToDelete.filename}</strong>"?
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setAssetToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteAsset(assetToDelete)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}

export default Assets;
