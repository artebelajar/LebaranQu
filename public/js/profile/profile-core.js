// ===================================================
// FILE: profile/profile-core.js - Fungsi Utama Profile
// ===================================================

// ========== LOAD PROFILE DATA ==========
async function loadProfile() {
  try {
    document.getElementById("loadingState").classList.remove("hidden");
    document.getElementById("profileContent").classList.add("hidden");
    document.getElementById("errorState").classList.add("hidden");

    const userIdToLoad = getProfileId();

    console.log("Loading profile for user ID:", userIdToLoad);

    if (!userIdToLoad || isNaN(userIdToLoad)) {
      throw new Error("ID user tidak valid");
    }

    const userRes = await fetch(`${API_BASE}/users/${userIdToLoad}`);
    if (!userRes.ok) {
      if (userRes.status === 404) {
        throw new Error("User tidak ditemukan");
      }
      throw new Error(`HTTP error ${userRes.status}`);
    }

    profileUser = await userRes.json();
    console.log("User data:", profileUser);

    // Update UI dasar
    updateProfileUI();

    // Setup UI berdasarkan kepemilikan
    setupProfileUI();

    // Load user posts
    await loadUserPosts(userIdToLoad);

    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("profileContent").classList.remove("hidden");
  } catch (error) {
    console.error("Error loading profile:", error);
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
    document.getElementById("errorMessage").textContent = error.message;
  }
}

// ========== UPDATE PROFILE UI ==========
function updateProfileUI() {
  document.getElementById("profileNama").textContent =
    profileUser.namaLengkap || "-";
  document.getElementById("profileTitleText").textContent =
    profileUser.title || "Alumni";
  document.getElementById("profileTitleDisplay").textContent =
    profileUser.title || "Alumni";
  document.getElementById("profileSekolah").textContent = getSchoolName(
    profileUser.asalSekolah,
  );
  document.getElementById("profileEmail").textContent =
    profileUser.email || "-";
  document.getElementById("profileTelepon").textContent =
    profileUser.nomorTelepon || "-";
  document.getElementById("profileBio").textContent =
    profileUser.bioSingkat || "Belum ada bio";

  // Token hanya ditampilkan di profile sendiri
  const tokenContainer = document.getElementById("tokenContainer");
  if (isOwnProfile) {
    document.getElementById("profileToken").textContent =
      profileUser.tokenAkses
        ? profileUser.tokenAkses.substring(0, 20) + "..."
        : "-";
    tokenContainer.classList.remove("hidden");
  } else {
    tokenContainer.classList.add("hidden");
  }

  if (profileUser.fotoProfil) {
    document.getElementById("profileFoto").src = profileUser.fotoProfil;
  }

  const roleBadge = document.getElementById("profileRole");
  if (profileUser.role === "admin") {
    roleBadge.textContent = "Administrator";
    roleBadge.className =
      "px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold";
  } else {
    roleBadge.textContent = "Alumni";
    roleBadge.className =
      "px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold";
  }
  
  // Update userName di navbar
  document.getElementById("userNameDisplay").textContent = currentUser.namaLengkap;
}

// ========== SETUP UI BERDASARKAN KEPEMILIKAN ==========
function setupProfileUI() {
  // Tampilkan/sembunyikan badge view only
  const viewOnlyBadge = document.getElementById("viewOnlyBadge");
  if (!isOwnProfile) {
    viewOnlyBadge.classList.remove("hidden");
  } else {
    viewOnlyBadge.classList.add("hidden");
  }

  // Tampilkan/sembunyikan overlay upload foto
  const uploadOverlay = document.getElementById("uploadOverlay");
  if (isOwnProfile) {
    uploadOverlay.classList.remove("hidden");
  } else {
    uploadOverlay.classList.add("hidden");
  }

  // Tampilkan/sembunyikan tombol edit bio
  const editBioBtn = document.getElementById("editBioBtn");
  if (isOwnProfile) {
    editBioBtn.classList.remove("hidden");
  } else {
    editBioBtn.classList.add("hidden");
  }

  // Tampilkan/sembunyikan tombol edit info
  const editInfoBtn = document.getElementById("editInfoBtn");
  if (isOwnProfile) {
    editInfoBtn.classList.remove("hidden");
  } else {
    editInfoBtn.classList.add("hidden");
  }
}

// ========== HITUNG PERINGKAT ==========
async function calculateUserRank(sekolah, userId, userTotalLikes) {
  try {
    const response = await fetch(
      `${API_BASE}/users/leaderboard?sekolah=${sekolah}`,
    );
    if (!response.ok) throw new Error("Gagal memuat data peringkat");

    const leaderboard = await response.json();

    const userIndex = leaderboard.findIndex(
      (user) => user.id === parseInt(userId),
    );

    let rankText = "-";
    let rankColor = "text-gray-800";

    if (userIndex !== -1) {
      const rank = userIndex + 1;
      rankText = `#${rank}`;

      if (rank === 1) {
        rankColor = "text-yellow-500";
      } else if (rank === 2) {
        rankColor = "text-gray-400";
      } else if (rank === 3) {
        rankColor = "text-amber-600";
      }

      const totalUsers = leaderboard.length;
      rankText += ` dari ${totalUsers} alumni`;
    }

    document.getElementById("userRank").textContent = rankText;
    document.getElementById("userRank").className =
      `text-2xl font-bold ${rankColor}`;
  } catch (error) {
    console.error("Error calculating rank:", error);
    document.getElementById("userRank").textContent = "-";
  }
}

// ========== REFRESH RANK ==========
async function refreshRank() {
  if (!profileUser) return;

  const postsRes = await fetch(
    `${API_BASE}/posts/user/${profileUser.id}`,
  );
  const posts = await postsRes.json();
  const totalLikes = posts.reduce(
    (sum, post) => sum + (post.likeCount || 0),
    0,
  );

  await calculateUserRank(
    profileUser.asalSekolah,
    profileUser.id,
    totalLikes,
  );
}

// ========== SCROLL TO TOP ==========
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Export ke window
window.loadProfile = loadProfile;
window.refreshRank = refreshRank;
window.scrollToTop = scrollToTop;