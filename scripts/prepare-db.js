require('dotenv').config();
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';
let provider = 'sqlite';

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
  provider = 'postgresql';
} else {
  provider = 'sqlite';
}

console.log('[Database Adapter] Target provider: ' + provider + ' (URL: ' + (dbUrl ? dbUrl.split(':')[0] : 'default') + ')');

// Update provider in schema.prisma if different
const updatedSchema = schema.replace(
  /datasource db\s*\{\s*provider\s*=\s*"[^"]*"/,
  'datasource db {\n  provider = "' + provider + '"'
);

if (schema !== updatedSchema) {
  fs.writeFileSync(schemaPath, updatedSchema, 'utf8');
  console.log('[Database Adapter] Updated prisma/schema.prisma provider to "' + provider + '"');
} else {
  console.log('[Database Adapter] prisma/schema.prisma already configured for "' + provider + '"');
}
