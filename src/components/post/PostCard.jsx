import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, MoreHorizontal, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import useAuth from '../../hooks/useAuth';

export default function PostCard({ post }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(Number(post.like_count || 0));
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(Number(post.comment_count || 0));

  useEffect(() => {
    let isMounted = true;

    // Purge legacy local storage keys
    localStorage.removeItem(`yappers_comments_${post.id}`);
    localStorage.removeItem(`yappers_like_count_${post.id}`);

    // 1. Fetch real like count and user like status from Supabase
    const fetchLikeStatus = async () => {
      try {
        const { count, error: countErr } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        if (!countErr && count !== null && isMounted) {
          setLikesCount(count);
        }

        if (user?.id) {
          const { data: userLike } = await supabase
            .from('likes')
            .select('post_id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (isMounted) {
            setIsLiked(!!userLike);
          }
        }
      } catch (err) {
        console.warn('Error fetching like status:', err);
      }
    };

    // 2. Fetch remote comments from Supabase
    const fetchComments = async () => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id,
            profiles!user_id (
              username,
              avatar_url
            )
          `)
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });

        if (!error && data && isMounted) {
          setComments(data);
          setCommentsCount(data.length);
        }
      } catch (err) {
        console.warn('Error fetching comments:', err);
      }
    };

    fetchLikeStatus();
    fetchComments();

    return () => {
      isMounted = false;
    };
  }, [post.id, user?.id]);

  const handleLike = async () => {
    if (!user?.id) {
      toast.error('Please sign in to like posts');
      return;
    }

    const nextLikedState = !isLiked;
    setIsLiked(nextLikedState);
    const optimisticCount = nextLikedState ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(optimisticCount);

    try {
      if (nextLikedState) {
        await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
      } else {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      }

      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      if (count !== null) {
        setLikesCount(count);
      }
    } catch (err) {
      console.warn('Error toggling like:', err.message);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!user?.id) {
      toast.error('Please sign in to comment');
      return;
    }

    const tempComment = newComment.trim();
    setNewComment('');

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: tempComment
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles!user_id (
            username,
            avatar_url
          )
        `)
        .single();

      if (!error && data) {
        setComments(prev => {
          if (prev.some(c => c.id === data.id)) return prev;
          return [...prev, data];
        });
        setCommentsCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to post comment');
    }
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const displayComments = showAllComments ? comments : comments.slice(-2);

  return (
    <article className="post-card glass">
      {/* Header */}
      <div className="post-header">
        <Link to={`/profile/${post.profiles?.username}`} className="post-author-link">
          <img
            src={post.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80'}
            alt={post.profiles?.username}
            className="author-avatar"
          />
          <div className="author-info">
            <span className="author-username">@{post.profiles?.username}</span>
            {post.profiles?.full_name && <span className="author-fullname">{post.profiles?.full_name}</span>}
          </div>
        </Link>
        <button className="post-options-btn">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Media Content */}
      <div className="post-media-container" onDoubleClick={handleDoubleTap}>
        {post.media_type === 'image' ? (
          <img src={post.media_url} alt="Post Content" className="post-media" loading="lazy" />
        ) : (
          <video src={post.media_url} controls className="post-media" />
        )}
        
        {showHeartAnim && (
          <div className="overlay-heart">
            <Heart size={80} fill="#ef4444" color="#ef4444" />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="post-actions">
        <button onClick={handleLike} className={`action-btn ${isLiked ? 'liked animate-like' : ''}`}>
          <Heart size={26} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : 'currentColor'} />
        </button>
        <button onClick={() => navigate(`/post/${post.id}`)} className="action-btn">
          <MessageCircle size={26} />
        </button>
        <button className="action-btn">
          <Send size={24} />
        </button>
      </div>

      {/* Likes & Comments Count */}
      <div className="post-likes-info">
        <span>{likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}</span>
        <span className="info-dot">•</span>
        <span>{commentsCount.toLocaleString()} {commentsCount === 1 ? 'comment' : 'comments'}</span>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="post-caption-box">
          <Link to={`/profile/${post.profiles?.username}`} className="caption-username">
            @{post.profiles?.username}
          </Link>
          <span className="caption-text">{post.caption}</span>
        </div>
      )}

      {/* Date */}
      <div className="post-date-box">
        <span>{timeAgo}</span>
      </div>

      {/* Comments List */}
      <div className="post-comments-box">
        {comments.length > 2 && !showAllComments && (
          <button className="view-comments-btn" onClick={() => setShowAllComments(true)}>
            View all {comments.length} comments
          </button>
        )}
        
        <div className="comments-list">
          {displayComments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <span className="comment-username">
                <Link to={`/profile/${comment.profiles?.username}`}>
                  @{comment.profiles?.username}
                </Link>
              </span>
              <span className="comment-content">{comment.content}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inline Comment Input */}
      <form onSubmit={handleAddComment} className="comment-form-container">
        <Smile size={22} className="emoji-icon" />
        <input
          type="text"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button type="submit" className="post-comment-btn" disabled={!newComment.trim()}>
          Post
        </button>
      </form>

      <style>{`
        .post-card {
          border-radius: 12px;
          border: 1px solid var(--border-color);
          overflow: hidden;
          margin-bottom: 24px;
          background-color: var(--bg-card);
          width: 100%;
        }

        .post-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
        }

        .post-author-link {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .author-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--border-color);
        }

        .author-info {
          display: flex;
          flex-direction: column;
        }

        .author-username {
          font-weight: 600;
          font-size: 14px;
        }

        .author-fullname {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .post-options-btn {
          color: var(--text-secondary);
        }

        .post-media-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background-color: #050505;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
        }

        .post-media {
          max-width: 100%;
          max-height: 100%;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .overlay-heart {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 5;
          pointer-events: none;
          animation: heartBurst 0.8s ease forwards;
        }

        @keyframes heartBurst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          15% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.9; }
          30% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.9; }
          80% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
        }

        .post-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px 8px 16px;
        }

        .action-btn {
          color: var(--text-primary);
          transition: transform 0.1s;
        }

        .action-btn:hover {
          transform: scale(1.1);
        }

        .action-btn.liked {
          color: #ef4444;
        }

        .post-likes-info {
          padding: 0 16px 4px 16px;
          font-weight: 600;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .info-dot {
          color: var(--text-muted);
          font-size: 12px;
        }

        .post-caption-box {
          padding: 4px 16px;
          font-size: 14px;
          line-height: 1.5;
        }

        .caption-username {
          font-weight: 600;
          margin-right: 8px;
        }

        .post-date-box {
          padding: 4px 16px;
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .post-comments-box {
          padding: 4px 16px 12px 16px;
        }

        .view-comments-btn {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .view-comments-btn:hover {
          color: var(--text-secondary);
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .comment-item {
          font-size: 13.5px;
        }

        .comment-username {
          font-weight: 600;
          margin-right: 6px;
        }

        .comment-form-container {
          display: flex;
          align-items: center;
          border-top: 1px solid var(--border-color);
          padding: 12px 16px;
          gap: 12px;
        }

        .emoji-icon {
          color: var(--text-muted);
        }

        .comment-form-container input {
          flex-grow: 1;
          border: none;
          background: none;
          padding: 0;
          font-size: 14px;
        }

        .comment-form-container input:focus {
          border: none;
        }

        .post-comment-btn {
          color: var(--accent-blue);
          font-weight: 600;
          font-size: 14px;
        }

        .post-comment-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </article>
  );
}
