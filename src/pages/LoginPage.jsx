import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import useAuth from '../hooks/useAuth';

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  if (loading) {
    return (
      <div className="login-loading-screen">
        <div className="spinner"></div>
        <style>{`
          .login-loading-screen {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            width: 100vw;
            background: #000;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #222;
            border-top: 3px solid #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-page-container">
      <div className="login-card glass">
        <div className="brand-section">
          <h1 className="logo-brand">Yappers</h1>
          <p className="tagline">Share your vibe. Connect with friends. Yap all day.</p>
        </div>

        <div className="visual-section">
          <div className="ambient-glow"></div>
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80"
            alt="Abstract Vibe"
            className="login-visual"
          />
        </div>

        <div className="action-section">
          <button className="btn-primary google-login-btn" onClick={signInWithGoogle}>
            <LogIn size={20} />
            <span>Sign in with Google</span>
          </button>

          <p className="terms">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      <style>{`
        .login-page-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          width: 100vw;
          background: radial-gradient(circle at center, #111 0%, #000 100%);
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          border-radius: 20px;
          padding: 40px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
          border: 1px solid var(--border-color);
          position: relative;
          overflow: hidden;
        }

        .brand-section {
          text-align: center;
        }

        .logo-brand {
          font-family: var(--display-font);
          font-size: 48px;
          font-weight: 800;
          background: var(--brand-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -1.5px;
          margin-bottom: 8px;
        }

        .tagline {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.5;
        }

        .visual-section {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .login-visual {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.85;
        }

        .ambient-glow {
          position: absolute;
          width: 150px;
          height: 150px;
          background: var(--accent-purple);
          filter: blur(80px);
          top: -20px;
          left: -20px;
          opacity: 0.5;
          pointer-events: none;
        }

        .action-section {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .google-login-btn {
          width: 100%;
          padding: 14px;
          font-size: 16px;
          border-radius: 12px;
        }

        .terms {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          line-height: 1.4;
          padding: 0 10px;
        }
      `}</style>
    </div>
  );
}
