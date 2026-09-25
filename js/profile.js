/**
 * profile.js — ตรรกะเฉพาะหน้า profile.html
 */
(async function () {
  const user = await requireAuth();
  if (!user) return;

  const profile = await DB.getProfile(user.id);
  renderAppShell({ activePage: "profile", user, profile });

  try {
    await DataStore.init();
  } catch (err) {
    Toast.show(err.message || "โหลดตัวเลือกอาการแพ้ไม่สำเร็จ", "danger", 5000);
  }

  const conditionPicker = createConditionPicker(document.getElementById("condition-grid"));

  document.getElementById("name").value = profile?.name || "";
  document.getElementById("age").value = profile?.age ?? "";
  document.getElementById("weight").value = profile?.weight_kg ?? "";
  document.getElementById("height").value = profile?.height_cm ?? "";
  conditionPicker.setSelected(profile?.health_conditions || []);

  const form = document.getElementById("profile-form");
  const errorEl = document.getElementById("form-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.remove("is-visible");
    try {
      await DB.updateProfile(user.id, {
        name: document.getElementById("name").value.trim(),
        age: Number(document.getElementById("age").value) || null,
        weight_kg: Number(document.getElementById("weight").value) || null,
        height_cm: Number(document.getElementById("height").value) || null,
        health_conditions: conditionPicker.getSelected(),
      });
      Toast.show("บันทึกโปรไฟล์แล้ว", "success");
    } catch (err) {
      errorEl.textContent = err.message || "บันทึกไม่สำเร็จ";
      errorEl.classList.add("is-visible");
    }
  });
})();
