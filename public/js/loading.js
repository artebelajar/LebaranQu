// ===================================================
// FILE: public/js/loading.js
// ===================================================

// Class untuk mengelola state loading tombol
class ButtonLoader {
  constructor(button) {
    this.button = button;
    this.originalText = button.innerHTML;
    this.originalDisabled = button.disabled;
  }

  // Mulai loading
  start(loadingText = 'Memproses...') {
    this.button.disabled = true;
    this.button.classList.add('opacity-75', 'cursor-not-allowed');
    this.button.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      ${loadingText}
    `;
  }

  // Selesai loading (kembali ke normal)
  stop() {
    this.button.disabled = false;
    this.button.classList.remove('opacity-75', 'cursor-not-allowed');
    this.button.innerHTML = this.originalText;
  }

  // Error state
  error(errorMessage = 'Gagal, coba lagi') {
    this.button.disabled = false;
    this.button.classList.remove('opacity-75', 'cursor-not-allowed');
    this.button.classList.add('bg-red-600', 'hover:bg-red-700');
    this.button.innerHTML = errorMessage;
    
    // Kembalikan ke normal setelah 2 detik
    setTimeout(() => {
      this.button.classList.remove('bg-red-600', 'hover:bg-red-700');
      this.button.innerHTML = this.originalText;
    }, 2000);
  }

  // Success state
  success(successMessage = 'Berhasil!') {
    this.button.disabled = false;
    this.button.classList.remove('opacity-75', 'cursor-not-allowed');
    this.button.classList.add('bg-green-600', 'hover:bg-green-700');
    this.button.innerHTML = successMessage;
    
    // Kembalikan ke normal setelah 1.5 detik
    setTimeout(() => {
      this.button.classList.remove('bg-green-600', 'hover:bg-green-700');
      this.button.innerHTML = this.originalText;
    }, 1500);
  }
}

// Global loading state untuk mencegah multiple submit
const loadingStates = {
  createPost: false,
  addComment: false,
  likePost: false,
  // Tambahkan sesuai kebutuhan
};

// Export ke window
window.ButtonLoader = ButtonLoader;
window.loadingStates = loadingStates;