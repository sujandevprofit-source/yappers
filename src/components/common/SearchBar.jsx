import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQueryChange = (val) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
    }
    setIsOpen(true);
  };

  // Search profiles when query changes
  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .ilike('username', `%${query.trim()}%`)
          .neq('username', 'tester3')
          .neq('username', 'demoyapper')
          .limit(6);

        if (error) throw error;
        setResults(data || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err.message);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleUserClick = (username) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    navigate(`/profile/${username}`);
  };

  return (
    <div className="search-bar-container" ref={dropdownRef}>
      <div className="search-input-wrapper">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          placeholder="Search by username..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button className="clear-btn" onClick={() => handleQueryChange('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (query.trim() !== '') && (
        <div className="search-results-dropdown glass">
          {loading ? (
            <div className="search-loader">Searching...</div>
          ) : results.length > 0 ? (
            results.map((user) => (
              <div
                key={user.id}
                className="search-result-item"
                onClick={() => handleUserClick(user.username)}
              >
                <img
                  src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80'}
                  alt={user.username}
                  className="search-avatar"
                />
                <div className="search-info">
                  <span className="search-username">@{user.username}</span>
                  {user.full_name && <span className="search-fullname">{user.full_name}</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="search-no-results">No users found</div>
          )}
        </div>
      )}

      <style>{`
        .search-bar-container {
          position: relative;
          width: 100%;
          max-width: 350px;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input-wrapper input {
          width: 100%;
          padding: 8px 12px 8px 38px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background-color: var(--bg-surface);
          color: var(--text-primary);
          font-size: 14px;
        }

        .search-input-wrapper input:focus {
          border-color: var(--border-focus);
          background-color: var(--bg-surface-hover);
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .clear-btn {
          position: absolute;
          right: 12px;
          color: var(--text-muted);
        }

        .clear-btn:hover {
          color: var(--text-primary);
        }

        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 100%;
          max-height: 300px;
          overflow-y: auto;
          border-radius: 8px;
          z-index: 100;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        }

        .search-loader, .search-no-results {
          padding: 16px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .search-result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .search-result-item:hover {
          background-color: var(--bg-surface-hover);
        }

        .search-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--border-color);
        }

        .search-info {
          display: flex;
          flex-direction: column;
        }

        .search-username {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }

        .search-fullname {
          font-size: 12px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
