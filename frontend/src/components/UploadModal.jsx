import React, { useState } from 'react';
import { FaTimes, FaCloudUploadAlt } from 'react-icons/fa';
import api from '../api/axios';
import './UploadModal.css';

const UploadModal = ({ onClose, onSuccess, isShort = false }) => {
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (type === 'video') setVideoFile(file);
    if (type === 'thumbnail') setThumbnailFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      setError('Video file is required');
      return;
    }
    if (!thumbnailFile) {
      setError('Thumbnail image is required');
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('video_file', videoFile);
    data.append('thumbnail_file', thumbnailFile);
    data.append('is_short', String(isShort));

    setUploading(true);
    setError('');

    try {
      const res = await api.post('/videos', data, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isShort ? 'Subir Short' : 'Subir video'}</h2>
          <button className="close-btn" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="modal-body">
          {error && <div className="upload-error">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title (required)</label>
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleInputChange} 
                required 
                placeholder="Add a title that describes your video"
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                rows="4"
                placeholder="Tell viewers about your video"
              ></textarea>
            </div>

            <div className="file-upload-section">
              <div className="file-input-group">
                <label>Video File (MP4)</label>
                <div className="file-drop-area">
                  <FaCloudUploadAlt size={32} />
                  <span>{videoFile ? videoFile.name : 'Select video file'}</span>
                  <input 
                    type="file" 
                    accept="video/mp4,video/x-m4v,video/*" 
                    onChange={(e) => handleFileChange(e, 'video')} 
                    required 
                  />
                </div>
              </div>
              
              <div className="file-input-group">
                <label>Thumbnail (required - JPG/PNG)</label>
                <div className="file-drop-area">
                  <FaCloudUploadAlt size={32} />
                  <span>{thumbnailFile ? thumbnailFile.name : 'Select thumbnail image'}</span>
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/jpg" 
                    onChange={(e) => handleFileChange(e, 'thumbnail')} 
                  />
                </div>
              </div>
            </div>

            {uploading && (
              <div className="upload-progress-container">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="progress-text">Uploading... {progress}%</div>
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="cancel-btn" onClick={onClose} disabled={uploading}>Cancel</button>
              <button type="submit" className="submit-btn" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
