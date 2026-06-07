// pages/planet.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
// Убедись, что путь к стилям верный
import '../styles/globals.css'; 

export default function PlanetEarthPage() {
  const [loading, setLoading] = useState(true);

  // Имитация загрузки для плавного появления
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>Ночная Земля | Свечение во тьме | CRM Лето</title>
      </Head>

      {/* Обертка страницы: ТЕМНЫЙ фон для контраста */}
      <div className={`planet-page-wrapper dark ${loading ? 'loading' : ''}`}>
        
        {/* Шапка (твоя crm-topbar), адаптированная под темную тему */}
        <header className="crm-topbar dark">
          <div className="topbar-logo">✨ CRM Лето</div>
          <div className="topbar-right">
            <a href="/" className="back-link">← На главную</a>
          </div>
        </header>

        {/* Центральная часть с планетой */}
        <main className="planet-main">
          
          <div className="planet-earth-night-container">
            {/* Твоя сочная фотография Земли во тьме */}
            <img 
              src="/earth-night.png" // Убедись, что файл лежит в public/
              alt="Светящаяся Земля во тьме" 
              className="earth-core"
            />
            
            {/* Основное сияние вокруг планеты */}
            <div className="atmosphere-glow-night"></div>
            
            {/* Внутреннее свечение городов (дополнительный эффект) */}
            <div className="city-lights-glow"></div>
          </div>

          <div className="planet-info-panel-night">
            <h2>🌃 Магия Ночной Земли</h2>
            <p>Так выглядит наш общий дом из космоса, когда заходит Солнце. Посмотрите на эти мириады огней — это жизнь, это работа, это творчество. Пусть этот вид напоминает вам о том, насколько масштабно и красиво всё, что мы делаем!</p>
          </div>

        </main>
      </div>

      <style jsx global>{`
        /* ТЕМНАЯ ТЕМА СТРАНИЦЫ */
        .planet-page-wrapper.dark {
          min-height: 100vh;
          // Очень глубокий сине-черный космос
          background: radial-gradient(circle at center, #1B4332 0%, #10B981 10%, #000 70%); 
          transition: opacity 0.5s ease;
          color: white;
          overflow: hidden; // Чтобы свечение не ломало верстку
        }
        .planet-page-wrapper.loading { opacity: 0; }
        
        /* ТЕМНАЯ ТОПБАР */
        .crm-topbar.dark { 
          background: #000; 
          border-bottom: 1px solid #1B4332; 
          display: flex;
          justify-content: space-between;
          padding: 10px 20px;
          align-items: center;
        }
        .topbar-logo { color: #10B981; font-weight: 700; font-size: 18px; }
        .back-link { color: #74C69D; text-decoration: none; font-size: 14px; }

        .planet-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 20px;
          gap: 50px;
        }

        /* КОНТЕЙНЕР ДЛЯ НОЧНОЙ ЗЕМЛИ */
        .planet-earth-night-container {
          position: relative;
          width: 500px; // Сделаем побольше
          height: 500px;
          border-radius: 50%;
          // Сделаем планету частью космоса
          overflow: visible; 
          cursor: pointer; // Чтобы хотелось кликнуть
          z-index: 10;
        }

        /* Ядро планеты (фотография) */
        .earth-core {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          z-index: 1;
        }

        /* ОСНОВНОЕ СИЯНИЕ АТМОСФЕРЫ */
        .atmosphere-glow-night {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          border-radius: 50%;
          // Сияние: тонкий синий ободок + мягкий зеленый отсвет
          box-shadow: inset 0 0 50px rgba(16, 185, 129, 0.4), 
                      0 0 80px rgba(16, 185, 129, 0.3), 
                      0 0 120px rgba(16, 185, 129, 0.2);
          z-index: 2;
          // Плавная пульсация
          animation: glowPulseNight 8s ease-in-out infinite;
        }

        /* ЭФФЕКТ ДЛЯ ОГНЕЙ ГОРОДОВ */
        .city-lights-glow {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          border-radius: 50%;
          // Добавляем теплое золотистое сияние *поверх* городов
          background: radial-gradient(circle at center, transparent 30%, rgba(244, 184, 96, 0.2) 60%);
          z-index: 3;
          opacity: 0.1;
          animation: glowPulseCities 5s ease-in-out infinite; // Пульсирует быстрее
        }

        /* ТЕМНАЯ ИНФО-ПАНЕЛЬ */
        .planet-info-panel-night {
          background: #000;
          padding: 32px;
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          max-width: 650px;
          text-align: center;
          border: 1px solid #1B4332;
        }
        .planet-info-panel-night h2 { color: #10B981; margin-bottom: 14px; font-weight: 600; }
        .planet-info-panel-night p { color: #74C69D; line-height: 1.7; font-size: 15px; }

        /* АНИМАЦИИ */
        @keyframes glowPulseNight {
          0%, 100% { box-shadow: 0 0 80px rgba(16, 185, 129, 0.3); }
          50% { box-shadow: 0 0 110px rgba(16, 185, 129, 0.5); }
        }
        @keyframes glowPulseCities {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </>
  );
}
