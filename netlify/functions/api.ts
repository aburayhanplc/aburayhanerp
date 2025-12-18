
import { Handler } from '@netlify/functions';
import { neon } from '@netlify/neon';

const sql = neon(process.env.DATABASE_URL || '');

const ensureTable = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }
  await sql`
    CREATE TABLE IF NOT EXISTS erp_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
};

export const handler: Handler = async (event) => {
  // More robust sub-path extraction
  const path = event.path
    .replace('/.netlify/functions/api', '')
    .replace('/api', '')
    .replace(/^\/+|\/+$/g, '');
    
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
    await ensureTable();

    if (path === 'health') {
      await sql`SELECT 1`;
      return { 
        statusCode: 200, 
        headers, 
        body: JSON.stringify({ status: 'connected', provider: 'Neon HTTP' }) 
      };
    }

    if (path === 'shipments') {
      if (method === 'GET') {
        const result = await sql`SELECT data FROM erp_state WHERE id = 'main_state'`;
        const data = result.length > 0 ? result[0].data : [];
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }

      if (method === 'POST') {
        const payload = JSON.parse(event.body || '[]');
        await sql`
          INSERT INTO erp_state (id, data, updated_at)
          VALUES ('main_state', ${JSON.stringify(payload)}, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP
        `;
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }
    }

    return { 
      statusCode: 404, 
      headers, 
      body: JSON.stringify({ error: 'Endpoint not found', path: path, rawPath: event.path }) 
    };

  } catch (error: any) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Database Connectivity Issue', 
        message: error.message
      })
    };
  }
};
