import L from 'leaflet'
import type { CSSProperties, ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import '../../../src/index.css'
import '../../../src/App.css'
import './video.css'
import data from '../data.json'
import type { LngLat, Place, Route } from '../../../src/api/ors'
import Header from '../../../src/components/Header'
import { OriginIcon, PinIcon } from '../../../src/components/icons'
import DestinationScreen from '../../../src/screens/DestinationScreen'
import EstimateScreen from '../../../src/screens/EstimateScreen'
import RideScreen from '../../../src/screens/RideScreen'
import SummaryScreen from '../../../src/screens/SummaryScreen'
import { estimatePriceRange, formatEuro } from '../../../src/pricing'
import { getRideStatus, type Ride } from '../../../src/ride'
import { STEPS, type Step } from '../../../src/steps'

// Every frame must be a pure function of t: no Leaflet animations.
L.Map.mergeOptions({ zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false })

// ---------- real data (one ORS fetch, replayed) ----------
const toFeature = data.autocomplete.features[0]
const FROM: Place = { label: 'Schiphol Plaza, Schiphol, NH, Netherlands', coordinates: [4.76113, 52.3096] }
const TO: Place = { label: toFeature.properties.label, coordinates: toFeature.geometry.coordinates as LngLat }
const dir = data.directions.features[0]
const ROUTE: Route = {
  distance: dir.properties.summary.distance,
  duration: dir.properties.summary.duration,
  coordinates: dir.geometry.coordinates as LngLat[],
}
const RIDE: Ride = { route: ROUTE, duration: ROUTE.duration * 1.06 }
const ESTIMATE = estimatePriceRange(ROUTE.distance, ROUTE.duration)
const FINAL = getRideStatus(RIDE, RIDE.duration)
const TYPED = 'Amsterdam Centraal'

const realFetch = window.fetch.bind(window)
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input)
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  if (url.includes('/geocode/autocomplete')) {
    const text = new URL(url).searchParams.get('text')
    return json({ features: text === TYPED ? [toFeature] : [] })
  }
  if (url.includes('/geocode/reverse')) return json(data.reverse)
  if (url.includes('/v2/directions')) return json(data.directions)
  return realFetch(input, init)
}

// ---------- timeline ----------
export const DURATION = 21.5
const T = {
  hookOut: 2.7,
  phoneIn: 2.85,
  typeStart: 4.05,
  typeEnd: 5.15,
  select: 5.9,
  tapNext: 7.05,
  push1: 7.5,
  tapStart: 11.05,
  push2: 11.5,
  rideStart: 11.9,
  rideEnd: 14.6,
  tapOverview: 15.15,
  push3: 15.5,
  badge: 16.45,
  outro: 19.0,
}
const PUSH = 0.5

// ---------- easing ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const easeOut = (u: number) => 1 - (1 - u) ** 3
const easeIn = (u: number) => u ** 3
const easeInOut = (u: number) => (u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2)
const easeInOutSine = (u: number) => -(Math.cos(Math.PI * u) - 1) / 2
const easeOutBack = (u: number) => {
  const c1 = 1.9
  return 1 + (c1 + 1) * (u - 1) ** 3 + c1 * (u - 1) ** 2
}

/** Fade + slide up in at a, (optionally) fade up out at b. */
function reveal(t: number, a: number, b = Infinity, dist = 28): CSSProperties {
  const i = easeOut(prog(t, a, a + 0.5))
  const o = b === Infinity ? 0 : easeIn(prog(t, b, b + 0.28))
  return { opacity: i * (1 - o), transform: `translateY(${(1 - i) * dist - o * 18}px)` }
}

// ---------- hook ----------
const TICK0 = 0.2
const TICK = 0.125
const TICKS = 18
export const HOOK_TICKS = Array.from({ length: TICKS + 1 }, (_, k) => TICK0 + k * TICK)
function hookMeter(t: number) {
  const k = clamp(Math.floor((t - TICK0) / TICK), 0, TICKS)
  const value = 4.15 + (86.4 - 4.15) * (k / TICKS) ** 1.55 + (k > 0 && k < TICKS ? ((k * 37) % 9) * 0.07 : 0)
  const local = t - TICK0 - k * TICK
  const pulse = t >= TICK0 && k < TICKS + 1 ? Math.exp(-Math.max(local, 0) * 28) : 0
  return { value, pulse }
}

function Hook({ t }: { t: number }) {
  if (t > T.hookOut + 0.4) return null
  const out = easeIn(prog(t, T.hookOut, T.hookOut + 0.3))
  const { value, pulse } = hookMeter(t)
  return (
    <div className="hook" style={{ opacity: 1 - out, transform: `scale(${1 - out * 0.05})` }}>
      <p className="hook-route" style={reveal(t, 0.02, Infinity, 16)}>
        <OriginIcon size={26} /> Schiphol <span className="hook-arrow">→</span> <PinIcon size={26} /> Amsterdam Centraal
      </p>
      <p className="hook-meter" style={{ transform: `scale(${1 + pulse * 0.018})` }}>
        {formatEuro(value)}
      </p>
      <p className="hook-question" style={reveal(t, 0.75)}>
        Wat gaat dit kosten?
      </p>
    </div>
  )
}

// ---------- captions ----------
type Caption = { a: number; b: number; eyebrow: ReactNode; headline: ReactNode; sub?: ReactNode }
const CAPTIONS: Caption[] = [
  {
    a: 3.3,
    b: 7.3,
    eyebrow: (
      <>
        <span className="logo-square" /> TaxiPrijs
      </>
    ),
    headline: (
      <>
        Weet wat je rit kost.
        <br />
        Vóór je instapt.
      </>
    ),
  },
  {
    a: 7.75,
    b: 11.3,
    eyebrow: 'Prijsschatting · voor vertrek',
    headline: (
      <>
        Een eerlijke prijs.
        <br />
        Vooraf.
      </>
    ),
    sub: 'Starttarief, kilometers en minuten — alles zichtbaar.',
  },
  {
    a: 11.75,
    b: 15.3,
    eyebrow: 'Rit volgen · onderweg',
    headline: (
      <>
        De meter, live
        <br />
        in je hand.
      </>
    ),
    sub: 'Taxi op de kaart. Eindprijs steeds scherper.',
  },
  {
    a: 15.75,
    b: 18.85,
    eyebrow: 'Ritoverzicht · aangekomen',
    headline: 'Binnen schatting.',
    sub: (
      <>
        Vooraf € {ESTIMATE.min}–{ESTIMATE.max}. Betaald {formatEuro(FINAL.price)}.
      </>
    ),
  },
]

function Captions({ t }: { t: number }) {
  return (
    <>
      {CAPTIONS.filter((c) => t >= c.a - 0.01 && t <= c.b + 0.35).map((c) => (
        <div className="caption" key={c.a}>
          <p className="caption-eyebrow" style={reveal(t, c.a, c.b)}>
            {c.eyebrow}
          </p>
          <h2 className="caption-headline" style={reveal(t, c.a + 0.12, c.b)}>
            {c.headline}
          </h2>
          {c.sub && (
            <p className="caption-sub" style={reveal(t, c.a + 0.26, c.b)}>
              {c.sub}
            </p>
          )}
        </div>
      ))}
    </>
  )
}

// ---------- outro ----------
function Outro({ t }: { t: number }) {
  const a = T.outro + 0.4
  if (t < a - 0.01) return null
  return (
    <div className="outro">
      <div className="outro-brand" style={reveal(t, a, Infinity, 36)}>
        <span className="logo-square logo-square-big" />
        TaxiPrijs
      </div>
      <p className="outro-tagline" style={reveal(t, a + 0.22)}>
        Geen verrassingen op de meter.
      </p>
    </div>
  )
}

// ---------- phone ----------
const noop = () => {}

function AppScreen({ step, children }: { step: Step; children: ReactNode }) {
  const index = STEPS.findIndex((s) => s.id === step)
  const current = STEPS[index]
  return (
    <div className="app">
      <Header
        title={current.title}
        subtitle={current.subtitle}
        stepNumber={index + 1}
        totalSteps={STEPS.length}
        onBack={step === 'schatting' ? noop : undefined}
      />
      {children}
    </div>
  )
}

type Layer = { id: string; from: number; to: number; pushIn?: number; pushOut?: number }
const LAYERS: Layer[] = [
  { id: 'dest', from: 0, to: T.push1 + PUSH, pushOut: T.push1 },
  { id: 'est', from: T.push1 - 0.1, to: T.push2 + PUSH, pushIn: T.push1, pushOut: T.push2 },
  { id: 'ride', from: T.push2 - 0.1, to: T.push3 + PUSH, pushIn: T.push2, pushOut: T.push3 },
  { id: 'sum', from: T.push3 - 0.1, to: 99, pushIn: T.push3 },
]

function layerStyle(t: number, l: Layer): CSSProperties {
  let x = 0
  let dim = 0
  if (l.pushIn !== undefined && t < l.pushIn + PUSH) x = 100 * (1 - easeInOut(prog(t, l.pushIn, l.pushIn + PUSH)))
  if (l.pushOut !== undefined && t > l.pushOut) {
    const u = easeInOut(prog(t, l.pushOut, l.pushOut + PUSH))
    x = -30 * u
    dim = u
  }
  return { transform: `translateX(${x}%)`, ['--dim' as string]: dim * 0.18 }
}

function rideElapsed(t: number) {
  return RIDE.duration * easeInOutSine(prog(t, T.rideStart, T.rideEnd))
}

function ScreenContent({ id, t }: { id: string; t: number }) {
  if (id === 'dest')
    return (
      <AppScreen step="bestemming">
        <DestinationScreen from={FROM} to={t >= T.select ? TO : null} onFromChange={noop} onToChange={noop} onNext={noop} />
      </AppScreen>
    )
  if (id === 'est')
    return (
      <AppScreen step="schatting">
        <EstimateScreen from={FROM} to={TO} route={ROUTE} onRouteLoaded={noop} onStart={noop} />
      </AppScreen>
    )
  if (id === 'ride')
    return (
      <AppScreen step="rit">
        <RideScreen
          from={FROM}
          to={TO}
          route={ROUTE.coordinates}
          status={getRideStatus(RIDE, rideElapsed(t))}
          onEndRide={noop}
          onArrived={noop}
        />
      </AppScreen>
    )
  return (
    <AppScreen step="overzicht">
      <SummaryScreen from={FROM} to={TO} ride={RIDE} status={FINAL} onClose={noop} />
    </AppScreen>
  )
}

function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <span className="status-icons">
        <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
          <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
          <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
          <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity="0.45" />
          <rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" />
          <rect x="23.5" y="4" width="1.8" height="4" rx="0.9" fill="currentColor" opacity="0.45" />
        </svg>
      </span>
    </div>
  )
}

function Phone({ t }: { t: number }) {
  const inU = easeOut(prog(t, T.phoneIn, T.phoneIn + 0.7))
  const outU = easeIn(prog(t, T.outro, T.outro + 0.45))
  const style: CSSProperties = {
    transform: `translateY(${(1 - inU) * 1050 + outU * 140}px) scale(${1 - outU * 0.06})`,
    opacity: (t < T.phoneIn ? 0 : 1) * (1 - outU),
  }
  return (
    <div className="phone-move" style={style}>
      <div className="phone-cam" id="phone-cam">
        <div className="phone" id="phone">
          <div className="phone-screen" id="phone-screen">
            <StatusBar />
            <div className="screens">
              {LAYERS.filter((l) => t >= l.from && t < l.to).map((l) => (
                <div className="screen-layer" data-screen={l.id} key={l.id} style={layerStyle(t, l)}>
                  <ScreenContent id={l.id} t={t} />
                </div>
              ))}
            </div>
            <div className="home-indicator" />
            <div className="tap" id="tap">
              <span className="tap-dot" />
              <span className="tap-ring" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Video({ t }: { t: number }) {
  return (
    <div className="stage">
      <Hook t={t} />
      <Captions t={t} />
      <Phone t={t} />
      <Outro t={t} />
    </div>
  )
}

// ---------- per-frame DOM choreography ----------
const PHONE_W = 430
const PHONE_H = 904
const SCREEN_W = 402
type Pt = { x: number; y: number }
const CENTER = { s: 1, focus: null as string | null, land: { x: 1380, y: 540 } }

type CamKey = { t: number; s: number; focus: string | null; land: Pt }
const C = (t: number): CamKey => ({ t, ...CENTER })
const K = (t: number, s: number, focus: string, x: number, y: number): CamKey => ({ t, s, focus, land: { x, y } })
const DEST_INPUT = '[data-screen=dest] .address-input:nth-of-type(2)'
const CAM: CamKey[] = [
  C(0),
  C(3.9),
  K(4.5, 1.42, DEST_INPUT, 1290, 470),
  K(5.95, 1.42, DEST_INPUT, 1290, 470),
  C(6.6),
  C(8.0),
  K(8.65, 1.5, '[data-screen=est] .price-range', 1320, 540),
  K(10.45, 1.5, '[data-screen=est] .price-range', 1320, 540),
  C(10.95),
  C(11.8),
  K(12.35, 1.22, '[data-screen=ride] .ride-price-row', 1350, 610),
  K(14.75, 1.22, '[data-screen=ride] .ride-price-row', 1350, 610),
  C(15.12),
  C(15.85),
  K(16.35, 1.6, '[data-screen=sum] .summary-price-row', 1290, 500),
  K(30, 1.6, '[data-screen=sum] .summary-price-row', 1290, 500),
]

const TAPS = [
  { t: T.select, sel: '[data-screen=dest] .address-input-suggestions button' },
  { t: T.tapNext, sel: '[data-screen=dest] .btn-primary' },
  { t: T.tapStart, sel: '[data-screen=est] .btn-primary' },
  { t: T.tapOverview, sel: '[data-screen=ride] .btn-primary' },
]
export const TAP_TIMES = TAPS.map((x) => x.t)
export const TIMES = T
const tapPos = new Map<number, Pt>()
let selectedDone = false

const $ = <E extends Element = HTMLElement>(sel: string) => document.querySelector<E>(sel)

function phoneLocal(sel: string): Pt | null {
  const el = $(sel)
  const phone = $('#phone')
  if (!el || !phone) return null
  const r = el.getBoundingClientRect()
  const p = phone.getBoundingClientRect()
  const k = p.width / PHONE_W
  return { x: (r.left + r.width / 2 - p.left) / k, y: (r.top + r.height / 2 - p.top) / k }
}

function camAt(t: number) {
  let i = CAM.findIndex((k) => k.t > t)
  if (i === -1) i = CAM.length - 1
  const A = CAM[Math.max(i - 1, 0)]
  const B = CAM[i]
  const u = easeInOut(B.t === A.t ? 1 : prog(t, A.t, B.t))
  const fa = (A.focus && phoneLocal(A.focus)) || { x: PHONE_W / 2, y: PHONE_H / 2 }
  const fb = (B.focus && phoneLocal(B.focus)) || { x: PHONE_W / 2, y: PHONE_H / 2 }
  return {
    s: lerp(A.s, B.s, u),
    f: { x: lerp(fa.x, fb.x, u), y: lerp(fa.y, fb.y, u) },
    land: { x: lerp(A.land.x, B.land.x, u), y: lerp(A.land.y, B.land.y, u) },
  }
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function waitFor(check: () => boolean, timeout = 8000) {
  const start = performance.now()
  while (!check()) {
    if (performance.now() - start > timeout) {
      console.warn('waitFor timeout')
      return
    }
    await new Promise((r) => setTimeout(r, 30))
  }
}

const tilesReady = () =>
  [...document.querySelectorAll<HTMLImageElement>('img.leaflet-tile')].every((img) => img.complete && img.naturalWidth > 0)

const root = createRoot(document.getElementById('video-root')!)

async function renderFrame(t: number) {
  flushSync(() => root.render(<Video t={t} />))

  // Typing into "Bestemming", like a user would.
  const field = document.querySelectorAll<HTMLElement>('[data-screen=dest] .address-input-field')[1]
  if (field) field.classList.toggle('fake-focus', t >= T.typeStart - 0.25 && t < T.select + 0.2)
  if (t >= T.typeStart && t < T.select) {
    const input = field?.querySelector('input')
    const n = Math.round(TYPED.length * prog(t, T.typeStart, T.typeEnd))
    if (input && input.value !== TYPED.slice(0, n)) setInputValue(input, TYPED.slice(0, n))
    if (t >= T.typeEnd + 0.15) await waitFor(() => !!$('[data-screen=dest] .address-input-suggestions'))
  }

  // Taps: measure the target once, before the tap clears it.
  for (const tap of TAPS) {
    if (t >= tap.t - 0.2 && !tapPos.has(tap.t)) {
      const el = $(tap.sel)
      const screen = $('#phone-screen')
      if (el && screen) {
        const r = el.getBoundingClientRect()
        const s = screen.getBoundingClientRect()
        const k = s.width / SCREEN_W
        tapPos.set(tap.t, { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k })
      }
    }
  }
  if (t >= T.select && !selectedDone) {
    $<HTMLButtonElement>('[data-screen=dest] .address-input-suggestions button')?.click()
    selectedDone = true
  }
  const tapEl = $('#tap')!
  const active = TAPS.find((tap) => t >= tap.t - 0.18 && t < tap.t + 0.5 && tapPos.has(tap.t))
  if (active) {
    const p = tapPos.get(active.t)!
    const d = t - active.t
    const press = d < 0 ? easeOut(prog(d, -0.18, 0)) : 1 - prog(d, 0.05, 0.3)
    const ring = prog(d, 0, 0.5)
    tapEl.style.cssText = `left:${p.x}px;top:${p.y}px;opacity:1;--press:${press};--ring:${easeOut(ring)};--ring-o:${(1 - ring) * (d >= 0 ? 1 : 0)}`
  } else tapEl.style.cssText = 'opacity:0'

  // Badge stamp.
  const badge = $('[data-screen=sum] .summary-badge')
  if (badge) {
    const u = prog(t, T.badge, T.badge + 0.42)
    badge.style.opacity = String(clamp(u * 6))
    badge.style.transform = `scale(${lerp(2.4, 1, easeOutBack(u))})`
    badge.style.transformOrigin = 'center'
  }

  // Camera.
  const cam = $('#phone-cam')!
  const { s, f, land } = camAt(t)
  cam.style.transform = `translate(${land.x - f.x * s}px, ${land.y - f.y * s}px) scale(${s})`

  await document.fonts.ready
  await waitFor(tilesReady)
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
}

declare global {
  interface Window {
    renderFrame: (t: number) => Promise<void>
    VIDEO: unknown
  }
}
window.renderFrame = renderFrame
window.VIDEO = { DURATION, HOOK_TICKS, TAP_TIMES, TIMES, PUSH, estimate: ESTIMATE, final: FINAL.price, route: ROUTE.distance }
