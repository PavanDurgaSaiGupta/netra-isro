/**
 * Fly-to framing + flight-path math — pure functions so the camera arc
 * choreography is unit-testable (regression.test.mjs) without a WebGL scene.
 * CameraController.tsx consumes these and maps the scalar results onto its
 * THREE vectors. Constants carry the framing rationale so callers don't
 * re-infer them (#11 camera overhaul).
 */

/** Camera park distance from the Earth's centre for the fly-to: keeps the
 *  globe's proportions steady (limb + stars always in frame) instead of running
 *  the lens into the surface. */
export const FRAME_RADIUS = 7.9

/** Minimum radial stand-off for high-orbit targets — kept above
 *  OrbitControls.minDistance (2.4) so the zoom clamp never fights the tween. */
export const MIN_STANDOFF = 2.6

/** Minimum clearance from the flight chord to the Earth's surface (R_EARTH 2.0
 *  lives in Earth.tsx; this must stay above it with margin). */
export const SAFE_PATH_R = 2.35

/** Radial distance the camera parks behind the target: the full stand-off for
 *  low orbits, clamped to the minimum for high-orbit ones. */
export function computeStandoff(orbitR: number): number {
  return Math.max(FRAME_RADIUS - orbitR, MIN_STANDOFF)
}

/** Nearest-approach distance from the Earth's centre (origin) to the straight
 *  chord start→end. A chord pointing through the planet returns ~0; a radially
 *  outgoing chord returns its start radius (t clamps to 0). */
export function closestChordDistance(
  start: readonly [number, number, number],
  end: readonly [number, number, number],
): number {
  const [sx, sy, sz] = start
  const [ex, ey, ez] = end
  const segX = ex - sx
  const segY = ey - sy
  const segZ = ez - sz
  const segLenSq = segX * segX + segY * segY + segZ * segZ || 1
  const t = Math.min(1, Math.max(0, -(sx * segX + sy * segY + sz * segZ) / segLenSq))
  const px = sx + segX * t
  const py = sy + segY * t
  const pz = sz + segZ * t
  return Math.sqrt(px * px + py * py + pz * pz)
}

/** How far the chord must bow outward (perpendicular) to keep clearance from
 *  the surface: 0 whenever the straight line already clears SAFE_PATH_R. */
export function computeMissHeight(straightClear: number): number {
  return straightClear < SAFE_PATH_R
    ? Math.sqrt(SAFE_PATH_R * SAFE_PATH_R - straightClear * straightClear)
    : 0
}

/** Arc bulge of the fly-to parabola: enough curvature to read as a pass around
 *  the target, scaled to the path length with a 0.3 floor and a 3.2 cap, and at
 *  least the surface-miss height so no chord ever clips the planet. */
export function computeBulge(pathLen: number, missHeight: number): number {
  return Math.min(3.2, Math.max(pathLen * 0.16, 0.3, missHeight * 1.25))
}

/** Flight duration in seconds: longer hops take longer but clamp to a
 *  1.0–1.75 s band (reduced-motion paths force 0 outside this helper). */
export function flightDuration(pathLen: number): number {
  return Math.min(1.75, Math.max(1.0, 0.9 + pathLen * 0.13))
}
