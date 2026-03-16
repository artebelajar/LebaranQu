import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema.js';

// dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL tidak ditemukan di .env');
  process.exit(1);
}

let client;
let db;
let isConnecting = false;

async function connectWithRetry(retries = 5) {
  while (retries > 0) {
    try {
      console.log(`🔄 Mencoba koneksi database... (${6 - retries}/5)`);
      
      client = postgres(connectionString, {
        max: 3,
        idle_timeout: 10,
        connect_timeout: 5,
        max_lifetime: 60 * 5,
        prepare: true,
        debug: false,
        connection: {
          application_name: 'lebaranqu'
        },
        onclose: () => {
          console.log('📴 Database connection closed');
          if (!isConnecting) {
            isConnecting = true;
            setTimeout(() => {
              isConnecting = false;
              connectWithRetry(5);
            }, 1000);
          }
        },
        onconnect: () => {
          console.log('✅ Database connection established');
        }
      });

      db = drizzle(client, { schema });
      
      // Test query
      await client`SELECT 1`;
      console.log('✅ Database query test successful');
      
      return { client, db };
      
    } catch (error) {
      console.error(`❌ Database connection failed:`, error.message);
      retries--;
      if (retries === 0) {
        console.error('❌ Gagal konek database setelah 5 percobaan');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Initialize database
const { client: dbClient, db: dbInstance } = await connectWithRetry();
client = dbClient;
db = dbInstance;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Closing database connections...');
  if (client) {
    await client.end();
    console.log('Database connections closed');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, closing database connections...');
  if (client) {
    await client.end();
    console.log('Database connections closed');
  }
  process.exit(0);
});

export { db };