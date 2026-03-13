import { Hono } from "hono";
import { db } from "../db/index.js";
import { posts, likes, users_26, comments, notifications, postViews } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

const app = new Hono();

// ========== GET ALL POSTS ==========
app.get("/", async (c) => {
  const startTime = Date.now();
  
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "5");
    const offset = (page - 1) * limit;
    const sekolah = c.req.query("sekolah");
    
    // Query posts
    let query = db
      .select({
        id: posts.id,
        judul: posts.judul,
        konten: posts.konten,
        gambar: posts.gambar,
        likeCount: posts.likeCount,
        viewCount: posts.viewCount,
        createdAt: posts.createdAt,
        user: {
          id: users_26.id,
          namaLengkap: users_26.namaLengkap,
          asalSekolah: users_26.asalSekolah,
          title: users_26.title,
          fotoProfil: users_26.fotoProfil,
          // HAPUS BARIS INI: lastActive: users_26.lastActive
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

    const postsData = await query;
    
    const responseTime = Date.now() - startTime;
    console.log(`📊 Posts loaded in ${responseTime}ms - ${postsData.length} posts`);
    
    return c.json(postsData);
    
  } catch (error) {
    console.error("❌ Get posts error:", error);
    return c.json({ error: "Gagal memuat postingan" }, 500);
  }
});

// ========== GET POSTS BY USER ID ==========
app.get("/user/:userId", async (c) => {
  const startTime = Date.now();
  
  try {
    const userId = parseInt(c.req.param("userId"));
    
    if (isNaN(userId)) {
      return c.json({ error: "User ID tidak valid" }, 400);
    }

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
    
    console.log(`👤 User posts loaded in ${Date.now() - startTime}ms - ${userPosts.length} posts`);
    return c.json(userPosts);
    
  } catch (error) {
    console.error("❌ Get user posts error:", error);
    return c.json([], 500);
  }
});

// ========== GET SINGLE POST ==========
app.get("/:id", async (c) => {
  const startTime = Date.now();
  
  try {
    const postId = parseInt(c.req.param("id"));
    
    if (isNaN(postId)) {
      return c.json({ error: "Post ID tidak valid" }, 400);
    }

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
    const body = await c.req.json();

    // Validasi input
    if (!body.userId || !body.judul || !body.konten) {
      return c.json({ error: "Data tidak lengkap" }, 400);
    }

    // Cek apakah user ada - HAPUS last_active dari SELECT
    const [user] = await db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        // HAPUS SEMUA KOLOM LAIN YANG TIDAK DIPERLUKAN
      })
      .from(users_26)
      .where(eq(users_26.id, body.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User tidak ditemukan" }, 404);
    }

    const [newPost] = await db
      .insert(posts)
      .values({
        userId: body.userId,
        judul: body.judul,
        konten: body.konten,
        viewCount: 0,
      })
      .returning();

    console.log(`✨ Post created in ${Date.now() - startTime}ms`);
    return c.json(newPost, 201);
    
  } catch (error) {
    console.error("❌ Create post error:", error);
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

    // Cek apakah post ada
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return c.json({ error: "Postingan tidak ditemukan" }, 404);
    }

    // Cek existing like
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userId, userId)))
      .limit(1);

    let updatedPost;
    let action;

    if (existingLike.length > 0) {
      await db
        .delete(likes)
        .where(and(eq(likes.postId, postId), eq(likes.userId, userId)));

      [updatedPost] = await db
        .update(posts)
        .set({ likeCount: sql`${posts.likeCount} - 1` })
        .where(eq(posts.id, postId))
        .returning();
      
      action = 'unliked';
    } else {
      await db.insert(likes).values({ postId, userId });

      [updatedPost] = await db
        .update(posts)
        .set({ likeCount: sql`${posts.likeCount} + 1` })
        .where(eq(posts.id, postId))
        .returning();

      action = 'liked';

      // Buat notifikasi (async)
      if (post.userId !== userId) {
        (async () => {
          try {
            const [userData] = await db
              .select({ namaLengkap: users_26.namaLengkap })
              .from(users_26)
              .where(eq(users_26.id, userId))
              .limit(1);

            await db.insert(notifications).values({
              userId: post.userId,
              fromUserId: userId,
              postId: postId,
              type: 'like',
              message: `${userData.namaLengkap} menyukai postingan Anda`,
              data: JSON.stringify({ postId, userId })
            });
          } catch (notifError) {
            console.error('⚠️ Notifikasi error:', notifError.message);
          }
        })();
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
    return c.json({ error: "Terjadi kesalahan" }, 500);
  }
});

// ========== GET COMMENTS ==========
app.get("/:postId/comments", async (c) => {
  const startTime = Date.now();
  
  try {
    const postId = parseInt(c.req.param("postId"));
    
    if (isNaN(postId)) {
      return c.json({ error: "Post ID tidak valid" }, 400);
    }

    const postComments = await db
      .select({
        id: comments.id,
        text: comments.text,
        createdAt: comments.createdAt,
        user: {
          id: users_26.id,
          namaLengkap: users_26.namaLengkap,
          fotoProfil: users_26.fotoProfil,
        },
      })
      .from(comments)
      .leftJoin(users_26, eq(comments.userId, users_26.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt))
      .limit(50);

    console.log(`💬 Comments loaded in ${Date.now() - startTime}ms - ${postComments.length} comments`);
    return c.json(postComments);
    
  } catch (error) {
    console.error("❌ Get comments error:", error);
    return c.json([], 500);
  }
});

// ========== ADD COMMENT ==========
app.post("/:postId/comments", async (c) => {
  const startTime = Date.now();
  
  try {
    const postId = parseInt(c.req.param("postId"));
    const body = await c.req.json();

    if (isNaN(postId) || !body.userId || !body.text) {
      return c.json({ error: "Data tidak lengkap" }, 400);
    }

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return c.json({ error: "Postingan tidak ditemukan" }, 404);
    }

    const [newComment] = await db
      .insert(comments)
      .values({
        postId,
        userId: body.userId,
        text: body.text.trim(),
      })
      .returning();

    const [user] = await db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        fotoProfil: users_26.fotoProfil,
      })
      .from(users_26)
      .where(eq(users_26.id, body.userId))
      .limit(1);

    if (post.userId !== body.userId) {
      (async () => {
        try {
          await db.insert(notifications).values({
            userId: post.userId,
            fromUserId: body.userId,
            postId: postId,
            type: 'comment',
            message: `${user.namaLengkap} berkomentar di postingan Anda`,
            data: JSON.stringify({ postId, commentId: newComment.id })
          });
        } catch (e) {
          console.error('⚠️ Notifikasi error:', e.message);
        }
      })();
    }

    console.log(`💬 Comment added in ${Date.now() - startTime}ms`);
    return c.json({
      ...newComment,
      user: user
    }, 201);
    
  } catch (error) {
    console.error("❌ Add comment error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== EDIT POST ==========
app.put("/:id", async (c) => {
  const startTime = Date.now();
  
  try {
    const postId = parseInt(c.req.param("id"));
    const body = await c.req.json();

    if (isNaN(postId)) {
      return c.json({ error: "Post ID tidak valid" }, 400);
    }

    const [existingPost] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!existingPost) {
      return c.json({ error: "Postingan tidak ditemukan" }, 404);
    }

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
    const postId = parseInt(c.req.param("id"));

    if (isNaN(postId)) {
      return c.json({ error: "Post ID tidak valid" }, 400);
    }

    const [existingPost] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!existingPost) {
      return c.json({ error: "Postingan tidak ditemukan" }, 404);
    }

    await Promise.all([
      db.delete(notifications).where(eq(notifications.postId, postId)),
      db.delete(postViews).where(eq(postViews.postId, postId)),
      db.delete(comments).where(eq(comments.postId, postId)),
      db.delete(likes).where(eq(likes.postId, postId)),
      db.delete(posts).where(eq(posts.id, postId))
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

// ========== TRACK VIEW (TAMBAHKAN ROUTE INI) ==========
app.post("/:id/view", async (c) => {
  const startTime = Date.now();
  
  try {
    const postId = parseInt(c.req.param("id"));
    const { userId } = await c.req.json();

    if (isNaN(postId) || !userId) {
      return c.json({ error: "Data tidak valid" }, 400);
    }

    // Cek di database
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
      await db.insert(postViews).values({ postId, userId });

      const [updatedPost] = await db
        .update(posts)
        .set({ viewCount: sql`${posts.viewCount} + 1` })
        .where(eq(posts.id, postId))
        .returning({ viewCount: posts.viewCount });

      viewCount = updatedPost.viewCount;
    } else {
      const [currentPost] = await db
        .select({ viewCount: posts.viewCount })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);
      
      viewCount = currentPost.viewCount;
    }

    console.log(`👁️ View tracked in ${Date.now() - startTime}ms`);
    return c.json({ 
      viewed: existingView.length === 0,
      viewCount
    });

  } catch (error) {
    console.error("❌ Track view error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;