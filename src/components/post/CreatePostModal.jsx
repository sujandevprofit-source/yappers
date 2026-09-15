import { useState, useRef } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import useAuth from '../../hooks/useAuth';

export default function CreatePostModal({ onClose }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [mediaType, setMediaType] = useState(''); // 'image' or 'video'
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const type = selectedFile.type.startsWith('video/') ? 'video' : 'image';

    if (type === 'video') {
      // Validate video duration & size
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('Video must be under 50MB.');
        return;
      }
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 60) {
          toast.error('Video must be under 1 minute (60 seconds).');
        } else {
          setFile(selectedFile);
          setPreviewUrl(URL.createObjectURL(selectedFile));
          setMediaType('video');
        }
      };
      video.src = URL.createObjectURL(selectedFile);
    } else if (type === 'image') {
      // Validate image size (e.g. 15MB)
      if (selectedFile.size > 15 * 1024 * 1024) {
        toast.error('Image must be under 15MB.');
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setMediaType('image');
    } else {
      toast.error('Unsupported file format. Please upload an image or video.');
    }
  };

  // Client-side image compression to save Supabase free storage
  const compressImage = (imageFile) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize to maximum 1080px width/height while maintaining aspect ratio
        const MAX_SIZE = 1080;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to WebP blob with 80% quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], imageFile.name.replace(/\.[^/.]+$/, "") + ".webp", {
                type: 'image/webp',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Canvas compression failed'));
            }
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select an image or video to upload.');
      return;
    }

    setUploading(true);
    toast.loading('Preparing media...', { id: 'post-upload' });

    try {
      // 1. Read file as Data URL as a guaranteed, instant fallback
      const readFileAsDataURL = (fileObj) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(fileObj);
        });
      };

      let mediaUrl = await readFileAsDataURL(file);
      let finalFile = file;

      // 2. Try processing image via backend if image
      if (mediaType === 'image') {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/process-media', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const processedBlob = await response.blob();
            finalFile = new File([processedBlob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp',
              lastModified: Date.now()
            });
            mediaUrl = await readFileAsDataURL(finalFile);
          }
        } catch (err) {
          console.warn('Backend image processing fallback to client', err);
        }
      }

      // 3. Try uploading to Supabase Storage if configured
      try {
        const fileExt = finalFile.name.split('.').pop() || 'webp';
        const fileKey = `${user?.id || 'demo'}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('user-media')
          .upload(fileKey, finalFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('user-media')
            .getPublicUrl(fileKey);
          if (publicUrl) mediaUrl = publicUrl;
        }
      } catch (storageErr) {
        console.warn('Supabase storage upload skipped or failed, using local media URL');
      }

      if (!user?.id) {
        toast.error('You must be signed in with Google to create a post.');
        return;
      }

      const { error: dbErr } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          caption: caption.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (dbErr) throw dbErr;

      toast.success('Post created successfully!', { id: 'post-upload' });
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Upload flow failed:', error);
      toast.error('Failed to create post: ' + (error.message || 'Error processing media'), { id: 'post-upload' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass">
        <div className="modal-header">
          <h2>Create New Post</h2>
          <button className="close-btn" onClick={onClose} disabled={uploading}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {!previewUrl ? (
            <div
              className="dropzone"
              onClick={() => fileInputRef.current.click()}
            >
              <Upload size={40} className="upload-icon" />
              <p className="upload-prompt">Drag or click to upload photo / video</p>
              <span className="upload-limits">Images up to 15MB. Videos under 1 min (50MB max).</span>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,video/*"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="post-preview-container">
              <div className="preview-media-wrapper">
                {mediaType === 'image' ? (
                  <img src={previewUrl} alt="Preview" className="preview-media" />
                ) : (
                  <video src={previewUrl} controls className="preview-media" />
                )}
                <button
                  className="change-file-btn"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl('');
                    setMediaType('');
                  }}
                  disabled={uploading}
                >
                  Change Media
                </button>
              </div>

              <div className="caption-section">
                <textarea
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={500}
                  disabled={uploading}
                />
                <div className="char-count">{caption.length}/500</div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="spinner-icon" size={16} />
                <span>Posting...</span>
              </>
            ) : (
              <span>Share Post</span>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 680px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-color);
          box-shadow: 0 24px 60px rgba(0,0,0,0.8);
          overflow: hidden;
          background-color: var(--bg-card);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header h2 {
          font-family: var(--display-font);
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          color: var(--text-secondary);
        }

        .close-btn:hover {
          color: var(--text-primary);
        }

        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          min-height: 300px;
        }

        .dropzone {
          flex-grow: 1;
          border: 2px dashed var(--border-color);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 40px 20px;
          text-align: center;
          transition: border-color 0.2s, background-color 0.2s;
        }

        .dropzone:hover {
          border-color: var(--text-muted);
          background-color: rgba(255,255,255,0.02);
        }

        .upload-icon {
          color: var(--text-muted);
        }

        .upload-prompt {
          font-size: 15px;
          font-weight: 500;
        }

        .upload-limits {
          font-size: 12px;
          color: var(--text-muted);
        }

        .post-preview-container {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 20px;
          width: 100%;
        }

        @media (max-width: 600px) {
          .post-preview-container {
            grid-template-columns: 1fr;
          }
        }

        .preview-media-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          overflow: hidden;
          background-color: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          border: 1px solid var(--border-color);
        }

        .preview-media {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .change-file-btn {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .change-file-btn:hover {
          background: rgba(0,0,0,0.85);
        }

        .caption-section {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .caption-section textarea {
          width: 100%;
          flex-grow: 1;
          height: 180px;
          resize: none;
          background: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px;
          color: var(--text-primary);
          font-size: 14px;
        }

        .char-count {
          align-self: flex-end;
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid var(--border-color);
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
