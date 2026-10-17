import { useFrame } from '@react-three/fiber'

/**
 * Screen-space label de-overlap coordinator (#2).
 *
 * Every SatelliteMarker with a mounted DOM label writes its projected screen
 * anchor into this module-level registry each frame. One coordinator
 * component (mounted after the markers inside the Canvas) resolves collisions
 * in a single pass, highest priority first:
 *
 *   selected (3) > hovered (2) > nearest (1)
 *
 * Losing chips are hidden with `visibility: hidden` — layout-free, keeps each
 * label's own display/opacity logic untouched — and re-shown the moment the
 * collision clears. Entries are removed when a marker hides its own label
 * (occlusion / distance cull / unmount), so a hidden label never blocks
 * another one.
 */

export interface MarkerLabelEntry {
  el: HTMLElement
  /** Screen-space anchor; the chip itself sits at x + LABEL_OFFSET_X. */
  x: number
  y: number
  priority: number
  /** Camera distance — tie-breaker among equal priorities. */
  dist: number
  /** Layout size — re-measured per frame so class-driven resizes (hovered /
   *  selected treatment steps the font up) keep the overlap box honest. */
  w: number
  h: number
}

const registry = new Map<string, MarkerLabelEntry>()

/** Horizontal offset of the chip from its anchor (mirrors the CSS translate). */
const LABEL_OFFSET_X = 8
/** Padding added around each chip when testing overlap (breathing room). */
const PAD_X = 3
const PAD_Y = 1

export function upsertMarkerLabel(
  id: string,
  el: HTMLElement,
  x: number,
  y: number,
  priority: number,
  dist: number,
): void {
  const existing = registry.get(id)
  if (existing && existing.el === el) {
    existing.x = x
    existing.y = y
    existing.priority = priority
    existing.dist = dist
    return
  }
  registry.set(id, { el, x, y, priority, dist, w: 0, h: 0 })
}

export function clearMarkerLabel(id: string): void {
  registry.delete(id)
}

interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function LabelDeconflict() {
  useFrame(() => {
    if (registry.size === 0) return

    // Reset pass: entries whose marker hid its own label this frame are
    // skipped (and made visible again so a re-shown label starts clean).
    const entries: MarkerLabelEntry[] = []
    registry.forEach((entry) => {
      if (entry.el.style.display === 'none') {
        if (entry.el.style.visibility === 'hidden') entry.el.style.visibility = ''
        return
      }
      entries.push(entry)
    })
    if (entries.length === 0) return

    // Stable order: highest priority first, then nearest to the camera.
    entries.sort((a, b) => b.priority - a.priority || a.dist - b.dist)

    const kept: Rect[] = []
    for (const entry of entries) {
      const { el } = entry
      // Measure each frame: the hover/selected treatments change the chip's
      // size (the selected chip steps the font up), and a one-shot cache
      // would under-size the overlap box right after a state flip. Reads hit
      // the already-laid-out DOM, so this stays cheap within the frame.
      const w = el.offsetWidth
      if (w === 0) continue // not laid out yet — leave it alone this frame
      entry.w = w
      entry.h = el.offsetHeight || 16
      const x0 = entry.x + LABEL_OFFSET_X - PAD_X
      const y0 = entry.y - entry.h / 2 - PAD_Y
      const x1 = entry.x + LABEL_OFFSET_X + entry.w + PAD_X
      const y1 = entry.y + entry.h / 2 + PAD_Y

      let blocked = false
      for (let i = 0; i < kept.length; i++) {
        const r = kept[i]
        if (x0 < r.x1 && x1 > r.x0 && y0 < r.y1 && y1 > r.y0) {
          blocked = true
          break
        }
      }
      if (blocked) {
        if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden'
      } else {
        if (el.style.visibility === 'hidden') el.style.visibility = ''
        kept.push({ x0, y0, x1, y1 })
      }
    }
  })
  return null
}
