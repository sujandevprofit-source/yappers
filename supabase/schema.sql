-- Create Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Posts Table
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    caption TEXT,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    thumbnail_url TEXT,
    like_count INTEGER DEFAULT 0 NOT NULL,
    comment_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Likes Table (Composite PK)
CREATE TABLE public.likes (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

-- Create Comments Table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Followers Table (Composite PK)
CREATE TABLE public.followers (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- Create Conversations Table
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT user_order CHECK (user1_id < user2_id),
    UNIQUE (user1_id, user2_id)
);

-- Create Messages Table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Notifications Table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- recipient
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- triggerer
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'message')),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create Indexes for performance
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_likes_post_id ON public.likes(post_id);
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_followers_following_id ON public.followers(following_id);
CREATE INDEX idx_conversations_user1_user2 ON public.conversations(user1_id, user2_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Posts Policies
CREATE POLICY "Allow public read access to posts" ON public.posts
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Likes Policies
CREATE POLICY "Allow public read access to likes" ON public.likes
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to toggle likes" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to remove their own likes" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- Comments Policies
CREATE POLICY "Allow public read access to comments" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Followers Policies
CREATE POLICY "Allow public read access to followers" ON public.followers
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to follow" ON public.followers
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Allow users to unfollow" ON public.followers
    FOR DELETE USING (auth.uid() = follower_id);

-- Conversations Policies
CREATE POLICY "Allow users to view conversations they are part of" ON public.conversations
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Allow users to create conversations they are part of" ON public.conversations
    FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages Policies
CREATE POLICY "Allow users to view messages in their conversations" ON public.messages
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user1_id FROM public.conversations WHERE id = conversation_id
            UNION
            SELECT user2_id FROM public.conversations WHERE id = conversation_id
        )
    );

CREATE POLICY "Allow users to insert messages in their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        auth.uid() IN (
            SELECT user1_id FROM public.conversations WHERE id = conversation_id
            UNION
            SELECT user2_id FROM public.conversations WHERE id = conversation_id
        )
    );

-- Notifications Policies
CREATE POLICY "Allow users to view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update/delete their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_username TEXT;
    username_exists BOOLEAN;
    email_part TEXT;
BEGIN
    -- Derive initial username from email (before the @)
    email_part := split_part(new.email, '@', 1);
    -- Replace non-alphanumeric characters with empty
    new_username := regexp_replace(email_part, '[^a-zA-Z0-9_]', '', 'g');
    
    -- Ensure username is not empty
    IF new_username = '' THEN
        new_username := 'user_' || substr(md5(random()::text), 1, 8);
    END IF;

    -- Handle potential duplicate username by appending random characters
    LOOP
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = new_username) INTO username_exists;
        IF NOT username_exists THEN
            EXIT;
        END IF;
        new_username := email_part || substr(md5(random()::text), 1, 4);
    END LOOP;

    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        new.id,
        new_username,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', email_part),
        COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to increment/decrement like count on posts
CREATE OR REPLACE FUNCTION public.handle_like_count()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts
        SET like_count = like_count + 1
        WHERE id = new.post_id;
        RETURN new;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts
        SET like_count = GREATEST(0, like_count - 1)
        WHERE id = old.post_id;
        RETURN old;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_post_liked
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_like_count();

-- Trigger to increment/decrement comment count on posts
CREATE OR REPLACE FUNCTION public.handle_comment_count()
RETURNS trigger AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts
        SET comment_count = comment_count + 1
        WHERE id = new.post_id;
        RETURN new;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts
        SET comment_count = GREATEST(0, comment_count - 1)
        WHERE id = old.post_id;
        RETURN old;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_post_commented
    AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_comment_count();

-- Trigger to update last_message_at on conversation update
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = now()
    WHERE id = new.conversation_id;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_message_sent
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();
