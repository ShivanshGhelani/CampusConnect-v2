import React, { useState, useEffect, useRef } from 'react';
import { assetApi } from '../../api/axios';
import AdminLayout from '../../components/admin/AdminLayout';

const Assets = () => {
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef(null);
  const descriptionRef = useRef(null);

  useEffect(() => {
    fetchAssets();
    fetchStats();
  }, [selectedCategory]);

  const fetchAssets = async () => {
    try {
      const endpoint = selectedCategory === 'all' ? '' : `/category/${selectedCategory}`;
      const response = await assetApi.list(endpoint);
      console.log('Assets API response:', response); // Debug log
      // Handle different response structures
      const assetsData = response.data?.data || response.data || [];
      setAssets(Array.isArray(assetsData) ? assetsData : []);
    } catch (err) {
      setError('Failed to fetch assets');
      console.error('Assets fetch error:', err);
      setAssets([]); // Ensure assets is always an array
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await assetApi.stats();
      console.log('Stats API response:', response); // Debug log
      // Handle different response structures  
      const statsData = response.data?.data || response.data || {};
      setStats(statsData);
    } catch (err) {
      console.error('Stats fetch error:', err);
      setStats({}); // Ensure stats is always an object
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading...');

    const formData = new FormData();
    formData.append('file', file);
    if (descriptionRef.current?.value) {
      formData.append('description', descriptionRef.current.value);
    }

    try {
      const response = await assetApi.upload(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
          setUploadStatus(`Uploading... ${percentCompleted}%`);
        },
      });

      if (response.data.success) {
        setUploadStatus('Upload successful!');
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          if (descriptionRef.current) descriptionRef.current.value = '';
          if (fileInputRef.current) fileInputRef.current.value = '';
          fetchAssets();
          fetchStats();
        }, 1000);
      } else {
        setUploadStatus('Upload failed: ' + response.data.message);
        setUploading(false);
      }
    } catch (err) {
      setUploadStatus('Upload failed. Please try again.');
      setUploading(false);
      console.error('Upload error:', err);
    }
  };

  const handleDelete = async (assetId) => {
    if (window.confirm('Are you sure you want to delete this asset? This action cannot be undone.')) {
      try {
        const response = await assetApi.delete(assetId);
        if (response.data.success) {
          fetchAssets();
          fetchStats();
        } else {
          alert('Failed to delete asset: ' + response.data.message);
        }
      } catch (error) {
        alert('Failed to delete asset. Please try again.');
        console.error('Delete error:', error);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const getAssetIcon = (asset) => {
    const category = asset.category || 'file';
    const iconMap = {
      images: 'fas fa-image',
      documents: 'fas fa-file-alt',
      spreadsheets: 'fas fa-file-excel',
      presentations: 'fas fa-file-powerpoint',
      archives: 'fas fa-file-archive',
      media: 'fas fa-file-video',
    };
    return iconMap[category] || 'fas fa-file';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const categories = [
    { key: 'all', label: 'All Assets' },
    { key: 'images', label: 'Images' },
    { key: 'documents', label: 'Documents' },
    { key: 'spreadsheets', label: 'Spreadsheets' },
    { key: 'media', label: 'Media' },
    { key: 'archives', label: 'Archives' },
  ];

  if (loading) {
    return (
      <AdminLayout pageTitle="Assets Management">
        <div className="flex justify-center items-center h-64">
          <div className="loading">Loading assets...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Assets Management">
      <div className="assets-page">
        <style jsx>{`
          .assets-page {
            padding: 20px;
            background-color: #f8f9fa;
            min-height: 100vh;
          }

          .assets-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }

          .assets-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }

          .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
          }

          .stat-label {
            color: #7f8c8d;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .upload-section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
          }

          .upload-area {
            border: 2px dashed #3498db;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            background: #f8f9fa;
            transition: all 0.3s ease;
            cursor: pointer;
          }

          .upload-area:hover {
            border-color: #2980b9;
            background: #e3f2fd;
          }

          .upload-area.dragover {
            border-color: #27ae60;
            background: #e8f5e8;
          }

          .upload-icon {
            font-size: 3rem;
            color: #3498db;
            margin-bottom: 20px;
          }

          .category-filters {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            flex-wrap: wrap;
          }

          .filter-btn {
            padding: 10px 20px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            text-decoration: none;
            color: #495057;
            transition: all 0.3s ease;
            cursor: pointer;
          }

          .filter-btn:hover, .filter-btn.active {
            background: #3498db;
            color: white;
            border-color: #3498db;
          }

          .assets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
          }

          .asset-card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: transform 0.3s ease;
          }

          .asset-card:hover {
            transform: translateY(-5px);
          }

          .asset-preview {
            height: 150px;
            background: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            color: #bdc3c7;
          }

          .asset-info {
            padding: 20px;
          }

          .asset-name {
            font-weight: bold;
            margin-bottom: 10px;
            word-break: break-word;
          }

          .asset-details {
            font-size: 0.9rem;
            color: #7f8c8d;
            margin-bottom: 15px;
          }

          .asset-actions {
            display: flex;
            gap: 10px;
          }

          .btn-sm {
            padding: 5px 15px;
            font-size: 0.8rem;
            border-radius: 5px;
            text-decoration: none;
            text-align: center;
            cursor: pointer;
            border: none;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 5px;
          }

          .btn-primary {
            background: #3498db;
            color: white;
          }

          .btn-primary:hover {
            background: #2980b9;
          }

          .btn-danger {
            background: #e74c3c;
            color: white;
          }

          .btn-danger:hover {
            background: #c0392b;
          }

          .upload-progress {
            margin-top: 20px;
          }

          .progress {
            background: #f8f9fa;
            border-radius: 10px;
            height: 20px;
            overflow: hidden;
            margin-bottom: 10px;
          }

          .progress-bar {
            background: #3498db;
            height: 100%;
            transition: width 0.3s ease;
          }

          .description-input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin-top: 15px;
            font-family: inherit;
          }

          .empty-state {
            text-align: center;
            padding: 50px;
            color: #7f8c8d;
          }

          .empty-state i {
            font-size: 4rem;
            margin-bottom: 20px;
            display: block;
          }

          .file-input {
            display: none;
          }

          .loading {
            text-align: center;
            padding: 50px;
            color: #7f8c8d;
          }

          .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
        `}</style>

        {error && <div className="error">{error}</div>}

        <div className="assets-header">
          <div>
            <h2>Assets Management</h2>
            <p>Upload, organize, and manage your files</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="assets-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.total_assets || 0}</div>
            <div className="stat-label">Total Assets</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.total_size || '0 MB'}</div>
            <div className="stat-label">Storage Used</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.categories?.images || 0}</div>
            <div className="stat-label">Images</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.categories?.documents || 0}</div>
            <div className="stat-label">Documents</div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="upload-section">
          <h3>Upload New Asset</h3>
          <div
            className={`upload-area ${dragOver ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            <h4>Click to upload or drag and drop</h4>
            <p>Maximum file size: 50MB</p>
            <p>Supported formats: Images, Documents, Spreadsheets, Presentations, Archives, Media</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="file-input"
            accept="*/*"
            onChange={(e) => {
              if (e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <input
            ref={descriptionRef}
            type="text"
            className="description-input"
            placeholder="Optional description..."
          />
          {uploading && (
            <div className="upload-progress">
              <div className="progress">
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p>{uploadStatus}</p>
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className="category-filters">
          {categories.map((category) => (
            <button
              key={category.key}
              className={`filter-btn ${selectedCategory === category.key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.key)}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Assets Grid */}
        <div className="assets-grid">
          {Array.isArray(assets) && assets.map((asset) => (
            <div key={asset._id} className="asset-card">
              <div className="asset-preview">
                <i className={getAssetIcon(asset)}></i>
              </div>
              <div className="asset-info">
                <div className="asset-name">{asset.original_filename}</div>
                <div className="asset-details">
                  <div>Size: {asset.formatted_size}</div>
                  <div>Uploaded: {formatDate(asset.uploaded_at)}</div>
                  <div>By: {asset.uploaded_by}</div>
                  {asset.downloads > 0 && <div>Downloads: {asset.downloads}</div>}
                  {asset.description && (
                    <div style={{ marginTop: '10px', fontStyle: 'italic' }}>
                      {asset.description}
                    </div>
                  )}
                </div>
                <div className="asset-actions">
                  <a
                    href={`/admin/assets/download/${asset._id}`}
                    className="btn-sm btn-primary"
                    download
                  >
                    <i className="fas fa-download"></i> Download
                  </a>
                  <button
                    onClick={() => handleDelete(asset._id)}
                    className="btn-sm btn-danger"
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && (!Array.isArray(assets) || assets.length === 0) && (
          <div className="empty-state">
            <i className="fas fa-folder-open"></i>
            <h3>No assets found</h3>
            <p>Upload your first asset to get started!</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Assets;
