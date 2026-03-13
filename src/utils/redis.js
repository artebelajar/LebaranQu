import Redis from 'ioredis';

let redis;

// Coba konek ke Redis, jika gagal gunakan mock object
try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 2) {
        console.warn('⚠️ Redis tidak tersedia, melanjutkan tanpa cache');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 1000);
    }
  });

  redis.on('connect', () => console.log('✅ Redis connected'));
  
  redis.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
      console.warn('⚠️ Redis tidak tersedia, melanjutkan tanpa cache');
    } else {
      console.error('❌ Redis error:', err.message);
    }
  });

} catch (error) {
  console.warn('⚠️ Redis gagal diinisialisasi, melanjutkan tanpa cache');
  redis = null;
}

// Mock Redis functions jika Redis tidak tersedia
const mockRedis = {
  async get(key) { return null; },
  async setex(key, ttl, value) { return 'OK'; },
  async del(key) { return 1; },
  async delByPattern(pattern) { 
    console.log(`Cache deletion skipped (Redis not available): ${pattern}`);
    return Promise.resolve(); 
  },
  on() {},
  once() {}
};

// Export redis atau mock
export default redis || mockRedis;