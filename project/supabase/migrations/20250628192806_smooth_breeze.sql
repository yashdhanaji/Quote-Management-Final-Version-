/*
  # Create organization-assets storage bucket

  1. Storage Setup
    - Create `organization-assets` bucket for storing company logos and other assets
    - Set bucket to be publicly accessible for logo display
    - Configure appropriate file size limits

  2. Security Policies
    - Allow authenticated users to upload files to their organization folder
    - Allow public read access for displaying logos
    - Restrict file operations to organization members only

  3. File Management
    - Files will be organized by organization ID as folder structure
    - Support common image formats (PNG, JPG, SVG, etc.)
    - Set reasonable file size limits for logos
*/

-- Create the organization-assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-assets',
  'organization-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Policy to allow authenticated users to upload files to their organization folder
CREATE POLICY "Users can upload to their organization folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- Policy to allow authenticated users to update files in their organization folder
CREATE POLICY "Users can update files in their organization folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM users 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'organization-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- Policy to allow authenticated users to delete files in their organization folder
CREATE POLICY "Users can delete files in their organization folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- Policy to allow public read access (for displaying logos)
CREATE POLICY "Public can view organization assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'organization-assets');

-- Policy to allow service role full access
CREATE POLICY "Service role can manage all organization assets"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'organization-assets')
WITH CHECK (bucket_id = 'organization-assets');