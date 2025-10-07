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
        {properties.map((property, idx) => {
          // Parse images from array or JSON string
          let images = [];
          if (property.images) {
            if (Array.isArray(property.images)) {
              images = property.images;
            } else if (typeof property.images === 'string') {
              try {
                images = JSON.parse(property.images);
              } catch (e) {
                images = [property.images];
              }
            }
          }
          const mainImage = images && images.length > 0 ? images[0] : null;

          return (
            <div
              key={idx}
              onClick={() => onPropertyView(property.id || idx)}
              className="bg-white/10 rounded-lg overflow-hidden hover:bg-white/20 transition cursor-pointer border border-white/20 group"
            >
              {/* Property Image */}
              {mainImage ? (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={mainImage}
                    alt={property.title || 'Property'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%2323394d" width="400" height="300"/%3E%3Ctext fill="%23667eea" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E🏢%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  {images.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs">
                      📷 {images.length}
                    </div>
                  )}
                  {property.is_new && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      NEW
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-blue-900 to-slate-800 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-6xl">🏢</span>
                    <p className="text-white/50 text-sm mt-2">No Image</p>
                  </div>
                </div>
              )}

              {/* Property Details */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-white line-clamp-2 flex-1">
                    {property.title || property.property_type || 'Объект'}
                  </h3>
                </div>

                <p className="text-blue-200 text-sm mb-2">
                  📍 {property.location || property.area || 'Dubai'}
                </p>

                {property.developer && (
                  <p className="text-blue-300 text-sm mb-2 truncate">
                    🏗️ {property.developer}
                  </p>
                )}

                <div className="flex justify-between items-end mt-3">
                  <div>
                    {property.bedrooms && (
                      <p className="text-blue-100 text-sm">
                        🛏️ {property.bedrooms} {property.bedrooms == 1 ? 'спальня' : 'спален'}
                      </p>
                    )}
                    {property.size && (
                      <p className="text-blue-100 text-sm">
                        📐 {Math.round(property.size)} кв.м
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

