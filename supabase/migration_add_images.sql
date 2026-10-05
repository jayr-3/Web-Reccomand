-- =========================================================
-- migration_add_images.sql
-- สำหรับโปรเจกต์ Supabase ที่ "มีข้อมูลผู้ใช้งานอยู่แล้ว" (รันแทน schema.sql
-- ซึ่งจะลบตารางเก่าทั้งหมด — ห้ามรัน schema.sql ซ้ำกับโปรเจกต์ที่ใช้งานจริงแล้ว)
--
-- สคริปต์นี้เพิ่มเฉพาะส่วนที่ขาดไปอย่างปลอดภัย (ไม่ลบข้อมูลเดิม):
--   1) คอลัมน์ menus.image_url      (รูปภาพประจำเมนู)
--   2) คอลัมน์ profiles.avatar_url  (รูปโปรไฟล์)
--   3) Storage bucket "menu-images" (อ่านสาธารณะ แก้ไขได้เฉพาะแอดมิน)
--   4) Storage bucket "avatars"     (อ่านสาธารณะ แก้ไขได้เฉพาะเจ้าของไฟล์)
--
-- วิธีใช้: วางรันในโปรเจกต์ Supabase -> SQL Editor -> New query -> Run
-- รันซ้ำได้ปลอดภัย
-- =========================================================

alter table public.menus add column if not exists image_url text;
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "menu_images_public_read" on storage.objects;
create policy "menu_images_public_read"
  on storage.objects for select
  using (bucket_id = 'menu-images');

drop policy if exists "menu_images_admin_write" on storage.objects;
create policy "menu_images_admin_write"
  on storage.objects for all
  using (bucket_id = 'menu-images' and public.is_admin())
  with check (bucket_id = 'menu-images' and public.is_admin());

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write"
  on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
