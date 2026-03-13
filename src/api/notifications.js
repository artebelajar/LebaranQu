import { Hono } from "hono";
import { db } from "../db/index.js";
import { notifications, users_26, posts } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

const app = new Hono();

// GET /api/notifications - Ambil semua notifikasi user
app.get("/", async (c) => {
  try {
    const userId = parseInt(c.req.query("userId"));
    const limit = parseInt(c.req.query("limit") || "50");
    
    if (!userId) {
      return c.json({ error: "User ID required" }, 400);
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

    // Hitung jumlah notifikasi belum dibaca
    const unreadCount = userNotifications.filter(n => !n.isRead).length;

    return c.json({
      notifications: userNotifications,
      unreadCount
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/notifications/mark-read - Tandai notifikasi sebagai dibaca
app.post("/mark-read", async (c) => {
  try {
    const { userId, notificationIds } = await c.req.json();

    if (!userId) {
      return c.json({ error: "User ID required" }, 400);
    }

    if (notificationIds && notificationIds.length > 0) {
      // Tandai notifikasi tertentu
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(sql`${notifications.id} IN (${notificationIds.join(',')}) AND ${notifications.userId} = ${userId}`);
    } else {
      // Tandai semua notifikasi user sebagai dibaca
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Mark read error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/notifications/unread-count - Hitung notifikasi belum dibaca
app.get("/unread-count", async (c) => {
  try {
    const userId = parseInt(c.req.query("userId"));
    
    if (!userId) {
      return c.json({ error: "User ID required" }, 400);
    }

    const [result] = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));

    return c.json({ count: parseInt(result.count) });
  } catch (error) {
    console.error("Unread count error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/notifications/clear - Hapus semua notifikasi (optional)
app.delete("/clear", async (c) => {
  try {
    const userId = parseInt(c.req.query("userId"));
    
    if (!userId) {
      return c.json({ error: "User ID required" }, 400);
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