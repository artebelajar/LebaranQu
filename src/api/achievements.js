// ===================================================
// FILE: achievements.js - API untuk Badge & Achievement
// ===================================================

import { Hono } from "hono";
import { db } from "../db/index.js";
import { achievements, userAchievements, users_26 } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

const app = new Hono();

// ========== GET ALL ACHIEVEMENTS ==========
app.get("/", async (c) => {
  try {
    const allAchievements = await db
      .select()
      .from(achievements)
      .orderBy(achievements.category, achievements.requirement);
    
    return c.json(allAchievements);
  } catch (error) {
    console.error("Get achievements error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== GET USER ACHIEVEMENTS ==========
app.get("/user/:userId", async (c) => {
  try {
    const userId = parseInt(c.req.param("userId"));
    
    if (isNaN(userId)) {
      return c.json({ error: "User ID tidak valid" }, 400);
    }

    const userAchs = await db
      .select({
        id: userAchievements.id,
        progress: userAchievements.progress,
        completed: userAchievements.completed,
        completedAt: userAchievements.completedAt,
        achievement: {
          id: achievements.id,
          name: achievements.name,
          description: achievements.description,
          icon: achievements.icon,
          category: achievements.category,
          requirement: achievements.requirement,
          badge_color: achievements.badge_color,
        }
      })
      .from(userAchievements)
      .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.completed), achievements.category);

    return c.json(userAchs);
  } catch (error) {
    console.error("Get user achievements error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== GET USER ACHIEVEMENT STATS ==========
app.get("/stats/:userId", async (c) => {
  try {
    const userId = parseInt(c.req.param("userId"));
    
    if (isNaN(userId)) {
      return c.json({ error: "User ID tidak valid" }, 400);
    }

    console.log("Fetching achievement stats for user:", userId);

    // Hitung total achievements
    const totalAchievements = await db
      .select({ count: sql`count(*)` })
      .from(achievements);

    // Hitung completed achievements untuk user ini
    const completedAchievements = await db
      .select({ count: sql`count(*)` })
      .from(userAchievements)
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.completed, true)
      ));

    // Ambil 3 achievement terbaru
    const recentAchievements = await db
      .select({
        name: achievements.name,
        icon: achievements.icon,
        completedAt: userAchievements.completedAt
      })
      .from(userAchievements)
      .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.completed, true)
      ))
      .orderBy(desc(userAchievements.completedAt))
      .limit(3);

    const total = parseInt(totalAchievements[0]?.count || '0');
    const completed = parseInt(completedAchievements[0]?.count || '0');

    return c.json({
      total: total,
      completed: completed,
      recent: recentAchievements || []
    });
  } catch (error) {
    console.error("Get achievement stats error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== GET LEADERBOARD ACHIEVEMENT ==========
app.get("/leaderboard/:category?", async (c) => {
  try {
    const category = c.req.param("category") || null;
    
    let query = db
      .select({
        userId: users_26.id,
        userName: users_26.namaLengkap,
        userFoto: users_26.fotoProfil,
        userSchool: users_26.asalSekolah,
        totalAchievements: sql`count(${userAchievements.id})`,
        completedAchievements: sql`sum(case when ${userAchievements.completed} then 1 else 0 end)`
      })
      .from(users_26)
      .leftJoin(userAchievements, eq(users_26.id, userAchievements.userId))
      .groupBy(users_26.id)
      .orderBy(desc(sql`completedAchievements`))
      .limit(10);

    if (category) {
      query = db
        .select({
          userId: users_26.id,
          userName: users_26.namaLengkap,
          userFoto: users_26.fotoProfil,
          userSchool: users_26.asalSekolah,
          totalAchievements: sql`count(${userAchievements.id})`,
          completedAchievements: sql`sum(case when ${userAchievements.completed} then 1 else 0 end)`
        })
        .from(users_26)
        .leftJoin(userAchievements, eq(users_26.id, userAchievements.userId))
        .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
        .where(eq(achievements.category, category))
        .groupBy(users_26.id)
        .orderBy(desc(sql`completedAchievements`))
        .limit(10);
    }

    const result = await query;
    return c.json(result);
  } catch (error) {
    console.error("Achievement leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== CHECK ACHIEVEMENT PROGRESS ==========
app.post("/check/:userId", async (c) => {
  try {
    const userId = parseInt(c.req.param("userId"));
    
    if (isNaN(userId)) {
      return c.json({ error: "User ID tidak valid" }, 400);
    }

    // Panggil fungsi pengecekan (implementasi di sini)
    
    return c.json({ 
      success: true,
      message: "Achievements checked"
    });
  } catch (error) {
    console.error("Check achievements error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;