// SVG-лупа вместо эмодзи
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export default function SearchBar({ search, setSearch }) {
  return (
    <div className="max-w-md mx-auto mb-8 relative">
      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon />
      </span>
      <input
        type="text"
        placeholder="Поиск сервисов..."
        className="w-full pl-10 pr-4 py-3 bg-white/60 backdrop-blur-md border border-white/60 rounded-full shadow-md focus:ring-2 focus:ring-green-300 focus:border-transparent text-gray-700 placeholder-gray-400"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  )
}
