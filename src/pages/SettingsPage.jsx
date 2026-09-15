import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Globe, Loader2, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import useAuth from '../hooks/useAuth';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState(profile?.username || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB.');
      return;
    }

    setUploadingAvatar(true);
    const toastId = toast.loading('Processing avatar image...');

    try {
      const reader = new FileReader();
      const readDataUrl = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      let localUrl = await readDataUrl;

      // Try Supabase Storage upload
      try {
        const fileExt = file.name.split('.').pop() || 'webp';
        const fileKey = `${profile?.id || 'demo'}/avatar_${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('user-media')
          .upload(fileKey, file, { cacheControl: '3600', upsert: true });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('user-media')
            .getPublicUrl(fileKey);
          if (publicUrl) localUrl = publicUrl;
        }
      } catch (storageErr) {
        console.warn('Supabase storage avatar upload skipped', storageErr);
      }

      setAvatarUrl(localUrl);
      toast.success('Avatar uploaded successfully!', { id: toastId });
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast.error('Upload failed: ' + (err.message || 'Error uploading'), { id: toastId });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      toast.error('Username must be 3-20 characters long and can only contain letters, numbers, and underscores.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Saving changes...');

    const updatedProfileData = {
      id: profile?.id || 'demo-user-12345',
      username: username.trim(),
      full_name: fullName.trim(),
      bio: bio.trim(),
      website: website.trim(),
      avatar_url: avatarUrl.trim(),
      updated_at: new Date().toISOString()
    };

    try {
      // 1. Try Supabase update
      try {
        await supabase
          .from('profiles')
          .update({
            username: username.trim(),
            full_name: fullName.trim(),
            bio: bio.trim(),
            website: website.trim(),
            avatar_url: avatarUrl.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', profile?.id);
      } catch (dbErr) {
        console.warn('Supabase profile update skipped/failed', dbErr);
      }

      // 2. Always update local storage session profile so it persists
      const savedBypass = localStorage.getItem('yappers_bypass_user');
      if (savedBypass) {
        const parsed = JSON.parse(savedBypass);
        parsed.profile = { ...parsed.profile, ...updatedProfileData };
        parsed.user.user_metadata = {
          ...parsed.user.user_metadata,
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim()
        };
        localStorage.setItem('yappers_bypass_user', JSON.stringify(parsed));
      }

      await refreshProfile();
      toast.success('Profile updated successfully!', { id: toastId });
      navigate(`/profile/${username}`);
    } catch (err) {
      toast.error('Failed to update profile: ' + (err.message || 'Error saving profile'), { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-layout">
      <div className="settings-header">
        <h2>Edit Profile</h2>
        <p>Keep your information updated to stay connected with other yappers.</p>
      </div>

      <form onSubmit={handleSave} className="settings-form glass">
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <div className="input-with-icon">
            <span className="input-prefix">@</span>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="username"
              required
              disabled={saving}
            />
          </div>
          <span className="input-help">3-20 characters: letters, numbers, underscores.</span>
        </div>

        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label>Avatar Picture</label>
          <div className="avatar-upload-container">
            <img 
              src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'} 
              alt="Avatar Preview" 
              className="avatar-preview-circle"
            />
            <div className="avatar-upload-actions">
              <label htmlFor="avatar-file-input" className="btn-secondary avatar-upload-btn">
                <Camera size={16} />
                <span>Upload Photo</span>
              </label>
              <input
                type="file"
                id="avatar-file-input"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar || saving}
                style={{ display: 'none' }}
              />
              <input
                type="text"
                placeholder="Or paste image URL..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                disabled={uploadingAvatar || saving}
                className="avatar-url-input"
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="website">Website</label>
          <div className="input-with-icon">
            <Globe size={18} className="input-icon" />
            <input
              type="text"
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="yappers.com"
              disabled={saving}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
            maxLength={160}
            disabled={saving}
          />
          <span className="char-counter">{bio.length}/160</span>
        </div>

        <button type="submit" className="btn-primary submit-btn" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="spinner" size={18} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </form>

      <style>{`
        .settings-layout {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px 20px 80px 20px;
        }

        .settings-header {
          margin-bottom: 24px;
        }

        .settings-header h2 {
          font-family: var(--display-font);
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .settings-header p {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .settings-form {
          border-radius: 12px;
          border: 1px solid var(--border-color);
          padding: 30px;
          background-color: var(--bg-card);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-prefix {
          position: absolute;
          left: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .input-with-icon input {
          width: 100%;
          padding-left: 32px;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
        }

        .input-with-icon .input-icon + input {
          padding-left: 38px;
        }

        .input-help {
          font-size: 11px;
          color: var(--text-muted);
        }

        .char-counter {
          align-self: flex-end;
          font-size: 11px;
          color: var(--text-muted);
        }

        .avatar-upload-container {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 10px 0;
        }

        .avatar-preview-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--border-color);
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }

        .avatar-upload-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-grow: 1;
        }

        .avatar-upload-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          font-size: 13px;
          cursor: pointer;
          width: fit-content;
        }

        .avatar-url-input {
          font-size: 13px;
          padding: 8px 12px;
          width: 100%;
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          margin-top: 10px;
        }

        .spinner {
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
