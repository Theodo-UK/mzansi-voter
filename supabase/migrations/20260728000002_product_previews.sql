alter table public.items
add column preview_image_path text
check (
  preview_image_path is null
  or preview_image_path ~ '^[0-9A-Z]{10,14}[.](jpeg|jpg|png|webp)$'
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-previews',
  'product-previews',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
);
