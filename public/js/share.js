// ===================================================
// FILE: share.js - Fungsi Share ke Media Sosial
// ===================================================

// ========== SHARE TO WHATSAPP ==========
function shareToWhatsApp(post) {
  try {
    const postData = typeof post === "string" ? JSON.parse(post) : post;
    const text = `${postData.judul}\n\n${postData.konten.substring(0, 100)}...\n\nDibaca selengkapnya di LebaranQu`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(window.location.origin + "/?post=" + postData.id)}`;
    window.open(url, "_blank");
  } catch (error) {
    console.error("WhatsApp share error:", error);
    if (typeof showToast === "function")
      showToast("Gagal membagikan ke WhatsApp", "error");
  }
}

// ========== SHARE TO FACEBOOK ==========
function shareToFacebook(post) {
  try {
    const postData = typeof post === "string" ? JSON.parse(post) : post;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + "/?post=" + postData.id)}&quote=${encodeURIComponent(postData.judul)}`;
    window.open(url, "_blank");
  } catch (error) {
    console.error("Facebook share error:", error);
    if (typeof showToast === "function")
      showToast("Gagal membagikan ke Facebook", "error");
  }
}

// ========== SHARE TO TWITTER ==========
function shareToTwitter(post) {
  try {
    const postData = typeof post === "string" ? JSON.parse(post) : post;
    const text = `${postData.judul}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin + "/?post=" + postData.id)}`;
    window.open(url, "_blank");
  } catch (error) {
    console.error("Twitter share error:", error);
    if (typeof showToast === "function")
      showToast("Gagal membagikan ke Twitter", "error");
  }
}

// ========== SHARE TO INSTAGRAM ==========
function shareToInstagram(post) {
  try {
    const postData = typeof post === "string" ? JSON.parse(post) : post;
    const text = `${postData.judul}\n\n${window.location.origin}/?post=${postData.id}`;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        if (typeof showToast === "function")
          showToast(
            "Link berhasil disalin! Silakan paste di Instagram",
            "success",
          );
      })
      .catch(() => {
        if (typeof showToast === "function")
          showToast("Gagal menyalin link", "error");
      });
  } catch (error) {
    console.error("Instagram share error:", error);
    if (typeof showToast === "function")
      showToast("Gagal memproses link Instagram", "error");
  }
}