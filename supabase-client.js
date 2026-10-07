/**
 * supabase-client.js
 * ---------------------------------------------------------------
 * จุดเชื่อมต่อฐานข้อมูล Supabase ของทั้งเว็บแอป
 *
 * ตั้งค่าโปรเจกต์ Supabase ไว้แล้วด้านล่าง — ทุกฟังก์ชันใน
 * js/db.js และ js/data.js จะเรียก Supabase จริงโดยอัตโนมัติ
 * (ไม่ตกไปใช้โหมดสาธิต localStorage อีกต่อไป)
 *
 * ก่อนใช้งานจริง ต้องรันสคริปต์ตั้งค่าฐานข้อมูลก่อน 1 ครั้ง:
 *   1) supabase/schema.sql  -> สร้างตาราง + Row Level Security policies
 *   2) supabase/seed.sql    -> นำเข้าข้อมูลเมนู 45 รายการ และวัตถุดิบ 170 รายการ
 * (วางรันใน Supabase Dashboard > SQL Editor ของโปรเจกต์นี้)
 * ---------------------------------------------------------------
 */

const SUPABASE_URL = "https://pwwdourickprpczrvytw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3d2RvdXJpY2twcnBjenJ2eXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NTI5MDksImV4cCI6MjEwNDUyODkwOX0.YMaqjGSaLMRGOdGEaA_sxX_UW2KHqg-nW3qao-LMq_o";

/** true เมื่อมีการตั้งค่า Supabase ครบแล้วเท่านั้น */
const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * สร้าง client จาก supabase-js (โหลดผ่าน CDN ใน <script> ของแต่ละหน้า)
 * คืนค่า null ถ้ายังไม่ได้ตั้งค่า เพื่อให้ db.js สลับไปใช้ localStorage แทน
 */
function createSupabaseClient() {
  if (!isSupabaseConfigured) return null;
  if (typeof window.supabase === "undefined") {
    console.warn("[supabase-client] ไม่พบไลบรารี supabase-js กรุณาตรวจสอบว่าได้แนบ CDN script ไว้ก่อนไฟล์นี้");
    return null;
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const supa = createSupabaseClient();

/**
 * ใช้ตรวจก่อนเรียก Supabase ทุกครั้ง (ทั้งใน db.js และ data.js)
 * กันเคส URL/Key ถูกตั้งค่าไว้ แต่โหลดไลบรารี supabase-js (CDN) ไม่สำเร็จ
 * เช่น ไม่ได้ต่อเน็ต หรือลืมแนบ <script> ของ supabase-js ไว้ก่อนไฟล์นี้
 */
function ensureSupabase() {
  if (!supa) {
    throw new Error(
      "เชื่อมต่อ Supabase ไม่สำเร็จ กรุณาตรวจสอบว่าแนบสคริปต์ supabase-js (CDN) ไว้ก่อนไฟล์ supabase-client.js และเชื่อมต่ออินเทอร์เน็ตอยู่"
    );
  }
}
