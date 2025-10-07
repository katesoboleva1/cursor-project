/**
 * MCP Refty Server - обработка natural language запросов
 * Model Context Protocol для интеллектуального поиска недвижимости
 */

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// OpenAI integration для NLP
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Контекст для MCP - знания о недвижимости Dubai
const DUBAI_CONTEXT = {
  locations: [
    { name: 'Downtown Dubai', aliases: ['downtown', 'даунтаун'], description: 'Центр Дубая, Burj Khalifa' },
    { name: 'Dubai Marina', aliases: ['marina', 'марина'], description: 'Прибрежный район с яхтами' },
    { name: 'Business Bay', aliases: ['business bay', 'бизнес бэй'], description: 'Деловой центр' },
    { name: 'Palm Jumeirah', aliases: ['palm', 'палм', 'пальма'], description: 'Искусственный остров' },
    { name: 'JBR', aliases: ['jbr', 'jumeirah beach residence'], description: 'Пляжная зона' },
    { name: 'Dubai Creek', aliases: ['creek', 'крик'], description: 'Исторический район' }
  ],
  priceRanges: {
    'budget': { min: 0, max: 800000 },
    'medium': { min: 800000, max: 2000000 },
    'premium': { min: 2000000, max: 5000000 },
    'luxury': { min: 5000000, max: 999999999 }
  },
  developers: [
    'Emaar', 'Damac', 'Nakheel', 'Meraas', 'Dubai Properties',
    'Sobha', 'Azizi', 'Danube', 'Omniyat'
  ]
};

// Системный промпт для MCP
const SYSTEM_PROMPT = `Ты - ассистент по недвижимости Refty для Дубая. 
Твоя задача - понимать запросы пользователей на русском, английском и арабском языках и преобразовывать их в структурированные фильтры для поиска.

Контекст:
- Локации: ${DUBAI_CONTEXT.locations.map(l => l.name).join(', ')}
- Застройщики: ${DUBAI_CONTEXT.developers.join(', ')}

Преобразуй запрос пользователя в JSON с полями:
{
  "filters": {
    "priceMin": number | null,
    "priceMax": number | null,
    "bedrooms": number | null,
    "location": string | null,
    "developer": string | null,
    "propertyType": string | null
  },
  "intent": "search" | "recommend" | "compare" | "info",
  "interpretation": "Человекопонятное объяснение запроса"
}

Примеры:
- "Квартира в Downtown до 2 миллионов" -> {"filters": {"location": "Downtown Dubai", "priceMax": 2000000}, "intent": "search", "interpretation": "Ищу квартиры в Downtown Dubai до 2 млн AED"}
- "Студия в Marina" -> {"filters": {"location": "Dubai Marina", "bedrooms": 0}, "intent": "search", "interpretation": "Ищу студии в Dubai Marina"}
`;

// Обработка запросов через MCP
app.post('/query', async (req, res) => {
  try {
    const { query, userId, context } = req.body;

    console.log(`[MCP Refty] Processing query from ${userId}: ${query}`);

    // Используем GPT для понимания запроса
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const mcpResponse = JSON.parse(completion.choices[0].message.content);

    // Обогащаем ответ контекстом пользователя
    if (context?.preferences) {
      // Применяем персональные предпочтения
      if (!mcpResponse.filters.priceMax && context.preferences.priceMax) {
        mcpResponse.filters.priceMax = context.preferences.priceMax;
      }
      if (!mcpResponse.filters.bedrooms && context.preferences.bedrooms) {
        mcpResponse.filters.bedrooms = context.preferences.bedrooms;
      }
    }

    console.log(`[MCP Refty] Response:`, mcpResponse);

    res.json(mcpResponse);

  } catch (error) {
    console.error('[MCP Refty] Error:', error);
    
    // Fallback к базовому парсингу
    const fallbackResponse = basicQueryParser(req.body.query);
    res.json(fallbackResponse);
  }
});

// Базовый парсер как fallback
function basicQueryParser(query) {
  const filters = {};
  const lowerQuery = query.toLowerCase();

  // Цена
  const pricePatterns = [
    /(\d+)\s*(?:млн|million|m)/gi,
    /(\d+)\s*(?:тыс|тысяч|k|thousand)/gi,
    /до\s*(\d+)/gi,
    /under\s*(\d+)/gi
  ];

  for (const pattern of pricePatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      let price = parseInt(match[0].replace(/\D/g, ''));
      if (lowerQuery.includes('млн') || lowerQuery.includes('million')) {
        price *= 1000000;
      } else if (lowerQuery.includes('тыс') || lowerQuery.includes('k')) {
        price *= 1000;
      }
      filters.priceMax = price;
      break;
    }
  }

  // Спальни
  const bedroomPatterns = [
    /(\d+)\s*(?:bedroom|спальн|комнат)/gi,
    /студия/gi
  ];

  for (const pattern of bedroomPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      if (lowerQuery.includes('студия')) {
        filters.bedrooms = 0;
      } else {
        filters.bedrooms = parseInt(match[0].replace(/\D/g, ''));
      }
      break;
    }
  }

  // Локация
  for (const location of DUBAI_CONTEXT.locations) {
    for (const alias of location.aliases) {
      if (lowerQuery.includes(alias.toLowerCase())) {
        filters.location = location.name;
        break;
      }
    }
    if (filters.location) break;
  }

  // Застройщик
  for (const developer of DUBAI_CONTEXT.developers) {
    if (lowerQuery.includes(developer.toLowerCase())) {
      filters.developer = developer;
      break;
    }
  }

  // Тип недвижимости
  const propertyTypes = {
    'apartment': ['квартира', 'apartment', 'апартамент'],
    'villa': ['вилла', 'villa'],
    'townhouse': ['таунхаус', 'townhouse'],
    'penthouse': ['пентхаус', 'penthouse']
  };

  for (const [type, keywords] of Object.entries(propertyTypes)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        filters.propertyType = type;
        break;
      }
    }
    if (filters.propertyType) break;
  }

  return {
    filters,
    intent: 'search',
    interpretation: `Поиск недвижимости с параметрами: ${JSON.stringify(filters)}`
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'MCP Refty' });
});

// Получение контекста
app.get('/context', (req, res) => {
  res.json(DUBAI_CONTEXT);
});

const PORT = process.env.MCP_REFTY_PORT || 3002;
app.listen(PORT, () => {
  console.log(`[MCP Refty] Server running on port ${PORT}`);
});

module.exports = app;

