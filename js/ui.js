/**
 * ui.js
 * ---------------------------------------------------------------
 * ส่วนประกอบ UI ที่ใช้ร่วมกันหลายหน้า: navbar, toast, ตัวเลือกวัตถุดิบ
 * แบบ search & autocomplete, ตัวเลือกอาการแพ้/โรคประจำตัว และ
 * แผงรายละเอียดเมนู (drawer)
 * ---------------------------------------------------------------
 */

/* ---------- App shell (sidebar) สำหรับหน้าสมาชิก/แอดมิน ---------- */
/**
 * วาด sidebar ของพื้นที่ที่ต้องล็อกอิน (dashboard/recommend/history/profile/admin)
 * ให้หน้าตาต่างจากหน้า guest/marketing ที่ใช้ navbar บนแบบเดิมอย่างชัดเจน
 * แสดงลิงก์ "แผงควบคุมแอดมิน" และป้าย role สีต่างเฉพาะบัญชีที่เป็นแอดมินเท่านั้น
 *
 * ต้องมี element #app-sidebar, #app-sidebar-overlay และปุ่ม .mobile-topbar-toggle
 * อยู่ใน HTML ของหน้าอยู่แล้ว (ดูตัวอย่างใน dashboard.html)
 *
 * @param {Object} opts
 * @param {"dashboard"|"recommend"|"history"|"profile"|"admin"} opts.activePage
 * @param {{id:string, email:string}} opts.user
 * @param {{name?:string, role?:string}} [opts.profile]
 */
function renderAppShell({ activePage, user, profile }) {
  const role = profile?.role === "admin" ? "admin" : "member";
  const displayName = profile?.name || user?.email || "";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  const navItems = [
    { page: "dashboard", href: "dashboard.html", icon: "🏠", label: "แดชบอร์ด" },
    { page: "recommend", href: "recommend.html", icon: "🔎", label: "ค้นหาเมนู" },
    { page: "history", href: "history.html", icon: "❤️", label: "เมนูโปรด/ประวัติ" },
    { page: "profile", href: "profile.html", icon: "⚙️", label: "โปรไฟล์" },
  ];

  const navHtml = navItems
    .map(
      (item) => `
      <a href="${item.href}" class="sidebar-link ${item.page === activePage ? "is-active" : ""}">
        <span class="sidebar-link-icon">${item.icon}</span>
        <span>${item.label}</span>
      </a>`
    )
    .join("");

  const adminNavHtml =
    role === "admin"
      ? `
      <div class="sidebar-divider"></div>
      <a href="admin.html" class="sidebar-link is-admin-link ${activePage === "admin" ? "is-active" : ""}">
        <span class="sidebar-link-icon">🛠️</span>
        <span>แผงควบคุมแอดมิน</span>
      </a>`
      : "";

  const sidebarEl = document.getElementById("app-sidebar");
  if (sidebarEl) {
    sidebarEl.innerHTML = `
      <a href="dashboard.html" class="sidebar-brand"><span class="brand-mark">🍲</span> กินอะไรดี</a>
      <div class="sidebar-user">
        <div class="avatar avatar-sidebar">${initial}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${displayName}</div>
          <span class="role-badge role-badge-${role}">${role === "admin" ? "แอดมิน" : "สมาชิก"}</span>
        </div>
      </div>
      <nav class="sidebar-nav">${navHtml}${adminNavHtml}</nav>
      <button type="button" id="app-shell-logout" class="sidebar-logout">ออกจากระบบ</button>
    `;
  }

  document.getElementById("app-shell-logout")?.addEventListener("click", async () => {
    await DB.signOut();
    window.location.href = "index.html";
  });

  // mobile: เปิด/ปิด sidebar แบบ off-canvas
  const toggle = document.querySelector(".mobile-topbar-toggle");
  const overlay = document.getElementById("app-sidebar-overlay");
  const closeSidebar = () => document.body.classList.remove("sidebar-open");
  toggle?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
  overlay?.addEventListener("click", closeSidebar);
  sidebarEl?.querySelectorAll(".sidebar-link").forEach((a) => a.addEventListener("click", closeSidebar));
}

/* ---------- Navbar ---------- */
function initNavbar() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll(".nav-link").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("is-open"))
    );
  }

  const current = document.body.dataset.page;
  document.querySelectorAll(".nav-link").forEach((a) => {
    if (a.dataset.page === current) a.classList.add("is-active");
  });
}

/* ---------- Toast ---------- */
const Toast = (() => {
  function host() {
    let el = document.querySelector(".toast-host");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast-host";
      document.body.appendChild(el);
    }
    return el;
  }
  function show(message, type = "default", duration = 2600) {
    const el = document.createElement("div");
    el.className = "toast" + (type !== "default" ? ` toast-${type}` : "");
    el.textContent = message;
    host().appendChild(el);
    setTimeout(() => el.remove(), duration);
  }
  return { show };
})();

/* ---------- Ingredient chip picker (Search & Autocomplete) ---------- */
function createIngredientPicker({ inputEl, resultsEl, chipListEl, emptyText = "ยังไม่ได้เลือกวัตถุดิบ" }) {
  let selected = [];

  function renderChips() {
    chipListEl.innerHTML = "";
    if (selected.length === 0) {
      chipListEl.innerHTML = `<span class="chip-empty">${emptyText}</span>`;
      return;
    }
    selected.forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.innerHTML = `${name} <button type="button" aria-label="ลบ ${name}">✕</button>`;
      chip.querySelector("button").addEventListener("click", () => {
        selected = selected.filter((n) => n !== name);
        renderChips();
      });
      chipListEl.appendChild(chip);
    });
  }

  function addIngredient(name) {
    if (!selected.includes(name)) selected.push(name);
    inputEl.value = "";
    closeResults();
    renderChips();
    inputEl.focus();
  }

  function closeResults() {
    resultsEl.innerHTML = "";
    resultsEl.classList.remove("is-open");
  }

  function renderResults(matches) {
    resultsEl.innerHTML = "";
    if (matches.length === 0) {
      closeResults();
      return;
    }
    matches.forEach((ing) => {
      const opt = document.createElement("div");
      opt.className = "picker-option";
      opt.innerHTML = `<span>${ing.name}</span><span class="cat">${ing.category}</span>`;
      opt.addEventListener("mousedown", (e) => {
        e.preventDefault();
        addIngredient(ing.name);
      });
      resultsEl.appendChild(opt);
    });
    resultsEl.classList.add("is-open");
  }

  inputEl.addEventListener("input", () => {
    const q = inputEl.value.trim();
    if (!q) return closeResults();
    renderResults(DataStore.searchIngredients(q));
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = inputEl.value.trim();
      if (q) addIngredient(q); // อนุญาตให้พิมพ์วัตถุดิบเองได้แม้ไม่อยู่ในรายการ
    }
    if (e.key === "Escape") closeResults();
  });

  inputEl.addEventListener("blur", () => setTimeout(closeResults, 120));

  renderChips();

  return {
    getSelected: () => selected.slice(),
    setSelected: (names) => {
      selected = names.slice();
      renderChips();
    },
  };
}

/* ---------- Health condition picker ---------- */
function createConditionPicker(gridEl) {
  const allergens = DataStore.getAllergens();
  let selected = [];

  gridEl.innerHTML = allergens
    .map(
      (a) => `
      <label class="condition-toggle" data-id="${a.id}">
        <input type="checkbox" value="${a.id}" />
        <span>${a.icon} ${a.label}</span>
      </label>`
    )
    .join("");

  gridEl.querySelectorAll(".condition-toggle").forEach((label) => {
    const input = label.querySelector("input");
    input.addEventListener("change", () => {
      label.classList.toggle("is-checked", input.checked);
      selected = Array.from(gridEl.querySelectorAll("input:checked")).map((i) => i.value);
    });
  });

  return {
    getSelected: () => selected.slice(),
    setSelected: (ids) => {
      selected = ids.slice();
      gridEl.querySelectorAll(".condition-toggle").forEach((label) => {
        const input = label.querySelector("input");
        input.checked = ids.includes(input.value);
        label.classList.toggle("is-checked", input.checked);
      });
    },
  };
}

/* ---------- Menu detail drawer ---------- */
const MenuDrawer = (() => {
  let overlayEl, drawerBodyEl, drawerFootEl, drawerTitleEl;

  function ensureDom() {
    if (overlayEl) return;
    overlayEl = document.createElement("div");
    overlayEl.className = "overlay";
    overlayEl.innerHTML = `
      <div class="drawer" role="dialog" aria-modal="true">
        <div class="drawer-head">
          <h3 class="drawer-title" style="margin:0"></h3>
          <button type="button" class="drawer-close" aria-label="ปิด">✕</button>
        </div>
        <div class="drawer-body"></div>
        <div class="drawer-foot"></div>
      </div>`;
    document.body.appendChild(overlayEl);
    drawerTitleEl = overlayEl.querySelector(".drawer-title");
    drawerBodyEl = overlayEl.querySelector(".drawer-body");
    drawerFootEl = overlayEl.querySelector(".drawer-foot");
    overlayEl.querySelector(".drawer-close").addEventListener("click", close);
    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  function close() {
    overlayEl.classList.remove("is-open");
  }

  /**
   * @param {Object} match ผลลัพธ์จาก RecommendEngine.scoreMenus() รายการเดียว
   * @param {Object} [opts]
   * @param {boolean} [opts.showMemberActions] แสดงปุ่มบันทึกเมนูโปรด/ให้คะแนน (เฉพาะสมาชิก)
   * @param {Function} [opts.onToggleFavorite] (menuId, isFavorite) => void
   * @param {Function} [opts.onRate] (menuId, rating) => void
   */
  function open(match, opts = {}) {
    ensureDom();
    const { menu, matchedCount, totalCount, missing, pct, isFavorite = false } = match;

    drawerTitleEl.textContent = menu.name;

    const ingredientListHtml = menu.ingredients
      .map((ing) => {
        const isMissing = missing.some((m) => m.raw === ing.raw);
        return `<div class="ingredient-line">
          <span>${ing.raw}</span>
          <span class="${isMissing ? "missing" : "have"}">${isMissing ? "ยังไม่มี" : "มีแล้ว ✓"}</span>
        </div>`;
      })
      .join("");

    const stepsHtml = menu.steps
      .map((s) => `<li>${s.replace(/^\d+\.\s*/, "")}</li>`)
      .join("");

    drawerBodyEl.innerHTML = `
      <div class="row-wrap" style="margin-bottom:18px">
        <span class="tag ${pct === 100 ? "tag-ready" : "tag-missing"}">${pct === 100 ? "ทำได้ทันที" : `ขาด ${totalCount - matchedCount} อย่าง`}</span>
        <span class="tag">ตรงกับวัตถุดิบที่มี ${pct}%</span>
      </div>
      <h4>ส่วนผสม (${totalCount} รายการ)</h4>
      <div class="stack" style="margin-bottom:22px">${ingredientListHtml}</div>
      <h4>วิธีทำ</h4>
      <ol class="step-list">${stepsHtml}</ol>
    `;

    drawerFootEl.innerHTML = "";
    if (opts.showMemberActions) {
      const favBtn = document.createElement("button");
      favBtn.type = "button";
      favBtn.className = "btn " + (isFavorite ? "btn-dark" : "btn-outline");
      favBtn.textContent = isFavorite ? "♥ บันทึกไว้แล้ว" : "♡ บันทึกเป็นเมนูโปรด";
      favBtn.addEventListener("click", () => {
        const next = !favBtn.dataset.fav || favBtn.dataset.fav === "false";
        opts.onToggleFavorite?.(menu.id, next);
        favBtn.dataset.fav = String(next);
        favBtn.className = "btn " + (next ? "btn-dark" : "btn-outline");
        favBtn.textContent = next ? "♥ บันทึกไว้แล้ว" : "♡ บันทึกเป็นเมนูโปรด";
      });
      favBtn.dataset.fav = String(isFavorite);
      drawerFootEl.appendChild(favBtn);

      const rateWrap = document.createElement("div");
      rateWrap.className = "rating-stars";
      rateWrap.setAttribute("aria-label", "ให้คะแนนเมนูนี้");
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement("button");
        star.type = "button";
        star.textContent = "★";
        star.addEventListener("click", () => {
          opts.onRate?.(menu.id, i);
          Array.from(rateWrap.children).forEach((c, idx) => c.classList.toggle("is-active", idx < i));
        });
        rateWrap.appendChild(star);
      }
      drawerFootEl.appendChild(rateWrap);
    } else {
      const hint = document.createElement("p");
      hint.className = "form-note";
      hint.style.margin = "0";
      hint.textContent = "สมัครสมาชิกเพื่อบันทึกเมนูโปรดและให้คะแนน สำหรับคำแนะนำที่แม่นยำขึ้นในครั้งถัดไป";
      drawerFootEl.appendChild(hint);
    }

    overlayEl.classList.add("is-open");
  }

  return { open, close };
})();

/**
 * แสดงข้อความ error แบบเต็มพื้นที่ เมื่อโหลดข้อมูลจาก Supabase ไม่สำเร็จ
 * (เช่น ยังไม่ได้รัน schema.sql/seed.sql หรือไม่ได้เชื่อมต่ออินเทอร์เน็ต)
 */
function renderFatalError(container, message) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="glyph">⚠️</div>
      <p class="mb-0" style="max-width:52ch; margin-inline:auto">${message}</p>
    </div>`;
}

/* ---------- Auth form helpers (ใช้ร่วมกันในหน้า login.html / register.html) ---------- */

/**
 * บังคับให้ช่อง input พิมพ์ได้เฉพาะอักขระภาษาอังกฤษ/ตัวเลข/สัญลักษณ์ (ASCII)
 * ตัดอักขระอื่น (เช่น ภาษาไทย, อิโมจิ) ออกทันทีที่พิมพ์หรือวาง
 */
function restrictToAscii(inputEl) {
  inputEl.addEventListener("input", () => {
    const cleaned = inputEl.value.replace(/[^\x00-\x7F]/g, "");
    if (cleaned !== inputEl.value) inputEl.value = cleaned;
  });
}

/** แปลงข้อความ error จาก Supabase Auth ให้เป็นภาษาไทยที่เข้าใจง่ายขึ้น */
function mapAuthErrorMessage(message = "") {
  const msg = message.toLowerCase();
  if (msg.includes("already registered") || msg.includes("already exists")) {
    return 'อีเมลนี้เคยสมัครสมาชิกไว้แล้ว <a href="login.html">ไปหน้าเข้าสู่ระบบ</a>';
  }
  if (msg.includes("invalid login credentials")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
  }
  if (msg.includes("email not confirmed")) {
    return "บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย หรือแจ้งผู้ดูแลระบบให้ปิดการยืนยันอีเมล";
  }
  if (msg.includes("password") && msg.includes("6")) {
    return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง";
  }
  return message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

/**
 * ผูก submit handler ของฟอร์ม auth (login/register) ให้ปิดปุ่มระหว่างส่งคำขอ
 * กันการกดซ้ำหลายครั้ง และแสดง error ด้วยข้อความที่แปลแล้ว
 */
function bindAuthForm({ form, submitBtn, errorEl, submittingText, onSubmit }) {
  const originalText = submitBtn.textContent;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.remove("is-visible");
    submitBtn.disabled = true;
    submitBtn.textContent = submittingText;
    try {
      await onSubmit();
    } catch (err) {
      errorEl.innerHTML = mapAuthErrorMessage(err.message);
      errorEl.classList.add("is-visible");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}
