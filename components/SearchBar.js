export default function SearchBar({ search, setSearch }) {
  return (
    <div className="max-w-md mx-auto mb-8">
      <input
        type="text"
        placeholder="🔍 Поиск сервисов..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  )
}
