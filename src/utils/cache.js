// ===================================================
// FILE: src/utils/cache.js
// ===================================================
import Redis from 'ioredis';

let redis = null;

// Coba konek ke Redis
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 2) {
          console.warn('⚠️ Redis tidak tersedia, menggunakan memory cache');
          return null;
        }
        return Math.min(times * 100, 1000);
      }
    });

    redis.on('connect', () => console.log('✅ Redis connected'));
    redis.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.warn('⚠️ Redis tidak tersedia, menggunakan memory cache');
      }
    });
  } catch (error) {
    console.warn('⚠️ Redis gagal diinisialisasi, menggunakan memory cache');
  }
}

// Memory cache sebagai fallback
const memoryCache = new Map();

// Cache wrapper
export const cache = {
  async get(key) {
    // Coba Redis dulu
    if (redis) {
      try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.warn('Redis get error, fallback to memory');
      }
    }
    
    // Fallback ke memory cache
    if (memoryCache.has(key)) {
      const { data, expiry } = memoryCache.get(key);
      if (expiry > Date.now()) {
        return data;
      } else {
        memoryCache.delete(key);
      }
    }
    return null;
  },

  async set(key, data, ttl = 300) { // ttl dalam detik, default 5 menit
    // Simpan di Redis
    if (redis) {
      try {
        await redis.setex(key, ttl, JSON.stringify(data));
        return;
      } catch (error) {
        console.warn('Redis set error, fallback to memory');
      }
    }
    
    // Fallback ke memory cache
    memoryCache.set(key, {
      data,
      expiry: Date.now() + (ttl * 1000)
    });
  },

  async del(key) {
    if (redis) {
      try {
        await redis.del(key);
      } catch (error) {
        console.warn('Redis del error');
      }
    }
    memoryCache.delete(key);
  },

  async delPattern(pattern) {
    if (redis) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (error) {
        console.warn('Redis delPattern error');
      }
    }
    
    // Hapus dari memory cache yang match pattern
    const patternRegex = new RegExp(pattern.replace('*', '.*'));
    for (const key of memoryCache.keys()) {
      if (patternRegex.test(key)) {
        memoryCache.delete(key);
      }
    }
  },

  // Untuk debugging
  async getStats() {
    return {
      redis: redis ? 'connected' : 'disconnected',
      memorySize: memoryCache.size,
      memoryKeys: Array.from(memoryCache.keys())
    };
  }
};