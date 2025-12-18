
import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

/**
 * Initialize Neon connection.
 * neon() automatically uses process.env.DATABASE_URL if not provided,
 * but we can also be explicit or use NETLIFY_DATABASE_URL.
 */
const sql = neon(process.env.DATABASE_URL || '');

/**
 * Helper to initialize the database table.
 * Neon HTTP driver handles connections per-request, so we don't need a pool.
 */
const ensureTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS erp_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
};

export const handler: Handler = async (event) => {
  const path = event.path.replace(/\.netlify\/functions\/api\/?/, '');
  const method = event.httpMethod;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Ensure table exists on every write/read path
    await ensureTable();

    // HEALTH CHECK
    if (path === 'health') {
      // Test the connection with a simple query
      await sql`SELECT 1`;
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ status: 'connected', provider: 'Neon HTTP' }) 
      };
    }

    // SHIPMENTS ENDPOINT
    if (path === 'shipments') {
      if (method === 'GET') {
        const result = await sql`SELECT data FROM erp_state WHERE id = 'main_state'`;
        const data = result.length > 0 ? result[0].data : [];
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }

      if (method === 'POST') {
        const payload = JSON.parse(event.body || '[]');
        // Atomic Upsert using JSONB
        await sql`
          INSERT INTO erp_state (id, data, updated_at)
          VALUES ('main_state', ${JSON.stringify(payload)}, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
        `;
        
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Endpoint not found' }) };

  } catch (error: any) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error.message,
        hint: 'Check if DATABASE_URL is set in Netlify Environment Variables'
      })
    };
  }
};
