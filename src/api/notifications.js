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
    const offset = parseInt(c.req.query("offset") || "0");
    
    if (!userId || isNaN(userId)) {
      return c.json({ error: "User ID diperlukan" }, 400);
    }

    // Batasi limit maksimal 100
    const safeLimit = Math.min(limit, 100);
    
    // Ambil notifikasi dengan pagination
    const userNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        message: notifications.message,
        data: notifications.data,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
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
      .limit(safeLimit)
      .offset(offset);

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
      notifications: userNotifications,
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

    // Konversi userId ke integer
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return c.json({ error: "User ID tidak valid" }, 400);
    }

    let updatedCount = 0;

    // Pastikan notificationIds adalah array
    const ids = Array.isArray(notificationIds) ? notificationIds : [];
    
    if (ids.length > 0) {
      // Validasi bahwa ids adalah array of numbers
      const validIds = ids
        .filter(id => id !== null && id !== undefined && !isNaN(parseInt(id)))
        .map(id => parseInt(id));
      
      if (validIds.length === 0) {
        return c.json({ error: "ID notifikasi tidak valid" }, 400);
      }
      
      console.log('✅ Valid IDs:', validIds);
      
      // MARK SPECIFIC NOTIFICATIONS
      const result = await db
        .update(notifications)
        .set({ 
          isRead: true,
          updatedAt: new Date()
        })
        .where(
          and(
            inArray(notifications.id, validIds),
            eq(notifications.userId, parsedUserId)
          )
        );
      
      updatedCount = validIds.length;
    } else {
      // MARK ALL AS READ
      const result = await db
        .update(notifications)
        .set({ 
          isRead: true,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(notifications.userId, parsedUserId),
            eq(notifications.isRead, false)
          )
        );
      
      // Dapatkan jumlah yang diupdate
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
      error: "Gagal mendapatkan jumlah notifikasi",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      .set({ 
        isRead: true,
        updatedAt: new Date()
      })
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
      error: "Gagal menandai notifikasi",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      error: "Gagal menghapus notifikasi",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      error: "Gagal menghapus notifikasi",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, 500);
  }
});

// ========== CREATE NOTIFICATION (HELPER) ==========
// Fungsi ini bisa dipanggil dari file lain
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
        updatedAt: new Date()
      })
      .returning();

    return newNotification;
  } catch (error) {
    console.error("❌ Create notification error:", error);
    throw error;
  }
}

export default app;