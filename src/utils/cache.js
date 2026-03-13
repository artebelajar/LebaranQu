import NodeCache from 'node-cache';

// Cache lokal sebagai fallback jika Redis down
const cache = new NodeCache({ 
  stdTTL: 60, // default 60 detik
  checkperiod: 120,
  useClones: false // untuk performa lebih baik
});

// Wrapper untuk mendapatkan data dengan fallback
cache.getOrSet = async (key, fetchFunction, ttl = 60) => {
  const cached = cache.get(key);
  if (cached) return cached;
  
  const data = await fetchFunction();
  cache.set(key, data, ttl);
  return data;
};

// Hapus banyak keys berdasarkan pattern
cache.delByPattern = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  cache.del(matchingKeys);
};

export default cache;