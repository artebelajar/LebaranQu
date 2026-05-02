// ========== TAMBAHKAN DI AKHIR FILE ==========

// ========== BULK GET POSTS (UNTUK OPTIMASI) ==========
app.post("/bulk", async (c) => {
  try {
    const { postIds } = await c.req.json();
    
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return c.json({ error: "Post IDs diperlukan" }, 400);
    }
    
    if (postIds.length > 100) {
      return c.json({ error: "Maksimal 100 post IDs" }, 400);
    }
    
    const postsData = await db
      .select({
        id: posts.id,
        judul: posts.judul,
        konten: posts.konten,
        likeCount: posts.likeCount,
        viewCount: posts.viewCount,
        createdAt: posts.createdAt,
        userId: posts.userId,
        user: {
          id: users_26.id,
          namaLengkap: users_26.namaLengkap,
          fotoProfil: users_26.fotoProfil,
          asalSekolah: users_26.asalSekolah,
        }
      })
      .from(posts)
      .leftJoin(users_26, eq(posts.userId, users_26.id))
      .where(sql`${posts.id} = ANY(${postIds}::int[])`);
    
    return c.json(postsData);
    
  } catch (error) {
    console.error("❌ Bulk get posts error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== GET POSTS BY DATE RANGE ==========
app.get("/date-range", async (c) => {
  try {
    const startDate = c.req.query("start");
    const endDate = c.req.query("end");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const offset = (page - 1) * limit;
    
    if (!startDate || !endDate) {
      return c.json({ error: "Start date dan end date diperlukan" }, 400);
    }
    
    let query = db
      .select({
        id: posts.id,
        judul: posts.judul,
        likeCount: posts.likeCount,
        viewCount: posts.viewCount,
        createdAt: posts.createdAt,
        user: {
          id: users_26.id,
          namaLengkap: users_26.namaLengkap,
          fotoProfil: users_26.fotoProfil,
        }
      })
      .from(posts)
      .leftJoin(users_26, eq(posts.userId, users_26.id))
      .where(and(
        sql`${posts.createdAt} >= ${startDate}::timestamp`,
        sql`${posts.createdAt} <= ${endDate}::timestamp`
      ))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [postsData, [totalResult]] = await Promise.all([
      query,
      db.select({ count: sql`count(*)` }).from(posts).where(and(
        sql`${posts.createdAt} >= ${startDate}::timestamp`,
        sql`${posts.createdAt} <= ${endDate}::timestamp`
      ))
    ]);
    
    return c.json({
      data: postsData,
      total: parseInt(totalResult.count),
      page,
      limit
    });
    
  } catch (error) {
    console.error("❌ Get posts by date range error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== GET TOP POSTS (POPULAR) ==========
app.get("/top/popular", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const timeRange = c.req.query("timeRange") || "week"; // day, week, month, all
    
    let dateFilter = null;
    const now = new Date();
    
    switch (timeRange) {
      case 'day':
        dateFilter = sql`${posts.createdAt} >= ${new Date(now.setDate(now.getDate() - 1))}`;
        break;
      case 'week':
        dateFilter = sql`${posts.createdAt} >= ${new Date(now.setDate(now.getDate() - 7))}`;
        break;
      case 'month':
        dateFilter = sql`${posts.createdAt} >= ${new Date(now.setMonth(now.getMonth() - 1))}`;
        break;
      default:
        dateFilter = sql`TRUE`;
    }
    
    let query = db
      .select({
        id: posts.id,
        judul: posts.judul,
        likeCount: posts.likeCount,
        viewCount: posts.viewCount,
        commentCount: sql`COUNT(${comments.id})`.as('comment_count'),
        createdAt: posts.createdAt,
        user: {
          id: users_26.id,
          namaLengkap: users_26.namaLengkap,
          fotoProfil: users_26.fotoProfil,
        }
      })
      .from(posts)
      .leftJoin(users_26, eq(posts.userId, users_26.id))
      .leftJoin(comments, eq(posts.id, comments.postId))
      .where(dateFilter)
      .groupBy(posts.id, users_26.id)
      .orderBy(
        desc(sql`${posts.likeCount} * 2 + ${posts.viewCount} + COUNT(${comments.id}) * 3`)
      )
      .limit(limit);
    
    const result = await query;
    return c.json(result);
    
  } catch (error) {
    console.error("❌ Get top posts error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== SEARCH POSTS ==========
app.get("/search", async (c) => {
  try {
    const query = c.req.query("q");
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const offset = (page - 1) * limit;
    
    if (!query || query.length < 2) {
      return c.json({ error: "Query minimal 2 karakter" }, 400);
    }
    
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const searchResults = await db
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
          fotoProfil: users_26.fotoProfil,
        },
        relevance: sql`ts_rank(to_tsvector('indonesian', ${posts.judul} || ' ' || ${posts.konten}), plainto_tsquery('indonesian', ${query}))`.as('relevance')
      })
      .from(posts)
      .leftJoin(users_26, eq(posts.userId, users_26.id))
      .where(sql`to_tsvector('indonesian', ${posts.judul} || ' ' || ${posts.konten}) @@ plainto_tsquery('indonesian', ${query})`)
      .orderBy(desc(sql`relevance`))
      .limit(limit)
      .offset(offset);
    
    // Hitung total
    const [totalResult] = await db
      .select({ count: sql`count(*)` })
      .from(posts)
      .where(sql`to_tsvector('indonesian', ${posts.judul} || ' ' || ${posts.konten}) @@ plainto_tsquery('indonesian', ${query})`);
    
    return c.json({
      data: searchResults,
      total: parseInt(totalResult.count),
      page,
      limit,
      query
    });
    
  } catch (error) {
    console.error("❌ Search posts error:", error);
    // Jika search index tidak ada, fallback ke LIKE
    return c.json({ error: error.message }, 500);
  }
});

export default app;