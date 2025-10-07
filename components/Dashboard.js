import { useState } from 'react';

export default function Dashboard({ filters, onFilterChange }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  const resetFilters = () => {
    setLocalFilters({});
    onFilterChange({});
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Фильтры</h3>

      <div className="space-y-4">
        {/* Price Range */}
        <div>
          <label className="block text-blue-200 text-sm font-medium mb-2">
            Цена (AED)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="От"
              value={localFilters.priceMin || ''}
              onChange={(e) => handleChange('priceMin', e.target.value)}
              className="px-3 py-2 rounded bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="number"
              placeholder="До"
              value={localFilters.priceMax || ''}
              onChange={(e) => handleChange('priceMax', e.target.value)}
              className="px-3 py-2 rounded bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Bedrooms */}
        <div>
          <label className="block text-blue-200 text-sm font-medium mb-2">
            Количество спален
          </label>
          <select
            value={localFilters.bedrooms || ''}
            onChange={(e) => handleChange('bedrooms', e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Любое</option>
            <option value="0">Студия</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4+</option>
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-blue-200 text-sm font-medium mb-2">
            Локация
          </label>
          <input
            type="text"
            placeholder="Например: Downtown, Marina"
            value={localFilters.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Developer */}
        <div>
          <label className="block text-blue-200 text-sm font-medium mb-2">
            Застройщик
          </label>
          <input
            type="text"
            placeholder="Название застройщика"
            value={localFilters.developer || ''}
            onChange={(e) => handleChange('developer', e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-blue-200 text-sm font-medium mb-2">
            Тип недвижимости
          </label>
          <select
            value={localFilters.propertyType || ''}
            onChange={(e) => handleChange('propertyType', e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Все типы</option>
            <option value="apartment">Апартаменты</option>
            <option value="villa">Вилла</option>
            <option value="townhouse">Таунхаус</option>
            <option value="penthouse">Пентхаус</option>
          </select>
        </div>

        {/* Purpose (Sale/Rent) */}
        <div>
          <label className="block text-blue-200 text-sm font-medium mb-2">
            Цель
          </label>
          <select
            value={localFilters.purpose || ''}
            onChange={(e) => handleChange('purpose', e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Все</option>
            <option value="for-sale">Продажа</option>
            <option value="for-rent">Аренда</option>
          </select>
        </div>

        {/* ROI Range */}
        <div>
          <label className="block text-blue-200 text-sm font-medium mb-2">
            ROI по аренде (%)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="От %"
              step="0.1"
              value={localFilters.roiMin || ''}
              onChange={(e) => handleChange('roiMin', e.target.value)}
              className="px-3 py-2 rounded bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="number"
              placeholder="До %"
              step="0.1"
              value={localFilters.roiMax || ''}
              onChange={(e) => handleChange('roiMax', e.target.value)}
              className="px-3 py-2 rounded bg-white/20 text-white placeholder-blue-300 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* ROI Segment */}
        <div>
          <label className="block text-blue-200 text-sm font-medium mb-2">
            ROI Сегмент
          </label>
          <select
            value={localFilters.roiSegment || ''}
            onChange={(e) => handleChange('roiSegment', e.target.value)}
            className="w-full px-3 py-2 rounded bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Все</option>
            <option value="<6%">&lt;6%</option>
            <option value="6-8%">6-8%</option>
            <option value="8-10%">8-10%</option>
            <option value=">10%">&gt;10%</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-4">
          <button
            onClick={applyFilters}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
          >
            Применить фильтры
          </button>
          <button
            onClick={resetFilters}
            className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-blue-200 font-semibold rounded-lg transition"
          >
            Сбросить
          </button>
        </div>
      </div>
    </div>
  );
}

