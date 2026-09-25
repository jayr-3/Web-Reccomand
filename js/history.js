/**
 * history.js — ตรรกะเฉพาะหน้า history.html
 * แสดงเมนูโปรดและประวัติการให้คะแนนทั้งหมดของสมาชิก (3.2 ข้อ 7.2)
 */
(async function () {
  const user = await requireAuth();
  if (!user) return;

  const profile = await DB.getProfile(user.id);
  renderAppShell({ activePage: "history", user, profile });

  const listEl = document.getElementById("results-list");

  try {
    await DataStore.init();
  } catch (err) {
    renderFatalError(listEl, err.message || "โหลดข้อมูลเมนูไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    return;
  }

  let favorites = await DB.getFavorites(user.id);

  function toMatchShape(fav) {
    const menu = DataStore.getMenuById(fav.menu_id);
    if (!menu) return { menu: null };
    return {
      menu,
      matchedCount: menu.ingredients.length,
      totalCount: menu.ingredients.length,
      missing: [],
      pct: 100,
      ready: true,
      isFavorite: true,
      rating: fav.rating,
    };
  }

  async function toggleFavorite(menuId, isFav) {
    await DB.setFavorite(user.id, menuId, isFav);
    if (!isFav) {
      favorites = favorites.filter((f) => f.menu_id !== menuId);
      render();
      Toast.show("นำออกจากเมนูโปรดแล้ว", "success");
    }
  }

  async function rateMenuHandler(menuId, rating) {
    await DB.rateMenu(user.id, menuId, rating);
    const entry = favorites.find((f) => f.menu_id === menuId);
    if (entry) entry.rating = rating;
    Toast.show(`ให้คะแนน ${rating} ดาวแล้ว`, "success");
  }

  function render() {
    if (favorites.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="glyph">🤍</div>
          <p class="mb-0">ยังไม่มีเมนูโปรด ลองไปที่หน้า “ค้นหาเมนู” แล้วกดบันทึกเมนูที่ชอบดูสิ</p>
        </div>`;
      return;
    }
    listEl.innerHTML = "";
    favorites.forEach((fav) => {
      const match = toMatchShape(fav);
      if (!match.menu) return;
      const row = document.createElement("div");
      row.className = "result-row";
      row.style.gridTemplateColumns = "1fr auto";
      row.innerHTML = `
        <div>
          <div class="result-title">${match.menu.name}</div>
          <div class="result-tags">
            <span class="tag tag-fave">♥ เมนูโปรด</span>
            ${match.rating ? `<span class="tag">${"★".repeat(match.rating)}${"☆".repeat(5 - match.rating)}</span>` : '<span class="tag">ยังไม่ได้ให้คะแนน</span>'}
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

  render();
})();
