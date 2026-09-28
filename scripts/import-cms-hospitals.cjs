#!/usr/bin/env node
'use strict';

/**
 * Hospital Database Migration & Import Script
 *
 * Source of Truth: scripts/hospitals_import.sql (8,226 Master Hospitals)
 * Does NOT require external CSV files on the server.
 *
 * Usage:
 *   npm run import:hospitals
 *   or:
 *   node scripts/import-cms-hospitals.cjs
 */

const fs = require('node:fs');
const path = require('node:path');
const { loadEnvFile } = require('node:process');
const { Client } = require('pg');

const envFilePath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFilePath)) {
  loadEnvFile(envFilePath);
}

async function main() {
  const sqlFilePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, 'hospitals_import.sql');

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`[Import] Error: SQL source file not found at: ${sqlFilePath}`);
    process.exit(1);
  }

  console.log(`[Import] Source of truth: ${sqlFilePath}`);
  const sql = fs.readFileSync(sqlFilePath, 'utf8');

  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';
  const database = process.env.DB_NAME || 'opencurtain_db';
  const isAwsRds = host.includes('rds.amazonaws.com');
  const ssl = process.env.DB_SSL === 'true' || isAwsRds ? { rejectUnauthorized: false } : false;

  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    ssl,
  });

  console.log(`[Import] Connecting to database "${database}" on ${host}:${port}...`);
  await client.connect();

  console.log('[Import] Executing SQL migration (safe upsert & hospital_units mapping)...');
  const startTime = Date.now();
  const res = await client.query(sql);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[Import] Success! Executed in ${duration}s.`);

  const results = Array.isArray(res) ? res : [res];
  for (const r of results) {
    if (r.rows && r.rows.length > 0) {
      const row = r.rows[0];
      if (row.total_hospitals_imported) {
        console.log(`[Import] Total Hospitals in DB: ${row.total_hospitals_imported}`);
      }
      if (row.total_hospital_units_created) {
        console.log(`[Import] Total Hospital Units in DB: ${row.total_hospital_units_created}`);
      }
    }
  }

  await client.end();
}

main().catch((err) => {
  console.error('[Import] Failed to execute migration:', err.message);
  process.exit(1);
});
