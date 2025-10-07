export default function PropertyGrid({ properties, onPropertyView, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-400 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-blue-200">Загрузка объектов...</p>
          </div>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Начните поиск
          </h3>
          <p className="text-blue-200">
            Задайте вопрос или используйте фильтры для поиска недвижимости
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">
          Найдено объектов: {properties.length}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto pr-2">
        {properties.map((property, idx) => (
          <div
            key={idx}
            onClick={() => onPropertyView(property.id || idx)}
            className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition cursor-pointer border border-white/20"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-white">
                {property.title || property.property_type || 'Объект'}
              </h3>
              {property.is_new && (
                <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                  NEW
                </span>
              )}
            </div>

            <p className="text-blue-200 text-sm mb-2">
              📍 {property.location || property.area || 'Dubai'}
            </p>

            {property.developer && (
              <p className="text-blue-300 text-sm mb-2">
                🏗️ {property.developer}
              </p>
            )}

            <div className="flex justify-between items-end mt-3">
              <div>
                {property.bedrooms && (
                  <p className="text-blue-100 text-sm">
                    🛏️ {property.bedrooms} спален
                  </p>
                )}
                {property.size && (
                  <p className="text-blue-100 text-sm">
                    📐 {property.size} кв.м
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {property.price?.toLocaleString() || 'N/A'}
                </p>
                <p className="text-blue-300 text-sm">AED</p>
              </div>
            </div>

            {property.payment_plan && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-blue-200 text-xs">
                  💳 План оплаты: {property.payment_plan}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

