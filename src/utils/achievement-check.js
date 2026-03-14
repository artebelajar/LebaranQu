// ===================================================
// FILE: achievement-check.js - Logic Pengecekan Achievement
// ===================================================

import { db } from "../db/index.js";
import { achievements, userAchievements, posts, likes, comments } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

// ========== CEK ACHIEVEMENT POST ==========
export async function checkPostAchievements(userId, postCount) {
  try {
    console.log(`Checking post achievements for user ${userId}, postCount: ${postCount}`);
    
    // Ambil semua achievement kategori post
    const postAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.category, 'post'));

    for (const ach of postAchievements) {
      if (postCount >= ach.requirement) {
        await updateUserAchievement(userId, ach.id, postCount);
      }
    }
  } catch (error) {
    console.error("Error checking post achievements:", error);
  }
}

// ========== CEK ACHIEVEMENT LIKE ==========
export async function checkLikeAchievements(userId, likeCount) {
  try {
    console.log(`Checking like achievements for user ${userId}, likeCount: ${likeCount}`);
    
    const likeAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.category, 'like'));

    for (const ach of likeAchievements) {
      if (likeCount >= ach.requirement) {
        await updateUserAchievement(userId, ach.id, likeCount);
      }
    }
  } catch (error) {
    console.error("Error checking like achievements:", error);
  }
}

// ========== CEK ACHIEVEMENT COMMENT ==========
export async function checkCommentAchievements(userId, commentCount) {
  try {
    console.log(`Checking comment achievements for user ${userId}, commentCount: ${commentCount}`);
    
    const commentAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.category, 'comment'));

    for (const ach of commentAchievements) {
      if (commentCount >= ach.requirement) {
        await updateUserAchievement(userId, ach.id, commentCount);
      }
    }
  } catch (error) {
    console.error("Error checking comment achievements:", error);
  }
}

// ========== CEK SPECIAL ACHIEVEMENTS ==========
export async function checkSpecialAchievements(userId, userData) {
  try {
    console.log(`Checking special achievements for user ${userId}`);
    
    // Achievement "Anggota Baru" - otomatis dapat saat register
    const newMemberAch = await db
      .select()
      .from(achievements)
      .where(and(
        eq(achievements.category, 'special'),
        eq(achievements.name, 'Anggota Baru')
      ))
      .limit(1);
    
    if (newMemberAch.length > 0) {
      await updateUserAchievement(userId, newMemberAch[0].id, 1, true);
    }

    // Achievement "Alumni Pertama" - jika jadi alumni pertama
    if (userData?.isFirstInSchool) {
      const firstAlumniAch = await db
        .select()
        .from(achievements)
        .where(and(
          eq(achievements.category, 'special'),
          eq(achievements.name, 'Alumni Pertama')
        ))
        .limit(1);
      
      if (firstAlumniAch.length > 0) {
        await updateUserAchievement(userId, firstAlumniAch[0].id, 1, true);
      }
    }

  } catch (error) {
    console.error("Error checking special achievements:", error);
  }
}

// ========== UPDATE USER ACHIEVEMENT ==========
export async function updateUserAchievement(userId, achievementId, progress, forceComplete = false) {
  try {
    // Cek apakah user sudah punya achievement ini
    const [existing] = await db
      .select()
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      ))
      .limit(1);

    // Dapatkan requirement achievement
    const [ach] = await db
      .select({ requirement: achievements.requirement })
      .from(achievements)
      .where(eq(achievements.id, achievementId))
      .limit(1);

    const requirement = ach?.requirement || 0;
    const completed = forceComplete || progress >= requirement;

    if (existing) {
      // Update progress jika belum complete
      if (!existing.completed && progress > existing.progress) {
        await db
          .update(userAchievements)
          .set({ 
            progress: progress,
            completed: completed,
            completedAt: completed ? new Date() : null,
            updatedAt: new Date()
          })
          .where(eq(userAchievements.id, existing.id));
        
        if (completed && !existing.completed) {
          console.log(`🏆 User ${userId} got achievement ${achievementId}`);
          // Di sini bisa kirim notifikasi
        }
      }
    } else {
      // Insert baru
      await db
        .insert(userAchievements)
        .values({
          userId,
          achievementId,
          progress: progress,
          completed: completed,
          completedAt: completed ? new Date() : null
        });
      
      if (completed) {
        console.log(`🏆 User ${userId} got achievement ${achievementId}`);
        // Di sini bisa kirim notifikasi
      }
    }
  } catch (error) {
    console.error("Error updating user achievement:", error);
  }
}

// ========== GET ACHIEVEMENT REQUIREMENT ==========
async function getAchievementRequirement(achievementId) {
  const [ach] = await db
    .select({ requirement: achievements.requirement })
    .from(achievements)
    .where(eq(achievements.id, achievementId))
    .limit(1);
  
  return ach?.requirement || 0;
}

// ========== INIT DEFAULT ACHIEVEMENTS ==========
export async function initDefaultAchievements() {
  try {
    const defaultAchievements = [
      // Postingan achievements
      { name: 'Penulis Pemula', description: 'Membuat 1 postingan pertama', icon: 'fa-pen', category: 'post', requirement: 1, badge_color: 'emerald' },
      { name: 'Penulis Aktif', description: 'Membuat 10 postingan', icon: 'fa-pen-fancy', category: 'post', requirement: 10, badge_color: 'blue' },
      { name: 'Penulis Produktif', description: 'Membuat 25 postingan', icon: 'fa-feather', category: 'post', requirement: 25, badge_color: 'purple' },
      { name: 'Penulis Legenda', description: 'Membuat 50 postingan', icon: 'fa-crown', category: 'post', requirement: 50, badge_color: 'yellow' },
      
      // Like achievements
      { name: 'Disukai Pemula', description: 'Mendapatkan 10 like', icon: 'fa-heart', category: 'like', requirement: 10, badge_color: 'red' },
      { name: 'Disukai Aktif', description: 'Mendapatkan 50 like', icon: 'fa-heart', category: 'like', requirement: 50, badge_color: 'red' },
      { name: 'Disukai Populer', description: 'Mendapatkan 100 like', icon: 'fa-heart', category: 'like', requirement: 100, badge_color: 'red' },
      { name: 'Disukai Selebriti', description: 'Mendapatkan 250 like', icon: 'fa-star', category: 'like', requirement: 250, badge_color: 'yellow' },
      
      // Comment achievements
      { name: 'Komentator Pemula', description: 'Menulis 5 komentar', icon: 'fa-comment', category: 'comment', requirement: 5, badge_color: 'blue' },
      { name: 'Komentator Aktif', description: 'Menulis 25 komentar', icon: 'fa-comments', category: 'comment', requirement: 25, badge_color: 'green' },
      { name: 'Komentator Berbakat', description: 'Menulis 50 komentar', icon: 'fa-message', category: 'comment', requirement: 50, badge_color: 'purple' },
      
      // Special achievements
      { name: 'Anggota Baru', description: 'Bergabung dengan LebaranQu', icon: 'fa-user-plus', category: 'special', requirement: 1, badge_color: 'emerald' },
      { name: 'Alumni Pertama', description: 'Menjadi alumni pertama di sekolah', icon: 'fa-graduation-cap', category: 'special', requirement: 1, badge_color: 'blue' },
      { name: 'Top 10 Leaderboard', description: 'Masuk 10 besar leaderboard', icon: 'fa-trophy', category: 'special', requirement: 10, badge_color: 'yellow' },
      { name: 'Top 3 Leaderboard', description: 'Masuk 3 besar leaderboard', icon: 'fa-crown', category: 'special', requirement: 3, badge_color: 'purple' },
    ];

    for (const ach of defaultAchievements) {
      await db
        .insert(achievements)
        .values(ach)
        .onConflictDoNothing();
    }
    
    console.log("✅ Default achievements initialized");
  } catch (error) {
    console.error("Error initializing achievements:", error);
  }
}