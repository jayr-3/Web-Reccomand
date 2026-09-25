/**
 * admin.js — ตรรกะหน้า admin.html
 * เข้าถึงได้เฉพาะบัญชีที่ profiles.role = 'admin' (ตรวจโดย requireAdmin())
 * จัดการข้อมูลกลาง 3 ตาราง (menus, ingredients, allergens) และสิทธิ์ผู้ใช้ (profiles.role)
 */
(async function () {
  const auth = await requireAdmin();
  if (!auth) return;
  const { user, profile } = auth;

  renderAppShell({ activePage: "admin", user, profile });

  // ---------- Tab switching ----------
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("is-active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      document.querySelector(`[data-tab-panel="${btn.dataset.tab}"]`).classList.add("is-active");
    });
  });

  /** แปลงบรรทัดวัตถุดิบ เช่น "หมูสับ 80 กรัม" -> ตัดตัวเลข/หน่วยท้ายออกเหลือ "หมูสับ" */
  function cleanIngredientName(line) {
    const qtyPattern =
      /\s*[\d๐-๙./¼½¾⅓⅔]+\s*(กรัม|มิลลิลิตร|ลิตร|ช้อนชา|ช้อนโต๊ะ|ถ้วยตวง|ก้อน|ชุด|ดอก|ราก|ฟอง|ชิ้น|ต้น|หัว|ใบ|ลูก)?\s*$/;
    let name = line.replace(qtyPattern, "").trim();
    name = name.replace(/[\d๐-๙./¼½¾⅓⅔]+\s*$/, "").trim();
    return name || line.trim();
  }

  // =========================================================
  // เมนูอาหาร
  // =========================================================
  const menuListEl = document.getElementById("menu-list");
  const menuForm = document.getElementById("menu-form");
  const menuFormError = document.getElementById("menu-form-error");
  const menuFormTitle = document.getElementById("menu-form-title");
  const menuFormCancel = document.getElementById("menu-form-cancel");
  let menus = [];

  function resetMenuForm() {
    menuForm.reset();
    document.getElementById("menu-id").value = "";
    // [เพิ่ม] ล้างค่าช่องรูปภาพ
    const imgInput = document.getElementById("menu-image");
    if (imgInput) imgInput.value = "";

    menuFormTitle.textContent = "เพิ่มเมนูใหม่";
    menuFormCancel.classList.add("hidden");
  }

  function editMenu(menu) {
    document.getElementById("menu-id").value = menu.id;
    document.getElementById("menu-name").value = menu.name;
    // [เพิ่ม] ดึงลิงก์รูปภาพเดิมมาใส่ในช่อง input
    const imgInput = document.getElementById("menu-image");
    if (imgInput) imgInput.value = menu.image_url || "";

    document.getElementById("menu-ingredients").value = menu.ingredients.map((i) => i.raw).join("\n");
    document.getElementById("menu-steps").value = menu.steps.join("\n");
    menuFormTitle.textContent = `แก้ไขเมนู: ${menu.name}`;
    menuFormCancel.classList.remove("hidden");
    menuForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderMenus() {
    if (menus.length === 0) {
      menuListEl.innerHTML = `<div class="empty-state"><div class="glyph">🍽️</div><p class="mb-0">ยังไม่มีเมนูในระบบ</p></div>`;
      return;
    }
    menuListEl.innerHTML = "";
    menus.forEach((menu) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <div class="info">
          <div class="title">#${menu.id} ${menu.name}</div>
          <div class="meta">${menu.ingredients.length} วัตถุดิบ · ${menu.steps.length} ขั้นตอน</div>
        </div>
        <div class="actions">
          <button class="btn btn-outline btn-sm" data-action="edit">แก้ไข</button>
          <button class="btn btn-danger-outline btn-sm" data-action="delete">ลบ</button>
        </div>`;
      row.querySelector('[data-action="edit"]').addEventListener("click", () => editMenu(menu));
      row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteMenu(menu));
      menuListEl.appendChild(row);
    });
  }

  async function loadMenus() {
    menus = await DB.admin.listMenus();
    renderMenus();
  }

  async function deleteMenu(menu) {
    if (!confirm(`ลบเมนู "${menu.name}" ใช่หรือไม่?`)) return;
    try {
      await DB.admin.deleteMenu(menu.id);
      Toast.show("ลบเมนูแล้ว", "success");
      await loadMenus();
    } catch (err) {
      Toast.show(err.message || "ลบไม่สำเร็จ", "danger");
    }
  }

  menuFormCancel.addEventListener("click", resetMenuForm);

  menuForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    menuFormError.classList.remove("is-visible");
    const idVal = document.getElementById("menu-id").value;
    
    // [เพิ่ม] อ่านค่ารูปภาพจากช่อง menu-image
    const imgInput = document.getElementById("menu-image");
    const imageUrl = imgInput ? imgInput.value.trim() : "";

    const ingredientLines = document
      .getElementById("menu-ingredients")
      .value.split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const stepLines = document
      .getElementById("menu-steps")
      .value.split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const nextId = idVal ? Number(idVal) : (menus.reduce((max, m) => Math.max(max, m.id), 0) || 0) + 1;

    const menu = {
      id: nextId,
      name: document.getElementById("menu-name").value.trim(),
      image_url: imageUrl, // [เพิ่ม] ส่ง image_url ไปบันทึก
      ingredients: ingredientLines.map((raw) => ({ raw, name: cleanIngredientName(raw) })),
      steps: stepLines,
    };

    const submitBtn = menuForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await DB.admin.saveMenu(menu);
      Toast.show("บันทึกเมนูแล้ว", "success");
      resetMenuForm();
      await loadMenus();
    } catch (err) {
      menuFormError.textContent = err.message || "บันทึกไม่สำเร็จ";
      menuFormError.classList.add("is-visible");
    } finally {
      submitBtn.disabled = false;
    }
  });

  // =========================================================
  // วัตถุดิบ
  // =========================================================
  const ingredientListEl = document.getElementById("ingredient-list");
  const ingredientForm = document.getElementById("ingredient-form");
  const ingredientFormError = document.getElementById("ingredient-form-error");
  const ingredientFormTitle = document.getElementById("ingredient-form-title");
  const ingredientFormCancel = document.getElementById("ingredient-form-cancel");
  let ingredientsList = [];

  function resetIngredientForm() {
    ingredientForm.reset();
    document.getElementById("ingredient-id").value = "";
    ingredientFormTitle.textContent = "เพิ่มวัตถุดิบใหม่";
    ingredientFormCancel.classList.add("hidden");
  }

  function editIngredient(ing) {
    document.getElementById("ingredient-id").value = ing.id;
    document.getElementById("ingredient-name").value = ing.name;
    document.getElementById("ingredient-category").value = ing.category || "";
    ingredientFormTitle.textContent = `แก้ไขวัตถุดิบ: ${ing.name}`;
    ingredientFormCancel.classList.remove("hidden");
    ingredientForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderIngredients() {
    const categories = [...new Set(ingredientsList.map((i) => i.category).filter(Boolean))];
    document.getElementById("ingredient-category-options").innerHTML = categories
      .map((c) => `<option value="${c}"></option>`)
      .join("");

    if (ingredientsList.length === 0) {
      ingredientListEl.innerHTML = `<div class="empty-state"><div class="glyph">🥕</div><p class="mb-0">ยังไม่มีวัตถุดิบในระบบ</p></div>`;
      return;
    }
    ingredientListEl.innerHTML = "";
    ingredientsList.forEach((ing) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <div class="info">
          <div class="title">${ing.name}</div>
          <div class="meta">${ing.category || "ไม่ระบุหมวดหมู่"}</div>
        </div>
        <div class="actions">
          <button class="btn btn-outline btn-sm" data-action="edit">แก้ไข</button>
          <button class="btn btn-danger-outline btn-sm" data-action="delete">ลบ</button>
        </div>`;
      row.querySelector('[data-action="edit"]').addEventListener("click", () => editIngredient(ing));
      row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteIngredient(ing));
      ingredientListEl.appendChild(row);
    });
  }

  async function loadIngredients() {
    ingredientsList = await DB.admin.listIngredients();
    renderIngredients();
  }

  async function deleteIngredient(ing) {
    if (!confirm(`ลบวัตถุดิบ "${ing.name}" ใช่หรือไม่?`)) return;
    try {
      await DB.admin.deleteIngredient(ing.id);
      Toast.show("ลบวัตถุดิบแล้ว", "success");
      await loadIngredients();
    } catch (err) {
      Toast.show(err.message || "ลบไม่สำเร็จ", "danger");
    }
  }

  ingredientFormCancel.addEventListener("click", resetIngredientForm);

  ingredientForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    ingredientFormError.classList.remove("is-visible");
    const idVal = document.getElementById("ingredient-id").value;
    const ingredient = {
      ...(idVal ? { id: Number(idVal) } : {}),
      name: document.getElementById("ingredient-name").value.trim(),
      category: document.getElementById("ingredient-category").value.trim() || null,
    };
    const submitBtn = ingredientForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await DB.admin.saveIngredient(ingredient);
      Toast.show("บันทึกวัตถุดิบแล้ว", "success");
      resetIngredientForm();
      await loadIngredients();
    } catch (err) {
      ingredientFormError.textContent = err.message || "บันทึกไม่สำเร็จ";
      ingredientFormError.classList.add("is-visible");
    } finally {
      submitBtn.disabled = false;
    }
  });

  // =========================================================
  // อาการแพ้ / โรคประจำตัว
  // =========================================================
  const allergenListEl = document.getElementById("allergen-list");
  const allergenForm = document.getElementById("allergen-form");
  const allergenFormError = document.getElementById("allergen-form-error");
  const allergenFormTitle = document.getElementById("allergen-form-title");
  const allergenFormCancel = document.getElementById("allergen-form-cancel");
  const allergenIdInput = document.getElementById("allergen-id");
  let allergensList = [];

  function resetAllergenForm() {
    allergenForm.reset();
    document.getElementById("allergen-order").value = 0;
    allergenIdInput.disabled = false;
    allergenFormTitle.textContent = "เพิ่มตัวเลือกอาการแพ้ใหม่";
    allergenFormCancel.classList.add("hidden");
  }

  function editAllergen(a) {
    allergenIdInput.value = a.id;
    allergenIdInput.disabled = true;
    document.getElementById("allergen-label").value = a.label;
    document.getElementById("allergen-icon").value = a.icon;
    document.getElementById("allergen-keywords").value = a.keywords.join(", ");
    document.getElementById("allergen-order").value = a.sort_order;
    allergenFormTitle.textContent = `แก้ไข: ${a.label}`;
    allergenFormCancel.classList.remove("hidden");
    allergenForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderAllergens() {
    if (allergensList.length === 0) {
      allergenListEl.innerHTML = `<div class="empty-state"><div class="glyph">🛡️</div><p class="mb-0">ยังไม่มีตัวเลือกอาการแพ้</p></div>`;
      return;
    }
    allergenListEl.innerHTML = "";
    allergensList.forEach((a) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <div class="info">
          <div class="title">${a.icon} ${a.label} <span class="meta">(${a.id})</span></div>
          <div class="meta">คำสำคัญ: ${a.keywords.join(", ")}</div>
        </div>
        <div class="actions">
          <button class="btn btn-outline btn-sm" data-action="edit">แก้ไข</button>
          <button class="btn btn-danger-outline btn-sm" data-action="delete">ลบ</button>
        </div>`;
      row.querySelector('[data-action="edit"]').addEventListener("click", () => editAllergen(a));
      row.querySelector('[data-action="delete"]').addEventListener("click", () => deleteAllergen(a));
      allergenListEl.appendChild(row);
    });
  }

  async function loadAllergens() {
    allergensList = await DB.admin.listAllergens();
    renderAllergens();
  }

  async function deleteAllergen(a) {
    if (!confirm(`ลบตัวเลือก "${a.label}" ใช่หรือไม่?`)) return;
    try {
      await DB.admin.deleteAllergen(a.id);
      Toast.show("ลบแล้ว", "success");
      await loadAllergens();
    } catch (err) {
      Toast.show(err.message || "ลบไม่สำเร็จ", "danger");
    }
  }

  allergenFormCancel.addEventListener("click", resetAllergenForm);

  allergenForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    allergenFormError.classList.remove("is-visible");
    const keywords = document
      .getElementById("allergen-keywords")
      .value.split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const allergen = {
      id: allergenIdInput.value.trim(),
      label: document.getElementById("allergen-label").value.trim(),
      icon: document.getElementById("allergen-icon").value.trim(),
      keywords,
      sort_order: Number(document.getElementById("allergen-order").value) || 0,
    };

    const submitBtn = allergenForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await DB.admin.saveAllergen(allergen);
      Toast.show("บันทึกแล้ว", "success");
      resetAllergenForm();
      await loadAllergens();
    } catch (err) {
      allergenFormError.textContent = err.message || "บันทึกไม่สำเร็จ";
      allergenFormError.classList.add("is-visible");
    } finally {
      submitBtn.disabled = false;
    }
  });

  // =========================================================
  // ผู้ใช้งาน / สิทธิ์
  // =========================================================
  const userListEl = document.getElementById("user-list");

  function renderUsers(users) {
    if (users.length === 0) {
      userListEl.innerHTML = `<div class="empty-state"><div class="glyph">👤</div><p class="mb-0">ยังไม่มีผู้ใช้งานในระบบ</p></div>`;
      return;
    }
    userListEl.innerHTML = "";
    users.forEach((u) => {
      const isMe = u.id === user.id;
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `
        <div class="info">
          <div class="title">${u.name || "(ไม่ระบุชื่อ)"} ${isMe ? '<span class="meta">(คุณ)</span>' : ""}</div>
          <div class="meta">${u.email || "-"}</div>
        </div>
        <div class="actions">
          <span class="admin-badge ${u.role === "admin" ? "is-admin" : ""}">${u.role === "admin" ? "แอดมิน" : "สมาชิก"}</span>
          <button class="btn btn-outline btn-sm" data-action="toggle">
            ${u.role === "admin" ? "ถอดสิทธิ์แอดมิน" : "ตั้งเป็นแอดมิน"}
          </button>
        </div>`;
      row.querySelector('[data-action="toggle"]').addEventListener("click", () => toggleRole(u));
      userListEl.appendChild(row);
    });
  }

  async function loadUsers() {
    const users = await DB.admin.listUsers();
    renderUsers(users);
  }

  async function toggleRole(u) {
    const nextRole = u.role === "admin" ? "member" : "admin";
    if (!confirm(`เปลี่ยนสิทธิ์ของ "${u.name || u.email}" เป็น "${nextRole === "admin" ? "แอดมิน" : "สมาชิก"}" ใช่หรือไม่?`)) return;
    try {
      await DB.admin.setRole(u.id, nextRole);
      Toast.show("อัปเดตสิทธิ์แล้ว", "success");
      await loadUsers();
    } catch (err) {
      Toast.show(err.message || "อัปเดตไม่สำเร็จ", "danger");
    }
  }

  // ---------- โหลดข้อมูลทั้งหมดตอนเปิดหน้า ----------
  try {
    await Promise.all([loadMenus(), loadIngredients(), loadAllergens(), loadUsers()]);
  } catch (err) {
    Toast.show(err.message || "โหลดข้อมูลไม่สำเร็จ", "danger", 6000);
  }
})();