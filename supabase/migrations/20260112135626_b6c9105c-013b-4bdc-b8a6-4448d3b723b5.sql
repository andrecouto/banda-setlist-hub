-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create song_tags junction table for many-to-many relationship
CREATE TABLE public.song_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(song_id, tag_id)
);

-- Enable Row Level Security
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_tags ENABLE ROW LEVEL SECURITY;

-- Policies for tags table
CREATE POLICY "Anyone can view tags" 
ON public.tags 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create tags" 
ON public.tags 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tags" 
ON public.tags 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tags" 
ON public.tags 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Policies for song_tags table
CREATE POLICY "Anyone can view song_tags" 
ON public.song_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create song_tags" 
ON public.song_tags 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete song_tags" 
ON public.song_tags 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_song_tags_song_id ON public.song_tags(song_id);
CREATE INDEX idx_song_tags_tag_id ON public.song_tags(tag_id);