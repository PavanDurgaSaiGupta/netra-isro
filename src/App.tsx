import { useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SatelliteProvider } from './context/SatelliteContext'
import Sidebar from './components/shell/Sidebar'
import TopBar from './components/shell/TopBar'
import SSATicker from './components/SSATicker'
import TacticalCursor from './components/TacticalCursor'
import MissionPreloader from './components/shell/MissionPreloader'
import MobileBottomNav from './components/shell/MobileBottomNav'
import DataSkeleton from './components/shell/DataSkeleton'

const LandingPageView = lazy(() => import('./views/LandingPageView'))
const LiveTrackingView = lazy(() => import('./views/LiveTrackingView'))
const SatelliteCatalogView = lazy(() => import('./views/SatelliteCatalogView'))
const DebrisAnalysisView = lazy(() => import('./views/DebrisAnalysisView'))
const AlertsView = lazy(() => import('./views/AlertsView'))
const AboutView = lazy(() => import('./views/AboutView'))

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SatelliteProvider>
        {/* Full-Screen ISRO DSSAM Preloader Boot Sequence */}
        <MissionPreloader />

        <div className="app-shell">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <TacticalCursor />
          <Sidebar
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />
          <div className="app-shell__main">
            <TopBar
              mobileMenuOpen={mobileMenuOpen}
              onToggleMobileMenu={() => setMobileMenuOpen((o) => !o)}
            />
            <SSATicker />
            <main className="app-shell__viewport" id="main-content" tabIndex={-1}>
              <Suspense fallback={<div style={{ padding: 'var(--space-6)' }}><DataSkeleton count={6} height={56} /></div>}>
                <Routes>
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
            </main>
            <MobileBottomNav />
          </div>
        </div>
      </SatelliteProvider>
    </BrowserRouter>
  )
}
