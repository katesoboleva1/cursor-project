export default function StatsPanel({ stats }) {
  if (!stats) return null;

  const statItems = [
    {
      label: 'Всего объектов',
      value: stats.total_properties?.toLocaleString() || '0',
      icon: '🏢'
    },
    {
      label: 'Средняя цена',
      value: `${Math.round(stats.avg_price)?.toLocaleString()} AED`,
      icon: '💰'
    },
    {
      label: 'Застройщиков',
      value: stats.total_developers || '0',
      icon: '🏗️'
    },
    {
      label: 'Локаций',
      value: stats.total_locations || '0',
      icon: '📍'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statItems.map((item, idx) => (
        <div
          key={idx}
          className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20"
        >
          <div className="text-3xl mb-2">{item.icon}</div>
          <div className="text-2xl font-bold text-white mb-1">
            {item.value}
          </div>
          <div className="text-blue-200 text-sm">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

