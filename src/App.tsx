import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SatelliteProvider } from './context/SatelliteContext'
import Sidebar from './components/shell/Sidebar'
import TopBar from './components/shell/TopBar'
import SSATicker from './components/SSATicker'
import TacticalCursor from './components/TacticalCursor'

import LandingPageView from './views/LandingPageView'
import LiveTrackingView from './views/LiveTrackingView'
import SatelliteCatalogView from './views/SatelliteCatalogView'
import DebrisAnalysisView from './views/DebrisAnalysisView'
import AlertsView from './views/AlertsView'
import AboutView from './views/AboutView'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SatelliteProvider>
        <div className="app-shell">
          <TacticalCursor />
          <Sidebar />
          <div className="app-shell__main">
            <TopBar />
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
          </div>
        </div>
      </SatelliteProvider>
    </BrowserRouter>
  )
}
