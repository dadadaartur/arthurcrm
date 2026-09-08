import Spinner from './Spinner'

// Единая точка входа для состояния загрузки страницы.
// Раньше в каждой странице центрирование и фон загрузочного экрана были
// сделаны по-разному (где-то только по горизонтали с py-8, где-то на весь
// экран, но с жёстко зашитым background:'#000', перебивавшим общий
// анимированный фон из components/Background.js, где-то спиннер вообще
// без обёртки). Теперь один компонент — всегда по центру экрана, фон
// всегда прозрачный, чтобы общий фон со звёздами и свечением был виден и
// во время загрузки тоже.
export default function LoadingScreen({ size = 64, minHeight = '100vh' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight,
        background: 'transparent',
      }}
    >
      <Spinner size={size} />
    </div>
  )
}
