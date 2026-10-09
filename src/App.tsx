import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, useGSAP, EASE, DUR, prefersReducedMotion } from './lib/motion'
import { SatelliteProvider } from './context/SatelliteContext'
import Sidebar from './components/shell/Sidebar'
import TopBar from './components/shell/TopBar'
import SSATicker from './components/shell/SSATicker'
import TacticalCursor from './components/TacticalCursor'
import MissionPreloader from './components/shell/MissionPreloader'
import MobileBottomNav from './components/shell/MobileBottomNav'
import DataSkeleton from './components/shell/DataSkeleton'
import ViewBoundary from './components/shell/ViewBoundary'

const LandingPageView = lazy(() => import('./views/LandingPageView'))
const LiveTrackingView = lazy(() => import('./views/LiveTrackingView'))
const SatelliteCatalogView = lazy(() => import('./views/SatelliteCatalogView'))
const DebrisAnalysisView = lazy(() => import('./views/DebrisAnalysisView'))
const AlertsView = lazy(() => import('./views/AlertsView'))
const AboutView = lazy(() => import('./views/AboutView'))

/**
 * Page transition (contract §4): the outgoing view drifts up then slides out along a
 * slight arc with --ease-exit (240ms), the swap happens, and the incoming view enters
 * from the mirrored side with --ease-entrance (420ms). Keyed on the displayed
 * location's pathname. Only the content layer transitions — routes render against a
 * trailing `displayed` location, so the three.js scene on /tracking mounts once per
 * visit and is never remounted mid-animation.
 */
function PageTransition({
  children,
  onSwapped,
}: {
  children: (location: Location) => ReactNode
  onSwapped: () => void
}) {
  const location = useLocation()
  const [displayed, setDisplayed] = useState(location)
  const rootRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  // Outgoing arc: y drift leads, then x slides out. onComplete performs the swap.
  useGSAP(
    () => {
      const sameView =
        location.pathname === displayed.pathname && location.search === displayed.search
      if (sameView) return
      const el = rootRef.current
      if (!el || prefersReducedMotion()) {
        setDisplayed(location)
        onSwapped()
        return
      }
      gsap
        .timeline({
          onComplete: () => {
            setDisplayed(location)
            onSwapped()
          },
        })
        .set(el, { pointerEvents: 'none' }, 0)
        .to(el, { y: -24, duration: DUR.fast / 2, ease: EASE.exit, overwrite: 'auto' })
        .to(el, { x: 44, opacity: 0, duration: DUR.fast / 2, ease: EASE.exit })
    },
    { scope: rootRef, dependencies: [location.key, displayed.pathname] },
  )

  // Incoming mirrored arc, cleared after so no transform residue remains.
  useGSAP(
    () => {
      const el = innerRef.current
      if (!el || prefersReducedMotion()) return
      gsap.fromTo(
        el,
        { x: -44, y: 20, opacity: 0 },
        {
          x: 0,
          y: 0,
          opacity: 1,
          duration: DUR.base,
          ease: EASE.entrance,
          clearProps: 'transform,opacity',
        },
      )
    },
    { scope: rootRef, dependencies: [displayed.pathname] },
  )

  return (
    <div className="page-transition" key={displayed.pathname} ref={rootRef}>
      <div className="page-transition__inner" ref={innerRef}>
        {children(displayed)}
      </div>
    </div>
  )
}

const CONTENT_ROUTES = new Set(['/', '/overview', '/about'])

function AppShell() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const viewportRef = useRef<HTMLElement | null>(null)
  const scrollContentRef = useRef<HTMLDivElement | null>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const isSmoothRoute = CONTENT_ROUTES.has(location.pathname)

  // T04: Lenis smooth scroll on content routes only (landing, about); the scroll container
  // is .app-shell__viewport, so it is passed as the Lenis wrapper.
  // Lenis is synchronized with gsap.ticker and updates ScrollTrigger on scroll.
  useEffect(() => {
    if (!isSmoothRoute) return
    const wrapper = viewportRef.current
    const content = scrollContentRef.current
    if (!wrapper || !content || prefersReducedMotion()) return

    const lenis = new Lenis({ wrapper, content, duration: 1.05 })
    lenisRef.current = lenis

    ScrollTrigger.defaults({ scroller: wrapper })
    const onLenisScroll = () => {
      ScrollTrigger.update()
    }
    lenis.on('scroll', onLenisScroll)

    const tickerCb = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tickerCb)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(tickerCb)
      lenis.off('scroll', onLenisScroll)
      ScrollTrigger.defaults({ scroller: undefined })
      lenisRef.current = null
      lenis.destroy()
    }
  }, [isSmoothRoute])

  const resetScroll = useCallback(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true, force: true })
      return
    }
    viewportRef.current?.scrollTo({ top: 0 })
  }, [])

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <TacticalCursor />
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />
      <div className="app-shell__main">
        <TopBar
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen((o) => !o)}
        />
        <SSATicker />
        <main className="app-shell__viewport" id="main-content" tabIndex={-1} ref={viewportRef}>
          {/* Stable scroll-content node for Lenis; the keyed transition div lives inside */}
          <div className="app-shell__scroll-content" ref={scrollContentRef}>
            <PageTransition onSwapped={resetScroll}>
              {(displayedLocation) => (
                <ViewBoundary>
                  <Suspense
                    fallback={
                      <div style={{ padding: 'var(--space-6)' }}>
                        <DataSkeleton count={6} height={56} />
                      </div>
                    }
                  >
                    <Routes location={displayedLocation}>
                      <Route path="/" element={<LandingPageView />} />
                      <Route path="/overview" element={<LandingPageView />} />
                      <Route path="/tracking" element={<LiveTrackingView />} />
                      <Route path="/catalog" element={<SatelliteCatalogView />} />
                      <Route path="/debris" element={<DebrisAnalysisView />} />
                      <Route path="/alerts" element={<AlertsView />} />
                      <Route path="/about" element={<AboutView />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </ViewBoundary>
              )}
            </PageTransition>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SatelliteProvider>
        {/* Full-screen Go/No-Go boot poll */}
        <MissionPreloader />
        <AppShell />
      </SatelliteProvider>
    </BrowserRouter>
  )
}
