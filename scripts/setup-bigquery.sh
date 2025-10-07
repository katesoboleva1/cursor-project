#!/bin/bash

# Setup BigQuery for Real Estate Dashboard

echo "🚀 Setting up BigQuery for Real Estate Dashboard..."

# Check if gcloud is installed
if ! command -v bq &> /dev/null; then
    echo "❌ BigQuery CLI (bq) not found. Please install Google Cloud SDK."
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found"
    exit 1
fi

# Create dataset
echo "📊 Creating dataset: $BIGQUERY_DATASET"
bq mk -d --location=US $GOOGLE_CLOUD_PROJECT:$BIGQUERY_DATASET

# Create tables from schema
echo "📝 Creating tables..."
bq query --use_legacy_sql=false < bigquery/schema.sql

# Load sample data (optional)
if [ -f "data/sample_properties.json" ]; then
    echo "📥 Loading sample data..."
    bq load \
        --source_format=NEWLINE_DELIMITED_JSON \
        $GOOGLE_CLOUD_PROJECT:$BIGQUERY_DATASET.properties \
        data/sample_properties.json
fi

echo "✅ BigQuery setup complete!"
echo ""
echo "📊 Dataset: $GOOGLE_CLOUD_PROJECT:$BIGQUERY_DATASET"
echo "🔗 Console: https://console.cloud.google.com/bigquery?project=$GOOGLE_CLOUD_PROJECT"

