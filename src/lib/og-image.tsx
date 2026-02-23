import { ImageResponse } from 'next/og'

export const ogSize = {
  width: 1200,
  height: 630,
}

export function generateOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1A1B23 0%, #2D3142 40%, #7C3AED 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.06,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Accent glow */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Bottom glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-50px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
            marginBottom: '32px',
            boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
          }}
        >
          <div
            style={{
              fontSize: '40px',
              fontWeight: 700,
              color: 'white',
              display: 'flex',
            }}
          >
            O
          </div>
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-2px',
            lineHeight: 1,
            display: 'flex',
          }}
        >
          OpenFinance
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.7)',
            marginTop: '20px',
            letterSpacing: '0.5px',
            display: 'flex',
          }}
        >
          AI-Powered Personal Finance for Freelancers
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '40px',
          }}
        >
          {['Open Source', 'Self-Hosted', 'Privacy-First'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                padding: '10px 24px',
                borderRadius: '100px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.85)',
                fontSize: '18px',
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            fontSize: '18px',
            color: 'rgba(255,255,255,0.4)',
            display: 'flex',
          }}
        >
          openfinance.to
        </div>
      </div>
    ),
    {
      ...ogSize,
    },
  )
}
