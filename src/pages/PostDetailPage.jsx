import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PostCard from '../components/post/PostCard';

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    supabase
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
        profiles!user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (data && !error) {
          setPost(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Error fetching post detail:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <div className="post-detail-layout">
      <div className="detail-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>
      </div>

      <div className="detail-content">
        {loading ? (
          <div className="detail-loader">
            <Loader2 className="spinner-icon" size={32} />
          </div>
        ) : post ? (
          <PostCard post={post} />
        ) : (
          <div className="not-found">Post not found</div>
        )}
      </div>

      <style>{`
        .post-detail-layout {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px 20px 80px 20px;
        }

        .detail-header {
          margin-bottom: 16px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 14px;
        }

        .back-btn:hover {
          color: var(--text-primary);
        }

        .detail-loader {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
          color: var(--text-muted);
        }

        .not-found {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
