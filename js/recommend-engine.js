/**
 * recommend-engine.js
 * ---------------------------------------------------------------
 * แกนหลักของ "ระบบแนะนำเมนูอาหาร" ตามกรอบแนวคิดในโครงร่างปัญหาพิเศษ
 * ทำงาน 2 ขั้นตอนตามลำดับ:
 *
 *  1) Health Condition Filter
 *     ตัดเมนูที่มีวัตถุดิบตรงกับอาการแพ้ / โรคประจำตัวที่ผู้ใช้เลือกออก
 *
 *  2) Content-Based Recommendation
 *     ให้คะแนนเมนูที่เหลือ จากสัดส่วนวัตถุดิบที่ผู้ใช้ "มีอยู่จริง"
 *     เทียบกับวัตถุดิบทั้งหมดของเมนูนั้น (ยิ่งมีครบยิ่งคะแนนสูง)
 *     ถ้าเป็นสมาชิก จะบวกคะแนนเพิ่มจากพฤติกรรมในอดีต (เมนู/วัตถุดิบที่เคยถูกใจ)
 * ---------------------------------------------------------------
 */

const RecommendEngine = (() => {
  function normalize(str) {
    return str.toLowerCase().replace(/\s+/g, "");
  }

  /** true ถ้าวัตถุดิบของผู้ใช้ "ครอบคลุม" ชื่อวัตถุดิบในเมนู (ใช้การเทียบแบบ substring ทั้งสองทาง) */
  function ingredientMatches(userIngredient, menuIngredientName) {
    const u = normalize(userIngredient);
    const m = normalize(menuIngredientName);
    if (!u || !m) return false;
    return m.includes(u) || u.includes(m);
  }

  /** ขั้นตอนที่ 1: Health Condition Filter */
  function filterByHealthConditions(menus, selectedAllergenIds) {
    if (!selectedAllergenIds || selectedAllergenIds.length === 0) return menus.slice();
    return menus.filter((menu) => !menu.allergenTags.some((tag) => selectedAllergenIds.includes(tag)));
  }

  /**
   * ขั้นตอนที่ 2: ให้คะแนนความเข้ากันได้ของวัตถุดิบ + personalization (ถ้ามี)
   * @param {Array} menus เมนูที่ผ่านการคัดกรองสุขภาพแล้ว
   * @param {Array<string>} availableIngredients วัตถุดิบที่ผู้ใช้มี
   * @param {Object} [options]
   * @param {Object<string, number>} [options.likedIngredientFreq] ความถี่วัตถุดิบในเมนูที่สมาชิกเคยถูกใจ/ให้คะแนนดี
   * @param {Set<number>} [options.likedMenuIds] เมนูที่เคยถูกใจมาก่อน (กันไม่ให้คะแนน personalization เพี้ยนกับเมนูเดิม)
   */
  function scoreMenus(menus, availableIngredients, options = {}) {
    const { likedIngredientFreq = {}, favoriteMenuIds = new Set() } = options;
    const maxFreq = Math.max(1, ...Object.values(likedIngredientFreq));

    return menus
      .map((menu) => {
        const total = menu.ingredients.length;
        const matched = [];
        const missing = [];

        menu.ingredients.forEach((ing) => {
          const hit = availableIngredients.some((userIng) => ingredientMatches(userIng, ing.name));
          if (hit) matched.push(ing);
          else missing.push(ing);
        });

        const baseScore = total > 0 ? matched.length / total : 0;

        // personalization: เฉลี่ยความถี่ของวัตถุดิบเมนูนี้ในประวัติที่เคยถูกใจ (0..1)
        const personalScores = menu.ingredients.map(
          (ing) => (likedIngredientFreq[normalize(ing.name)] || 0) / maxFreq
        );
        const personalBoost =
          personalScores.length > 0 ? personalScores.reduce((a, b) => a + b, 0) / personalScores.length : 0;

        const hasPersonalization = Object.keys(likedIngredientFreq).length > 0;
        const finalScore = hasPersonalization ? baseScore * 0.75 + personalBoost * 0.25 : baseScore;

        return {
          menu,
          matchedCount: matched.length,
          totalCount: total,
          missing,
          pct: Math.round(finalScore * 100),
          ready: matched.length === total,
          isFavorite: favoriteMenuIds.has(menu.id),
        };
      })
      .sort((a, b) => b.pct - a.pct || b.matchedCount - a.matchedCount);
  }

  /** จุดเรียกใช้งานหลัก: กรองสุขภาพก่อน แล้วค่อยให้คะแนน */
  function recommend(menus, { availableIngredients = [], allergenIds = [], ...scoreOptions } = {}) {
    const safe = filterByHealthConditions(menus, allergenIds);
    const excluded = menus.length - safe.length;
    return {
      results: scoreMenus(safe, availableIngredients, scoreOptions),
      excludedCount: excluded,
    };
  }

  return { filterByHealthConditions, scoreMenus, recommend, ingredientMatches };
})();
