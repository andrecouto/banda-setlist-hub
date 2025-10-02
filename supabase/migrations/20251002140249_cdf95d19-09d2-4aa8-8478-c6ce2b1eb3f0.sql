-- Add chord chart column to songs table
ALTER TABLE public.songs 
ADD COLUMN chord_chart text;