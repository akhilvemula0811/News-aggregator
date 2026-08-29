import axios from 'axios';

async function main() {
  console.log('🚀 Triggering ingestion...');
  try {
    const res = await axios.post('http://localhost:5000/api/admin/ingest', {}, {
      headers: {
        'x-admin-secret': 'super_secret_admin_token_123'
      }
    });
    console.log('Status:', res.status);
    console.log('Response:', res.data);
  } catch (e: any) {
    console.error('Error triggering ingest:', e.message);
  }
}

main();
