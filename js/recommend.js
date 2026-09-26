/**
 * recommend.js — ตรรกะเฉพาะหน้า recommend.html (สมาชิก)
 * ต่างจากโหมด Guest ตรงที่: ดึงข้อจำกัดสุขภาพจากโปรไฟล์อัตโนมัติ (3.2 ข้อ 2.2)
 * และบวกคะแนน personalization จากประวัติเมนูที่เคยถูกใจ/ให้คะแนน (3.2 ข้อ 5.2)
 */
(async function () {
  const user = await requireAuth();
  if (!user) return;

  // โหลดโปรไฟล์ก่อนเพื่อวาด sidebar ให้เห็นทันที แม้ภายหลังจะโหลดเมนู/วัตถุดิบไม่สำเร็จ
  // ผู้ใช้จะได้ยังกดเปลี่ยนหน้าอื่นจาก sidebar ได้ ไม่ใช่หน้าที่พังจนออกไปไหนไม่ได้
  const profile = await DB.getProfile(user.id);
  renderAppShell({ activePage: "recommend", user, profile });

  try {
    await DataStore.init();
  } catch (err) {
    renderFatalError(document.getElementById("results-list"), err.message || "โหลดข้อมูลเมนู/วัตถุดิบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    document.getElementById("btn-recommend").disabled = true;
    return;
  }

  const favorites = await DB.getFavorites(user.id);
  const favoriteMenuIds = new Set(favorites.map((f) => f.menu_id));

  // สร้างความถี่วัตถุดิบจากเมนูที่เคยถูกใจ/ให้คะแนนดี เพื่อใช้ personalize ผลลัพธ์
  function buildLikedIngredientFreq() {
    const freq = {};
    favorites.forEach((f) => {
      const menu = DataStore.getMenuById(f.menu_id);
      if (!menu) return;
      const weight = f.rating ? f.rating : 3; // บันทึกไว้เฉยๆ แต่ยังไม่ให้คะแนน ถือเป็นน้ำหนักกลาง
      menu.ingredients.forEach((ing) => {
        const key = ing.name.toLowerCase().replace(/\s+/g, "");
        freq[key] = (freq[key] || 0) + weight;
      });
    });
    return freq;
  }
  const likedIngredientFreq = buildLikedIngredientFreq();

  const ingredientPicker = createIngredientPicker({
    inputEl: document.getElementById("ingredient-input"),
    resultsEl: document.getElementById("ingredient-results"),
    chipListEl: document.getElementById("ingredient-chips"),
  });

  const conditionPicker = createConditionPicker(document.getElementById("condition-grid"));
  conditionPicker.setSelected(profile?.health_conditions || []);

  const summaryEl = document.getElementById("results-summary");
  const listEl = document.getElementById("results-list");

  function renderEmpty(message, glyph = "🍽️") {
    listEl.innerHTML = `<div class="empty-state"><div class="glyph">${glyph}</div><p class="mb-0">${message}</p></div>`;
  }

  async function toggleFavorite(menuId, isFav) {
    await DB.setFavorite(user.id, menuId, isFav);
    if (isFav) favoriteMenuIds.add(menuId);
    else favoriteMenuIds.delete(menuId);
    Toast.show(isFav ? "บันทึกเป็นเมนูโปรดแล้ว" : "นำออกจากเมนูโปรดแล้ว", "success");
  }

  async function rateMenuHandler(menuId, rating) {
    await DB.rateMenu(user.id, menuId, rating);
    Toast.show(`ให้คะแนน ${rating} ดาวแล้ว ระบบจะใช้ปรับคำแนะนำครั้งถัดไป`, "success");
  }

  function renderResults({ results, excludedCount }) {
    if (results.length === 0) {
      summaryEl.textContent = "";
      renderEmpty("ไม่พบเมนูที่ปลอดภัยตามเงื่อนไขที่เลือก ลองปรับอาการแพ้หรือวัตถุดิบดูใหม่", "🚫");
      return;
    }
    summaryEl.textContent =
      excludedCount > 0
        ? `พบ ${results.length} เมนูที่ปลอดภัยสำหรับคุณ (คัดออกไปแล้ว ${excludedCount} เมนู) · เรียงตามความเหมาะสมกับคุณ`
        : `พบ ${results.length} เมนูที่ตรงกับวัตถุดิบของคุณ · เรียงตามความเหมาะสมกับคุณ`;

    listEl.innerHTML = "";
    const defaultImage = "https://placehold.co/150x150?text=No+Image";

    results.forEach((match) => {
      const imageUrl = match.menu.image_url && match.menu.image_url.trim() !== "" ? match.menu.image_url : defaultImage;
      const row = document.createElement("div");
      row.className = "result-row";
      // ปรับ Grid ให้รองรับรูปภาพด้านหน้า (รูปภาพ | วงแหวนเปอร์เซ็นต์ | ข้อความ | ลูกศร)
      row.style.gridTemplateColumns = "60px auto 1fr auto";
      row.style.gap = "12px";
      row.style.alignItems = "center";
      
      row.innerHTML = `
        <img src="${imageUrl}" alt="${match.menu.name}" onerror="this.src='${defaultImage}'" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />
        <div class="match-ring" style="--pct:${match.pct}" data-pct="${match.pct}"></div>
        <div>
          <div class="result-title">${match.menu.name}</div>
          <div class="result-tags">
            ${match.ready ? '<span class="tag tag-ready">ทำได้ทันที</span>' : `<span class="tag tag-missing">ขาด ${match.totalCount - match.matchedCount} อย่าง</span>`}
            ${match.isFavorite ? '<span class="tag tag-fave">♥ เมนูโปรด</span>' : ""}
            <span class="tag">${match.totalCount} ส่วนผสม</span>
          </div>
        </div>
        <div class="result-action">›</div>
      `;
      row.addEventListener("click", () =>
        MenuDrawer.open(match, {
          showMemberActions: true,
          onToggleFavorite: toggleFavorite,
          onRate: rateMenuHandler,
        })
      );
      listEl.appendChild(row);
    });
  }

  function runRecommendation() {
    const available = ingredientPicker.getSelected();
    const allergenIds = conditionPicker.getSelected();
    const result = RecommendEngine.recommend(DataStore.getMenus(), {
      availableIngredients: available,
      allergenIds,
      likedIngredientFreq,
      favoriteMenuIds,
    });
    renderResults(result);
  }

  document.getElementById("btn-recommend").addEventListener("click", runRecommendation);

  renderEmpty("เลือกวัตถุดิบที่มี แล้วกด “แนะนำเมนูให้หน่อย” เพื่อเริ่มค้นหา", "👋");
})();