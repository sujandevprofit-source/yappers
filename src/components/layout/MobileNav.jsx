import { NavLink } from 'react-router-dom';
import { Home, Compass, MessageSquare, PlusSquare, User } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useUnreadMessages from '../../hooks/useUnreadMessages';

export default function MobileNav({ onCreatePostOpen }) {
  const { profile } = useAuth();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();

  return (
    <nav className="mobile-nav">
      <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <Home size={22} />
      </NavLink>
      <NavLink to="/explore" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <Compass size={22} />
      </NavLink>
      <button className="mobile-nav-item" onClick={onCreatePostOpen}>
        <PlusSquare size={22} />
      </button>
      <NavLink to="/messages" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <MessageSquare size={22} />
          {unreadMessagesCount > 0 && <span className="mobile-unread-badge">{unreadMessagesCount}</span>}
        </div>
      </NavLink>
      <NavLink to={profile?.username ? `/profile/${profile.username}` : '/'} className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <User size={22} />
      </NavLink>

      <style>{`
        .mobile-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 60px;
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--border-color);
          justify-content: space-around;
          align-items: center;
          z-index: 10;
          padding-bottom: env(safe-area-inset-bottom);
        }

        .mobile-nav-item {
          display: flex;
          justify-content: center;
          align-items: center;
          color: var(--text-secondary);
          flex: 1;
          height: 100%;
          transition: color 0.2s;
        }

        .mobile-nav-item:hover, .mobile-nav-item.active {
          color: var(--text-primary);
        }

        .mobile-nav-item.active svg {
          stroke: var(--accent-purple);
        }

        .mobile-unread-badge {
          position: absolute;
          top: -4px;
          right: -6px;
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

        @media (max-width: 768px) {
          .mobile-nav {
            display: flex;
          }
        }
      `}</style>
    </nav>
  );
}
