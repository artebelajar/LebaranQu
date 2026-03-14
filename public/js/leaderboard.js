// ===================================================
// FILE: leaderboard.js - Fungsi Terkait Leaderboard
// ===================================================

// ========== LOAD LEADERBOARD ==========
async function loadLeaderboard() {
  try {
    let filter = "all";
    if (!isAdmin) filter = currentUser.asalSekolah;
    else filter = document.getElementById("leaderboardFilter")?.value || "all";

    const response = await fetch(
      `${API_BASE}/users/leaderboard?sekolah=${filter}`,
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const users = await response.json();
    const leaderboardList = document.getElementById("leaderboardList");

    if (!users || users.length === 0) {
      leaderboardList.innerHTML =
        '<p class="text-gray-500 text-center py-4 col-span-5">Belum ada data</p>';
    } else {
      leaderboardList.innerHTML = users
        .slice(0, 10)
        .map((user, index) => {
          let medalIcon = "",
            medalColor = "";
          if (index === 0) {
            medalIcon = "🥇";
            medalColor = "bg-yellow-100 border-yellow-500";
          } else if (index === 1) {
            medalIcon = "🥈";
            medalColor = "bg-gray-100 border-gray-400";
          } else if (index === 2) {
            medalIcon = "🥉";
            medalColor = "bg-amber-100 border-amber-600";
          } else medalColor = "bg-gray-50 border-gray-200";
          return `
          <div class="leaderboard-item flex flex-col items-center p-3 ${medalColor} rounded-lg border-2 text-center">
            <div class="text-2xl mb-1">${medalIcon || "#" + (index + 1)}</div>
            <img src="${user.fotoProfil || "/images/default-avatar.png"}" 
                 class="w-12 h-12 rounded-full object-cover border-2 ${index === 0 ? "border-yellow-500" : index === 1 ? "border-gray-400" : index === 2 ? "border-amber-600" : "border-gray-200"}"
                 onerror="this.src='/images/default-avatar.png'">
            <p class="font-medium text-sm mt-2 truncate max-w-full">${user.namaLengkap || "Unknown"}</p>
            <p class="text-xs text-gray-500">${user.title || "Alumni"}</p>
            <p class="font-bold text-sm mt-1 ${index < 3 ? "text-emerald-600" : "text-gray-600"}">
              ${user.totalLikes || 0} <span class="text-[10px]">likes</span>
            </p>
          </div>
        `;
        })
        .join("");
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    document.getElementById("leaderboardList").innerHTML =
      '<p class="text-red-500 text-center py-4 col-span-5">Gagal memuat leaderboard</p>';
  }
}