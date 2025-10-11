import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Head from 'next/head';
import Dashboard from '../components/Dashboard';
import SearchBar from '../components/SearchBar';
import PropertyGrid from '../components/PropertyGrid';
import StatsPanel from '../components/StatsPanel';
import ChatInterface from '../components/ChatInterface';

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    const socketClient = io('http://localhost:3001');
    setSocket(socketClient);

    // Generate or retrieve user ID
    let storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      storedUserId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', storedUserId);
    }
    setUserId(storedUserId);

    // Initialize session
    socketClient.emit('init_session', {
      userId: storedUserId,
      preferences: JSON.parse(localStorage.getItem('preferences') || '{}')
    });

    // Listen for session initialization
    socketClient.on('session_initialized', (data) => {
      console.log('Session initialized:', data);
      fetchStats();
      
      // Get initial recommendations
      socketClient.emit('get_recommendations', { userId: storedUserId });
    });

    // Listen for search results
    socketClient.on('search_results', (data) => {
      setProperties(data.results);
      setFilters(data.filters || {});
      setIsLoading(false);

      setChatHistory(prev => [...prev, {
        type: 'assistant',
        message: `Найдено ${data.results.length} объектов`,
        filters: data.filters,
        interpretation: data.interpretation
      }]);
    });

    // Listen for recommendations
    socketClient.on('recommendations', (data) => {
      setRecommendations(data.results || []);
    });

    // Listen for errors
    socketClient.on('error', (data) => {
      console.error('Socket error:', data);
      setIsLoading(false);
      setChatHistory(prev => [...prev, {
        type: 'error',
        message: data.message
      }]);
    });

    return () => {
      socketClient.disconnect();
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSearch = (query) => {
    if (!socket) return;

    setIsLoading(true);
    setChatHistory(prev => [...prev, {
      type: 'user',
      message: query
    }]);

    socket.emit('ask_question', {
      query,
      userId
    });
  };

  const handleFilterChange = (newFilters) => {
    if (!socket) return;

    setIsLoading(true);
    setFilters(newFilters);

    socket.emit('update_filters', {
      filters: newFilters,
      userId
    });
  };

  const handlePropertyView = (propertyId) => {
    if (!socket) return;

    socket.emit('view_property', {
      propertyId,
      userId
    });
  };

  const refreshRecommendations = () => {
    if (!socket) return;
    socket.emit('get_recommendations', { userId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Head>
        <title>Real Estate Dashboard - Refty</title>
        <meta name="description" content="Real-time Dubai real estate search powered by AI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🏢 Refty Real Estate Dashboard
          </h1>
          <p className="text-blue-200">
            Персональный поиск недвижимости в Дубае с AI-помощником
          </p>
        </header>

        {stats && <StatsPanel stats={stats} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <SearchBar 
              onSearch={handleSearch}
              isLoading={isLoading}
            />
          </div>
          <div>
            <Dashboard 
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PropertyGrid 
              properties={properties}
              onPropertyView={handlePropertyView}
              isLoading={isLoading}
            />
          </div>

          <div className="space-y-6">
            <ChatInterface 
              chatHistory={chatHistory}
              onSendMessage={handleSearch}
              isLoading={isLoading}
            />

            {recommendations.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">
                    Рекомендации
                  </h3>
                  <button
                    onClick={refreshRecommendations}
                    className="text-blue-300 hover:text-blue-200 text-sm"
                  >
                    Обновить
                  </button>
                </div>
                <div className="space-y-3">
                  {recommendations.slice(0, 5).map((property, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handlePropertyView(property.id)}
                      className="bg-white/5 p-3 rounded cursor-pointer hover:bg-white/10 transition"
                    >
                      <p className="text-white font-medium text-sm">
                        {property.title || property.location}
                      </p>
                      <p className="text-blue-300 text-sm">
                        {property.price?.toLocaleString()} AED
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

