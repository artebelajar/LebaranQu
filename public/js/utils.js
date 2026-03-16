// ===================================================
// FILE: utils.js - Fungsi Helper
// ===================================================

// ========== FORMAT TANGGAL ==========
function formatDate(date) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(date) {
  return new Date(date).toLocaleDateString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

function getTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  return `${diffDays} hari lalu`;
}

// ========== SEKOLAH ==========
function getSchoolColor(sekolah) {
  return SCHOOL_COLORS[sekolah] || "bg-gray-100 text-gray-800";
}

function getSchoolName(sekolah) {
  return SCHOOL_NAMES[sekolah] || sekolah;
}

// ========== ESCAPE HTML ==========
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ========== TOAST NOTIFICATION ==========
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed bottom-4 right-4 bg-white border-l-4 shadow-lg rounded-lg p-4 max-w-sm z-50 hidden';
    toast.innerHTML = `
      <div class="flex items-center">
        <div id="toastIcon" class="mr-3"></div>
        <p id="toastMessage" class="text-sm"></p>
      </div>
    `;
    document.body.appendChild(toast);
  }
  
  const toastMessage = document.getElementById('toastMessage') || toast.querySelector('#toastMessage');
  const toastIcon = document.getElementById('toastIcon') || toast.querySelector('#toastIcon');
  
  toastMessage.textContent = message;
  
  toast.classList.remove('border-red-500', 'border-emerald-500', 'border-blue-500');
  
  if (type === 'success') {
    toast.classList.add('border-emerald-500');
    toastIcon.innerHTML = '<i class="fas fa-check-circle text-emerald-500 text-xl"></i>';
  } else if (type === 'info') {
    toast.classList.add('border-blue-500');
    toastIcon.innerHTML = '<i class="fas fa-info-circle text-blue-500 text-xl"></i>';
  } else {
    toast.classList.add('border-red-500');
    toastIcon.innerHTML = '<i class="fas fa-exclamation-circle text-red-500 text-xl"></i>';
  }
  
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ========== DEBOUNCE ==========
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========== LAZY LOAD IMAGES ==========
function initLazyLoading() {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

// ========== COMPRESS IMAGE SEBELUM UPLOAD ==========
async function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', quality);
      };
    };
  });
}