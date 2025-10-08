-- Update bands policies
DROP POLICY IF EXISTS "Superusers can manage bands" ON public.bands;

CREATE POLICY "Superusers and band admins can manage bands"
ON public.bands
FOR ALL
USING (get_user_role(auth.uid()) IN ('superuser', 'band_admin'));

-- Update comments policies - band_admins can only manage their own comments
DROP POLICY IF EXISTS "Superusers can manage all comments" ON public.comments;

CREATE POLICY "Superusers can manage all comments"
ON public.comments
FOR ALL
USING (get_user_role(auth.uid()) = 'superuser');

CREATE POLICY "Users can delete own comments"
ON public.comments
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.id = comments.user_id
));

-- Update events policies to include band_admins
DROP POLICY IF EXISTS "Band members can manage their band events" ON public.events;

CREATE POLICY "Band members and admins can manage events"
ON public.events
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() 
  AND (
    profiles.band_id = events.band_id 
    OR profiles.role IN ('superuser', 'band_admin')
  )
));

-- Update event_participants policies
DROP POLICY IF EXISTS "Event managers can manage participants" ON public.event_participants;

CREATE POLICY "Event managers and admins can manage participants"
ON public.event_participants
FOR ALL
USING (EXISTS (
  SELECT 1 FROM events e
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE e.id = event_participants.event_id 
  AND (
    p.band_id = e.band_id 
    OR p.role IN ('superuser', 'band_admin')
  )
));

-- Update event_songs policies
DROP POLICY IF EXISTS "Event managers can manage event songs" ON public.event_songs;

CREATE POLICY "Event managers and admins can manage event songs"
ON public.event_songs
FOR ALL
USING (EXISTS (
  SELECT 1 FROM events e
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE e.id = event_songs.event_id 
  AND (
    p.band_id = e.band_id 
    OR p.role IN ('superuser', 'band_admin')
  )
));

-- Update profiles policies - band_admins can view and update profiles but not change to/from superuser role
DROP POLICY IF EXISTS "Superusers can manage all profiles" ON public.profiles;

CREATE POLICY "Superusers can manage all profiles"
ON public.profiles
FOR ALL
USING (get_user_role(auth.uid()) = 'superuser');

CREATE POLICY "Band admins can view all profiles"
ON public.profiles
FOR SELECT
USING (get_user_role(auth.uid()) = 'band_admin');

CREATE POLICY "Band admins can update non-superuser profiles"
ON public.profiles
FOR UPDATE
USING (
  get_user_role(auth.uid()) = 'band_admin'
  AND get_user_role(profiles.user_id) != 'superuser'
)
WITH CHECK (
  get_user_role(auth.uid()) = 'band_admin'
  AND role != 'superuser'
);

CREATE POLICY "Band admins can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  get_user_role(auth.uid()) = 'band_admin'
  AND role != 'superuser'
);

CREATE POLICY "Band admins can delete non-superuser profiles"
ON public.profiles
FOR DELETE
USING (
  get_user_role(auth.uid()) = 'band_admin'
  AND get_user_role(profiles.user_id) != 'superuser'
);