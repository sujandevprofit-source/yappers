import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Bell, Heart, MessageCircle, UserPlus, Loader2 } from 'lucide-react';
import SearchBar from '../common/SearchBar';
import useAuth from '../../hooks/useAuth';
import useUnreadMessages from '../../hooks/useUnreadMessages';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export default function Navbar() {
  const { user } = useAuth();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Fetch initial notifications count & list
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            id,
            type,
            is_read,
            created_at,
            actor:actor_id (username, avatar_url),
            post:post_id (media_url, media_type)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setNotifications(data || []);
        setUnreadCount(data ? data.filter(n => !n.is_read).length : 0);
      } catch (err) {
        console.error('Error fetching notifications:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Close dropdown on click outside
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user]);

  const handleToggleDropdown = async () => {
    const nextState = !showDropdown;
    setShowDropdown(nextState);

    if (nextState && unreadCount > 0) {
      // Mark as read in DB
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (error) throw error;

        // Reset local badge count
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } catch (err) {
        console.error('Error marking notifications as read:', err.message);
      }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart size={16} fill="#ef4444" color="#ef4444" />;
      case 'comment':
        return <MessageCircle size={16} fill="var(--accent-blue)" color="var(--accent-blue)" />;
      case 'follow':
        return <UserPlus size={16} fill="var(--accent-purple)" color="var(--accent-purple)" />;
      default:
        return null;
    }
  };

  const getNotificationText = (type) => {
    switch (type) {
      case 'like':
        return 'liked your post.';
      case 'comment':
        return 'commented on your post.';
      case 'follow':
        return 'started following you.';
      default:
        return 'sent you a notification.';
    }
  };

  return (
    <header className="navbar glass">
      <div className="navbar-left">
        <h1 className="nav-logo" onClick={() => navigate('/')}>Yappers</h1>
      </div>

      <div className="navbar-center">
        {user && <SearchBar />}
      </div>

      <div className="navbar-right">
        {user && (
          <>
            <Link to="/messages" className="nav-icon-link">
              <MessageSquare size={22} />
              {unreadMessagesCount > 0 && <span className="notification-badge">{unreadMessagesCount}</span>}
            </Link>

            <div className="notification-dropdown-container" ref={dropdownRef}>
              <button className="nav-icon-link" onClick={handleToggleDropdown}>
                <Bell size={22} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>

              {showDropdown && (
                <div className="notifications-dropdown glass">
                  <div className="dropdown-header">
                    <h3>Notifications</h3>
                  </div>

                  <div className="dropdown-body">
                    {loading ? (
                      <div className="dropdown-loader">
                        <Loader2 className="spinner-icon" size={20} />
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`}>
                          <img
                            src={n.actor?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80'}
                            alt={n.actor?.username}
                            className="notify-avatar"
                          />
                          <div className="notify-text-box">
                            <span className="notify-message">
                              <strong>@{n.actor?.username}</strong> {getNotificationText(n.type)}
                            </span>
                            <span className="notify-time">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="notify-meta-icon">
                            {n.post?.media_url ? (
                              <img src={n.post.media_url} alt="Post preview" className="notify-post-preview" />
                            ) : (
                              getNotificationIcon(n.type)
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="dropdown-empty">No new notifications</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 9;
          border-bottom: 1px solid var(--border-color);
        }

        .navbar-left {
          display: flex;
          align-items: center;
        }

        .nav-logo {
          font-family: var(--display-font);
          font-size: 24px;
          font-weight: 800;
          background: var(--brand-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          cursor: pointer;
          letter-spacing: -0.5px;
        }

        .navbar-center {
          flex-grow: 1;
          display: flex;
          justify-content: center;
          margin: 0 16px;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-icon-link {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: color 0.2s;
        }

        .nav-icon-link:hover {
          color: var(--text-primary);
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background-color: var(--danger);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-main);
        }

        /* Notifications Dropdown */
        .notification-dropdown-container {
          position: relative;
        }

        .notifications-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: -10px;
          width: 360px;
          max-height: 400px;
          overflow-y: auto;
          border-radius: 12px;
          z-index: 100;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          background-color: var(--bg-card);
        }

        .dropdown-header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .dropdown-header h3 {
          font-size: 15px;
          font-weight: 700;
        }

        .dropdown-body {
          display: flex;
          flex-direction: column;
        }

        .dropdown-loader {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
        }

        .notification-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
          transition: background-color 0.2s;
        }

        .notification-item:hover {
          background-color: var(--bg-surface-hover);
        }

        .notification-item.unread {
          background-color: rgba(192, 132, 252, 0.03);
        }

        .notify-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--border-color);
        }

        .notify-text-box {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          gap: 2px;
        }

        .notify-message {
          font-size: 13px;
          line-height: 1.4;
        }

        .notify-time {
          font-size: 10px;
          color: var(--text-muted);
        }

        .notify-meta-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 38px;
          height: 38px;
        }

        .notify-post-preview {
          width: 36px;
          height: 36px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid var(--border-color);
        }

        .dropdown-empty {
          padding: 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13.5px;
        }

        @media (min-width: 769px) {
          .navbar {
            left: var(--sidebar-width);
          }
          .navbar-left {
            display: none;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .navbar {
            left: var(--sidebar-collapsed-width);
          }
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 0 16px;
          }
          .navbar-center {
            display: none;
          }
          .notifications-dropdown {
            width: 300px;
            right: -20px;
          }
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
