/**
 * Unified Storage Service - Uses Backend API for all file operations
 * This replaces all direct Supabase client calls for security
 */

class UnifiedStorageService {
  constructor() {
    // Use the correct environment variable name for API base URL
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  }

  // Event file uploads (posters, certificates)
  async uploadEventFile(eventId, fileType, file) {
    try {
      const formData = new FormData();
      formData.append('event_id', eventId);
      formData.append('file_type', fileType);
      formData.append('file', file);

      const response = await fetch(`${this.baseURL}/api/v1/storage/upload/event-files`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Upload failed');
      }

      return {
        success: true,
        fileId: result.file_path,
        fileName: file.name,
        filePath: result.file_path,
        url: result.file_url
      };
    } catch (error) {
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload multiple certificate templates
  async uploadCertificateTemplates(templates, eventId) {
    const uploadResults = {};
    
    for (const [certificateType, file] of Object.entries(templates)) {
      if (file) {
        const result = await this.uploadEventFile(eventId, certificateType, file);
        uploadResults[certificateType] = result;
      }
    }
    
    return uploadResults;
  }

  // Upload event poster
  async uploadEventPoster(posterFile, eventId) {
    if (!posterFile) return null;
    
    return await this.uploadEventFile(eventId, 'event_poster', posterFile);
  }

  // Upload user avatar
  async uploadAvatar(file, user) {
    try {
      const formData = new FormData();
      formData.append('user_type', user.user_type || 'student');
      formData.append('user_id', user.enrollment_no || user.employee_id || user.student_id);
      formData.append('full_name', user.full_name || 'User');
      formData.append('file', file);

      const response = await fetch(`${this.baseURL}/api/v1/storage/upload/avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Avatar upload failed');
      }

      return {
        success: true,
        avatarUrl: result.avatar_url,
        filePath: result.file_path
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Upload certificate template
  async uploadCertificateTemplate(file, templateName, category) {
    try {
      const formData = new FormData();
      formData.append('template_name', templateName);
      formData.append('category', category);
      formData.append('file', file);

      const response = await fetch(`${this.baseURL}/api/v1/storage/upload/certificate-template`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Certificate template upload failed');
      }

      return {
        success: true,
        templateUrl: result.template_url,
        filePath: result.file_path,
        templateName: templateName,
        category: category
      };
    } catch (error) {
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload college assets (logos, signatures)
  async uploadAsset(file, assetType, subType, department, assetName) {
    try {
      const formData = new FormData();
      formData.append('asset_type', assetType);
      formData.append('asset_name', assetName);
      formData.append('file', file);
      
      if (subType) formData.append('sub_type', subType);
      if (department) formData.append('department', department);

      const response = await fetch(`${this.baseURL}/api/v1/storage/upload/asset`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Asset upload failed');
      }

      return {
        path: result.file_path,
        url: result.asset_url,
        filename: file.name,
        size: file.size,
        type: assetType,
        signature_type: subType,
        department: department,
        name: assetName,
        bucket: result.bucket
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Delete college asset
  async deleteAsset(filename, assetType, subType, department) {
    try {
      const formData = new FormData();
      formData.append('asset_type', assetType);
      formData.append('filename', filename);
      
      if (subType) formData.append('sub_type', subType);
      if (department) formData.append('department', department);

      const response = await fetch(`${this.baseURL}/api/v1/storage/delete/asset`, {
        method: 'DELETE',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Asset delete failed');
      }

      return result.success;
    } catch (error) {
      
      return false;
    }
  }

  // Delete event files
  async deleteEventFiles(eventId) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/storage/delete/event-files/${eventId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If it's not JSON (like HTML error page), the API endpoint might not be implemented yet
        
        return { 
          success: false, 
          error: 'Delete API endpoint not available yet',
          deletedCount: 0 
        };
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Delete failed');
      }

      return { 
        success: true, 
        deletedCount: result.deleted_count 
      };
    } catch (error) {
      
      // Return graceful error that allows the upload to continue
      return { 
        success: false, 
        error: error.message,
        deletedCount: 0 
      };
    }
  }

  // Delete specific event file types
  async deleteSpecificEventFiles(eventId, fileTypes) {
    try {
      const fileTypesParam = Array.isArray(fileTypes) ? fileTypes.join(',') : fileTypes;
      const response = await fetch(`${this.baseURL}/api/v1/storage/delete/event-specific-files/${eventId}?file_types=${encodeURIComponent(fileTypesParam)}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        
        return { 
          success: false, 
          error: 'Delete API endpoint not available yet',
          deletedCount: 0 
        };
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Delete failed');
      }

      return { 
        success: true, 
        deletedCount: result.deleted_count,
        fileTypesDeleted: result.file_types_deleted
      };
    } catch (error) {
      
      return { 
        success: false, 
        error: error.message,
        deletedCount: 0 
      };
    }
  }

  // Delete user avatar
  async deleteAvatar(user) {
    try {
      const formData = new FormData();
      formData.append('user_type', user.user_type || 'student');
      formData.append('user_id', user.enrollment_no || user.employee_id || user.student_id);

      const response = await fetch(`${this.baseURL}/api/v1/storage/delete/avatar`, {
        method: 'DELETE',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Delete failed');
      }

      return result.success;
    } catch (error) {
      
      throw error;
    }
  }

  // Legacy compatibility methods (maintain same interface)
  getFileUrl(filePath) {
    // For legacy compatibility - URLs are now returned directly from upload
    return filePath;
  }

  getAvatarUrl(path) {
    // For legacy compatibility - URLs are now returned directly from upload
    return path;
  }

  getAssetUrl(path) {
    // For legacy compatibility - URLs are now returned directly from upload
    return path;
  }

  // Legacy methods for backward compatibility
  async deleteExistingAvatars(user) {
    return await this.deleteAvatar(user);
  }

  async listAssets(assetType = null) {
    // This would require a new backend endpoint if needed
    
    return [];
  }
}

// Export singleton instance
export default new UnifiedStorageService();

// Export individual functions for compatibility with existing components
export const uploadAvatar = async (file, user) => {
  const service = new UnifiedStorageService();
  return await service.uploadAvatar(file, user);
};

export const getAvatarUrl = (path) => path;

export const deleteExistingAvatars = async (user) => {
  const service = new UnifiedStorageService();
  return await service.deleteAvatar(user);
};

export const deleteAvatar = async (user) => {
  const service = new UnifiedStorageService();
  return await service.deleteAvatar(user);
};

export const uploadAsset = async (file, assetType, subType, department, assetName) => {
  const service = new UnifiedStorageService();
  return await service.uploadAsset(file, assetType, subType, department, assetName);
};

export const getAssetUrl = (path) => path;

export const listAssets = async (assetType = null) => {
  
  return [];
};

export const deleteAsset = async (filename, assetType, subType, department) => {
  const service = new UnifiedStorageService();
  return await service.deleteAsset(filename, assetType, subType, department);
};

export const uploadCertificateTemplate = async (file, templateName, category) => {
  const service = new UnifiedStorageService();
  return await service.uploadCertificateTemplate(file, templateName, category);
};
