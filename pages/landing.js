import { useRouter } from 'next/router'
import Head from 'next/head'
import { useProfile } from '../context/ProfileContext'

// Публичный лендинг — вынесен из pages/index.js как есть, ни один пиксель
// дизайна не менялся (см. п.16 ТЗ и правило «не трогать главную страницу
// без согласования» — эта страница ту главную не меняет, только переносит
// то, что раньше показывалось на / неавторизованным посетителям, на
// собственный адрес). pages/index.js теперь только для авторизованных —
// неавторизованных сюда перенаправляет.
export default function Landing() {
  const router = useRouter()
  const { user } = useProfile()
  return (
    <div className="landing-wrapper min-h-screen bg-black text-white overflow-x-hidden">
      <Head><title>Кармический Банк | Экосистема Роста</title></Head>
      <div className="stars-bg"><div className="gradient-aura" /></div>
      <header className="fixed top-0 w-full z-50 px-8 py-5 flex justify-between items-center backdrop-blur-md">
        <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">Кармический банк</div>
        {user ? (
          <button onClick={() => router.push('/')} className="text-sm font-medium text-white/70 hover:text-white transition-colors px-5 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">Вернуться в систему</button>
        ) : (
          <button onClick={() => router.push('/login')} className="text-sm font-medium text-white/70 hover:text-white transition-colors px-5 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">Войти</button>
        )}
      </header>
      <section className="relative pt-32 pb-20 flex flex-col items-center text-center px-4">
        <div className="hero-black-hole mb-12" style={{ position: 'relative', width: 180, height: 180 }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,0,0.4) 0%, rgba(255,100,0,0.2) 30%, transparent 60%)', filter: 'blur(14px)', animation: 'orbitSpin 80s linear infinite' }} />
          <div className="black-hole" style={{ width: 180, height: 180, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tighter leading-tight">
          Управляйте не людьми, <br />
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">а энергией их достижений</span>
        </h1>
        <p className="max-w-2xl text-gray-400 text-lg md:text-xl mb-10">Традиционные премии — это прошлое. «Кармический Банк» — это операционная система для мотивации.</p>
        <div className="flex gap-6"><button onClick={() => router.push('/create-company')} className="btn-gold !text-lg !py-4 !px-12">Создать компанию</button></div>
      </section>
      <footer className="py-10 border-t border-white/5 text-center text-gray-600 text-xs">© {new Date().getFullYear()} Кармический банк.</footer>
      <style jsx>{`
        .hero-black-hole { position: relative; display: flex; justify-content: center; align-items: center; }
        .gradient-aura { position: absolute; bottom: 0; width: 100%; height: 50%; background: radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%); }
        .landing-wrapper { scroll-behavior: smooth; }
        @keyframes orbitSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
