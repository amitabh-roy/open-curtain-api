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

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'opencurtain_db',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  console.log(`Connecting to database "${process.env.DB_NAME || 'opencurtain_db'}" on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}...`);
  await client.connect();

  console.log('Executing SQL script (truncating & importing hospitals and hospital_units)...');
  const startTime = Date.now();
  const res = await client.query(sql);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Execution completed successfully in ${duration}s!`);

  const results = Array.isArray(res) ? res : [res];
  for (const r of results) {
    if (r.rows && r.rows.length > 0) {
      console.log('Count Result:', r.rows);
    }
  }

  await client.end();
}

run().catch((err) => {
  console.error('Failed to execute SQL script:', err.message);
  process.exit(1);
});
