-- Step 1: Add band_admin role to the enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'band_admin';