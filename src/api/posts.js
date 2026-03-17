import { Hono } from "hono";
import { db } from "../db/index.js";
import { posts, likes, users_26, comments, notifications, postViews } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { broadcastToUser, broadcastToAll } from "../utils/websocket.js";
import { 
  checkPostAchievements, 
  checkLikeAchievements, 
  checkCommentAchievements
} from "../utils/achievement-check.js";
import {
   createPostSchema,
  updatePostSchema,
  postIdSchema,
  userPostSchema,  // <-- PASTIKAN INI DI-IMPORT
  createCommentSchema,
  likeSchema,
  viewSchema
} from "../validators/schemas.js";
import { validateRequest, validateParams } from "../utils/validate.js";

const app = new Hono();

// ========== GET ALL POSTS DENGAN OPTIMASI ==========
app.get("/", async (c) => {
  try {
    const sekolah = c.req.query("sekolah");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const offset = (page - 1) * limit;
    
    // Hanya ambil data yang diperlukan
    let query = db
      .select({
        id: posts.id,
        judul: posts.judul,
        konten: sql`SUBSTRING(${posts.konten}, 1, 200)`, // Hanya 200 karakter pertama
        likeCount: posts.likeCount,
        viewCount: posts.viewCount,
        createdAt: posts.createdAt,
        user: {
          id: users_26.id,
          namaLengkap: users_26.namaLengkap,
          fotoProfil: users_26.fotoProfil,
          asalSekolah: users_26.asalSekolah,
        },
      })
      .from(posts)
      .leftJoin(users_26, eq(posts.userId, users_26.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    if (sekolah && sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    // Hitung total untuk pagination
    const countQuery = db
      .select({ count: sql`count(*)` })
      .from(posts)
      .leftJoin(users_26, eq(posts.userId, users_26.id));

    if (sekolah && sekolah !== "all") {
      countQuery.where(eq(users_26.asalSekolah, sekolah));
    }

    const [postsData, [totalResult]] = await Promise.all([
      query,
      countQuery
    ]);

    return c.json({
      data: postsData,
      total: parseInt(totalResult.count),
      page,
      limit,
      totalPages: Math.ceil(parseInt(totalResult.count) / limit)
    });
    
  } catch (error) {
    console.error("❌ Get posts error:", error);
    return c.json({ error: "Gagal memuat postingan" }, 500);
  }
});

// ========== GET POSTS BY USER ID ==========
app.get("/user/:userId", async (c) => {
  const startTime = Date.now();

  try {
    // VALIDASI PARAM DENGAN SCHEMA YANG BENAR
    const validation = validateParams(c, userPostSchema); // <-- PAKAI userPostSchema, BUKAN postIdSchema
    if (!validation.success) {
      console.error('Validation error:', validation.error);
      return c.json({ error: validation.error.message, details: validation.error.details }, 400);
    }
    
    const { userId } = validation.data;
    console.log('Validated userId:', userId);

    const userPosts = await db
      .select({
        id: posts.id,
        judul: posts.judul,
        konten: posts.konten,
        gambar: posts.gambar,
        likeCount: posts.likeCount,
        viewCount: posts.viewCount,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(50);

    console.log(
      `👤 User posts loaded in ${Date.now() - startTime}ms - ${userPosts.length} posts`,
    );
    return c.json(userPosts);
  } catch (error) {
    console.error("❌ Get user posts error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== GET SINGLE POST ==========
app.get("/:id", async (c) => {
  const startTime = Date.now();

  try {
    // VALIDASI PARAM DENGAN ZOD
    const validation = validateParams(c, postIdSchema);
    if (!validation.success) {
      return c.json({ error: validation.error.message, details: validation.error.details }, 400);
    }
    
    const { id: postId } = validation.data;

    const [post] = await db
      .select({
        id: posts.id,
        judul: posts.judul,
        konten: posts.konten,
        gambar: posts.gambar,
        likeCount: posts.likeCount,
        viewCount: posts.viewCount,
        createdAt: posts.createdAt,
        userId: posts.userId,
      })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return c.json({ error: "Postingan tidak ditemukan" }, 404);
    }

    console.log(`📄 Post ${postId} loaded in ${Date.now() - startTime}ms`);
    return c.json(post);
  } catch (error) {
    console.error("❌ Get post error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== CREATE POST ==========
app.post("/", async (c) => {
  const startTime = Date.now();
  
  try {
    // VALIDASI BODY DENGAN ZOD
    const validation = await validateRequest(c, createPostSchema);
    if (!validation.success) {
      return c.json({ error: validation.error.message, details: validation.error.details }, 400);
    }
    
    const body = validation.data;

    const [user] = await db
      .select({ id: users_26.id, namaLengkap: users_26.namaLengkap })
      .from(users_26)
      .where(eq(users_26.id, body.userId))
      .limit(1);

    if (!user) return c.json({ error: "User tidak ditemukan" }, 404);

    await db.update(users_26)
      .set({ lastActive: new Date() })
      .where(eq(users_26.id, body.userId));

    const [newPost] = await db
      .insert(posts)
      .values({
        userId: body.userId,
        judul: body.judul,
        konten: body.konten,
        viewCount: 0,
      })
      .returning();

    // Ambil data post lengkap dengan user
    const [postWithUser] = await db
      .select({
        id: posts.id,
        judul: posts.judul,
        konten: posts.konten,
        likeCount: posts.likeCount,
        viewCount: posts.viewCount,
        createdAt: posts.createdAt,
        user: {
          id: users_26.id,
          namaLengkap: users_26.namaLengkap,
          asalSekolah: users_26.asalSekolah,
          title: users_26.title,
          fotoProfil: users_26.fotoProfil,
        },
      })
      .from(posts)
      .leftJoin(users_26, eq(posts.userId, users_26.id))
      .where(eq(posts.id, newPost.id))
      .limit(1);

    // HITUNG JUMLAH POSTINGAN USER
    const [postCount] = await db
      .select({ count: sql`count(*)` })
      .from(posts)
      .where(eq(posts.userId, body.userId));

    // CEK ACHIEVEMENT POST
    try {
      await checkPostAchievements(body.userId, postCount.count);
    } catch (achError) {
      console.error("Error checking post achievements:", achError);
    }

    // BROADCAST REAL-TIME
    try {
      broadcastToAll({
        type: 'new_post',
        post: postWithUser,
        timestamp: new Date()
      });
    } catch (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }

    console.log(`✨ Post created in ${Date.now() - startTime}ms`);
    return c.json(newPost, 201);
    
  } catch (error) {
    console.error("❌ Create post error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== GET COMMENTS - VERSI DIPERBAIKI ==========
app.get("/:postId/comments", async (c) => {
  const startTime = Date.now();
  
  try {
    const postIdParam = c.req.param("postId");
    console.log(`📝 Fetching comments for post ${postIdParam}`);
    
    // Validasi manual dulu
    const postId = parseInt(postIdParam);
    if (isNaN(postId) || postId <= 0) {
      return c.json({ error: "Post ID tidak valid" }, 400);
    }

    // Cek apakah post exists
    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return c.json({ error: "Postingan tidak ditemukan" }, 404);
    }

    // Ambil comments dengan query sederhana
    const postComments = await db
      .select({
        id: comments.id,
        text: comments.text,
        createdAt: comments.createdAt,
        userId: comments.userId,
      })
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt))
      .limit(50);

    // Ambil data user untuk setiap comment (manual join)
    const commentsWithUser = await Promise.all(
      postComments.map(async (comment) => {
        const [user] = await db
          .select({
            id: users_26.id,
            namaLengkap: users_26.namaLengkap,
            fotoProfil: users_26.fotoProfil,
          })
          .from(users_26)
          .where(eq(users_26.id, comment.userId))
          .limit(1);

        return {
          id: comment.id,
          text: comment.text,
          createdAt: comment.createdAt,
          user: user || {
            id: comment.userId,
            namaLengkap: 'Unknown User',
            fotoProfil: '/images/default-avatar.png'
          }
        };
      })
    );

    console.log(`💬 Comments loaded in ${Date.now() - startTime}ms - ${commentsWithUser.length} comments`);
    return c.json(commentsWithUser);
    
  } catch (error) {
    console.error("❌ Get comments error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== ADD COMMENT - VERSI DIPERBAIKI ==========
app.post("/:postId/comments", async (c) => {
  const startTime = Date.now();
  
  try {
    // Ambil parameter dari URL
    const postIdParam = c.req.param("postId");
    console.log("Adding comment to post:", postIdParam);
    
    // Validasi manual dulu (sebagai fallback)
    const postId = parseInt(postIdParam);
    if (isNaN(postId) || postId <= 0) {
      return c.json({ error: "Post ID tidak valid" }, 400);
    }

    // Parse body
    const body = await c.req.json();
    console.log("Comment body:", body);

    // Validasi body
    if (!body.userId || !body.text) {
      return c.json({ error: "User ID dan text harus diisi" }, 400);
    }

    if (typeof body.userId !== 'number' || body.userId <= 0) {
      return c.json({ error: "User ID harus berupa angka positif" }, 400);
    }

    if (typeof body.text !== 'string' || body.text.trim().length === 0) {
      return c.json({ error: "Komentar tidak boleh kosong" }, 400);
    }

    if (body.text.length > 1000) {
      return c.json({ error: "Komentar terlalu panjang (maks 1000 karakter)" }, 400);
    }

    // Cek apakah post exists
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return c.json({ error: "Postingan tidak ditemukan" }, 404);
    }

    // Update last active user
    await db.update(users_26)
      .set({ lastActive: new Date() })
      .where(eq(users_26.id, body.userId));

    // Insert comment
    const [newComment] = await db
      .insert(comments)
      .values({
        postId: postId,
        userId: body.userId,
        text: body.text.trim(),
      })
      .returning();

    // Ambil data user
    const [user] = await db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        fotoProfil: users_26.fotoProfil,
      })
      .from(users_26)
      .where(eq(users_26.id, body.userId))
      .limit(1);

    const commentWithUser = {
      ...newComment,
      user: user
    };

    // Hitung jumlah komentar user
    const [commentCount] = await db
      .select({ count: sql`count(*)` })
      .from(comments)
      .where(eq(comments.userId, body.userId));

    // CEK ACHIEVEMENT KOMENTAR
    try {
      await checkCommentAchievements(body.userId, commentCount.count);
    } catch (achError) {
      console.error("Error checking comment achievements:", achError);
    }

    // BROADCAST REAL-TIME ke semua user
    try {
      broadcastToAll({
        type: 'new_comment',
        postId: postId,
        comment: commentWithUser,
        timestamp: new Date()
      });
    } catch (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }

    // BROADCAST khusus ke pemilik post
    if (post.userId !== body.userId) {
      try {
        broadcastToUser(post.userId, {
          type: 'new_comment_notification',
          postId: postId,
          comment: commentWithUser,
          timestamp: new Date()
        });
      } catch (broadcastError) {
        console.error('Broadcast error:', broadcastError);
      }

      // Notifikasi
      db.insert(notifications).values({
        userId: post.userId,
        fromUserId: body.userId,
        postId: postId,
        type: 'comment',
        message: `${user.namaLengkap} berkomentar di postingan Anda`,
        data: JSON.stringify({ postId, commentId: newComment.id })
      }).catch(console.error);
    }

    console.log(`💬 Comment added in ${Date.now() - startTime}ms`);
    return c.json(commentWithUser, 201);
    
  } catch (error) {
    console.error("❌ Add comment error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== LIKE/UNLIKE POST ==========
app.post("/:id/like", async (c) => {
  const startTime = Date.now();
  
  try {
    const postId = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const userId = body.userId;

    if (isNaN(postId) || !userId) {
      return c.json({ error: "Data tidak valid" }, 400);
    }

    // Cek apakah post exists
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return c.json({ error: "Postingan tidak ditemukan" }, 404);
    }

    // Update last active user
    await db.update(users_26)
      .set({ lastActive: new Date() })
      .where(eq(users_26.id, userId));

    // Cek apakah sudah like sebelumnya
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(
        eq(likes.postId, postId),
        eq(likes.userId, userId)
      ))
      .limit(1);

    let updatedPost;
    let action;

    if (existingLike.length > 0) {
      // UNLIKE
      await db.delete(likes)
        .where(and(
          eq(likes.postId, postId),
          eq(likes.userId, userId)
        ));

      [updatedPost] = await db
        .update(posts)
        .set({ 
          likeCount: sql`${posts.likeCount} - 1`,
          updatedAt: new Date()
        })
        .where(eq(posts.id, postId))
        .returning();
      
      action = 'unliked';
      
      console.log(`👎 User ${userId} unliked post ${postId}`);
    } else {
      // LIKE
      await db.insert(likes).values({ 
        postId, 
        userId,
        created_at: new Date()
      });

      [updatedPost] = await db
        .update(posts)
        .set({ 
          likeCount: sql`${posts.likeCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(posts.id, postId))
        .returning();

      action = 'liked';
      
      console.log(`❤️ User ${userId} liked post ${postId}`);

      // HITUNG TOTAL LIKES YANG DITERIMA OLEH PEMILIK POST
      if (post.userId !== userId) {
        const [likeCount] = await db
          .select({ count: sql`count(*)` })
          .from(likes)
          .leftJoin(posts, eq(likes.postId, posts.id))
          .where(eq(posts.userId, post.userId));

        // CEK ACHIEVEMENT LIKE UNTUK PEMILIK POST
        try {
          await checkLikeAchievements(post.userId, likeCount.count);
        } catch (achError) {
          console.error("Error checking like achievements:", achError);
        }
      }
    }

    // BROADCAST UPDATE LIKES KE SEMUA USER (REAL-TIME)
    try {
      broadcastToAll({
        type: 'update_likes',
        postId: postId,
        likeCount: updatedPost.likeCount,
        action: action,
        userId: userId,
        timestamp: new Date()
      });
    } catch (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }

    // KIRIM NOTIFIKASI KE PEMILIK POST (JIKA LIKE DAN BUKAN DIRI SENDIRI)
    if (post.userId !== userId && action === 'liked') {
      // Ambil data user yang like
      const [userData] = await db
        .select({ 
          id: users_26.id,
          namaLengkap: users_26.namaLengkap,
          fotoProfil: users_26.fotoProfil 
        })
        .from(users_26)
        .where(eq(users_26.id, userId))
        .limit(1);

      // Simpan notifikasi ke database
      const [notification] = await db
        .insert(notifications)
        .values({
          userId: post.userId,
          fromUserId: userId,
          postId: postId,
          type: 'like',
          message: `${userData.namaLengkap} menyukai postingan Anda`,
          data: JSON.stringify({ postId, userId }),
          createdAt: new Date(),
          isRead: false
        })
        .returning();

      console.log(`🔔 Notification created for user ${post.userId}`);

      // Ambil data notifikasi lengkap untuk dikirim real-time
      const [notifWithUser] = await db
        .select({
          id: notifications.id,
          type: notifications.type,
          message: notifications.message,
          data: notifications.data,
          createdAt: notifications.createdAt,
          fromUser: {
            id: users_26.id,
            namaLengkap: users_26.namaLengkap,
            fotoProfil: users_26.fotoProfil
          },
          post: {
            id: posts.id,
            judul: posts.judul
          }
        })
        .from(notifications)
        .leftJoin(users_26, eq(notifications.fromUserId, users_26.id))
        .leftJoin(posts, eq(notifications.postId, posts.id))
        .where(eq(notifications.id, notification.id))
        .limit(1);

      // KIRIM NOTIFIKASI REAL-TIME KE PEMILIK POST
      try {
        broadcastToUser(post.userId, {
          type: 'new_notification',
          notification: notifWithUser,
          timestamp: new Date()
        });
        
        console.log(`📨 Real-time notification sent to user ${post.userId}`);
      } catch (notifError) {
        console.error('Failed to send real-time notification:', notifError);
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`❤️ Like processed in ${responseTime}ms - ${action}`);

    return c.json({
      success: true,
      action: action,
      postId: postId,
      userId: userId,
      likeCount: updatedPost.likeCount,
      post: updatedPost
    });

  } catch (error) {
    console.error("❌ Like error:", error);
    return c.json({ 
      error: "Terjadi kesalahan saat memproses like",
      details: error.message 
    }, 500);
  }
});

// ========== EDIT POST ==========
app.put("/:id", async (c) => {
  const startTime = Date.now();

  try {
    // VALIDASI PARAM DENGAN ZOD
    const paramsValidation = validateParams(c, postIdSchema);
    if (!paramsValidation.success) {
      return c.json({ error: paramsValidation.error.message, details: paramsValidation.error.details }, 400);
    }
    
    // VALIDASI BODY DENGAN ZOD
    const bodyValidation = await validateRequest(c, updatePostSchema);
    if (!bodyValidation.success) {
      return c.json({ error: bodyValidation.error.message, details: bodyValidation.error.details }, 400);
    }
    
    const { id: postId } = paramsValidation.data;
    const body = bodyValidation.data;

    const [existingPost] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!existingPost) {
      return c.json({ error: "Postingan tidak ditemukan" }, 404);
    }

    // Update lastActive user yang edit post
    await db
      .update(users_26)
      .set({ lastActive: new Date() })
      .where(eq(users_26.id, existingPost.userId));

    const [updatedPost] = await db
      .update(posts)
      .set({
        judul: body.judul || existingPost.judul,
        konten: body.konten || existingPost.konten,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning();

    console.log(`✏️ Post updated in ${Date.now() - startTime}ms`);
    return c.json(updatedPost);
  } catch (error) {
    console.error("❌ Edit post error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== DELETE POST ==========
app.delete("/:id", async (c) => {
  const startTime = Date.now();

  try {
    // VALIDASI PARAM DENGAN ZOD
    const validation = validateParams(c, postIdSchema);
    if (!validation.success) {
      return c.json({ error: validation.error.message, details: validation.error.details }, 400);
    }
    
    const { id: postId } = validation.data;

    const [existingPost] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!existingPost) {
      return c.json({ error: "Postingan tidak ditemukan" }, 404);
    }

    // Update lastActive user yang hapus post
    await db
      .update(users_26)
      .set({ lastActive: new Date() })
      .where(eq(users_26.id, existingPost.userId));

    await Promise.all([
      db.delete(notifications).where(eq(notifications.postId, postId)),
      db.delete(postViews).where(eq(postViews.postId, postId)),
      db.delete(comments).where(eq(comments.postId, postId)),
      db.delete(likes).where(eq(likes.postId, postId)),
      db.delete(posts).where(eq(posts.id, postId)),
    ]);

    console.log(`🗑️ Post deleted in ${Date.now() - startTime}ms`);
    return c.json({ message: "Postingan berhasil dihapus" });
  } catch (error) {
    console.error("❌ Delete post error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== LEADERBOARD ==========
app.get("/leaderboard", async (c) => {
  const startTime = Date.now();

  try {
    const sekolah = c.req.query("sekolah");

    let query = db
      .select({
        id: posts.id,
        judul: posts.judul,
        likeCount: posts.likeCount,
        user: {
          id: users_26.id,
          namaLengkap: users_26.namaLengkap,
          asalSekolah: users_26.asalSekolah,
          fotoProfil: users_26.fotoProfil,
          lastActive: users_26.lastActive,
        },
      })
      .from(posts)
      .leftJoin(users_26, eq(posts.userId, users_26.id))
      .orderBy(desc(posts.likeCount))
      .limit(10);

    if (sekolah && sekolah !== "all") {
      query = query.where(eq(users_26.asalSekolah, sekolah));
    }

    const result = await query;

    console.log(`🏆 Leaderboard loaded in ${Date.now() - startTime}ms`);
    return c.json(result);
  } catch (error) {
    console.error("❌ Leaderboard error:", error);
    return c.json([], 500);
  }
});

// ========== TRACK VIEW ==========
app.post("/:id/view", async (c) => {
  const startTime = Date.now();

  try {
    const postId = parseInt(c.req.param("id"));
    let userId;

    // Parse body dengan aman
    try {
      const body = await c.req.json();
      userId = body?.userId;
    } catch (e) {
      // Jika bukan JSON, coba dari query string
      userId = c.req.query('userId');
    }

    if (isNaN(postId) || postId <= 0) {
      return c.json({ error: "Post ID tidak valid" }, 400);
    }

    if (!userId || isNaN(parseInt(userId))) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    userId = parseInt(userId);

    // Update lastActive user
    await db
      .update(users_26)
      .set({ lastActive: new Date() })
      .where(eq(users_26.id, userId));

    // Cek view di database
    const existingView = await db
      .select()
      .from(postViews)
      .where(and(
        eq(postViews.postId, postId),
        eq(postViews.userId, userId)
      ))
      .limit(1);

    let viewCount;

    if (existingView.length === 0) {
      // Insert view baru
      await db.insert(postViews).values({ 
        postId, 
        userId,
        viewedAt: new Date()
      });

      // Update view count di posts
      const [updatedPost] = await db
        .update(posts)
        .set({ 
          viewCount: sql`${posts.viewCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(posts.id, postId))
        .returning({ viewCount: posts.viewCount });

      viewCount = updatedPost.viewCount;
    } else {
      // Sudah pernah view, ambil count sekarang
      const [currentPost] = await db
        .select({ viewCount: posts.viewCount })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      viewCount = currentPost?.viewCount || 0;
    }

    console.log(`👁️ View tracked for post ${postId} by user ${userId} in ${Date.now() - startTime}ms`);
    
    return c.json({
      viewed: existingView.length === 0,
      viewCount,
    });
    
  } catch (error) {
    console.error("❌ Track view error:", error);
    return c.json({ 
      error: "Gagal mencatat view",
      message: error.message 
    }, 500);
  }
});

export default app;