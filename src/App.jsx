import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AuthGuard from './components/auth/AuthGuard';
import MainLayout from './components/layout/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import ProfilePage from './pages/ProfilePage';
import PostDetailPage from './pages/PostDetailPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes inside Main Shell Layout */}
          <Route
            path="/*"
            element={
              <AuthGuard>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/profile/:username" element={<ProfilePage />} />
                    <Route path="/post/:id" element={<PostDetailPage />} />
                    <Route path="/messages" element={<ChatPage />} />
                    <Route path="/messages/:conversationId" element={<ChatPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    {/* Fallback to Home */}
                    <Route path="*" element={<HomePage />} />
                  </Routes>
                </MainLayout>
              </AuthGuard>
            }
          />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#121212',
              color: '#f5f5f5',
              border: '1px solid #262626',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
