-- =========================================================
-- migration_allergen_subtypes.sql
-- เพิ่มตัวเลือกย่อยของอาการแพ้ (เช่น "แพ้ถั่ว" -> แพ้ถั่วลิสง/ถั่วเหลือง/อัลมอนด์)
-- สำหรับโปรเจกต์ Supabase ที่ "มีข้อมูลอยู่แล้ว" (ปลอดภัย ไม่ลบ/ไม่กระทบของเดิม)
--
-- สิ่งที่สคริปต์นี้ทำ:
--   1) เพิ่มคอลัมน์ allergens.parent_id (ถ้ายังไม่มี)
--   2) เพิ่มตัวเลือกย่อยใหม่ ผูกกับหมวดหลักที่มีอยู่แล้วในตาราง (milk, egg, nuts,
--      shellfish, wheat) — ไม่แตะต้อง/ไม่ลบแถวหมวดหลักเดิมที่แอดมินตั้งค่าไว้
--
-- หน้าเว็บ (js/ui.js) จะกางหมวดหลักที่มีตัวเลือกย่อยให้อัตโนมัติเป็นปุ่ม
-- "กาง/ยุบ" ส่วนหมวดที่ไม่มีตัวเลือกย่อยจะแสดงเป็น checkbox เดี่ยวเหมือนเดิม
--
-- วิธีใช้: วางรันในโปรเจกต์ Supabase -> SQL Editor -> New query -> Run
-- รันซ้ำได้ปลอดภัย (ใช้ ON CONFLICT อัปเดตทับของเดิมถ้ามีอยู่แล้ว)
-- =========================================================

alter table public.allergens
  add column if not exists parent_id text references public.allergens (id) on delete cascade;

-- หมายเหตุ: ถ้าหมวดหลักในตารางของคุณใช้รหัส (id) ไม่ตรงกับ 'milk' / 'egg' /
-- 'nuts' / 'shellfish' / 'wheat' ที่อ้างถึงด้านล่าง ให้แก้ parent_id ในคำสั่ง
-- insert ให้ตรงกับรหัสจริงในตาราง allergens ของคุณก่อนรัน (เช็คได้จาก Table
-- Editor -> allergens -> คอลัมน์ id)

insert into public.allergens (id, label, icon, parent_id, keywords, sort_order) values
  ('milk_fresh', 'แพ้นมสด/นมวัว', '🥛', 'milk', '{"นมสด","นมวัว"}', 100),
  ('milk_butter', 'แพ้เนย', '🧈', 'milk', '{"เนย"}', 101),
  ('milk_cheese', 'แพ้ชีส', '🧀', 'milk', '{"ชีส"}', 102),
  ('milk_cream', 'แพ้ครีม/วิปปิ้งครีม', '🍦', 'milk', '{"ครีม","วิปครีม","วิปปิ้งครีม"}', 103),
  ('milk_yogurt', 'แพ้โยเกิร์ต', '🥣', 'milk', '{"โยเกิร์ต","โยเกิร์ด"}', 104),

  ('egg_chicken', 'แพ้ไข่ไก่', '🐔', 'egg', '{"ไข่ไก่"}', 200),
  ('egg_duck', 'แพ้ไข่เป็ด', '🦆', 'egg', '{"ไข่เป็ด"}', 201),
  ('egg_quail', 'แพ้ไข่นกกระทา', '🐦', 'egg', '{"ไข่นกกระทา"}', 202),

  ('nuts_peanut', 'แพ้ถั่วลิสง', '🥜', 'nuts', '{"ถั่วลิสง"}', 300),
  ('nuts_soy', 'แพ้ถั่วเหลือง', '🫘', 'nuts', '{"ถั่วเหลือง","เต้าเจี้ยว","เต้าหู้","ซีอิ๊ว"}', 301),
  ('nuts_almond', 'แพ้อัลมอนด์', '🌰', 'nuts', '{"อัลมอนด์"}', 302),
  ('nuts_tree_other', 'แพ้ถั่วเปลือกแข็งอื่นๆ', '🌰', 'nuts', '{"เม็ดมะม่วงหิมพานต์","ถั่วเปลือกแข็ง","วอลนัท","แมคคาเดเมีย"}', 303),

  ('shellfish_oyster', 'แพ้หอยนางรม', '🦪', 'shellfish', '{"หอยนางรม"}', 400),
  ('shellfish_mussel', 'แพ้หอยแมลงภู่', '🦪', 'shellfish', '{"หอยแมลงภู่"}', 401),
  ('shellfish_clam', 'แพ้หอยชนิดอื่น ๆ', '🐚', 'shellfish', '{"หอยลาย","หอย"}', 402),
  ('shellfish_shrimp', 'แพ้กุ้ง', '🍤', 'shellfish', '{"กุ้ง"}', 403),
  ('shellfish_crab', 'แพ้ปู', '🦀', 'shellfish', '{"ปู"}', 404),

  ('wheat_flour', 'แพ้แป้งสาลี', '🌾', 'wheat', '{"แป้งสาลี","แป้งสาลีอเนกประสงค์"}', 500),
  ('wheat_noodle', 'แพ้บะหมี่', '🍜', 'wheat', '{"บะหมี่"}', 501),
  ('wheat_bread', 'แพ้ขนมปัง', '🍞', 'wheat', '{"ขนมปัง"}', 502),
  ('wheat_pasta', 'แพ้พาสต้า/สปาเก็ตตี้', '🍝', 'wheat', '{"สปาเก็ตตี้","พาสต้า","มักกะโรนี"}', 503)
on conflict (id) do update set
  label = excluded.label,
  icon = excluded.icon,
  parent_id = excluded.parent_id,
  keywords = excluded.keywords,
  sort_order = excluded.sort_order;

-- ตรวจผลลัพธ์: หมวดหลักควรมี parent_id เป็นว่าง ส่วนตัวเลือกย่อยควรมี parent_id ชี้กลับไปหมวดหลัก
select id, label, parent_id, keywords, sort_order
from public.allergens
order by coalesce(parent_id, id), parent_id nulls first, sort_order;
