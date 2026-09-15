import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PostCard from '../components/post/PostCard';
import useAuth from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function HomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState(() => {
    try {
      const cached = sessionStorage.getItem('yappers_feed_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [suggestedUsers, setSuggestedUsers] = useState(() => {
    try {
      const cached = sessionStorage.getItem('yappers_suggested_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [suggestedLoading, setSuggestedLoading] = useState(() => suggestedUsers.length === 0);
  const [loading, setLoading] = useState(() => posts.length === 0);

  useEffect(() => {
    let isMounted = true;
    const fetchFeed = async () => {
      if (posts.length === 0) setLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id,
            caption,
            media_url,
            media_type,
            like_count,
            comment_count,
            created_at,
            user_id,
            profiles!user_id(id, username, full_name, avatar_url)
          `)
          .neq('user_id', '4522b7c9-407e-4e96-8a35-397e64ed0784')
          .order('created_at', { ascending: false });

        if (!error && data && isMounted) {
          const cleanPosts = data.filter(
            (p) => p.profiles?.username !== 'tester3' && p.profiles?.username !== 'demoyapper'
          );
          setPosts(cleanPosts);
          sessionStorage.setItem('yappers_feed_cache', JSON.stringify(cleanPosts));
        }
      } catch (err) {
        console.warn('Error fetching posts feed:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFeed();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchSuggestedUsers = async () => {
      if (suggestedUsers.length === 0) setSuggestedLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .neq('username', 'tester3')
          .neq('username', 'demoyapper')
          .order('created_at', { ascending: false })
          .limit(10);

        if (profile?.id) {
          query = query.neq('id', profile.id);
        }

        const { data, error } = await query;
        if (!error && data && isMounted) {
          setSuggestedUsers(data);
          sessionStorage.setItem('yappers_suggested_cache', JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Could not fetch real suggested users:', err.message);
      } finally {
        if (isMounted) setSuggestedLoading(false);
      }
    };

    const fetchTotalUsersCount = async () => {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .neq('username', 'tester3')
          .neq('username', 'demoyapper');

        if (!error && count !== null && isMounted) {
          setTotalUsersCount(count);
        }
      } catch (err) {
        console.warn('Could not fetch total users count:', err.message);
      }
    };

    fetchSuggestedUsers();
    fetchTotalUsersCount();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  return (
    <div className="home-layout">
      {/* Main Feed Section */}
      <div className="feed-section">
        {loading ? (
          // Sleek Skeleton Loading
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="skeleton-card glass">
              <div className="skeleton-header">
                <div className="skeleton-avatar"></div>
                <div className="skeleton-text"></div>
              </div>
              <div className="skeleton-media"></div>
            </div>
          ))
        ) : posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="empty-feed glass">
            <h2>Welcome to Yappers!</h2>
            <p>Your feed is currently empty. Tap the "+" create button to share your first post or follow other yappers!</p>
          </div>
        )}
      </div>

      {/* Sidebar Suggestions */}
      <div className="suggestions-section">
        <div className="current-user-card">
          <img
            src={profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80'}
            alt="Current User"
            className="current-avatar"
            onClick={() => profile?.username && navigate(`/profile/${profile.username}`)}
          />
          <div className="current-info">
            <span className="current-username" onClick={() => profile?.username && navigate(`/profile/${profile.username}`)}>
              @{profile?.username || 'user'}
            </span>
            <span className="current-fullname">{profile?.full_name || 'Yapper User'}</span>
          </div>
        </div>

        <div className="suggestions-container glass">
          <div className="suggestions-header">
            <h3>Suggested for you</h3>
          </div>

          <div className="suggestions-list">
            {suggestedLoading ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Loading suggested yappers...
              </div>
            ) : suggestedUsers.length > 0 ? (
              suggestedUsers.map((sUser) => (
                <div key={sUser.id} className="suggestion-item">
                  <img
                    src={sUser.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80'}
                    alt={sUser.username || 'yapper'}
                    className="suggestion-avatar"
                    onClick={() => navigate(`/profile/${sUser.username}`)}
                  />
                  <div className="suggestion-info">
                    <span className="suggestion-username" onClick={() => navigate(`/profile/${sUser.username}`)}>
                      @{sUser.username || 'yapper'}
                    </span>
                    <span className="suggestion-fullname">{sUser.full_name || sUser.username || 'Yapper'}</span>
                  </div>
                  <button
                    className="suggestion-action-btn"
                    onClick={() => navigate(`/profile/${sUser.username}`)}
                  >
                    View
                  </button>
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No other registered yappers yet.
              </div>
            )}
          </div>
        </div>

        {/* Total Users Community Stats Box */}
        <div className="community-stats-card glass" style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: 'var(--accent-purple)' }} />
            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>Community Overview</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Community Yappers:</span>
            <span style={{ fontWeight: '700', color: 'var(--accent-purple)', fontSize: '15px' }}>{totalUsersCount} Yappers</span>
          </div>
        </div>
      </div>

      <style>{`
        .home-layout {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 40px;
          max-width: 935px;
          margin: 0 auto;
          padding: 24px 20px;
        }

        @media (max-width: 900px) {
          .home-layout {
            grid-template-columns: 1fr;
            max-width: 600px;
          }

          .suggestions-section {
            display: none;
          }
        }

        .feed-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .empty-feed {
          width: 100%;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          border: 1px solid var(--border-color);
        }

        .empty-feed h2 {
          font-family: var(--display-font);
          margin-bottom: 12px;
          font-size: 22px;
        }

        .empty-feed p {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.6;
        }

        /* Suggested section styling */
        .suggestions-section {
          position: sticky;
          top: 84px;
          height: fit-content;
        }

        .current-user-card {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding: 0 8px;
        }

        .current-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: cover;
          cursor: pointer;
          border: 1px solid var(--border-color);
        }

        .current-info {
          display: flex;
          flex-direction: column;
        }

        .current-username {
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }

        .current-fullname {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .suggestions-container {
          border-radius: 12px;
          border: 1px solid var(--border-color);
          padding: 20px;
          background-color: var(--bg-card);
        }

        .suggestions-header {
          margin-bottom: 16px;
        }

        .suggestions-header h3 {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .suggestion-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          cursor: pointer;
          border: 1px solid var(--border-color);
        }

        .suggestion-info {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .suggestion-username {
          font-weight: 600;
          font-size: 13.5px;
          cursor: pointer;
        }

        .suggestion-username:hover {
          text-decoration: underline;
        }

        .suggestion-fullname {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .suggestion-action-btn {
          color: var(--accent-blue);
          font-size: 12px;
          font-weight: 600;
        }

        /* Skeleton loading styles */
        .skeleton-card {
          width: 100%;
          height: 480px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          margin-bottom: 24px;
          padding: 16px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
        }

        .skeleton-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #1e1e1e;
          animation: pulse 1.5s infinite ease-in-out;
        }

        .skeleton-text {
          width: 120px;
          height: 14px;
          border-radius: 4px;
          background: #1e1e1e;
          animation: pulse 1.5s infinite ease-in-out;
        }

        .skeleton-media {
          flex-grow: 1;
          background: #1a1a1a;
          animation: pulse 1.5s infinite ease-in-out;
        }

        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
