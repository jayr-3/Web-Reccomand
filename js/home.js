/**
 * home.js — ควบคุมการทำงานของหน้าหลัก (Home)
 */
(async function () {
  try {
    // 1. ตรวจสอบการล็อกอิน (ถ้ายังไม่ล็อกอิน ระบบจะเด้งไปหน้า login อัตโนมัติ)
    const user = await requireAuth();
    if (!user) return;

    // 2. ดึงข้อมูลโปรไฟล์
    const profile = await DB.getProfile(user.id);
    
    // 3. สั่งเรนเดอร์แถบ Sidebar ด้านซ้าย และระบุว่าหน้าปัจจุบันคือ "home"
    renderAppShell({ activePage: "home", user, profile });

  } catch (err) {
    console.error("Home Error:", err);
  }
})();
