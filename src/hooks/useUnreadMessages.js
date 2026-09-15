import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useAuth from './useAuth';

export default function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      // 1. Get all conversation IDs user is part of
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!convs || convs.length === 0) {
        setUnreadCount(0);
        return;
      }

      const convIds = convs.map(c => c.id);

      // 2. Count unread incoming messages
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('id, conversation_id, created_at')
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      if (!error && msgs) {
        let readMap = {};
        try {
          readMap = JSON.parse(localStorage.getItem('yappers_read_conversations') || '{}');
        } catch {}

        const trulyUnread = msgs.filter(m => {
          const readTimestamp = readMap[m.conversation_id];
          if (!readTimestamp) return true;
          const msgTime = new Date(m.created_at).getTime();
          return msgTime > readTimestamp;
        });

        setUnreadCount(trulyUnread.length);
      }
    } catch (err) {
      console.warn('Error fetching unread messages count:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();

    if (!user) return;

    const handleReadEvent = () => {
      fetchUnreadCount();
    };

    window.addEventListener('yappers_messages_read', handleReadEvent);

    const channelId = `unread_msg_${user.id}_${Math.random().toString(36).substring(2, 8)}`;
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
            if (payload.new && payload.new.sender_id !== user.id) {
              fetchUnreadCount();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          () => {
            fetchUnreadCount();
          }
        );

      channel.subscribe();
    } catch (err) {
      console.warn('Realtime unread messages subscription error:', err);
    }

    return () => {
      window.removeEventListener('yappers_messages_read', handleReadEvent);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, fetchUnreadCount]);

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
}
