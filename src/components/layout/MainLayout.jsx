import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import CreatePostModal from '../post/CreatePostModal';

export default function MainLayout({ children }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="main-layout-container">
      <Navbar />
      <Sidebar onCreatePostOpen={() => setIsCreateOpen(true)} />
      
      <main className="main-content">
        {children}
      </main>

      <MobileNav onCreatePostOpen={() => setIsCreateOpen(true)} />

      {isCreateOpen && (
        <CreatePostModal onClose={() => setIsCreateOpen(false)} />
      )}

      <style>{`
        .main-layout-container {
          display: flex;
          width: 100%;
          min-height: 100vh;
          background-color: var(--bg-main);
        }

        .main-content {
          flex-grow: 1;
          padding-top: 60px; /* Navbar height */
          margin-left: var(--sidebar-width);
          min-height: 100vh;
          width: calc(100% - var(--sidebar-width));
          transition: margin-left 0.2s, width 0.2s;
        }

        @media (max-width: 1024px) {
          .main-content {
            margin-left: var(--sidebar-collapsed-width);
            width: calc(100% - var(--sidebar-collapsed-width));
          }
        }

        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
            width: 100%;
            padding-bottom: 60px; /* MobileNav height */
          }
        }
      `}</style>
    </div>
  );
}
