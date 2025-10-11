import { useEffect, useRef } from 'react';

export default function ChatInterface({ chatHistory, onSendMessage, isLoading }) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">История запросов</h3>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {chatHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-blue-200 text-sm">
              История ваших запросов появится здесь
            </p>
          </div>
        ) : (
          chatHistory.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                item.type === 'user'
                  ? 'bg-blue-500/30 ml-4'
                  : item.type === 'error'
                  ? 'bg-red-500/30'
                  : 'bg-white/10 mr-4'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="text-xl">
                  {item.type === 'user' ? '👤' : item.type === 'error' ? '⚠️' : '🤖'}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">{item.message}</p>
                  
                  {item.interpretation && (
                    <p className="text-blue-300 text-xs mt-1">
                      {item.interpretation}
                    </p>
                  )}

                  {item.filters && Object.keys(item.filters).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(item.filters).map(([key, value]) => (
                        <span
                          key={key}
                          className="px-2 py-1 bg-white/10 text-blue-200 text-xs rounded"
                        >
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="p-3 rounded-lg bg-white/10 mr-4">
            <div className="flex items-center gap-2">
              <div className="text-xl">🤖</div>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

