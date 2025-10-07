const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { BigQuery } = require('@google-cloud/bigquery');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

// Initialize BigQuery
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Store user sessions and preferences
const userSessions = new Map();

// BigQuery real-time data fetcher
async function fetchRealEstateData(filters = {}) {
  const query = `
    SELECT 
      *
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.properties\`
    WHERE 1=1
    ${filters.priceMin ? `AND price >= ${filters.priceMin}` : ''}
    ${filters.priceMax ? `AND price <= ${filters.priceMax}` : ''}
    ${filters.bedrooms ? `AND bedrooms = ${filters.bedrooms}` : ''}
    ${filters.location ? `AND LOWER(location) LIKE '%${filters.location.toLowerCase()}%'` : ''}
    ${filters.developer ? `AND LOWER(developer) LIKE '%${filters.developer.toLowerCase()}%'` : ''}
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const [rows] = await bigquery.query({ query });
  return rows;
}

// MCP Refty integration for natural language queries
async function processMCPQuery(userQuery, userId) {
  try {
    // Send query to MCP Refty
    const response = await axios.post(`${process.env.MCP_REFTY_ENDPOINT}/query`, {
      query: userQuery,
      userId: userId,
      context: {
        domain: 'real_estate',
        location: 'dubai',
        preferences: userSessions.get(userId)?.preferences || {}
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MCP_REFTY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('MCP Refty error:', error.message);
    // Fallback to basic query parsing
    return parseBasicQuery(userQuery);
  }
}

// Basic query parser as fallback
function parseBasicQuery(query) {
  const filters = {};
  const lowerQuery = query.toLowerCase();

  // Price extraction
  const priceMatch = lowerQuery.match(/(\d+)\s*(?:тыс|тысяч|k|thousand|миллион|million|m)/gi);
  if (priceMatch) {
    filters.priceMax = parseInt(priceMatch[0]) * (lowerQuery.includes('million') || lowerQuery.includes('миллион') ? 1000000 : 1000);
  }

  // Bedrooms
  const bedroomsMatch = lowerQuery.match(/(\d+)\s*(?:bedroom|комнат|спален)/gi);
  if (bedroomsMatch) {
    filters.bedrooms = parseInt(bedroomsMatch[0]);
  }

  // Location
  const locations = ['downtown', 'marina', 'jbr', 'palm', 'business bay', 'creek'];
  locations.forEach(loc => {
    if (lowerQuery.includes(loc)) {
      filters.location = loc;
    }
  });

  return { filters, intent: 'search' };
}

// Send user interaction to n8n for learning
async function sendToN8N(userId, interaction) {
  try {
    await axios.post(process.env.N8N_WEBHOOK_URL, {
      userId,
      interaction,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('n8n webhook error:', error.message);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Initialize user session
  socket.on('init_session', (data) => {
    const userId = data.userId || socket.id;
    userSessions.set(userId, {
      socketId: socket.id,
      preferences: data.preferences || {},
      searchHistory: []
    });

    socket.emit('session_initialized', { userId });
  });

  // Handle natural language queries
  socket.on('ask_question', async (data) => {
    const { query, userId } = data;
    console.log(`Query from ${userId}: ${query}`);

    try {
      // Process with MCP Refty
      const mcpResponse = await processMCPQuery(query, userId);
      
      // Get data from BigQuery
      const results = await fetchRealEstateData(mcpResponse.filters || {});

      // Store in session
      const session = userSessions.get(userId);
      if (session) {
        session.searchHistory.push({
          query,
          filters: mcpResponse.filters,
          resultCount: results.length,
          timestamp: new Date()
        });
      }

      // Send to n8n for learning
      await sendToN8N(userId, {
        type: 'search',
        query,
        filters: mcpResponse.filters,
        resultCount: results.length
      });

      // Send results back to client
      socket.emit('search_results', {
        query,
        results,
        filters: mcpResponse.filters,
        interpretation: mcpResponse.interpretation
      });

    } catch (error) {
      console.error('Query processing error:', error);
      socket.emit('error', { message: 'Ошибка обработки запроса' });
    }
  });

  // Handle property view tracking
  socket.on('view_property', async (data) => {
    const { propertyId, userId } = data;
    
    await sendToN8N(userId, {
      type: 'view',
      propertyId,
      timestamp: new Date()
    });

    socket.emit('property_tracked', { propertyId });
  });

  // Handle filter updates
  socket.on('update_filters', async (data) => {
    const { filters, userId } = data;

    try {
      const results = await fetchRealEstateData(filters);
      
      socket.emit('search_results', {
        results,
        filters
      });

      await sendToN8N(userId, {
        type: 'filter_update',
        filters
      });

    } catch (error) {
      console.error('Filter update error:', error);
      socket.emit('error', { message: 'Ошибка обновления фильтров' });
    }
  });

  // Get personalized recommendations
  socket.on('get_recommendations', async (data) => {
    const { userId } = data;
    const session = userSessions.get(userId);

    if (!session || session.searchHistory.length === 0) {
      socket.emit('recommendations', { results: [] });
      return;
    }

    try {
      // Analyze user preferences from history
      const preferences = analyzeUserPreferences(session.searchHistory);
      
      const results = await fetchRealEstateData(preferences);

      socket.emit('recommendations', {
        results,
        basedOn: preferences
      });

    } catch (error) {
      console.error('Recommendations error:', error);
      socket.emit('error', { message: 'Ошибка получения рекомендаций' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Analyze user preferences from search history
function analyzeUserPreferences(searchHistory) {
  const preferences = {};
  
  // Find most common filters
  const allFilters = searchHistory.map(s => s.filters).filter(f => f);
  
  if (allFilters.length > 0) {
    // Average price range
    const prices = allFilters.filter(f => f.priceMax).map(f => f.priceMax);
    if (prices.length > 0) {
      preferences.priceMax = Math.round(prices.reduce((a, b) => a + b) / prices.length);
    }

    // Most common bedrooms
    const bedrooms = allFilters.filter(f => f.bedrooms).map(f => f.bedrooms);
    if (bedrooms.length > 0) {
      preferences.bedrooms = Math.round(bedrooms.reduce((a, b) => a + b) / bedrooms.length);
    }

    // Most common location
    const locations = allFilters.filter(f => f.location).map(f => f.location);
    if (locations.length > 0) {
      preferences.location = locations.sort((a, b) =>
        locations.filter(v => v === a).length - locations.filter(v => v === b).length
      ).pop();
    }
  }

  return preferences;
}

// REST API endpoints
app.get('/api/properties', async (req, res) => {
  try {
    const filters = req.query;
    const results = await fetchRealEstateData(filters);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const { query, userId } = req.body;
    const mcpResponse = await processMCPQuery(query, userId);
    const results = await fetchRealEstateData(mcpResponse.filters || {});
    
    res.json({
      success: true,
      data: results,
      filters: mcpResponse.filters,
      interpretation: mcpResponse.interpretation
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_properties,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(DISTINCT developer) as total_developers,
        COUNT(DISTINCT location) as total_locations
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${process.env.BIGQUERY_DATASET}.properties\`
    `;

    const [rows] = await bigquery.query({ query });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

