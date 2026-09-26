update public.profiles
set role = 'admin'
where email = 'your-email@example.com';   -- 🔧 แก้อีเมลตรงนี้

-- ตรวจสอบผลลัพธ์
select id, email, name, role from public.profiles where role = 'admin';
