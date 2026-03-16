// ===================================================
// FILE: src/api/leaderboard.js - VERSI FINAL DENGAN QUERY BENAR
// ===================================================

import { Hono } from "hono";
import { db } from "../db/index.js";
import { users_26, posts, likes, comments, userAchievements, achievements } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { cache } from "../utils/cache.js";

const app = new Hono();

// ========== LEADERBOARD BADGE - VERSI DIPERBAIKI ==========
app.get("/badge", async (c) => {
  try {
    const sekolah = c.req.query("sekolah") || "all";
    const cacheKey = `leaderboard:badge:${sekolah}`;
    
    // Coba ambil dari cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`📦 Serving badge leaderboard from cache for ${sekolah}`);
      return c.json(cached);
    }

    console.log(`Computing badge leaderboard for ${sekolah}...`);

    // Query yang benar - hitung badge dulu, baru order by
    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        completedBadge: sql`COUNT(CASE WHEN ${userAchievements.completed} = true THEN 1 END)`.as('completed_badge_count')
      })
      .from(users_26)
      .leftJoin(userAchievements, eq(users_26.id, userAchievements.userId))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    
    // Sort di JavaScript (karena tidak bisa pake alias di ORDER BY)
    const sortedResult = result
      .map(user => ({
        ...user,
        completedBadge: Number(user.completedBadge) || 0
      }))
      .sort((a, b) => b.completedBadge - a.completedBadge)
      .slice(0, 20); // Ambil top 20

    // Simpan ke cache (5 menit)
    await cache.set(cacheKey, sortedResult, 300);
    
    console.log(`✅ Badge leaderboard computed for ${sekolah}`);
    return c.json(sortedResult);
    
  } catch (error) {
    console.error("Badge leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== LEADERBOARD POST ==========
app.get("/post", async (c) => {
  try {
    const sekolah = c.req.query("sekolah") || "all";
    const cacheKey = `leaderboard:post:${sekolah}`;
    
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);

    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        totalPosts: sql`COUNT(${posts.id})`.as('post_count')
      })
      .from(users_26)
      .leftJoin(posts, eq(users_26.id, posts.userId))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    
    // Sort di JavaScript
    const sortedResult = result
      .map(user => ({
        ...user,
        totalPosts: Number(user.totalPosts) || 0
      }))
      .sort((a, b) => b.totalPosts - a.totalPosts)
      .slice(0, 20);

    await cache.set(cacheKey, sortedResult, 300);
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
    const cacheKey = `leaderboard:like:${sekolah}`;
    
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);

    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        totalLikes: sql`COALESCE(SUM(${posts.likeCount}), 0)`.as('like_count')
      })
      .from(users_26)
      .leftJoin(posts, eq(users_26.id, posts.userId))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    
    const sortedResult = result
      .map(user => ({
        ...user,
        totalLikes: Number(user.totalLikes) || 0
      }))
      .sort((a, b) => b.totalLikes - a.totalLikes)
      .slice(0, 20);

    await cache.set(cacheKey, sortedResult, 300);
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
    const cacheKey = `leaderboard:comment:${sekolah}`;
    
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);

    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        totalComments: sql`COUNT(${comments.id})`.as('comment_count')
      })
      .from(users_26)
      .leftJoin(comments, eq(users_26.id, comments.userId))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    
    const sortedResult = result
      .map(user => ({
        ...user,
        totalComments: Number(user.totalComments) || 0
      }))
      .sort((a, b) => b.totalComments - a.totalComments)
      .slice(0, 20);

    await cache.set(cacheKey, sortedResult, 300);
    return c.json(sortedResult);
    
  } catch (error) {
    console.error("Comment leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== LEADERBOARD VIEW ==========
app.get("/view", async (c) => {
  try {
    const sekolah = c.req.query("sekolah") || "all";
    const cacheKey = `leaderboard:view:${sekolah}`;
    
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);

    let query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        totalViews: sql`COALESCE(SUM(${posts.viewCount}), 0)`.as('view_count')
      })
      .from(users_26)
      .leftJoin(posts, eq(users_26.id, posts.userId))
      .groupBy(users_26.id);

    if (sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;
    
    const sortedResult = result
      .map(user => ({
        ...user,
        totalViews: Number(user.totalViews) || 0
      }))
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 20);

    await cache.set(cacheKey, sortedResult, 300);
    return c.json(sortedResult);
    
  } catch (error) {
    console.error("View leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== LEADERBOARD OVERALL - VERSI OPTIMASI ==========
app.get("/overall", async (c) => {
  try {
    const sekolah = c.req.query("sekolah") || "all";
    const cacheKey = `leaderboard:overall:${sekolah}`;
    
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);

    // Ambil semua users
    let usersQuery = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
      })
      .from(users_26);

    if (sekolah !== "all") {
      usersQuery = usersQuery.where(eq(users_26.asalSekolah, sekolah));
    }

    const users = await usersQuery;
    
    // Proses semua user secara parallel
    const overall = await Promise.all(
      users.map(async (user) => {
        // Jalankan semua query parallel untuk satu user
        const [
          [postCountResult],
          [likeCountResult],
          [viewCountResult],
          [commentCountResult],
          [badgeCountResult]
        ] = await Promise.all([
          db.select({ count: sql`COUNT(*)` }).from(posts).where(eq(posts.userId, user.id)),
          db.select({ sum: sql`COALESCE(SUM(${posts.likeCount}), 0)` }).from(posts).where(eq(posts.userId, user.id)),
          db.select({ sum: sql`COALESCE(SUM(${posts.viewCount}), 0)` }).from(posts).where(eq(posts.userId, user.id)),
          db.select({ count: sql`COUNT(*)` }).from(comments).where(eq(comments.userId, user.id)),
          db.select({ count: sql`COUNT(*)` }).from(userAchievements).where(and(
            eq(userAchievements.userId, user.id),
            eq(userAchievements.completed, true)
          ))
        ]);

        const postCount = Number(postCountResult?.count || 0);
        const likeCount = Number(likeCountResult?.sum || 0);
        const viewCount = Number(viewCountResult?.sum || 0);
        const commentCount = Number(commentCountResult?.count || 0);
        const badgeCount = Number(badgeCountResult?.count || 0);

        const overallScore = 
          (postCount * 10) + 
          (likeCount * 2) + 
          (Math.floor(viewCount / 5)) + 
          (commentCount * 3) + 
          (badgeCount * 20);

        return {
          id: user.id,
          namaLengkap: user.namaLengkap,
          asalSekolah: user.asalSekolah,
          title: user.title,
          fotoProfil: user.fotoProfil,
          totalPosts: postCount,
          totalLikes: likeCount,
          totalViews: viewCount,
          totalComments: commentCount,
          completedBadge: badgeCount,
          overallScore
        };
      })
    );

    // Sort by overall score
    const sortedResult = overall
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 20);

    await cache.set(cacheKey, sortedResult, 300);
    return c.json(sortedResult);
    
  } catch (error) {
    console.error("Overall leaderboard error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;