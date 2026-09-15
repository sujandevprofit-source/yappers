import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Grid, MessageSquare, Settings, LogOut, Loader2, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import useAuth from '../hooks/useAuth';
import PostGrid from '../components/post/PostGrid';

export default function ProfilePage() {
  const { username } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const { profile: currentAuthProfile } = useAuth();

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      const targetUsername = username || currentAuthProfile?.username;
      if (!targetUsername) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch user profile from Supabase
        let profData = null;
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', targetUsername)
            .maybeSingle();
          profData = data;
        } catch (dbErr) {
          console.warn('Supabase profile query error', dbErr);
        }

        // Fallback for current user profile if freshly logged in
        if (!profData && currentAuthProfile?.username === targetUsername) {
          profData = currentAuthProfile;
        }

        if (!profData) {
          toast.error('User not found');
          navigate('/');
          return;
        }

        setProfile(profData);

        // 2. Fetch remote posts
        let remotePosts = [];
        try {
          const { data: postsData } = await supabase
            .from('posts')
            .select('id, media_url, media_type, like_count, comment_count, caption, created_at')
            .eq('user_id', profData.id)
            .order('created_at', { ascending: false });
          remotePosts = postsData || [];
        } catch (postsErr) {
          console.warn('Supabase profile posts query error', postsErr);
        }

        setPosts(remotePosts);

        // 3. Fetch followers/following count safely
        try {
          const [followersRes, followingRes] = await Promise.all([
            supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', profData.id),
            supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', profData.id)
          ]);
          setFollowersCount(followersRes.count || 0);
          setFollowingCount(followingRes.count || 0);
        } catch (fErr) {
          setFollowersCount(0);
          setFollowingCount(0);
        }

        // 4. Check follow state
        if (user && user.id !== profData.id) {
          try {
            const { data: followData } = await supabase
              .from('followers')
              .select('follower_id')
              .eq('follower_id', user.id)
              .eq('following_id', profData.id)
              .maybeSingle();
            setIsFollowing(!!followData);
          } catch (e) {
            setIsFollowing(false);
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [username, user, currentAuthProfile, navigate]);

  const handleFollowToggle = async () => {
    if (!user || !profile || actionLoading) return;
    setActionLoading(true);

    const nextFollowState = !isFollowing;
    setIsFollowing(nextFollowState);
    setFollowersCount(prev => nextFollowState ? prev + 1 : Math.max(0, prev - 1));

    try {
      if (nextFollowState) {
        const { error } = await supabase
          .from('followers')
          .insert({ follower_id: user.id, following_id: profile.id });
        if (error) throw error;

        // Follow notification
        await supabase.from('notifications').insert({
          user_id: profile.id,
          actor_id: user.id,
          type: 'follow'
        });
      } else {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);
        if (error) throw error;
      }
    } catch (err) {
      // Revert state
      setIsFollowing(!nextFollowState);
      setFollowersCount(prev => !nextFollowState ? prev + 1 : Math.max(0, prev - 1));
      toast.error('Action failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDM = async () => {
    if (!user || !profile) return;
    
    // Enforce user1_id < user2_id order for uniqueness constraint
    const [uid1, uid2] = [user.id, profile.id].sort();

    try {
      // 1. Check if conversation already exists
      const { data: existing, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('user1_id', uid1)
        .eq('user2_id', uid2)
        .maybeSingle();

      if (error) throw error;

      if (existing) {
        navigate(`/messages/${existing.id}`);
      } else {
        // 2. Insert new conversation
        const { data: created, error: createErr } = await supabase
          .from('conversations')
          .insert({ user1_id: uid1, user2_id: uid2 })
          .select('id')
          .single();

        if (createErr) throw createErr;
        navigate(`/messages/${created.id}`);
      }
    } catch (err) {
      toast.error('Failed to open chat: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <Loader2 className="spinner-icon" size={32} />
      </div>
    );
  }

  const isOwnProfile = user && user.id === profile?.id;

  return (
    <div className="profile-layout">
      {/* Profile Info Header */}
      <header className="profile-header-section">
        <div className="avatar-wrapper">
          <img
            src={profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'}
            alt={profile.username}
            className="profile-avatar-img"
          />
        </div>

        <div className="profile-details">
          <div className="username-row">
            <h2 className="profile-username">@{profile.username}</h2>
            
            <div className="action-buttons-wrapper">
              {isOwnProfile ? (
                <>
                  <Link to="/settings" className="btn-secondary profile-action-btn">
                    <Settings size={16} />
                    <span>Edit Profile</span>
                  </Link>
                  <button onClick={signOut} className="btn-secondary profile-action-btn logout-profile-btn">
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleFollowToggle}
                    className={`profile-action-btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={actionLoading}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                  <button onClick={handleStartDM} className="btn-secondary profile-action-btn">
                    <MessageSquare size={16} />
                    <span>Message</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="stats-row">
            <span className="stat-item"><strong>{posts.length}</strong> posts</span>
            <span className="stat-item"><strong>{followersCount}</strong> followers</span>
            <span className="stat-item"><strong>{followingCount}</strong> following</span>
          </div>

          <div className="bio-row">
            <h3 className="profile-fullname-text">{profile.full_name}</h3>
            {profile.bio && <p className="profile-bio-text">{profile.bio}</p>}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-website-link"
              >
                <Globe size={14} />
                <span>{profile.website}</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Grid Tabs */}
      <div className="profile-tabs">
        <button className="tab-item active">
          <Grid size={16} />
          <span>POSTS</span>
        </button>
      </div>

      {/* Posts Grid */}
      <div className="profile-posts-grid">
        <PostGrid posts={posts} />
      </div>

      <style>{`
        .profile-layout {
          max-width: 935px;
          margin: 0 auto;
          padding: 30px 20px 80px 20px;
        }

        .profile-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
          color: var(--text-muted);
        }

        .profile-header-section {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 40px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 44px;
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .profile-header-section {
            grid-template-columns: 1fr;
            gap: 20px;
            padding-bottom: 24px;
            text-align: center;
          }
          
          .avatar-wrapper {
            display: flex;
            justify-content: center;
          }
        }

        .profile-avatar-img {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .profile-avatar-img {
            width: 100px;
            height: 100px;
          }
        }

        .profile-details {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .username-row {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .username-row {
            justify-content: center;
          }
        }

        .profile-username {
          font-family: var(--display-font);
          font-size: 24px;
          font-weight: 400;
        }

        .action-buttons-wrapper {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .profile-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          padding: 8px 16px;
        }

        .logout-profile-btn {
          border-color: rgba(239, 68, 68, 0.2);
          color: var(--danger);
        }

        .logout-profile-btn:hover {
          background-color: rgba(239, 68, 68, 0.05);
        }

        .stats-row {
          display: flex;
          gap: 40px;
          font-size: 16px;
        }

        @media (max-width: 768px) {
          .stats-row {
            justify-content: space-around;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            padding: 12px 0;
          }
        }

        .stat-item strong {
          color: var(--text-primary);
        }

        .bio-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
        }

        @media (max-width: 768px) {
          .bio-row {
            align-items: center;
            text-align: center;
          }
        }

        .profile-fullname-text {
          font-size: 15px;
          font-weight: 600;
        }

        .profile-bio-text {
          font-size: 14px;
          color: var(--text-primary);
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .profile-website-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-link);
          font-size: 14px;
          font-weight: 500;
          width: fit-content;
        }

        .profile-tabs {
          display: flex;
          justify-content: center;
          border-top: 1px solid var(--border-color);
          margin-bottom: 16px;
        }

        @media (max-width: 768px) {
          .profile-tabs {
            border-top: none;
          }
        }

        .tab-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 16px 0;
          font-size: 12px;
          letter-spacing: 1px;
          font-weight: 600;
          color: var(--text-secondary);
          border-top: 1px solid transparent;
          margin-top: -1px;
        }

        .tab-item.active {
          color: var(--text-primary);
          border-top: 1px solid var(--text-primary);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
