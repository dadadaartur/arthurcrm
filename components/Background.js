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
        background: `
          #FFFFFF
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 39px,
            rgba(0, 0, 0, 0.08) 40px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 39px,
            rgba(0, 0, 0, 0.08) 40px
          ),
          repeating-linear-gradient(
            45deg,
            transparent,
            transparent 39px,
            rgba(0, 0, 0, 0.04) 40px
          )
        `,
        backgroundSize: '40px 40px, 40px 40px, 56.57px 56.57px'
      }}
    />
  )
}
