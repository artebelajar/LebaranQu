// ===================================================
// FILE: leaderboard.js - API untuk Multi-Kategori Leaderboard
// ===================================================

import { Hono } from "hono";
import { db } from "../db/index.js";
import { users_26, posts, likes, comments, userAchievements, achievements } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

const app = new Hono();

// ========== LEADERBOARD BADGE - PERBAIKI ORDER BY ==========
app.get("/badge", async (c) => {
  try {
    const sekolah = c.req.query("sekolah") || "all";
    
    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        totalBadge: sql`COUNT(${userAchievements.id})::integer`,
        completedBadge: sql`SUM(CASE WHEN ${userAchievements.completed} THEN 1 ELSE 0 END)::integer`,
        rareBadge: sql`SUM(CASE WHEN ${achievements.requirement} >= 50 THEN 1 ELSE 0 END)::integer`
      })
      .from(users_26)
      .leftJoin(userAchievements, eq(users_26.id, userAchievements.userId))
      .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    
    // Sorting manual di JavaScript (bukan di SQL)
    const sortedResult = result.sort((a, b) => {
      if (b.completedBadge !== a.completedBadge) {
        return b.completedBadge - a.completedBadge;
      }
      if (b.rareBadge !== a.rareBadge) {
        return b.rareBadge - a.rareBadge;
      }
      return b.totalBadge - a.totalBadge;
    }).slice(0, 20);

    return c.json(sortedResult);
  } catch (error) {
    console.error("Badge leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== LEADERBOARD VIEW ==========
app.get("/view", async (c) => {
  try {
    const sekolah = c.req.query("sekolah") || "all";
    
    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        totalViews: sql`COALESCE(SUM(${posts.viewCount}), 0)::integer`
      })
      .from(users_26)
      .leftJoin(posts, eq(users_26.id, posts.userId))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    const sortedResult = result.sort((a, b) => b.totalViews - a.totalViews).slice(0, 20);
    
    return c.json(sortedResult);
  } catch (error) {
    console.error("View leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== LEADERBOARD POST ==========
app.get("/post", async (c) => {
  try {
    const sekolah = c.req.query("sekolah") || "all";
    
    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        totalPosts: sql`COUNT(${posts.id})::integer`
      })
      .from(users_26)
      .leftJoin(posts, eq(users_26.id, posts.userId))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    const sortedResult = result.sort((a, b) => b.totalPosts - a.totalPosts).slice(0, 20);
    
    return c.json(sortedResult);
  } catch (error) {
    console.error("Post leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== LEADERBOARD LIKE ==========
app.get("/like", async (c) => {
  try {
    const sekolah = c.req.query("sekolah") || "all";
    
    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        totalLikes: sql`COALESCE(SUM(${posts.likeCount}), 0)::integer`
      })
      .from(users_26)
      .leftJoin(posts, eq(users_26.id, posts.userId))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    const sortedResult = result.sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 20);
    
    return c.json(sortedResult);
  } catch (error) {
    console.error("Like leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== LEADERBOARD COMMENT ==========
app.get("/comment", async (c) => {
  try {
    const sekolah = c.req.query("sekolah") || "all";
    
    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        totalComments: sql`COUNT(${comments.id})::integer`
      })
      .from(users_26)
      .leftJoin(comments, eq(users_26.id, comments.userId))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    const sortedResult = result.sort((a, b) => b.totalComments - a.totalComments).slice(0, 20);
    
    return c.json(sortedResult);
  } catch (error) {
    console.error("Comment leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== LEADERBOARD OVERALL ==========
app.get("/overall", async (c) => {
  try {
    const sekolah = c.req.query("sekolah") || "all";
    
    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        totalPosts: sql`COUNT(DISTINCT ${posts.id})::integer`,
        totalLikes: sql`COALESCE(SUM(${posts.likeCount}), 0)::integer`,
        totalViews: sql`COALESCE(SUM(${posts.viewCount}), 0)::integer`,
        totalComments: sql`COUNT(DISTINCT ${comments.id})::integer`,
        totalBadge: sql`COUNT(DISTINCT ${userAchievements.id})::integer`,
        completedBadge: sql`SUM(CASE WHEN ${userAchievements.completed} THEN 1 ELSE 0 END)::integer`
      })
      .from(users_26)
      .leftJoin(posts, eq(users_26.id, posts.userId))
      .leftJoin(comments, eq(users_26.id, comments.userId))
      .leftJoin(userAchievements, eq(users_26.id, userAchievements.userId))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    
    // Hitung skor overall dengan bobot
    const overall = result.map(user => ({
      ...user,
      overallScore: 
        (user.totalPosts * 10) + 
        (user.totalLikes * 2) + 
        (Math.floor(user.totalViews / 5)) + 
        (user.totalComments * 3) + 
        (user.completedBadge * 20)
    })).sort((a, b) => b.overallScore - a.overallScore);

    return c.json(overall);
  } catch (error) {
    console.error("Overall leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;