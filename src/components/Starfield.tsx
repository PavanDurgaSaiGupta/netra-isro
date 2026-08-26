import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  phase: number
  speed: number
}

/** Persistent twinkling starfield behind the whole page. */
export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const count = window.innerWidth < 768 ? 90 : 170
    let stars: Star[] = []
    let raf = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.1 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.2,
      }))
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (t: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      for (const s of stars) {
        const tw = reduced ? 0.8 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(s.phase + t * 0.001 * s.speed))
        ctx.globalAlpha = tw * 0.85
        ctx.fillStyle = '#cfd8e6'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />
}
