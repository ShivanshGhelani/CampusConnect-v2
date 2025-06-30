import React, { useState, useEffect } from 'react';
import { uploadAsset, listAssets, deleteAsset, getAssetUrl } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';

const Assets = () => {
  // State management
  const [assets, setAssets] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [selectedSubType, setSelectedSubType] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [assetName, setAssetName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [galleryFilter, setGalleryFilter] = useState('all');
  const [statistics, setStatistics] = useState(null);

  // Effects
  useEffect(() => {
    loadAssets();
    loadStatistics();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Data loading functions
  const loadAssets = async () => {
    try {
      const assetsList = await listAssets();
      setAssets(assetsList);
    } catch (error) {
      console.error('Error loading assets:', error);
      setError('Failed to load assets');
    }
  };

  const loadStatistics = async () => {
    try {
      const assetsList = await listAssets();
      const logoCount = assetsList.filter(asset => asset.type === 'logo').length;
      const signatureCount = assetsList.filter(asset => asset.type === 'signature').length;
      
      setStatistics({
        total_assets: assetsList.length,
        logos: logoCount,
        signatures: signatureCount
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // File handling functions
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleSingleFile(file);
    }
  };

  const handleSingleFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleSingleFile(files[0]);
    }
  };

  // Upload function
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedAssetType) {
      setError('Please select an asset type first.');
      return;
    }
    
    if (selectedAssetType === 'signature' && !selectedSubType) {
      setError('Please select a signature type.');
      return;
    }
    
    if (selectedAssetType === 'signature' && 
        (selectedSubType === 'faculty' || selectedSubType === 'head-of-department') && 
        !selectedDepartment) {
      setError('Please select a department.');
      return;
    }
      
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    if (!assetName.trim()) {
      setError('Please enter an asset name.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const uploadedAsset = await uploadAsset(
        selectedFile,
        selectedAssetType,
        selectedSubType,
        selectedDepartment,
        assetName.trim()
      );

      setSuccess('Asset uploaded successfully!');
      resetForm();
      loadAssets();
      loadStatistics();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete function
  const handleDelete = async (filename, assetType, signatureType, department) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    try {
      await deleteAsset(filename, assetType, signatureType, department);
      setSuccess('Asset deleted successfully!');
      loadAssets();
      loadStatistics();
      if (previewAsset && previewAsset.filename === filename) {
        setPreviewModalOpen(false);
        setPreviewAsset(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.message || 'Failed to delete asset');
    }
  };

  // Reset form function
  const resetForm = () => {
    setSelectedFile(null);
    setAssetName('');
    setSelectedAssetType('');
    setSelectedSubType('');
    setSelectedDepartment('');
  };

  // Copy to clipboard function
  const copyAssetPath = (path) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(path).then(() => {
        setSuccess('Path copied to clipboard!');
      }).catch(() => {
        fallbackCopyTextToClipboard(path);
      });
    } else {
      fallbackCopyTextToClipboard(path);
    }
  };

  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setSuccess('Path copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy path:', err);
      setError('Failed to copy path to clipboard');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  // Utility functions
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Generate user-friendly path
  const generateUserFriendlyPath = (asset) => {
    if (asset.type === 'logo') {
      return `/logo/${asset.filename}`;
    } else if (asset.type === 'signature') {
      if (asset.signature_type === 'principal') {
        return `/signature/principal/${asset.filename}`;
      } else if (asset.signature_type === 'faculty' && asset.department) {
        return `/signature/faculty/${asset.department}/${asset.filename}`;
      } else if (asset.signature_type === 'head-of-department' && asset.department) {
        return `/signature/head-of-department/${asset.department}/${asset.filename}`;
      } else {
        return `static/${asset.path}`.replace(/\\/g, '/');
      }
    } else {
      return `static/${asset.path}`.replace(/\\/g, '/');
    }
  };

  const openAssetPreview = (asset) => {
    setPreviewAsset(asset);
    setPreviewModalOpen(true);
  };

  // Custom CSS styles matching the backend template
  const styles = {
    assetsContainer: {
      background: '#f8f9fa',
      minHeight: 'calc(100vh - 70px)',
      padding: '1rem'
    },
    pageHeader: {
      background: 'white',
      borderRadius: '6px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '1rem 1.25rem',
      marginBottom: '1rem',
      border: 'none'
    },
    assetCard: {
      background: 'white',
      borderRadius: '6px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: 'none',
      marginBottom: '1rem',
      height: 'fit-content'
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
      alignItems: 'start'
    },
    sectionCard: {
      padding: '1.25rem',
      borderBottom: '1px solid #e9ecef'
    },
    sectionTitle: {
      color: '#495057',
      fontSize: '0.9rem',
      fontWeight: '600',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    btnGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '0.5rem',
      maxWidth: '400px'
    },
    assetTypeBtn: {
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      color: '#495057',
      padding: '0.6rem 0.8rem',
      borderRadius: '4px',
      transition: 'all 0.15s ease',
      fontWeight: '500',
      fontSize: '0.8rem',
      textAlign: 'center',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.25rem'
    },
    uploadDropzone: {
      border: '2px dashed #ced4da',
      borderRadius: '6px',
      padding: '2rem 1.5rem',
      textAlign: 'center',
      background: '#fafafa',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
      marginBottom: '1rem',
      height: '240px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      boxSizing: 'border-box'
    },
    filePreviewArea: {
      border: '2px solid #28a745',
      borderRadius: '6px',
      padding: '1rem',
      textAlign: 'center',
      background: '#f8fff8',
      height: '240px',
      flexDirection: 'column',
      marginBottom: '1rem',
      overflow: 'hidden',
      boxSizing: 'border-box'
    },
    currentAssetsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
      gap: '0.75rem',
      marginTop: '1rem'
    },
    assetItem: {
      background: 'white',
      border: '1px solid #e9ecef',
      borderRadius: '4px',
      padding: '0.75rem',
      textAlign: 'center',
      transition: 'all 0.15s ease',
      cursor: 'pointer',
      position: 'relative'
    }
  };

  return (
    <AdminLayout pageTitle="Assets Management">
      <div style={styles.assetsContainer}>
        <div className="w-full max-w-7xl mx-auto px-4">
          {/* Page Header */}
          <div style={styles.pageHeader}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="mb-1 text-lg font-semibold">
                  <i className="fas fa-folder-open mr-2"></i>Assets Management
                </h4>
                <p className="text-gray-600 mb-0 text-sm">Upload and manage digital assets for your organization</p>
              </div>
              <div className="flex items-center">
                <span className="badge bg-primary mr-2 px-3 py-1 bg-blue-500 text-white rounded-full text-sm">
                  {statistics?.total_assets || assets.length || 0} Assets
                </span>
              </div>
            </div>
          </div>

          {/* Messages Row */}
          <div className="mb-4">
            <div className="w-full">
              {success && (
                <div className="alert-success bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
                  <i className="fas fa-check-circle mr-2"></i>
                  <span>{success}</span>
                </div>
              )}
              
              {error && (
                <div className="alert-danger bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          <div style={styles.gridContainer} className="responsive-grid">
            {/* Left Column: Current Assets and Asset Configuration */}
            <div className="col-span-1">
              {/* Current Assets Card */}
              {assets.length > 0 && (
                <div style={styles.assetCard}>
                  <div style={styles.sectionCard}>
                    <div style={styles.sectionTitle} className="justify-between">
                      <div className="flex items-center">
                        <i className="fas fa-folder mr-2"></i>Current Assets
                      </div>
                      <button 
                        type="button" 
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        onClick={() => setGalleryModalOpen(true)}
                      >
                        <i className="fas fa-external-link-alt mr-1"></i>View All
                      </button>
                    </div>
                    <div style={styles.currentAssetsGrid}>
                      {assets.slice(0, 6).map((asset) => (
                        <div
                          key={`${asset.filename}-${asset.path}`}
                          style={styles.assetItem}
                          className="hover:shadow-lg hover:border-blue-500 transform hover:-translate-y-1"
                          onClick={() => openAssetPreview(asset)}
                        >
                          <button
                            className="absolute top-1 right-1 bg-red-500 text-white border-none rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(asset.filename, asset.type, asset.signature_type, asset.department);
                            }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                          <img 
                            src={asset.url} 
                            alt={asset.name || asset.filename}
                            className="max-w-full max-h-15 rounded mb-2 object-contain block mx-auto"
                            style={{ maxHeight: '60px' }}
                          />
                          <div className="text-xs font-medium text-gray-700 truncate" title={asset.filename}>
                            {asset.filename}
                          </div>
                          <div className="text-xs text-gray-500">
                            {asset.type}{asset.signature_type ? ` - ${asset.signature_type}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Asset Configuration Card */}
              <div style={styles.assetCard}>
                <div style={styles.sectionCard}>
                  <div style={styles.sectionTitle}>
                    <i className="fas fa-cog mr-2"></i>Asset Configuration
                  </div>
                  
                  {/* Asset Type Selection */}
                  <div className="mb-4">
                    <h6 className="mb-3 text-sm font-semibold">
                      <i className="fas fa-layer-group mr-2"></i>Asset Type
                    </h6>
                    <div style={styles.btnGrid}>
                      <button
                        type="button"
                        style={{
                          ...styles.assetTypeBtn,
                          ...(selectedAssetType === 'logo' ? {
                            background: '#007bff',
                            color: 'white',
                            borderColor: '#007bff',
                            boxShadow: '0 2px 4px rgba(0,123,255,0.25)'
                          } : {})
                        }}
                        onClick={() => setSelectedAssetType('logo')}
                      >
                        <i className="fas fa-image text-lg"></i>
                        <span>Logo</span>
                      </button>
                      <button
                        type="button"
                        style={{
                          ...styles.assetTypeBtn,
                          ...(selectedAssetType === 'signature' ? {
                            background: '#007bff',
                            color: 'white',
                            borderColor: '#007bff',
                            boxShadow: '0 2px 4px rgba(0,123,255,0.25)'
                          } : {})
                        }}
                        onClick={() => setSelectedAssetType('signature')}
                      >
                        <i className="fas fa-signature text-lg"></i>
                        <span>Signature</span>
                      </button>
                    </div>
                  </div>

                  {/* Signature Sub-type Selection */}
                  {selectedAssetType === 'signature' && (
                    <div className="mb-4">
                      <h6 className="mb-3 text-sm font-semibold">
                        <i className="fas fa-users mr-2"></i>Signatory Designation
                      </h6>
                      <div style={styles.btnGrid}>
                        <button
                          type="button"
                          style={{
                            ...styles.assetTypeBtn,
                            ...(selectedSubType === 'faculty' ? {
                              background: '#28a745',
                              color: 'white',
                              borderColor: '#28a745',
                              boxShadow: '0 2px 4px rgba(40,167,69,0.25)'
                            } : {})
                          }}
                          onClick={() => setSelectedSubType('faculty')}
                        >
                          <i className="fas fa-chalkboard-teacher"></i>
                          <span>Faculty</span>
                        </button>
                        <button
                          type="button"
                          style={{
                            ...styles.assetTypeBtn,
                            ...(selectedSubType === 'principal' ? {
                              background: '#28a745',
                              color: 'white',
                              borderColor: '#28a745',
                              boxShadow: '0 2px 4px rgba(40,167,69,0.25)'
                            } : {})
                          }}
                          onClick={() => setSelectedSubType('principal')}
                        >
                          <i className="fas fa-user-tie"></i>
                          <span>Principal</span>
                        </button>
                        <button
                          type="button"
                          style={{
                            ...styles.assetTypeBtn,
                            ...(selectedSubType === 'head-of-department' ? {
                              background: '#28a745',
                              color: 'white',
                              borderColor: '#28a745',
                              boxShadow: '0 2px 4px rgba(40,167,69,0.25)'
                            } : {})
                          }}
                          onClick={() => setSelectedSubType('head-of-department')}
                        >
                          <i className="fas fa-user-graduate"></i>
                          <span>Head of Dept.</span>
                        </button>
                      </div>

                      {/* Department Selection */}
                      {(selectedSubType === 'faculty' || selectedSubType === 'head-of-department') && (
                        <div className="mt-3">
                          <label className="font-semibold text-sm block mb-2">Department:</label>
                          <select
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                          >
                            <option value="">Choose Department...</option>
                            <option value="computer-science">Computer Science</option>
                            <option value="electrical">Electrical Engineering</option>
                            <option value="mechanical">Mechanical Engineering</option>
                            <option value="civil">Civil Engineering</option>
                            <option value="electronics">Electronics & Communication</option>
                            <option value="information-technology">Information Technology</option>
                            <option value="biotechnology">Biotechnology</option>
                            <option value="mathematics">Mathematics</option>
                            <option value="physics">Physics</option>
                            <option value="chemistry">Chemistry</option>
                            <option value="english">English</option>
                            <option value="management">Management Studies</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Asset Details Form */}
                  {selectedAssetType && (
                    <div className="mb-4">
                      <h6 className="mb-3 text-sm font-semibold">
                        <i className="fas fa-edit mr-2"></i>Asset Details
                      </h6>
                      <div className="mb-3">
                        <label className="font-semibold text-sm block mb-2">
                          <i className="fas fa-tag mr-1"></i>Asset Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter asset name"
                          value={assetName}
                          onChange={(e) => setAssetName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Upload Section */}
            <div className="col-span-1">
              <div style={styles.assetCard}>
                <div style={styles.sectionCard}>
                  <form onSubmit={handleUpload}>
                    <div style={styles.sectionTitle}>
                      <i className="fas fa-cloud-upload-alt mr-2"></i>Upload Asset
                    </div>
                    
                    {/* File Upload Area */}
                    {!selectedFile && (
                      <div
                        style={styles.uploadDropzone}
                        className="hover:border-blue-500 hover:bg-blue-50"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => {
                          if (!selectedAssetType) {
                            setError('Please select an asset type first.');
                            return;
                          }
                          if (selectedAssetType === 'signature' && 
                              (selectedSubType === 'faculty' || selectedSubType === 'head-of-department') && 
                              !selectedDepartment) {
                            setError('Please select a department first.');
                            return;
                          }
                          document.getElementById('fileInput').click();
                        }}
                      >
                        <i className="fas fa-cloud-upload-alt text-gray-400 text-4xl mb-2"></i>
                        <h6 className="mb-2 font-semibold">Drag & Drop a File Here</h6>
                        <p className="text-gray-500 text-sm mb-3">or click to browse (single file only)</p>
                        <button
                          type="button"
                          className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
                        >
                          <i className="fas fa-folder-open mr-2"></i>Browse File
                        </button>
                        <input
                          type="file"
                          id="fileInput"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleFileSelect}
                        />
                      </div>
                    )}

                    {/* File Preview Area */}
                    {selectedFile && (
                      <div style={styles.filePreviewArea} className="flex">
                        <div className="flex items-center justify-between mb-3 flex-shrink-0">
                          <h6 className="text-sm font-semibold mb-0">
                            <i className="fas fa-eye mr-2"></i>Selected File
                          </h6>
                          <button
                            type="button"
                            className="border border-gray-400 text-gray-600 px-2 py-1 rounded text-xs hover:bg-gray-100"
                            onClick={() => setSelectedFile(null)}
                          >
                            <i className="fas fa-times mr-1"></i>Clear & Re-upload
                          </button>
                        </div>
                        <div className="flex-1 flex flex-col justify-center items-center overflow-hidden">
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="Preview"
                            className="max-w-full max-h-32 rounded shadow-md object-contain"
                          />
                          <div className="text-xs font-medium text-gray-700 mt-2 text-center break-words">
                            {selectedFile.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Size: {(selectedFile.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upload Button */}
                    <div className="text-center">
                      <button
                        type="submit"
                        className="bg-blue-500 text-white px-6 py-2 rounded font-medium hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={!selectedFile || isUploading}
                      >
                        {isUploading ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>Uploading...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-upload mr-2"></i>Upload Asset
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assets Gallery Modal */}
      {galleryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-90vh flex flex-col overflow-hidden mx-4">
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <h5 className="text-lg font-semibold">
                <i className="fas fa-images mr-2"></i>All Assets Gallery
              </h5>
              <button
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded"
                onClick={() => setGalleryModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex gap-2 mb-6 pb-4 border-b">
                <button
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    galleryFilter === 'all' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setGalleryFilter('all')}
                >
                  All Assets ({assets.length})
                </button>
                <button
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    galleryFilter === 'logo' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setGalleryFilter('logo')}
                >
                  Logos ({assets.filter(asset => asset.type === 'logo').length})
                </button>
                <button
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    galleryFilter === 'signature' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setGalleryFilter('signature')}
                >
                  Signatures ({assets.filter(asset => asset.type === 'signature').length})
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto pr-2">
                {assets
                  .filter(asset => galleryFilter === 'all' || asset.type === galleryFilter)
                  .map((asset) => (
                    <div
                      key={`${asset.filename}-${asset.path}`}
                      className="bg-white border border-gray-200 rounded-lg p-4 text-center transition-all hover:shadow-lg hover:border-blue-500 cursor-pointer transform hover:-translate-y-1"
                      onClick={() => openAssetPreview(asset)}
                    >
                      <img
                        src={asset.url}
                        alt={asset.filename}
                        className="max-w-full max-h-20 rounded mb-3 object-contain mx-auto"
                      />
                      <div className="text-xs font-medium text-gray-700 truncate" title={asset.filename}>
                        {asset.filename}
                      </div>
                      <div className="text-xs text-gray-500">
                        {asset.type}{asset.signature_type ? ` - ${asset.signature_type}` : ''}
                        {asset.department && asset.department !== 'college' ? ` (${asset.department})` : ''}
                      </div>
                    </div>
                  ))}
              </div>
              {assets.filter(asset => galleryFilter === 'all' || asset.type === galleryFilter).length === 0 && (
                <p className="text-center text-gray-500">No assets found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Asset Preview Modal */}
      {previewModalOpen && previewAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-90vh flex flex-col overflow-hidden mx-4">
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <h5 className="text-lg font-semibold">
                <i className="fas fa-eye mr-2"></i>Asset Preview
              </h5>
              <button
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded"
                onClick={() => setPreviewModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="text-center bg-gray-50 rounded-lg p-8 mb-4">
                <img
                  src={previewAsset.url}
                  alt="Asset Preview"
                  className="max-w-full max-h-72 rounded-lg shadow-lg object-contain mx-auto"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-semibold text-gray-700 text-sm">Filename:</span>
                  <span className="text-gray-600 text-sm">{previewAsset.filename}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-semibold text-gray-700 text-sm">Path:</span>
                  <div className="flex items-center gap-2 max-w-xs">
                    <code className="bg-gray-200 px-2 py-1 rounded text-xs font-mono text-gray-700 break-all flex-1">
                      {generateUserFriendlyPath(previewAsset)}
                    </code>
                    <button
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 flex-shrink-0"
                      onClick={() => copyAssetPath(generateUserFriendlyPath(previewAsset))}
                      title="Copy path"
                    >
                      <i className="fas fa-copy"></i>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-semibold text-gray-700 text-sm">Type:</span>
                  <span className="text-gray-600 text-sm">{previewAsset.type}</span>
                </div>
                {previewAsset.signature_type && (
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="font-semibold text-gray-700 text-sm">Signature Type:</span>
                    <span className="text-gray-600 text-sm">{previewAsset.signature_type}</span>
                  </div>
                )}
                {previewAsset.department && (
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="font-semibold text-gray-700 text-sm">Department:</span>
                    <span className="text-gray-600 text-sm">{previewAsset.department}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-semibold text-gray-700 text-sm">Size:</span>
                  <span className="text-gray-600 text-sm">{formatFileSize(previewAsset.size)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-semibold text-gray-700 text-sm">Modified:</span>
                  <span className="text-gray-600 text-sm">{formatDate(previewAsset.modified)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end p-6 border-t bg-gray-50">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                onClick={() => {
                  handleDelete(previewAsset.filename, previewAsset.type, previewAsset.signature_type, previewAsset.department);
                }}
              >
                <i className="fas fa-trash mr-2"></i>Delete Asset
              </button>
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                onClick={() => setPreviewModalOpen(false)}
              >
                <i className="fas fa-times mr-2"></i>Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 1024px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
            gap: 0.5rem !important;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default Assets;
