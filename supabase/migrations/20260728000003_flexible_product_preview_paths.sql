alter table public.items
drop constraint items_preview_image_path_check;

alter table public.items
add constraint items_preview_image_path_check
check (
  preview_image_path is null
  or preview_image_path ~ '^[0-9A-Z]{10,64}[.](jpeg|jpg|png|webp)$'
);
