-- Create enum for event types
CREATE TYPE public.event_type AS ENUM ('culto_domingo', 'culto_quarta', 'especial');

-- Add event_type column to events table
ALTER TABLE public.events 
ADD COLUMN event_type public.event_type NOT NULL DEFAULT 'culto_domingo';

-- Update existing events to have a default type based on day of week
UPDATE public.events 
SET event_type = CASE 
  WHEN EXTRACT(DOW FROM event_date) = 0 THEN 'culto_domingo'::event_type
  WHEN EXTRACT(DOW FROM event_date) = 3 THEN 'culto_quarta'::event_type
  ELSE 'especial'::event_type
END;