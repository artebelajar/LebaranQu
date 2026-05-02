// ===================================================
// FILE: src/api/notifications.js (BACKEND - FULL CODE)
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
    const offset = parseInt(c.req.query("offset") || "0");
    
    if (!userId || isNaN(userId)) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    const safeLimit = Math.min(limit, 100);

    // Ambil notifikasi dengan cara yang lebih sederhana
    const userNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        message: notifications.message,
        data: notifications.data,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        fromUserId: notifications.fromUserId,
        postId: notifications.postId,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(safeLimit)
      .offset(offset);

    // Ambil data user untuk setiap notifikasi (manual join)
    const notificationsWithUser = await Promise.all(
      userNotifications.map(async (notif) => {
        let fromUser = null;
        if (notif.fromUserId) {
          const [user] = await db
            .select({
              id: users_26.id,
              namaLengkap: users_26.namaLengkap,
              fotoProfil: users_26.fotoProfil,
            })
            .from(users_26)
            .where(eq(users_26.id, notif.fromUserId))
            .limit(1);
          fromUser = user;
        }

        let post = null;
        if (notif.postId) {
          const [postData] = await db
            .select({
              id: posts.id,
              judul: posts.judul,
            })
            .from(posts)
            .where(eq(posts.id, notif.postId))
            .limit(1);
          post = postData;
        }

        return {
          id: notif.id,
          type: notif.type,
          message: notif.message,
          data: notif.data,
          isRead: notif.isRead,
          createdAt: notif.createdAt,
          fromUser: fromUser,
          post: post,
        };
      })
    );

    // Hitung total notifikasi
    const [totalResult] = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    // Hitung unread count
    const [unreadResult] = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));

    return c.json({
      success: true,
      notifications: notificationsWithUser,
      unreadCount: parseInt(unreadResult?.count || '0'),
      total: parseInt(totalResult?.count || '0'),
      limit: safeLimit,
      offset: offset
    });
    
  } catch (error) {
    console.error("❌ Get notifications error:", error);
    return c.json({ 
      success: false,
      error: "Gagal memuat notifikasi",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, 500);
  }
});

// ========== MARK AS READ ==========
app.post("/mark-read", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, notificationIds } = body;

    console.log('📝 Mark read request:', { userId, notificationIds });

    if (!userId) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return c.json({ error: "User ID tidak valid" }, 400);
    }

    let updatedCount = 0;
    const ids = Array.isArray(notificationIds) ? notificationIds : [];
    
    if (ids.length > 0) {
      const validIds = ids
        .filter(id => id !== null && id !== undefined && !isNaN(parseInt(id)))
        .map(id => parseInt(id));
      
      if (validIds.length === 0) {
        return c.json({ error: "ID notifikasi tidak valid" }, 400);
      }
      
      // Update specific notifications
      for (const id of validIds) {
        await db
          .update(notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(notifications.id, id),
              eq(notifications.userId, parsedUserId)
            )
          );
      }
      updatedCount = validIds.length;
    } else {
      // Mark all as read
      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.userId, parsedUserId),
            eq(notifications.isRead, false)
          )
        );
      
      const [countResult] = await db
        .select({ count: sql`count(*)` })
        .from(notifications)
        .where(and(
          eq(notifications.userId, parsedUserId),
          eq(notifications.isRead, false)
        ));
      
      updatedCount = parseInt(countResult?.count || '0');
    }

    return c.json({ 
      success: true, 
      message: "Notifikasi telah ditandai dibaca",
      count: updatedCount 
    });
    
  } catch (error) {
    console.error("❌ Mark read error:", error);
    return c.json({ 
      success: false,
      error: "Gagal menandai notifikasi",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    return c.json({ 
      success: true,
      count: parseInt(result?.count || '0') 
    });
    
  } catch (error) {
    console.error("❌ Unread count error:", error);
    return c.json({ 
      success: false,
      error: "Gagal mendapatkan jumlah notifikasi"
    }, 500);
  }
});

// ========== MARK SINGLE NOTIFICATION AS READ ==========
app.post("/:id/read", async (c) => {
  try {
    const notificationId = parseInt(c.req.param("id"));
    const { userId } = await c.req.json();

    if (!notificationId || isNaN(notificationId)) {
      return c.json({ error: "ID notifikasi tidak valid" }, 400);
    }

    if (!userId) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return c.json({ error: "User ID tidak valid" }, 400);
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, parsedUserId)
        )
      );

    return c.json({ 
      success: true, 
      message: "Notifikasi telah ditandai dibaca" 
    });
    
  } catch (error) {
    console.error("❌ Mark single notification read error:", error);
    return c.json({ 
      success: false,
      error: "Gagal menandai notifikasi"
    }, 500);
  }
});

// ========== DELETE ALL NOTIFICATIONS ==========
app.delete("/clear", async (c) => {
  try {
    const userId = parseInt(c.req.query("userId"));
    
    if (!userId || isNaN(userId)) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));

    return c.json({ 
      success: true, 
      message: "Semua notifikasi telah dihapus",
      deletedCount: parseInt(countResult?.count || '0')
    });
    
  } catch (error) {
    console.error("❌ Clear notifications error:", error);
    return c.json({ 
      success: false,
      error: "Gagal menghapus notifikasi"
    }, 500);
  }
});

// ========== DELETE SINGLE NOTIFICATION ==========
app.delete("/:id", async (c) => {
  try {
    const notificationId = parseInt(c.req.param("id"));
    const userId = parseInt(c.req.query("userId"));

    if (!notificationId || isNaN(notificationId)) {
      return c.json({ error: "ID notifikasi tidak valid" }, 400);
    }

    if (!userId || isNaN(userId)) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );

    return c.json({ 
      success: true, 
      message: "Notifikasi telah dihapus" 
    });
    
  } catch (error) {
    console.error("❌ Delete notification error:", error);
    return c.json({ 
      success: false,
      error: "Gagal menghapus notifikasi"
    }, 500);
  }
});

// ========== CREATE NOTIFICATION (HELPER) ==========
export async function createNotification(notificationData) {
  try {
    const { userId, fromUserId, postId, type, message, data } = notificationData;
    
    const [newNotification] = await db
      .insert(notifications)
      .values({
        userId,
        fromUserId: fromUserId || null,
        postId: postId || null,
        type,
        message,
        data: data ? JSON.stringify(data) : null,
        isRead: false,
        createdAt: new Date(),
      })
      .returning();

    return newNotification;
  } catch (error) {
    console.error("❌ Create notification error:", error);
    throw error;
  }
}

export default app;