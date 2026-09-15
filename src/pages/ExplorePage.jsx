import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PostGrid from '../components/post/PostGrid';
import SearchBar from '../components/common/SearchBar';
import { Compass, Loader2 } from 'lucide-react';

export default function ExplorePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExplorePosts = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
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
            profiles!user_id(username)
          `)
          .neq('user_id', '4522b7c9-407e-4e96-8a35-397e64ed0784')
          .order('created_at', { ascending: false });

        const cleanPosts = (data || []).filter(
          (p) => p.profiles?.username !== 'tester3' && p.profiles?.username !== 'demoyapper'
        );
        setPosts(cleanPosts);
      } catch (err) {
        console.warn('Error fetching explore posts:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExplorePosts();
  }, []);

  return (
    <div className="explore-layout">
      {/* Mobile search bar container */}
      <div className="mobile-search-section">
        <SearchBar />
      </div>

      <div className="explore-header">
        <Compass size={24} className="header-icon" />
        <h2>Explore Yappers</h2>
      </div>

      {loading ? (
        <div className="explore-loader">
          <Loader2 className="spinner-icon" size={32} />
        </div>
      ) : (
        <PostGrid posts={posts} />
      )}

      <style>{`
        .explore-layout {
          max-width: 935px;
          margin: 0 auto;
          padding: 24px 20px 80px 20px;
        }

        .mobile-search-section {
          display: none;
          justify-content: center;
          margin-bottom: 24px;
        }

        .explore-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }

        .explore-header h2 {
          font-family: var(--display-font);
          font-size: 22px;
          font-weight: 700;
        }

        .header-icon {
          color: var(--accent-purple);
        }

        .explore-loader {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .mobile-search-section {
            display: flex;
          }
          
          .explore-layout {
            padding-top: 16px;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
