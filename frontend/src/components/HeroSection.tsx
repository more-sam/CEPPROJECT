import { ChevronDown } from 'lucide-react'

/**
 * Hero section with background video, navbar, and dashboard preview.
 * Exact implementation per specification.
 */
export function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col"
      style={{
        backgroundColor: '#000000',
        overflow: 'hidden',
      }}
    >
      {/* Background Video - lowest z-index */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '120%',
          height: '120%',
          objectFit: 'cover',
          left: '-10%',
          top: '-10%',
          transformOrigin: 'center bottom',
          zIndex: 0,
        }}
        aria-hidden="true"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260215_121759_424f8e9c-d8bd-4974-9567-52709dfb6842.mp4"
          type="video/mp4"
        />
      </video>

      {/* Blurred Background Element - z-index: 1 */}
      <div
        className="pointer-events-none"
        style={{
          position: 'absolute',
          left: '50%',
          top: '215px',
          transform: 'translateX(-50%)',
          width: '801px',
          height: '384px',
          borderRadius: '9999px',
          backgroundColor: '#000000',
          filter: 'blur(77.5px)',
          zIndex: 1,
        }}
      />

      {/* All content at z-index: 2 */}
      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 2 }}>
        {/* Navbar */}
        <header
          className="flex items-center justify-between"
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            padding: '16px 120px',
            height: '102px',
          }}
        >
          {/* Left side: Logo + Nav */}
          <div className="flex items-center" style={{ gap: '80px' }}>
            {/* Logo */}
            <div className="flex-shrink-0">
              <svg
                width="134"
                height="25"
                viewBox="0 0 134 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="LOGOIPSUM"
              >
                <text
                  x="0"
                  y="18"
                  fontFamily="Manrope, sans-serif"
                  fontWeight="700"
                  fontSize="25"
                  fill="white"
                  letterSpacing="-0.5px"
                >
                  LOGOIPSUM
                </text>
              </svg>
            </div>

            {/* Nav Links */}
            <nav className="flex items-center" style={{ gap: '10px' }} aria-label="Main navigation">
              <a
                href="/"
                className="flex items-center gap-3 px-[10px] py-[4px]"
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: '500',
                  fontSize: '14px',
                  lineHeight: '22px',
                  color: 'white',
                  textDecoration: 'none',
                }}
              >
                Home
              </a>
              <a
                href="/services"
                className="flex items-center gap-3 px-[10px] py-[4px]"
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: '500',
                  fontSize: '14px',
                  lineHeight: '22px',
                  color: 'white',
                  textDecoration: 'none',
                }}
              >
                Services
                <ChevronDown className="h-[24px] w-[24px] text-white flex-shrink-0" />
              </a>
              <a
                href="/reviews"
                className="flex items-center gap-3 px-[10px] py-[4px]"
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: '500',
                  fontSize: '14px',
                  lineHeight: '22px',
                  color: 'white',
                  textDecoration: 'none',
                }}
              >
                Reviews
              </a>
              <a
                href="/contact"
                className="flex items-center gap-3 px-[10px] py-[4px]"
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: '500',
                  fontSize: '14px',
                  lineHeight: '22px',
                  color: 'white',
                  textDecoration: 'none',
                }}
              >
                Contact us
              </a>
            </nav>
          </div>

          {/* Right side: Buttons */}
          <div className="flex items-center" style={{ gap: '12px' }}>
            {/* Sign In */}
            <button
              type="button"
              style={{
                backgroundColor: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: '600',
                fontSize: '14px',
                lineHeight: '22px',
                color: '#171717',
                border: '1px solid #d4d4d4',
                cursor: 'pointer',
                transition: 'background-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
            >
              Sign In
            </button>

            {/* Get Started */}
            <button
              type="button"
              style={{
                backgroundColor: '#7b39fc',
                padding: '8px 16px',
                borderRadius: '8px',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: '600',
                fontSize: '14px',
                lineHeight: '22px',
                color: '#fafafa',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0px 4px 16px rgba(23, 23, 23, 0.04)',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#6a2de8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7b39fc'; }}
            >
              Get Started
            </button>
          </div>
        </header>

        {/* Hero Content */}
        <main className="flex-1 flex items-center justify-center pt-[162px] px-6">
          <div
            className="flex flex-col items-center text-center"
            style={{
              maxWidth: '871px',
              width: '100%',
              margin: '0 auto',
            }}
          >
            {/* Heading Block */}
            <div className="flex flex-col items-center" style={{ gap: '10px' }}>
              <h1
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: '500',
                  fontSize: '76px',
                  lineHeight: '1.15',
                  letterSpacing: '-2px',
                  color: 'white',
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                Automate repetitive.
              </h1>
              <h1
                style={{
                  fontFamily: '"Instrument Serif", Georgia, serif',
                  fontWeight: '400',
                  fontStyle: 'italic',
                  fontSize: '76px',
                  lineHeight: '1.15',
                  letterSpacing: '-2px',
                  color: 'white',
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                Focus on growth.
              </h1>
            </div>

            {/* Subtitle */}
            <p
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontWeight: '400',
                fontSize: '18px',
                lineHeight: '26px',
                color: '#f6f7f9',
                opacity: 0.9,
                maxWidth: '613px',
                margin: 0,
                textAlign: 'center',
              }}
            >
              The next-generation AI agent platform that handles lead generation,
              customer support, and data entry while you build.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center" style={{ gap: '22px', marginTop: '24px' }}>
              <button
                type="button"
                style={{
                  backgroundColor: '#7b39fc',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  fontFamily: 'Cabin, sans-serif',
                  fontWeight: '500',
                  fontSize: '16px',
                  lineHeight: '1.7',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#6a2de8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#7b39fc'; }}
              >
                Get Started Free
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: '#2b2344',
                  padding: '14px 24px',
                  borderRadius: '10px',
                  fontFamily: 'Cabin, sans-serif',
                  fontWeight: '500',
                  fontSize: '16px',
                  lineHeight: '1.7',
                  color: '#f6f7f9',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a2d5a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2b2344'; }}
              >
                Watch 2min Demo
              </button>
            </div>
          </div>
        </main>

        {/* Dashboard Image */}
        <div
          className="flex items-center justify-center"
          style={{
            marginTop: '80px',
            paddingBottom: '40px',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '1163px',
              maxWidth: '90vw',
              borderRadius: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1.5px solid transparent',
              padding: '22.5px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#1a1a2e',
              }}
            >
              {/* Placeholder for dashboard screenshot */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                }}
              >
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 9h6M9 15h4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="17" cy="7" r="2" fill="rgba(123,57,252,0.6)" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}