import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Smile, Info, ArrowLeft, SendHorizontal, MessageCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useAuth from '../hooks/useAuth';
import useChat from '../hooks/useChat';

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    conversations,
    messages,
    loadingConv,
    loadingMessages,
    sendMessage,
    markConversationAsRead,
  } = useChat(conversationId);

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  const activeConv = conversations.find(c => c.id === conversationId);

  // Mark conversation as read whenever conversationId changes or page opens
  useEffect(() => {
    if (conversationId) {
      markConversationAsRead(conversationId);
    }
  }, [conversationId, markConversationAsRead]);

  // Auto scroll to bottom when messages load/update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const msg = inputMessage;
    setInputMessage('');
    
    try {
      await sendMessage(msg);
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  return (
    <div className="chat-layout-wrapper">
      {/* 1. Conversations List (Hidden on mobile if active chat is open) */}
      <div className={`chat-list-panel ${conversationId ? 'hide-on-mobile' : ''}`}>
        <div className="panel-header">
          <h2>Messages</h2>
        </div>

        <div className="conversations-scroll-box">
          {loadingConv ? (
            <div className="panel-loader">
              <Loader2 className="spinner-icon" size={24} />
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/messages/${c.id}`)}
                className={`conversation-row-item ${c.id === conversationId ? 'active' : ''} ${c.unreadCount > 0 ? 'has-unread' : ''}`}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <img
                    src={c.otherUser?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80'}
                    alt={c.otherUser?.username}
                    className="row-avatar"
                  />
                  {c.unreadCount > 0 && <span className="chat-avatar-unread-dot"></span>}
                </div>
                <div className="row-details">
                  <span className="row-username">@{c.otherUser?.username}</span>
                  <span className="row-fullname">{c.otherUser?.full_name}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span className="row-time">
                    {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })
                      .replace('about', '')
                      .replace('over', '')
                      .trim()}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="unread-chat-count-pill">{c.unreadCount}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-chat-list">
              <MessageCircle size={36} className="empty-icon" />
              <p>No conversations yet. Go to a user's profile to send them a message!</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Active Chat Panel (Hidden on mobile if no active chat) */}
      <div className={`active-chat-panel ${!conversationId ? 'hide-on-mobile' : ''}`}>
        {conversationId && activeConv ? (
          <>
            {/* Header */}
            <div className="chat-window-header">
              <button onClick={() => navigate('/messages')} className="chat-back-btn">
                <ArrowLeft size={20} />
              </button>
              
              <Link to={`/profile/${activeConv.otherUser?.username}`} className="header-user-info">
                <img
                  src={activeConv.otherUser?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80'}
                  alt={activeConv.otherUser?.username}
                  className="header-avatar"
                />
                <div className="header-text">
                  <span className="header-username">@{activeConv.otherUser?.username}</span>
                  <span className="header-fullname">{activeConv.otherUser?.full_name}</span>
                </div>
              </Link>

              <button className="chat-info-btn">
                <Info size={20} />
              </button>
            </div>

            {/* Messages body */}
            <div className="chat-messages-body">
              {loadingMessages ? (
                <div className="body-loader">
                  <Loader2 className="spinner-icon" size={28} />
                </div>
              ) : (
                <div className="messages-list-container">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble-wrapper ${isOwn ? 'own-message' : 'incoming-message'}`}
                      >
                        {!isOwn && (
                          <img
                            src={activeConv.otherUser?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80'}
                            alt={activeConv.otherUser?.username}
                            className="msg-avatar"
                          />
                        )}
                        <div className="msg-bubble-content">
                          <p className="msg-text">{msg.content}</p>
                          <span className="msg-timestamp">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="chat-input-bar">
              <Smile size={22} className="input-bar-emoji-btn" />
              <input
                type="text"
                placeholder="Message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
              />
              <button type="submit" disabled={!inputMessage.trim()} className="input-bar-send-btn">
                <SendHorizontal size={22} />
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-card">
              <div className="icon-badge">
                <MessageCircle size={48} />
              </div>
              <h3>Your Messages</h3>
              <p>Send private photos, videos and messages to a friend.</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .chat-layout-wrapper {
          display: grid;
          grid-template-columns: 350px 1fr;
          height: calc(100vh - 60px); /* Height minus Navbar */
          width: 100%;
          border-left: 1px solid var(--border-color);
        }

        .chat-list-panel {
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          background: var(--bg-main);
          height: 100%;
        }

        .panel-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .panel-header h2 {
          font-family: var(--display-font);
          font-size: 20px;
          font-weight: 700;
        }

        .conversations-scroll-box {
          flex-grow: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .panel-loader, .body-loader {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 30px;
        }

        .conversation-row-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 24px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .conversation-row-item:hover {
          background-color: var(--bg-surface-hover);
        }

        .conversation-row-item.active {
          background-color: var(--bg-surface);
        }

        .row-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--border-color);
        }

        .row-details {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .row-username {
          font-weight: 600;
          font-size: 14.5px;
        }

        .row-fullname {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .row-time {
          font-size: 11px;
          color: var(--text-muted);
        }

        .chat-avatar-unread-dot {
          position: absolute;
          top: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: var(--danger);
          border: 2px solid var(--bg-main);
        }

        .unread-chat-count-pill {
          background-color: var(--accent-purple);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        .empty-chat-list {
          padding: 40px 24px;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .empty-chat-list p {
          font-size: 13px;
          line-height: 1.5;
        }

        /* Active Chat Window */
        .active-chat-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #000;
        }

        .chat-window-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          border-bottom: 1px solid var(--border-color);
          background-color: var(--bg-main);
        }

        .chat-back-btn {
          display: none;
          color: var(--text-primary);
        }

        .header-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--border-color);
        }

        .header-text {
          display: flex;
          flex-direction: column;
        }

        .header-username {
          font-weight: 600;
          font-size: 14.5px;
        }

        .header-fullname {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .chat-info-btn {
          color: var(--text-secondary);
        }

        .chat-messages-body {
          flex-grow: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .messages-list-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message-bubble-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          max-width: 70%;
        }

        .own-message {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .incoming-message {
          align-self: flex-start;
        }

        .msg-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--border-color);
        }

        .msg-bubble-content {
          padding: 10px 16px;
          border-radius: 18px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .own-message .msg-bubble-content {
          background: var(--brand-gradient);
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .incoming-message .msg-bubble-content {
          background-color: var(--bg-surface);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
          border: 1px solid var(--border-color);
        }

        .msg-text {
          font-size: 14px;
          line-height: 1.4;
        }

        .msg-timestamp {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.6);
          align-self: flex-end;
        }

        .incoming-message .msg-timestamp {
          color: var(--text-muted);
        }

        .chat-input-bar {
          display: flex;
          align-items: center;
          padding: 16px 24px;
          background-color: var(--bg-main);
          border-top: 1px solid var(--border-color);
          gap: 16px;
        }

        .chat-input-bar input {
          flex-grow: 1;
          border-radius: 24px;
          padding: 10px 18px;
          font-size: 14px;
          background-color: var(--bg-surface);
        }

        .input-bar-emoji-btn {
          color: var(--text-muted);
        }

        .input-bar-send-btn {
          color: var(--accent-blue);
        }

        .input-bar-send-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* No Chat Selected State */
        .no-chat-selected {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        }

        .no-chat-card {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          max-width: 320px;
          padding: 20px;
        }

        .icon-badge {
          width: 90px;
          height: 90px;
          border: 2px solid var(--text-primary);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          color: var(--text-primary);
        }

        .no-chat-card h3 {
          font-family: var(--display-font);
          font-size: 22px;
          font-weight: 600;
        }

        .no-chat-card p {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.5;
        }

        /* Mobile specific media queries */
        @media (max-width: 768px) {
          .chat-layout-wrapper {
            grid-template-columns: 1fr;
            height: calc(100vh - 120px); /* Top nav + bottom nav */
          }

          .hide-on-mobile {
            display: none !important;
          }

          .chat-back-btn {
            display: flex;
            margin-right: 12px;
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
    </div>
  );
}
