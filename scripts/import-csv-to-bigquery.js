#!/usr/bin/env node

/**
 * Скрипт для импорта CSV файла с недвижимостью в BigQuery
 * Использование: node scripts/import-csv-to-bigquery.js path/to/file.csv
 */

const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

async function importCSVToBigQuery(csvFilePath) {
  console.log(`📥 Importing CSV file: ${csvFilePath}`);

  const datasetId = process.env.BIGQUERY_DATASET;
  const tableId = 'properties';

  // Проверяем, существует ли файл
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
  }

  const metadata = {
    sourceFormat: 'CSV',
    skipLeadingRows: 1,
    autodetect: true,
    writeDisposition: 'WRITE_APPEND',
    schema: {
      fields: [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'title', type: 'STRING' },
        { name: 'property_type', type: 'STRING' },
        { name: 'developer', type: 'STRING' },
        { name: 'location', type: 'STRING' },
        { name: 'area', type: 'STRING' },
        { name: 'bedrooms', type: 'INTEGER' },
        { name: 'bathrooms', type: 'INTEGER' },
        { name: 'size', type: 'FLOAT' },
        { name: 'price', type: 'FLOAT' },
        { name: 'currency', type: 'STRING' },
        { name: 'payment_plan', type: 'STRING' },
        { name: 'completion_date', type: 'DATE' },
        { name: 'status', type: 'STRING' },
        { name: 'is_new', type: 'BOOLEAN' },
        { name: 'description', type: 'STRING' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' }
      ]
    }
  };

  try {
    console.log(`📊 Loading to ${datasetId}.${tableId}...`);

    const [job] = await bigquery
      .dataset(datasetId)
      .table(tableId)
      .load(csvFilePath, metadata);

    console.log(`✅ Job ${job.id} completed.`);

    // Получаем статистику
    const errors = job.status.errors;
    if (errors && errors.length > 0) {
      console.error('❌ Errors:');
      errors.forEach(error => console.error(error));
    } else {
      // Считаем количество записей
      const query = `
        SELECT COUNT(*) as total
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${datasetId}.${tableId}\`
      `;
      const [rows] = await bigquery.query({ query });
      console.log(`📈 Total records in table: ${rows[0].total}`);
    }

  } catch (error) {
    console.error('❌ Error loading data:', error);
    process.exit(1);
  }
}

// Main
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.log('Usage: node import-csv-to-bigquery.js path/to/file.csv');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/import-csv-to-bigquery.js ~/dubai_real_estate_channels.csv');
  process.exit(1);
}

importCSVToBigQuery(csvFilePath)
  .then(() => {
    console.log('✅ Import complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });

