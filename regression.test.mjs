import { SEED_CATALOG, computeState, parseCelesTrakTLE, validTLE, CELESTRAK_TLE_URL, formatIST } from './src/services/satelliteData.ts'
import {
  MIN_STANDOFF,
  SAFE_PATH_R,
  closestChordDistance,
  computeBulge,
  computeMissHeight,
  computeStandoff,
  flightDuration,
} from './src/lib/cameraFlight.ts'

let failed = 0
const check = (cond, msg) => { if (cond) console.log('ok:', msg); else { failed++; console.error('FAIL:', msg) } }

check(validTLE(SEED_CATALOG[0].tle1, SEED_CATALOG[0].tle2, 44804), 'validTLE accepts well-shaped seed TLE with matching NORAD')
check(!validTLE('bad', 'worse'), 'validTLE rejects malformed strings')
check(!validTLE(SEED_CATALOG[0].tle1, SEED_CATALOG[1].tle2, 44804), 'validTLE rejects mismatched line1/line2 norad')
check(!validTLE(SEED_CATALOG[0].tle1.slice(0, 68), SEED_CATALOG[0].tle2, 44804), 'validTLE rejects wrong line length')

check(computeState(SEED_CATALOG[0], new Date()) !== null, 'computeState propagates a live seed entry')
check(computeState(SEED_CATALOG[0], new Date(NaN)) === null, 'computeState rejects invalid date')
const tampered = { ...SEED_CATALOG[0], tle1: SEED_CATALOG[0].tle1.slice(0, 60) }
check(computeState(tampered) === null, 'computeState rejects malformed TLE shape')

const synthetic = `CARTOSAT-3
1 44804U 19081A   26056.89245102  .00000412  00000+0  21458-4 0  9998
2 44804  97.4712 118.2345 0013916 114.7332 245.5484 15.22878954261895`
check(parseCelesTrakTLE(synthetic).length === 0, 'parser rejects synthetic TLEs on strict checksum path')

const strictSample = `ISS (ZARYA)
1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11806-2 0  9003
2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537`
const parsedStrict = parseCelesTrakTLE(strictSample)
check(parsedStrict.length === 1 && parsedStrict[0].noradId === 25544, 'parser accepts strict checksum TLE and maps correct norad')
check(parsedStrict[0].operator === 'NASA / MULTINATIONAL', 'parser preserves seed metadata')

const isroOnly = `CARTOSAT-3A
1 99999U 19081A   08264.51782528  .00000000  00000+0  00000+0 0  9002
2 99999  97.4712 118.2345 0013916 114.7332 245.5484 15.22878954261891`
const parsedISRO = parseCelesTrakTLE(isroOnly)
check(parsedISRO.length === 1 && parsedISRO[0].id === 'isro-99999' && parsedISRO[0].operator === 'ISRO', 'parser creates isro-* entry for unknown ISRO satellite')

check(CELESTRAK_TLE_URL.includes('FORMAT=tle'), 'endpoint requests TLE format, not OMM JSON')

check(formatIST(new Date('2026-09-17T06:00:00Z')) === '11:30:00', `formatIST converts UTC to IST (got ${formatIST(new Date('2026-09-17T06:00:00Z'))})`)

// ---- lib/cameraFlight — fly-to framing & arc choreography (#11 camera overhaul) ----
check(MIN_STANDOFF > 2.4, 'fly-to stand-off stays above the OrbitControls 2.4 zoom clamp')
check(SAFE_PATH_R > 2.0, 'flight path keeps clear of the Earth surface radius (R_EARTH 2.0)')
check(computeStandoff(2.0) === 5.9, 'surface-level orbit gets stand-off = FRAME_RADIUS - orbitR')
check(computeStandoff(9.0) === 2.6, 'high orbit clamps stand-off to MIN_STANDOFF')
check(closestChordDistance([0, 0, 10], [0, 0, -10]) < 1e-6, 'chord pointing through the planet clips centre (needs bulge)')
check(closestChordDistance([4, 0, 0], [8, 0, 0]) === 4, 'radially outgoing chord clamps to its start radius')
check(Math.abs(closestChordDistance([0, 0, 5], [5, 0, 0]) - Math.sqrt(12.5)) < 1e-9, 'tangential chord computes its true closest approach')
check(computeMissHeight(0) === 2.35, 'chord at centre bows the full SAFE_PATH_R')
check(computeMissHeight(3) === 0, 'chord already beyond SAFE_PATH_R needs no miss height')
check(Math.abs(computeMissHeight(2.3) - Math.sqrt(2.35 ** 2 - 2.3 ** 2)) < 1e-9, 'partial clearance bows only the missing margin')
check(computeBulge(10, 0) === 1.6, 'bulge scales with path length above the 0.3 floor')
check(computeBulge(30, 0) === 3.2, 'bulge caps at 3.2 for very long hops')
check(computeBulge(0, 2.4) === 3, 'miss height dominates when clearance is tight (x1.25)')
check(flightDuration(0) === 1.0, 'flight duration floored at 1.0s')
check(flightDuration(10) === 1.75, 'flight duration capped at 1.75s for long hops')
check(Math.abs(flightDuration(4) - 1.42) < 1e-9, 'flight duration scales linearly mid-range')

console.log(failed === 0 ? 'ALL TESTS PASSED' : `SOME TESTS FAILED (${failed})`)
process.exit(failed === 0 ? 0 : 1)
