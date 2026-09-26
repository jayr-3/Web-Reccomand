/**
 * profile.js — ตรรกะเฉพาะหน้า profile.html
 */

// ส่วนที่ 1: การจัดการโหลดโปรไฟล์และการเปิด Modal
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

  // เซ็ตข้อมูลลงฟอร์ม
  document.getElementById("name").value = profile?.name || "";
  document.getElementById("age").value = profile?.age ?? "";
  document.getElementById("weight").value = profile?.weight_kg ?? "";
  document.getElementById("height").value = profile?.height_cm ?? "";
  conditionPicker.setSelected(profile?.health_conditions || []);

  // การจัดการเปิด/ปิด Modal แก้ไขโปรไฟล์
  const profileModal = document.getElementById("profile-modal");
  const btnEditProfile = document.getElementById("btn-edit-profile");
  const closeProfileModal = document.getElementById("close-profile-modal");

  btnEditProfile.addEventListener("click", () => profileModal.classList.add("is-open"));
  closeProfileModal.addEventListener("click", () => profileModal.classList.remove("is-open"));
  profileModal.addEventListener("click", (e) => {
    if (e.target === profileModal) profileModal.classList.remove("is-open");
  });

  // การจัดการรูปโปรไฟล์ (พรีวิว)
  const avatarInput = document.getElementById("avatar-upload");
  const avatarPreviewImg = document.getElementById("avatar-preview-img");
  const avatarPreviewText = document.getElementById("avatar-preview-text");
  let base64Avatar = localStorage.getItem(`avatar_${user.id}`) || null;

  // โชว์รูปเก่าในฟอร์มแก้ไข (ถ้ามี)
  if (base64Avatar) {
    avatarPreviewImg.src = base64Avatar;
    avatarPreviewImg.style.display = "block";
    avatarPreviewText.style.display = "none";
  }

  // พรีวิวรูปเมื่อผู้ใช้เลือกไฟล์ใหม่
  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        base64Avatar = event.target.result;
        avatarPreviewImg.src = base64Avatar;
        avatarPreviewImg.style.display = "block";
        avatarPreviewText.style.display = "none";
      };
      reader.readAsDataURL(file);
    }
  });

  // การบันทึกข้อมูลฟอร์ม
  const form = document.getElementById("profile-form");
  const errorEl = document.getElementById("form-error");
  const btnSave = document.getElementById("btn-save-profile");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.remove("is-visible");
    btnSave.disabled = true;
    btnSave.textContent = "กำลังบันทึก...";

    try {
      // 1. บันทึกข้อมูลสุขภาพลง Supabase
      await DB.updateProfile(user.id, {
        name: document.getElementById("name").value.trim(),
        age: Number(document.getElementById("age").value) || null,
        weight_kg: Number(document.getElementById("weight").value) || null,
        height_cm: Number(document.getElementById("height").value) || null,
        health_conditions: conditionPicker.getSelected(),
      });

      // 2. บันทึกรูปลงอุปกรณ์
      if (base64Avatar) {
        localStorage.setItem(`avatar_${user.id}`, base64Avatar);
      }

      Toast.show("บันทึกโปรไฟล์แล้ว", "success");
      profileModal.classList.remove("is-open");
      setTimeout(() => location.reload(), 800); // รีเฟรชหน้าจอเพื่ออัปเดตข้อมูลใหม่
    } catch (err) {
      errorEl.textContent = err.message || "บันทึกไม่สำเร็จ";
      errorEl.classList.add("is-visible");
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = "บันทึกการเปลี่ยนแปลง";
    }
  });
})();

// ส่วนที่ 2: ดึงข้อมูลสรุปบนหน้าแดชบอร์ด
async function initProfileDashboard() {
  try {
    const user = await DB.getCurrentUser();
    if (!user) return;

    const profile = await DB.getProfile(user.id);
    const displayName = profile?.name || user.email.split('@')[0];
    
    // อัปเดตส่วนหัว
    document.getElementById('dash-name').textContent = displayName;
    
    // อัปเดตรูปโปรไฟล์ทุกจุดในหน้า (ทั้งแดชบอร์ดหลักและเมนูแถบซ้าย)
    const savedAvatar = localStorage.getItem(`avatar_${user.id}`);
    const avatarElements = document.querySelectorAll('.avatar'); // เลือกทุกจุดที่เป็นคลาส avatar
    
    document.querySelectorAll('.avatar').forEach(el => {
      // ลบพื้นหลังและบังคับไม่ให้รูปทะลุกรอบ
      el.style.background = "transparent";
      el.style.overflow = "hidden";
      el.style.padding = "0"; 
      
      // แทรกรูปและบังคับสัดส่วนภาพเป็น 1:1 (aspect-ratio) เพื่อให้กลมพอดีเสมอ
      el.innerHTML = `<img src="${savedAvatar}" style="width: 100%; height: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 50%; display: block;" />`;
    });

    // จัดการเรื่องอาการแพ้
    await DataStore.init(); 
    const allergens = DataStore.getAllergens();
    const userConditions = profile?.health_conditions || [];
    const statAllergiesList = document.getElementById('stat-allergies-list');

    if (userConditions.length > 0) {
      const allergyDetails = userConditions.map(id => {
        const found = allergens.find(a => a.id === id);
        return found ? `${found.icon} ${found.label}` : id;
      });
      statAllergiesList.innerHTML = allergyDetails.join('<br>');
      statAllergiesList.style.color = '#333';
    } else {
      statAllergiesList.textContent = "ไม่มีข้อจำกัด";
      statAllergiesList.style.color = '#999';
    }

    // ดึงจำนวนเมนูโปรด
    const favorites = await DB.getFavorites(user.id);
    document.getElementById('stat-fav-count').textContent = favorites ? favorites.length : 0;

    // นับและแสดงคะแนน
    const ratedItems = favorites.filter(f => f.rating && f.rating > 0);
    document.getElementById('stat-rating-count').textContent = ratedItems.length;

    const modal = document.getElementById('ratings-modal');
    const modalBody = document.getElementById('ratings-modal-body');
    const closeBtn = document.getElementById('close-ratings-modal');

    document.getElementById('btn-show-ratings').addEventListener('click', () => {
      if (ratedItems.length === 0) {
        modalBody.innerHTML = `<div style="text-align:center; padding: 40px 0; color:#999;">คุณยังไม่เคยให้คะแนนเมนูใดๆ</div>`;
      } else {
        modalBody.innerHTML = ratedItems.map(item => {
          const menu = DataStore.getMenuById(item.menu_id);
          if (!menu) return '';
          
          const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
          const defaultImg = "https://placehold.co/100x100?text=No+Image";
          const img = menu.image_url || defaultImg;
          
          return `
            <div style="display: flex; gap: 16px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #eee;">
              <img src="${img}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" alt="${menu.name}">
              <div>
                <h4 style="margin: 0 0 4px 0;">${menu.name}</h4>
                <div style="color: #FF5A1F; letter-spacing: 2px; font-size: 1.2rem;">${stars}</div>
                <div style="font-size: 0.8rem; color: #999; margin-top: 4px;">ให้คะแนนเมื่อ: ${new Date(item.created_at).toLocaleDateString('th-TH')}</div>
              </div>
            </div>
          `;
        }).join('');
      }
      modal.classList.add('is-open');
    });

    if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));
    if(modal) modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('is-open');
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    initProfileDashboard();
  }, 800);
});