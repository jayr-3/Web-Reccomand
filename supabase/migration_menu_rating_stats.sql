-- =========================================================
-- migration_menu_rating_stats.sql
-- สำหรับโปรเจกต์ Supabase ที่ "มีข้อมูลผู้ใช้งานอยู่แล้ว" (รันแทน schema.sql
-- ซึ่งจะลบตารางเก่าทั้งหมด — ห้ามรัน schema.sql ซ้ำกับโปรเจกต์ที่ใช้งานจริงแล้ว)
--
-- สคริปต์นี้สร้าง view สรุปคะแนนเฉลี่ย + จำนวนคนให้คะแนนของแต่ละเมนู (รวมจาก
-- favorites.rating ของสมาชิกทุกคน) เพื่อนำไปบวกคะแนนในระบบแนะนำเมนู — เมนูที่
-- คนให้คะแนนดีเยอะจะถูกจัดอันดับขึ้นก่อน และใช้โชว์เป็นดาว ★ ในผลลัพธ์ด้วย
--
-- ปลอดภัย ไม่กระทบข้อมูลเดิม: ไม่แตะตาราง favorites เลย แค่เพิ่ม view ใหม่
-- (รันซ้ำได้ด้วย create or replace) และ view นี้ "ไม่เปิดเผย" ว่าใครให้คะแนน
-- อะไร เป็นแค่ตัวเลขสรุปต่อเมนู จึงเปิดให้อ่านได้สาธารณะ (anon + authenticated)
-- โดยไม่ต้องแก้ RLS ของตาราง favorites เดิมที่ยังจำกัดให้เห็นแค่แถวของตัวเอง
--
-- วิธีใช้: วางรันในโปรเจกต์ Supabase -> SQL Editor -> New query -> Run
-- =========================================================

create or replace view public.menu_rating_stats as
select
  menu_id,
  round(avg(rating)::numeric, 2) as avg_rating,
  count(rating) as rating_count
from public.favorites
where rating is not null
group by menu_id;

grant select on public.menu_rating_stats to anon, authenticated;

-- ตรวจผลลัพธ์ (ควรเห็นแถวของทุกเมนูที่เคยมีคนให้คะแนนอย่างน้อย 1 ครั้ง)
select * from public.menu_rating_stats order by avg_rating desc;
