const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

if (!fs.existsSync(schemaPath)) {
  console.error(`[Prepare DB] schema.prisma not found at ${schemaPath}`);
  process.exit(1);
}

let schema = fs.readFileSync(schemaPath, 'utf8');
const dbProvider = process.env.DB_PROVIDER || 'sqlite';

if (dbProvider === 'postgresql') {
  schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  console.log('[Prepare DB] Switched database provider to postgresql.');
} else {
  schema = schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
  console.log('[Prepare DB] Switched database provider to sqlite.');
}

fs.writeFileSync(schemaPath, schema);
