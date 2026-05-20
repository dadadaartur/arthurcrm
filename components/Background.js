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
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cg fill='none' stroke='%23D4AF37' stroke-width='0.7' opacity='0.35'%3E%3Ccircle cx='100' cy='100' r='40'/%3E%3Ccircle cx='100' cy='100' r='80'/%3E%3Ccircle cx='60' cy='100' r='40'/%3E%3Ccircle cx='140' cy='100' r='40'/%3E%3Ccircle cx='100' cy='60' r='40'/%3E%3Ccircle cx='100' cy='140' r='40'/%3E%3Ccircle cx='65.36' cy='65.36' r='40'/%3E%3Ccircle cx='134.64' cy='65.36' r='40'/%3E%3Ccircle cx='65.36' cy='134.64' r='40'/%3E%3Ccircle cx='134.64' cy='134.64' r='40'/%3E%3Cline x1='0' y1='100' x2='200' y2='100'/%3E%3Cline x1='100' y1='0' x2='100' y2='200'/%3E%3Cline x1='0' y1='0' x2='200' y2='200'/%3E%3Cline x1='200' y1='0' x2='0' y2='200'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px'
      }}
    />
  )
}
