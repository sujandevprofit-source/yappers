import { Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PostGrid({ posts }) {
  const navigate = useNavigate();

  if (!posts || posts.length === 0) {
    return (
      <div className="empty-grid">
        <p>No posts yet</p>
        <style>{`
          .empty-grid {
            text-align: center;
            padding: 40px;
            color: var(--text-muted);
            font-size: 16px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="media-grid">
      {posts.map((post) => (
        <div
          key={post.id}
          className="media-item"
          onClick={() => navigate(`/post/${post.id}`)}
        >
          {post.media_type === 'image' ? (
            <img src={post.media_url} alt={post.caption || 'Post'} loading="lazy" />
          ) : (
            <video src={post.media_url} muted loop onMouseOver={e => e.target.play()} onMouseOut={e => e.target.pause()} />
          )}
          <div className="media-overlay">
            <div className="overlay-info">
              <Heart size={20} fill="#fff" />
              <span>{post.like_count || 0}</span>
            </div>
            <div className="overlay-info">
              <MessageCircle size={20} fill="#fff" />
              <span>{post.comment_count || 0}</span>
            </div>
          </div>
        </div>
      ))}
      <style>{`
        .overlay-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
