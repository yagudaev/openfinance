import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768 // matches Tailwind's `md` breakpoint

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    function handleChange(e: MediaQueryListEvent | MediaQueryList) {
      setIsMobile(e.matches)
    }

    handleChange(mql)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
