/**
 * guard.js — ป้องกันหน้าที่ใช้ได้เฉพาะสมาชิก / เฉพาะแอดมิน
 */

/** เรียกในหน้าที่ต้องล็อกอินก่อน ถ้าไม่มี session จะเด้งไปหน้า login ให้อัตโนมัติ */
async function requireAuth() {
  let user;
  try {
    user = await DB.getCurrentUser();
  } catch (err) {
    // เชื่อมต่อ Supabase ไม่ได้ (เช่น ไม่มีอินเทอร์เน็ต) ถือว่ายืนยันตัวตนไม่ได้
    // เด้งไปหน้า login เพื่อให้เห็น error ที่ชัดเจนแทนหน้าเปล่า ๆ ค้างเฉย ๆ
    console.error("[guard] ตรวจสอบสถานะล็อกอินไม่สำเร็จ:", err);
    window.location.href = "login.html";
    return null;
  }
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

/**
 * เรียกในหน้าที่ใช้ได้เฉพาะแอดมิน (เช่น admin.html) — ต้องล็อกอินก่อน
 * และมี profiles.role = 'admin' เท่านั้น ถ้าไม่ใช่จะเด้งกลับ dashboard.html
 * คืนค่า { user, profile } เมื่อผ่านการตรวจสอบ
 */
async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  let profile;
  try {
    profile = await DB.getProfile(user.id);
  } catch (err) {
    console.error("[guard] โหลดโปรไฟล์เพื่อตรวจสิทธิ์แอดมินไม่สำเร็จ:", err);
    window.location.href = "dashboard.html";
    return null;
  }
  if (!profile || profile.role !== "admin") {
    window.location.href = "dashboard.html";
    return null;
  }
  return { user, profile };
}
