import React, { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { uploadAvatar, deleteAvatar, getAvatarUrl } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

function AvatarUpload({ currentAvatar, onAvatarUpdate, className = "" }) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [imageSrc, setImageSrc] = useState();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const hiddenAnchorRef = useRef(null);
  const hiddenInputRef = useRef(null);

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setError('');
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImageSrc(reader.result?.toString() || '')
      );
      reader.readAsDataURL(e.target.files[0]);
      setShowModal(true);
    }
  };

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    setCrop({
      unit: '%',
      width: 90,
      height: 90,
      x: 5,
      y: 5,
      aspect: 1,
    });
  }, []);

  const getCroppedImg = useCallback((image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  }, []);
  const handleUpload = async () => {
    if (!completedCrop || !imgRef.current) {
      console.log('Missing crop or image ref');
      return;
    }

    try {
      setUploading(true);
      setError('');

      console.log('Starting upload process...');
      console.log('Crop data:', completedCrop);

      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      console.log('Cropped image blob:', croppedImageBlob);

      if (!croppedImageBlob) {
        throw new Error('Failed to generate cropped image');
      }

      const file = new File([croppedImageBlob], `avatar-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      console.log('File created:', file.name, file.size, 'bytes');      // Upload to Supabase
      console.log('Uploading to Supabase...');
      const avatarPath = await uploadAvatar(file, user);
      console.log('Supabase upload successful:', avatarPath);
      
      // Get the public URL from Supabase
      const avatarPublicUrl = getAvatarUrl(avatarPath);
      console.log('Generated public URL:', avatarPublicUrl);
      
      // Update profile in backend with the PUBLIC URL, not the path
      console.log('Updating backend profile...');
      
      // Use different endpoint based on user type
      const endpoint = user?.user_type === 'faculty' 
        ? '/api/v1/client/profile/faculty/update' 
        : '/api/v1/client/profile/update';
      
      const response = await api.put(endpoint, {
        avatar_url: avatarPublicUrl  // Store the full public URL
      });
      
      console.log('Backend response:', response.data);      if (response.data.success) {
        console.log('Backend update successful');
        onAvatarUpdate(avatarPublicUrl);  // Use the same URL we stored
        setShowModal(false);
        setImageSrc(null);
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      console.error('Error stack:', error.stack);
      setError(`Failed to upload avatar: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };  const handleRemoveAvatar = async () => {
    try {
      setUploading(true);
      setError('');

      // First, delete the file from Supabase storage
      if (user?.enrollment_no && user?.full_name) {
        try {
          await deleteAvatar(user);
          console.log('Avatar file deleted from Supabase storage');
        } catch (storageError) {
          console.warn('Could not delete file from storage (may not exist):', storageError);
          // Continue with database update even if file deletion fails
        }
      }

      // Update the database to set avatar_url to null
      const endpoint = user?.user_type === 'faculty' 
        ? '/api/v1/client/profile/faculty/update' 
        : '/api/v1/client/profile/update';
        
      const response = await api.put(endpoint, {
        avatar_url: null
      });      if (response.data.success) {
        // Clear any cached avatar state
        onAvatarUpdate(null);
        setShowModal(false);
      } else {
        throw new Error(response.data.message || 'Failed to remove avatar');
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
      setError('Failed to remove avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    if (user?.full_name) {
      const names = user.full_name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (user?.enrollment_no) {
      return user.enrollment_no.substring(0, 2).toUpperCase();
    }
    return 'GU';
  };

  return (
    <>
      <div className={`relative group ${className}`}>
        <div className="w-40 h-40 bg-slate-100 rounded-full flex items-center justify-center shadow-lg border-4 border-white group-hover:scale-105 transition-transform duration-300 cursor-pointer overflow-hidden">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-5xl font-bold text-slate-800">
              {getInitials()}
            </span>
          )}
        </div>
        
        {/* Edit overlay */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
          onClick={() => setShowModal(true)}
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <div className="absolute bottom-2 right-2 w-10 h-10 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {imageSrc ? 'Crop Your Avatar' : 'Profile Photo'}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setImageSrc(null);
                    setError('');
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {!imageSrc ? (
                <div className="space-y-4">
                  {/* Current avatar preview */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center shadow-lg border-4 border-white overflow-hidden">
                      {currentAvatar ? (
                        <img
                          src={currentAvatar}
                          alt="Current avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-bold text-slate-800">
                          {getInitials()}
                        </span>
                      )}
                    </div>
                  </div>                  {/* Action buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => hiddenInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 font-semibold"
                      disabled={uploading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {currentAvatar ? 'Change Photo' : 'Upload Photo'}
                    </button>

                    {currentAvatar && (
                      <button
                        onClick={handleRemoveAvatar}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-200 font-semibold"
                        disabled={uploading}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Image cropper */}
                  <div className="flex justify-center">
                    <ReactCrop
                      crop={crop}
                      onChange={(_, percentCrop) => setCrop(percentCrop)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={1}
                      className="max-w-full max-h-96"
                    >
                      <img
                        ref={imgRef}
                        alt="Crop me"
                        src={imageSrc}
                        style={{ transform: 'scale(1) rotate(0deg)' }}
                        onLoad={onImageLoad}
                        className="max-w-full max-h-96"
                      />
                    </ReactCrop>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setImageSrc(null);
                        setError('');
                      }}
                      className="flex-1 px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors font-semibold rounded-xl hover:bg-slate-50 border border-slate-200"
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpload}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-semibold flex items-center justify-center gap-2"
                      disabled={uploading || !completedCrop}
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Avatar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={hiddenInputRef}
        type="file"
        accept="image/*"
        onChange={onSelectFile}
        className="hidden"
      />
    </>
  );
}

export default AvatarUpload;
