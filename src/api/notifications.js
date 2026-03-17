// ===================================================
// FILE: src/api/notifications.js (BACKEND)
// ===================================================

import { Hono } from "hono";
import { db } from "../db/index.js";
import { notifications, users_26, posts } from "../db/schema.js";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

const app = new Hono();

// ========== GET NOTIFICATIONS ==========
app.get("/", async (c) => {
  try {
    const userId = parseInt(c.req.query("userId"));
    const limit = parseInt(c.req.query("limit") || "50");
    
    if (!userId || isNaN(userId)) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    const userNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        message: notifications.message,
        data: notifications.data,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        fromUser: {
          id: users_26.id,
          namaLengkap: users_26.namaLengkap,
          fotoProfil: users_26.fotoProfil,
        },
        post: {
          id: posts.id,
          judul: posts.judul,
        }
      })
      .from(notifications)
      .leftJoin(users_26, eq(notifications.fromUserId, users_26.id))
      .leftJoin(posts, eq(notifications.postId, posts.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    // Hitung unread count
    const [unreadResult] = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));

    return c.json({
      notifications: userNotifications,
      unreadCount: parseInt(unreadResult?.count || '0')
    });
    
  } catch (error) {
    console.error("Get notifications error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== MARK AS READ ==========
app.post("/mark-read", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, notificationIds } = body;

    console.log('Mark read request:', { userId, notificationIds });

    if (!userId) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    // Pastikan notificationIds adalah array
    const ids = Array.isArray(notificationIds) ? notificationIds : [];
    
    if (ids.length > 0) {
      // Validasi bahwa ids adalah array of numbers
      const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
      
      if (validIds.length === 0) {
        return c.json({ error: "ID notifikasi tidak valid" }, 400);
      }
      
      console.log('Valid IDs:', validIds);
      
      // MARK SPECIFIC NOTIFICATIONS - PAKAI inArray
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            inArray(notifications.id, validIds),
            eq(notifications.userId, userId)
          )
        );
    } else {
      // MARK ALL AS READ
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
    }

    return c.json({ 
      success: true, 
      message: "Notifikasi telah ditandai dibaca",
      count: ids.length 
    });
    
  } catch (error) {
    console.error("❌ Mark read error:", error);
    return c.json({ 
      error: error.message,
      details: "Gagal menandai notifikasi"
    }, 500);
  }
});

// ========== GET UNREAD COUNT ==========
app.get("/unread-count", async (c) => {
  try {
    const userId = parseInt(c.req.query("userId"));
    
    if (!userId || isNaN(userId)) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    const [result] = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));

    return c.json({ count: parseInt(result?.count || '0') });
    
  } catch (error) {
    console.error("Unread count error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== DELETE ALL NOTIFICATIONS ==========
app.delete("/clear", async (c) => {
  try {
    const userId = parseInt(c.req.query("userId"));
    
    if (!userId || isNaN(userId)) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));

    return c.json({ success: true });
    
  } catch (error) {
    console.error("Clear notifications error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;