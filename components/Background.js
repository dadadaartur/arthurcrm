// components/Background.js
export default function Background() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        backgroundColor: '#FFFFFF',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%23D4AF37' stroke-width='0.8' opacity='0.2'%3E%3Ccircle cx='400' cy='400' r='200'/%3E%3Ccircle cx='400' cy='400' r='140'/%3E%3Cpath d='M400 200 Q500 300 400 400 Q300 300 400 200'/%3E%3Cpath d='M400 600 Q500 500 400 400 Q300 500 400 600'/%3E%3Cpath d='M200 400 Q300 300 400 400 Q300 500 200 400'/%3E%3Cpath d='M600 400 Q500 300 400 400 Q500 500 600 400'/%3E%3Ccircle cx='400' cy='400' r='80'/%3E%3Ccircle cx='400' cy='400' r='20' fill='%23D4AF37' opacity='0.4'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'min(80vw, 80vh)'
      }}
    />
  )
}
