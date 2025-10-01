-- Add author and lyrics columns to songs table
ALTER TABLE public.songs 
ADD COLUMN author text,
ADD COLUMN lyrics text;

COMMENT ON COLUMN public.songs.author IS 'Song author/composer (optional)';
COMMENT ON COLUMN public.songs.lyrics IS 'Song lyrics (optional)';