#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadEnvFile } = require('node:process');
const { Client } = require('pg');

const envFilePath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFilePath)) {
  loadEnvFile(envFilePath);
}

async function run() {
  const sqlFilePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, 'hospitals_import.sql');

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`SQL file not found at: ${sqlFilePath}`);
    process.exit(1);
  }

  console.log(`Reading SQL script: ${sqlFilePath}`);
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

  console.log(`Connecting to database "${database}" on ${host}:${port}...`);
  await client.connect();

  console.log('Executing SQL script (safe upsert & hospital_units mapping)...');
  const startTime = Date.now();
  const res = await client.query(sql);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Execution completed successfully in ${duration}s!`);

  const results = Array.isArray(res) ? res : [res];
  for (const r of results) {
    if (r.rows && r.rows.length > 0) {
      const row = r.rows[0];
      if (row.total_hospitals_imported) {
        console.log(`Total Hospitals: ${row.total_hospitals_imported}`);
      }
      if (row.total_hospital_units_created) {
        console.log(`Total Hospital Units: ${row.total_hospital_units_created}`);
      }
    }
  }

  await client.end();
}

run().catch((err) => {
  console.error('Failed to execute SQL script:', err.message);
  process.exit(1);
});
