import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SatelliteProvider } from './context/SatelliteContext'
import Sidebar from './components/shell/Sidebar'
import TopBar from './components/shell/TopBar'
import SSATicker from './components/SSATicker'
import TacticalCursor from './components/TacticalCursor'
import MissionPreloader from './components/shell/MissionPreloader'
import MobileBottomNav from './components/shell/MobileBottomNav'

import LandingPageView from './views/LandingPageView'
import LiveTrackingView from './views/LiveTrackingView'
import SatelliteCatalogView from './views/SatelliteCatalogView'
import DebrisAnalysisView from './views/DebrisAnalysisView'
import AlertsView from './views/AlertsView'
import AboutView from './views/AboutView'

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SatelliteProvider>
        {/* Full-Screen ISRO DSSAM Preloader Boot Sequence */}
        <MissionPreloader />

        <div className="app-shell">
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
            <main className="app-shell__viewport">
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
            </main>
            <MobileBottomNav />
          </div>
        </div>
      </SatelliteProvider>
    </BrowserRouter>
  )
}
