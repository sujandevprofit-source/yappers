import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useAuth from './useAuth';

export default function useChat(activeConversationId = null) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Mark messages in active conversation as read
  const markConversationAsRead = useCallback(async (convId) => {
    if (!convId || !user) return;

    // Save local read timestamp immediately for instant badge clearing
    try {
      const readMap = JSON.parse(localStorage.getItem('yappers_read_conversations') || '{}');
      readMap[convId] = Date.now();
      localStorage.setItem('yappers_read_conversations', JSON.stringify(readMap));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    setConversations(prev =>
      prev.map(c => (c.id === convId ? { ...c, unreadCount: 0 } : c))
    );

    // Notify all unread badge components across the app to update instantly
    window.dispatchEvent(new CustomEvent('yappers_messages_read', { detail: { convId } }));

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', convId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (err) {
      console.warn('Error marking messages as read in DB:', err);
    }
  }, [user]);

  // Fetch all conversations for the user
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConv(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          last_message_at,
          user1:user1_id ( id, username, full_name, avatar_url ),
          user2:user2_id ( id, username, full_name, avatar_url )
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Fetch unread incoming messages count per conversation
      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id, created_at')
        .neq('sender_id', user.id)
        .eq('is_read', false);

      let localReadMap = {};
      try {
        localReadMap = JSON.parse(localStorage.getItem('yappers_read_conversations') || '{}');
      } catch {}

      const unreadMap = new Map();
      (unreadData || []).forEach(m => {
        const readTime = localReadMap[m.conversation_id];
        const msgTime = new Date(m.created_at).getTime();
        if (!readTime || msgTime > readTime) {
          unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
        }
      });

      const formatted = (data || []).map((c) => {
        const otherUser = c.user1.id === user.id ? c.user2 : c.user1;
        const unreadCount = c.id === activeConversationId ? 0 : (unreadMap.get(c.id) || 0);
        return {
          id: c.id,
          last_message_at: c.last_message_at,
          otherUser,
          unreadCount,
        };
      });

      setConversations(formatted);
    } catch (err) {
      console.error('Error fetching conversations:', err.message);
    } finally {
      setLoadingConv(false);
    }
  }, [user, activeConversationId]);

  // Fetch message history for the active conversation
  const fetchMessages = useCallback(async () => {
    if (!activeConversationId) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark active conversation messages as read
      markConversationAsRead(activeConversationId);
    } catch (err) {
      console.error('Error fetching messages:', err.message);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeConversationId, markConversationAsRead]);

  // Load conversations on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchConversations]);

  // Load messages whenever active conversation changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMessages();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMessages]);

  // Subscribe to real-time messages in conversations
  useEffect(() => {
    if (!user) return;

    const channelId = `chat_feed_${user.id}_${Math.random().toString(36).substring(2, 8)}`;
    let channel;

    try {
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            const newMsg = payload.new;
            if (!newMsg) return;

            if (activeConversationId && newMsg.conversation_id === activeConversationId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });

              if (newMsg.sender_id !== user.id) {
                markConversationAsRead(activeConversationId);
              }
            }

            // Re-sort conversation list and update unread count
            setConversations((prev) => {
              const updated = prev.map((c) => {
                if (c.id === newMsg.conversation_id) {
                  const isCurrentActive = c.id === activeConversationId;
                  const isIncoming = newMsg.sender_id !== user.id;
                  return {
                    ...c,
                    last_message_at: newMsg.created_at,
                    unreadCount: isCurrentActive || !isIncoming ? 0 : (c.unreadCount || 0) + 1,
                  };
                }
                return c;
              });
              return [...updated].sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
            });
          }
        );

      channel.subscribe();
    } catch (err) {
      console.warn('Realtime chat messages subscription error:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [activeConversationId, user, markConversationAsRead]);

  // Send a new message
  const sendMessage = async (content) => {
    if (!activeConversationId || !user || !content.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversationId,
          sender_id: user.id,
          content: content.trim(),
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update local message state optimistically
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });

      return data;
    } catch (err) {
      console.error('Error sending message:', err.message);
      throw err;
    }
  };

  return {
    conversations,
    messages,
    loadingConv,
    loadingMessages,
    sendMessage,
    refreshConversations: fetchConversations,
    markConversationAsRead,
  };
}
