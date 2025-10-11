#!/usr/bin/env node

/**
 * Скрипт для синхронизации данных из вашего CSV в BigQuery
 * с маппингом полей и обогащением данных
 */

const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Маппинг полей из вашего CSV в схему BigQuery
const FIELD_MAPPING = {
  // Ваше поле -> Наше поле
  'Channel Name': 'developer',
  'Channel Title': 'title',
  'Channel Description': 'description',
  'Subscribers': 'views_count',
  'Total Views': 'total_views',
  'Video Count': 'property_count',
  'URL': 'contact_url',
  // Добавьте свои маппинги здесь
};

// Функция для преобразования строки CSV в формат BigQuery
function transformRecord(record) {
  const transformed = {
    id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'available',
    currency: 'AED'
  };

  // Применяем маппинг
  for (const [csvField, bqField] of Object.entries(FIELD_MAPPING)) {
    if (record[csvField]) {
      transformed[bqField] = record[csvField];
    }
  }

  // Дополнительные преобразования
  // Пример: извлечение цены из текста
  if (record.description) {
    const priceMatch = record.description.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:AED|درهم)/i);
    if (priceMatch) {
      transformed.price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    // Извлечение количества спален
    const bedroomsMatch = record.description.match(/(\d+)\s*(?:bedroom|BR|спальн)/i);
    if (bedroomsMatch) {
      transformed.bedrooms = parseInt(bedroomsMatch[1]);
    }
  }

  // Определение локации
  const locationKeywords = {
    'Downtown Dubai': ['downtown', 'burj khalifa', 'даунтаун'],
    'Dubai Marina': ['marina', 'марина'],
    'Business Bay': ['business bay', 'бизнес'],
    'Palm Jumeirah': ['palm', 'пальма', 'jumeirah'],
    'JBR': ['jbr', 'beach residence']
  };

  const text = (record.description || '').toLowerCase();
  for (const [location, keywords] of Object.entries(locationKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      transformed.location = location;
      break;
    }
  }

  return transformed;
}

async function syncData(csvFilePath) {
  console.log(`🔄 Syncing data from: ${csvFilePath}`);

  const records = [];
  let processed = 0;
  let skipped = 0;

  // Читаем CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const transformed = transformRecord(row);
          
          // Валидация: пропускаем записи без обязательных полей
          if (!transformed.title && !transformed.developer) {
            skipped++;
            return;
          }

          records.push(transformed);
          processed++;

          if (processed % 100 === 0) {
            console.log(`📊 Processed ${processed} records...`);
          }
        } catch (error) {
          console.error('Error transforming record:', error);
          skipped++;
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`✅ Processed ${processed} records, skipped ${skipped}`);

  // Загружаем в BigQuery батчами
  const BATCH_SIZE = 500;
  const datasetId = process.env.BIGQUERY_DATASET;
  const tableId = 'properties';

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    try {
      await bigquery
        .dataset(datasetId)
        .table(tableId)
        .insert(batch);

      console.log(`✅ Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)`);
    } catch (error) {
      console.error(`❌ Error uploading batch:`, error);
      
      // Попытка загрузить записи по одной
      for (const record of batch) {
        try {
          await bigquery
            .dataset(datasetId)
            .table(tableId)
            .insert([record]);
        } catch (e) {
          console.error('Failed to insert record:', record.id, e.message);
        }
      }
    }
  }

  console.log(`🎉 Sync complete! Total records: ${processed}`);
}

// Main
const csvFilePath = process.argv[2] || process.env.DEFAULT_CSV_PATH;

if (!csvFilePath) {
  console.log('Usage: node sync-data.js path/to/file.csv');
  console.log('');
  console.log('Or set DEFAULT_CSV_PATH in .env');
  process.exit(1);
}

syncData(csvFilePath)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });

