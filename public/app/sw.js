// Область действия — только /app (см. регистрацию в pages/app/_shell —
// register('/app/sw.js') без явного scope даёт scope='/app/' сам по себе,
// это стандартное поведение браузера для расположения файла).
// Простая стратегия: статика (иконки/манифест) — кэш прежде сети,
// всё остальное (HTML-навигация, данные) — сеть прежде кэша, чтобы
// баланс/задания никогда не показывали устаревшие данные молча.
const CACHE = 'karma-app-shell-v1'
const SHELL_ASSETS = [
  '/app-manifest.json',
  '/app-icons/icon-192.png',
  '/app-icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  // cache.addAll — всё или ничего: если хотя бы один ресурс отвечает не
  // 200 (например, иконку ещё не загрузили в public/app-icons/), вся
  // установка service worker падает, и он не активируется вовсе — это
  // могло быть причиной, почему вообще все запросы из приложения
  // начинали падать с «Failed to fetch». Кэшируем по одному, ошибка
  // одного файла не должна валить остальные.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(SHELL_ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  const isShellAsset = SHELL_ASSETS.some((a) => url.pathname === a)

  if (isShellAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
    return
  }

  // Всё остальное внутри /app (страницы, API) — сеть прежде кэша,
  // с откатом на кэш только если сеть реально недоступна (офлайн).
  if (url.pathname.startsWith('/app')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(event.request))
    )
  }
})
