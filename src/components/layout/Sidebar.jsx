import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, MessageSquare, PlusSquare, User, LogOut, Settings } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useUnreadMessages from '../../hooks/useUnreadMessages';

export default function Sidebar({ onCreatePostOpen }) {
  const { profile, signOut } = useAuth();
  const { unreadCount: unreadMessagesCount } = useUnreadMessages();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Explore', path: '/explore', icon: Compass },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Create', onClick: onCreatePostOpen, icon: PlusSquare },
    { name: 'Profile', path: profile?.username ? `/profile/${profile.username}` : '/', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <h1 className="logo-text" onClick={() => navigate('/')}>Yappers</h1>
      </div>
      
      <nav className="nav-links">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          if (item.onClick) {
            return (
              <button key={index} className="nav-item-btn" onClick={item.onClick}>
                <Icon size={24} className="nav-icon" />
                <span className="nav-label">{item.name}</span>
              </button>
            );
          }
          
          return (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Icon size={24} className="nav-icon" />
                {item.name === 'Messages' && unreadMessagesCount > 0 && (
                  <span className="sidebar-unread-badge">{unreadMessagesCount}</span>
                )}
              </div>
              <span className="nav-label">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <button className="nav-item logout-btn" onClick={signOut}>
        <LogOut size={24} className="nav-icon" />
        <span className="nav-label">Logout</span>
      </button>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          border-right: 1px solid var(--border-color);
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          padding: 24px 12px;
          display: flex;
          flex-direction: column;
          background-color: var(--bg-main);
          z-index: 10;
        }

        .logo-container {
          padding: 0 12px 36px 12px;
          cursor: pointer;
        }

        .logo-text {
          font-family: var(--display-font);
          font-size: 28px;
          font-weight: 800;
          background: var(--brand-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }

        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-grow: 1;
        }

        .nav-item, .nav-item-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 500;
          transition: background-color 0.2s;
          text-align: left;
          width: 100%;
        }

        .nav-item:hover, .nav-item-btn:hover {
          background-color: var(--bg-surface-hover);
        }

        .nav-item.active {
          font-weight: 700;
          background-color: var(--bg-surface);
        }

        .nav-item.active .nav-icon {
          color: var(--accent-purple);
        }

        .sidebar-unread-badge {
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

        .logout-btn {
          margin-top: auto;
          color: var(--danger);
        }

        .logout-btn:hover {
          background-color: rgba(239, 68, 68, 0.1);
        }

        @media (max-width: 1024px) {
          .sidebar {
            width: var(--sidebar-collapsed-width);
            align-items: center;
            padding: 24px 0;
          }

          .logo-text {
            display: none;
          }

          .logo-container::after {
            content: 'Y';
            font-family: var(--display-font);
            font-size: 28px;
            font-weight: 800;
            background: var(--brand-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .nav-label {
            display: none;
          }

          .nav-item, .nav-item-btn {
            justify-content: center;
            padding: 12px 0;
            width: 48px;
            height: 48px;
            border-radius: 50%;
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
