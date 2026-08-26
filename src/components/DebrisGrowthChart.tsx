import { useEffect, useRef, useState } from 'react'
import { createTimeline, stagger } from 'animejs'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Tracked object history & projection (1810 -> 2100)
// Pre-1957 is zero baseline (dotted). 1957 (Sputnik-1) begins catalogued space debris.
const HISTORY: Array<[number, number]> = [
  [1957, 2],
  [1965, 900],
  [1975, 4200],
  [1985, 9800],
  [1995, 21000],
  [2007, 34000], // Fengyun-1C ASAT
  [2009, 41000], // Iridium-Cosmos
  [2016, 52000],
  [2021, 61000],
  [2026, 72000], // Current active catalogued >10cm
]

const PROJECTION: Array<[number, number]> = [
  [2026, 72000],
  [2040, 110000],
  [2060, 240000],
  [2080, 520000],
  [2100, 850000],
]

const MILESTONES = [
  { year: 1957, val: 2, label: 'SPUTNIK-1', sub: 'FIRST TRACKED OBJECT' },
  { year: 2009, val: 41000, label: 'IRIDIUM-COSMOS', sub: 'MAJOR ORBITAL BREAKUP' },
  { year: 2026, val: 72000, label: 'TODAY', sub: 'NETRA ACTIVE SHIELD', isToday: true },
  { year: 2100, val: 850000, label: '2100 RISK', sub: 'KESSLER RUNAWAY BOUNDARY' },
]

const W = 920
const H = 380
const PAD_L = 60
const PAD_R = 30
const PAD_T = 28
const PAD_B = 44

function scale(x: number, y: number): [number, number] {
  // X: 1810 -> 2100
  const px = PAD_L + ((x - 1810) / (2100 - 1810)) * (W - PAD_L - PAD_R)
  // Y: 0 -> 1M (log scale for > 1, 0 at bottom)
  const yNorm = y <= 0 ? 0 : Math.log10(Math.max(y, 1.2)) / Math.log10(1000000)
  const py = H - PAD_B - yNorm * (H - PAD_T - PAD_B)
  return [px, py]
}

const toPath = (rows: Array<[number, number]>) =>
  rows.map(([yr, n], i) => `${i === 0 ? 'M' : 'L'}${scale(yr, n).map((v) => v.toFixed(1)).join(',')}`).join(' ')

export default function DebrisGrowthChart() {
  const rootRef = useRef<HTMLElement>(null)
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const paths = root.querySelectorAll<SVGPathElement>('.chart__path, .chart__proj-path')
    paths.forEach((p) => {
      const len = p.getTotalLength()
      p.style.strokeDasharray = `${len}`
      p.style.strokeDashoffset = `${len}`
    })

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          const tl = createTimeline({ defaults: { ease: 'outQuad' } })
          tl.add('.chart__grid-line, .chart__axis-label', {
            opacity: [0, 1],
            duration: 500,
            delay: stagger(25),
          })
          if (paths[0]) {
            tl.add(paths[0], {
              strokeDashoffset: [paths[0].getTotalLength(), 0],
              duration: 1600,
              ease: 'outCubic',
            }, '-=200')
          }
          if (paths[1]) {
            tl.add(paths[1], {
              strokeDashoffset: [paths[1].getTotalLength(), 0],
              duration: 1200,
              ease: 'outCubic',
            }, '-=400')
          }
          tl.add('.chart__today-line, .chart__today-dot, .chart__milestone', {
            opacity: [0, 1],
            duration: 600,
            delay: stagger(60),
          }, '-=600')
        },
      })
    }, root)

    return () => ctx.revert()
  }, [])

  const [todayX, todayY] = scale(2026, 72000)
  const yTicks = [0, 1000, 10000, 100000, 500000, 1000000]
  const xTicks = [1810, 1830, 1850, 1870, 1890, 1910, 1930, 1950, 1980, 2000, 2020, 2040, 2060, 2080, 2100]

  return (
    <section className="growth section-pad" ref={rootRef} id="growth">
      <div className="growth__grid">
        <div className="growth__info">
          <span className="kicker hud-text">GROWTH OF TRACKED OBJECTS</span>
          <h2 className="display">A CROWDED SKY, ACCELERATING</h2>
          <p>
            Since Sputnik-1 in 1957, humanity's orbital footprint has expanded from a solitary
            satellite to over 72,000 catalogued fragments larger than 10&nbsp;cm. Conjunction-risk
            models indicate that without rapid de-orbit protocols and automated collision avoidance
            like NETRA, the orbital population will reach runaway cascading density (Kessler Syndrome)
            before 2100.
          </p>

          <div className="growth__stat-pills" aria-label="Key debris metrics">
            <div className="pill">
              <span className="pill__num">72,000+</span>
              <span className="pill__label hud-text">CATALOGUED &gt;10CM</span>
            </div>
            <div className="pill">
              <span className="pill__num">1,200+</span>
              <span className="pill__label hud-text">NETRA SCREENED</span>
            </div>
            <div className="pill">
              <span className="pill__num">&lt;25 YRS</span>
              <span className="pill__label hud-text">ISRO DE-ORBIT RULE</span>
            </div>
          </div>
        </div>

        <div
          className="chart"
          role="img"
          aria-label="Technical line chart of tracked space objects growing from 1810 pre-spaceflight baseline through 1957 to projected 2100"
        >
          <div className="chart__header hud-text">
            <span>SINUSOID OF SPREADING • OBJECT CATALOGUE</span>
            <span style={{ color: 'var(--accent-orange)' }}>● DEBRIS TRAJECTORY</span>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`}>
            {/* Horizontal Gridlines & Y-Axis */}
            {yTicks.map((val) => {
              const [, py] = scale(1810, val)
              const label =
                val === 0 ? '0' : val >= 1000000 ? '1M' : val >= 500000 ? '500K' : val >= 100000 ? '100K' : val >= 10000 ? '10K' : '1K'
              return (
                <g key={val}>
                  <line className="chart__grid-line" x1={PAD_L} x2={W - PAD_R} y1={py} y2={py} />
                  <text className="chart__axis-label" x={PAD_L - 10} y={py + 3} textAnchor="end">
                    {label}
                  </text>
                </g>
              )
            })}

            {/* X-Axis Tick Marks & Labels (1810 -> 2100) */}
            {xTicks.map((yr) => {
              const [px] = scale(yr, 0)
              return (
                <g key={yr}>
                  <line className="chart__grid-tick" x1={px} x2={px} y1={H - PAD_B} y2={H - PAD_B + 5} />
                  <text className="chart__axis-label" x={px} y={H - PAD_B + 18} textAnchor="middle">
                    {yr}
                  </text>
                </g>
              )
            })}

            {/* Dotted Pre-Spaceflight Era Baseline (1810 -> 1957) */}
            <line
              className="chart__baseline-dotted"
              x1={scale(1810, 0)[0]}
              y1={scale(1810, 0)[1]}
              x2={scale(1957, 0)[0]}
              y2={scale(1957, 0)[1]}
            />

            {/* Sputnik-1 Initial Step Vertical Rise */}
            <line
              className="chart__sputnik-step"
              x1={scale(1957, 0)[0]}
              y1={scale(1957, 0)[1]}
              x2={scale(1957, 2)[0]}
              y2={scale(1957, 2)[1]}
            />

            {/* Historical Debris Curve (1957 -> 2026) */}
            <path className="chart__path" d={toPath(HISTORY)} />

            {/* Projected Debris Curve (2026 -> 2100) */}
            <path className="chart__proj-path" d={toPath(PROJECTION)} />

            {/* Vertical Marker for TODAY (2026) */}
            <line className="chart__today-line" x1={todayX} x2={todayX} y1={PAD_T} y2={H - PAD_B} />
            <circle className="chart__today-dot" cx={todayX} cy={todayY} r={5} />
            <text className="chart__today-label hud-text" x={todayX + 8} y={PAD_T + 14}>
              TODAY • 72,000+
            </text>

            {/* Milestone Callout Badges */}
            {MILESTONES.map((m, idx) => {
              const [mx, my] = scale(m.year, m.val)
              const isHovered = activeMilestone === idx
              return (
                <g
                  key={m.label}
                  className="chart__milestone"
                  onMouseEnter={() => setActiveMilestone(idx)}
                  onMouseLeave={() => setActiveMilestone(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={mx}
                    cy={my}
                    r={m.isToday ? 6 : 3.5}
                    fill={m.isToday ? 'var(--accent-orange)' : '#f3f4f1'}
                    stroke={m.isToday ? 'rgba(255,107,26,0.5)' : 'rgba(255,255,255,0.4)'}
                    strokeWidth={m.isToday ? 3 : 1.5}
                  />
                  <text
                    className={`chart__event-label ${isHovered ? 'chart__event-label--active' : ''}`}
                    x={mx}
                    y={my - 10}
                    textAnchor={m.year >= 2080 ? 'end' : m.year <= 1960 ? 'start' : 'middle'}
                  >
                    {m.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </section>
  )
}
