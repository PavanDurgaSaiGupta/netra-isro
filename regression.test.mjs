import { SEED_CATALOG, computeState, parseCelesTrakTLE, validTLE, CELESTRAK_TLE_URL, formatIST } from './src/services/satelliteData.ts'

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

console.log(failed === 0 ? 'ALL TESTS PASSED' : `SOME TESTS FAILED (${failed})`)
process.exit(failed === 0 ? 0 : 1)
