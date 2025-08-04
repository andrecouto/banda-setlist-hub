-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('superuser', 'band_member');

-- Create bands table
CREATE TABLE public.bands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'band_member',
  band_id UUID REFERENCES public.bands(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  band_id UUID NOT NULL REFERENCES public.bands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  youtube_link TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create songs table
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_songs table (many-to-many relationship with medley support)
CREATE TABLE public.event_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  song_order INTEGER NOT NULL,
  key_played TEXT,
  is_medley BOOLEAN DEFAULT false,
  medley_group INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_participants table
CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instrument TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, participant_id)
);

-- Create comments table for event observations
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

-- Create RLS policies for bands
CREATE POLICY "Everyone can view bands" ON public.bands FOR SELECT USING (true);
CREATE POLICY "Superusers can manage bands" ON public.bands FOR ALL USING (public.get_user_role(auth.uid()) = 'superuser');

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Superusers can manage all profiles" ON public.profiles FOR ALL USING (public.get_user_role(auth.uid()) = 'superuser');

-- Create RLS policies for events
CREATE POLICY "Everyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Band members can manage their band events" ON public.events 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND (band_id = public.events.band_id OR role = 'superuser')
    )
  );

-- Create RLS policies for songs
CREATE POLICY "Everyone can view songs" ON public.songs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage songs" ON public.songs FOR ALL USING (auth.uid() IS NOT NULL);

-- Create RLS policies for event_songs
CREATE POLICY "Everyone can view event songs" ON public.event_songs FOR SELECT USING (true);
CREATE POLICY "Event managers can manage event songs" ON public.event_songs 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE e.id = public.event_songs.event_id 
      AND (p.band_id = e.band_id OR p.role = 'superuser')
    )
  );

-- Create RLS policies for event_participants
CREATE POLICY "Everyone can view event participants" ON public.event_participants FOR SELECT USING (true);
CREATE POLICY "Event managers can manage participants" ON public.event_participants 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE e.id = public.event_participants.event_id 
      AND (p.band_id = e.band_id OR p.role = 'superuser')
    )
  );

-- Create RLS policies for comments
CREATE POLICY "Everyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND id = public.comments.user_id)
);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND id = public.comments.user_id)
);
CREATE POLICY "Superusers can manage all comments" ON public.comments FOR ALL USING (public.get_user_role(auth.uid()) = 'superuser');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_bands_updated_at BEFORE UPDATE ON public.bands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON public.songs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();