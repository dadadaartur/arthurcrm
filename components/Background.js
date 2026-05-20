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
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cg fill='none' stroke='%23D4AF37' stroke-width='0.6' opacity='0.25'%3E%3Ccircle cx='300' cy='300' r='150'/%3E%3Ccircle cx='225' cy='300' r='150'/%3E%3Ccircle cx='375' cy='300' r='150'/%3E%3Ccircle cx='300' cy='225' r='150'/%3E%3Ccircle cx='300' cy='375' r='150'/%3E%3Ccircle cx='255' cy='255' r='150'/%3E%3Ccircle cx='345' cy='345' r='150'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'min(90vw, 90vh)'
      }}
    />
  )
}
