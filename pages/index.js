// pages/index.js
import Head from 'next/head'
import Background from '../components/Background'

export default function Home() {
  return (
    <>
      <Head>
        <title>Arthur CRM</title>
        <meta name="description" content="Личный кабинет" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Background />

      <main style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        {/* Шапка */}
        <header style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Arthur CRM</h1>
          <nav>
            <a href="#" style={{ margin: '0 1rem' }}>Главная</a>
            <a href="#" style={{ margin: '0 1rem' }}>Транзакции</a>
            <a href="#" style={{ margin: '0 1rem' }}>Профиль</a>
          </nav>
        </header>

        {/* Центральная область с нимбом и цифрой */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh', paddingLeft: '0' }}>
          <div className="premium-card" style={{
            background: '#000000',
            color: '#FFD700',
            border: '1px solid #FFD700',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.15)',
            maxWidth: '280px',
            width: '100%',
            marginLeft: '-10%' // сдвиг влево (регулируйте при необходимости)
          }}>
            {/* Нимб (декоративный круг) */}
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              border: '2px solid #FFD700',
              margin: '0 auto 1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1.5rem' }}>⏣</span>
            </div>

            {/* Баланс */}
            <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '0.3rem' }}>
              124 830 ₽
            </div>
            <div style={{ color: 'rgba(255, 215, 0, 0.7)', fontSize: '0.8rem' }}>
              доступно
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
