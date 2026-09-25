/**
 * data.js
 * ---------------------------------------------------------------
 * โหลดข้อมูลตั้งต้นของระบบ (เมนูอาหาร / วัตถุดิบ / ตัวเลือกอาการแพ้)
 * จากตาราง Supabase โดยตรงทั้งหมด — ไม่มีไฟล์ข้อมูลสำรองในเครื่องอีกต่อไป
 *
 * ตารางที่ต้องมี (ดู supabase/schema.sql + supabase/seed.sql):
 *   menus(id, name, ingredients jsonb, steps jsonb)
 *   ingredients(name, category)
 *   allergens(id, label, icon, keywords text[])
 *
 * ถ้ายังไม่ได้รันสคริปต์ตั้งค่าฐานข้อมูล หรือเชื่อมต่อ Supabase ไม่ได้
 * DataStore.init() จะโยน error ออกมา ให้แต่ละหน้าจับ error นี้แล้วแสดง
 * ข้อความแจ้งเตือนที่เหมาะสม (ดูตัวอย่างใน js/guest.js)
 * ---------------------------------------------------------------
 */

const DataStore = (() => {
  let menus = null;
  let ingredients = null;
  let allergens = null;

  /** ตรวจว่าเมนูมีวัตถุดิบที่ตรงกับคำสำคัญของอาการแพ้ข้อใดบ้าง */
  function tagAllergens(menuIngredients, allergenDefs) {
    const text = menuIngredients.map((i) => i.name).join(" ");
    return allergenDefs
      .filter((a) => a.keywords.some((kw) => text.includes(kw)))
      .map((a) => a.id);
  }

  async function init() {
    if (menus && ingredients && allergens) return; // โหลดครั้งเดียวพอ
    ensureSupabase();

    const [menuRes, ingredientRes, allergenRes] = await Promise.all([
      supa.from("menus").select("id, name, ingredients, steps").order("id"),
      supa.from("ingredients").select("name, category").order("name"),
      supa.from("allergens").select("id, label, icon, keywords").order("sort_order"),
    ]);

    if (menuRes.error) throw menuRes.error;
    if (ingredientRes.error) throw ingredientRes.error;
    if (allergenRes.error) throw allergenRes.error;

    if (menuRes.data.length === 0) {
      throw new Error("ยังไม่มีข้อมูลเมนูในฐานข้อมูล กรุณารัน supabase/schema.sql และ supabase/seed.sql ก่อน");
    }

    allergens = allergenRes.data;
    ingredients = ingredientRes.data;
    menus = menuRes.data.map((m) => ({
      id: m.id,
      name: m.name,
      ingredients: m.ingredients,
      steps: m.steps,
      allergenTags: tagAllergens(m.ingredients, allergens),
    }));
  }

  function getMenus() {
    return menus || [];
  }

  function getMenuById(id) {
    return (menus || []).find((m) => m.id === Number(id));
  }

  function getIngredients() {
    return ingredients || [];
  }

  function getAllergens() {
    return allergens || [];
  }

  /** ค้นหาวัตถุดิบจากชื่อ (ใช้กับช่อง Search & Autocomplete) */
  function searchIngredients(query, limit = 8) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (ingredients || [])
      .filter((i) => i.name.toLowerCase().includes(q))
      .slice(0, limit);
  }

  return { init, getMenus, getMenuById, getIngredients, getAllergens, searchIngredients };
})();
