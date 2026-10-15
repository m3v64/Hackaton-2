// Synthesizes the soundtrack (music + SFX as one mix) -> work/audio.wav
import fs from 'node:fs'

const tl = JSON.parse(fs.readFileSync('timeline.json', 'utf8'))
const T = tl.TIMES
const SR = 48000
const DUR = tl.DURATION
const N = Math.ceil(DUR * SR)
const BEAT = 0.5
const GROOVE = [3.0, 19.0]

// buses
const dryL = new Float32Array(N), dryR = new Float32Array(N)
const revIn = new Float32Array(N) // mono send to reverb
const dlyIn = new Float32Array(N) // mono send to delay
const duck = new Float32Array(N).fill(1) // sidechain gain for pad/bass

const midi = (m) => 440 * 2 ** ((m - 69) / 12)
const idx = (t) => Math.round(t * SR)
let seed = 12345
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1

function add(i, l, r, rev = 0, dly = 0) {
  if (i < 0 || i >= N) return
  dryL[i] += l
  dryR[i] += r
  revIn[i] += (l + r) * 0.5 * rev
  dlyIn[i] += (l + r) * 0.5 * dly
}
const panLR = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)]

// ---------- instruments ----------
function kick(t0, g = 0.9) {
  const len = 0.45 * SR
  let ph = 0
  for (let n = 0; n < len; n++) {
    const t = n / SR
    const f = 48 + 110 * Math.exp(-t * 32)
    ph += (2 * Math.PI * f) / SR
    const env = Math.exp(-t * 7.5) * Math.min(1, t * 900)
    const click = n < 120 ? rnd() * 0.25 * (1 - n / 120) : 0
    const s = (Math.sin(ph) * env + click) * g
    add(idx(t0) + n, s, s)
  }
  // sidechain dip
  for (let n = 0; n < 0.4 * SR; n++) {
    const i = idx(t0) + n
    if (i < N) duck[i] = Math.min(duck[i], 1 - 0.55 * Math.exp(-(n / SR) / 0.11))
  }
}

function noiseHit(t0, { dur, decay, hp = 0, lp = 1, g, pan = 0, rev = 0, attack = 0.001 }) {
  // one-pole filtered noise; hp/lp are coefficients 0..1
  const [pl, pr] = panLR(pan)
  let lpS = 0, hpS = 0, prev = 0
  for (let n = 0; n < dur * SR; n++) {
    const t = n / SR
    const x = rnd()
    lpS += lp * (x - lpS)
    const y = lpS - hpS
    hpS += hp * (lpS - hpS)
    prev = y
    const env = Math.min(1, t / attack) * Math.exp(-t / decay) * g
    add(idx(t0) + n, prev * env * pl, prev * env * pr, rev)
  }
}

function tone(t0, freq, { dur, decay, g, pan = 0, rev = 0, dly = 0, partials = [[1, 1]], attack = 0.002 }) {
  const [pl, pr] = panLR(pan)
  for (let n = 0; n < dur * SR; n++) {
    const t = n / SR
    let s = 0
    for (const [ratio, amp, pdecay = decay] of partials) s += amp * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp(-t / pdecay)
    const env = Math.min(1, t / attack) * g
    add(idx(t0) + n, s * env * pl, s * env * pr, rev, dly)
  }
}

const bell = (t0, f, g, pan = 0, dur = 2.5) =>
  tone(t0, f, { dur, decay: 1.1, g, pan, rev: 0.45, partials: [[1, 1, 1.2], [2.0, 0.35, 0.6], [2.76, 0.18, 0.35], [5.4, 0.06, 0.15]] })

function pluck(t0, freq, g, pan) {
  // Karplus-Strong
  const P = Math.round(SR / freq)
  const buf = new Float32Array(P)
  for (let k = 0; k < P; k++) buf[k] = rnd() * 0.5
  const [pl, pr] = panLR(pan)
  let p = 0
  const len = 0.9 * SR
  let lp = 0
  for (let n = 0; n < len; n++) {
    const a = buf[p]
    const b = buf[(p + 1) % P]
    buf[p] = 0.4985 * (a + b)
    lp += 0.35 * (a - lp)
    const env = g * Math.min(1, n / 40)
    add(idx(t0) + n, lp * env * pl, lp * env * pr, 0.3, 0.35)
    p = (p + 1) % P
  }
}

function pad(t0, t1, notes, { g, cutoff, rel = 0.6, att = 0.25, detune = 0.006, sc = true }) {
  const n0 = idx(t0), n1 = Math.min(N, idx(t1 + rel))
  const lpState = [0, 0]
  for (let n = n0; n < n1; n++) {
    const t = n / SR - t0
    const env = Math.min(1, t / att) * (n / SR > t1 ? Math.max(0, 1 - (n / SR - t1) / rel) : 1)
    let L = 0, R = 0
    for (const m of notes) {
      const f = midi(m)
      for (const [d, side] of [[-detune, 0], [detune, 1]]) {
        const ff = f * (1 + d)
        let s = 0
        for (let h = 1; h <= 9; h++) s += Math.sin(2 * Math.PI * ff * h * t + h * 1.3 + m) / h
        if (side === 0) L += s
        else R += s
      }
    }
    const c = typeof cutoff === 'function' ? cutoff(n / SR) : cutoff
    const a = 1 - Math.exp((-2 * Math.PI * c) / SR)
    lpState[0] += a * (L - lpState[0])
    lpState[1] += a * (R - lpState[1])
    const gg = (g / notes.length) * env * (sc ? duck[n] : 1)
    dryL[n] += lpState[0] * gg
    dryR[n] += lpState[1] * gg
    revIn[n] += (lpState[0] + lpState[1]) * 0.5 * gg * 0.35
  }
}

function bassNote(t0, dur, m, g) {
  const f = midi(m)
  for (let n = 0; n < dur * SR; n++) {
    const t = n / SR
    const env = Math.min(1, t * 300) * Math.exp(-t * 3.2) * Math.min(1, (dur - t) * 60)
    const s = (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) + 0.08 * Math.sin(6 * Math.PI * f * t)) * env * g
    const i = idx(t0) + n
    if (i < N) add(i, s * duck[i], s * duck[i])
  }
}

function swoosh(t0, g = 0.12, dur = 0.5) {
  // band-passed noise sweeping up, bell-shaped envelope (state-variable filter)
  let low = 0, band = 0
  for (let n = 0; n < dur * SR; n++) {
    const u = n / (dur * SR)
    const fc = 300 + 3200 * u * u
    const f = 2 * Math.sin((Math.PI * fc) / SR)
    const x = rnd()
    low += f * band
    const high = x - low - 0.6 * band
    band += f * high
    const env = Math.sin(Math.PI * u) ** 2 * g
    const pan = -0.6 + 1.2 * u
    const [pl, pr] = panLR(pan)
    add(idx(t0) + n, band * env * pl, band * env * pr, 0.25)
  }
}

// ---------- score ----------
// Kick sidechain must exist before pad/bass are rendered, so drums first.
const beats = []
for (let t = GROOVE[0]; t < GROOVE[1] - 0.01; t += BEAT) beats.push(t)
beats.forEach((t, k) => {
  kick(t, k === 0 ? 0.95 : 0.62)
  if (k % 2 === 1) noiseHit(t, { dur: 0.3, decay: 0.07, hp: 0.25, lp: 0.55, g: 0.16, rev: 0.35, attack: 0.002 }) // clap
  noiseHit(t + BEAT / 2, { dur: 0.08, decay: 0.022, hp: 0.75, lp: 1, g: 0.11, pan: 0.35 }) // offbeat hat
  if (t >= 11.0) noiseHit(t + BEAT * 0.75, { dur: 0.05, decay: 0.012, hp: 0.8, lp: 1, g: 0.05, pan: -0.3 })
})

// Hook: Am pad swelling, filter opening
pad(0, 3.0, [57, 60, 64], { g: 0.3, cutoff: (t) => 350 + 900 * (t / 3), att: 1.2, rel: 0.25, sc: false })
pad(0, 3.0, [45], { g: 0.16, cutoff: 300, att: 1.5, rel: 0.25, sc: false })

// Meter ticks, on every meter step
tl.HOOK_TICKS.forEach((t, k) => {
  const f = k % 4 === 0 ? 1760 : 1318.5
  tone(t, f, { dur: 0.06, decay: 0.012, g: 0.24 + 0.1 * (k / tl.HOOK_TICKS.length), pan: k % 2 ? 0.2 : -0.2, partials: [[1, 1], [2.01, 0.3]], rev: 0.15 })
  noiseHit(t, { dur: 0.02, decay: 0.004, hp: 0.6, g: 0.1 })
})

// Riser into the drop
{
  let low = 0, band = 0
  const a = 1.4, b = 3.0
  for (let n = idx(a); n < idx(b); n++) {
    const u = (n / SR - a) / (b - a)
    const fc = 400 + 5000 * u ** 2
    const f = 2 * Math.sin((Math.PI * fc) / SR)
    low += f * band
    band += f * (rnd() - low - 0.5 * band)
    const env = 0.2 * u ** 2.2
    add(n, band * env, band * env, 0.3)
  }
}
// Impact at 3.0
tone(3.0, 55, { dur: 1.4, decay: 0.45, g: 0.38, partials: [[1, 1], [2, 0.2]] })
noiseHit(3.0, { dur: 1.6, decay: 0.45, hp: 0.05, lp: 0.25, g: 0.12, rev: 0.6, attack: 0.003 })

// Groove harmony: F G Am F C G Am G | C
const CHORDS = [
  { root: 41, notes: [57, 60, 65] }, // F
  { root: 43, notes: [59, 62, 67] }, // G
  { root: 45, notes: [60, 64, 69] }, // Am
  { root: 41, notes: [57, 60, 65] }, // F
  { root: 48, notes: [55, 60, 64] }, // C
  { root: 43, notes: [59, 62, 67] }, // G
  { root: 45, notes: [60, 64, 69] }, // Am
  { root: 43, notes: [59, 62, 67] }, // G
]
CHORDS.forEach((c, k) => {
  const t0 = 3.0 + k * 2
  pad(t0, t0 + 2, c.notes, { g: 0.2, cutoff: k < 2 ? 1400 : 2000, att: 0.08, rel: 0.12 })
  for (let e = 0; e < 4 * 2; e++) {
    const bt = t0 + e * 0.25
    bassNote(bt, 0.24, c.root + (e % 4 === 3 ? 12 : 0), e % 2 === 0 ? 0.3 : 0.2)
  }
  // Pluck arpeggio from the estimate scene on
  if (t0 >= 7.0) {
    const arp = [c.notes[0], c.notes[1], c.notes[2], c.notes[0] + 12, c.notes[2], c.notes[1], c.notes[2], c.notes[0] + 12]
    for (let s = 0; s < 16; s++) pluck(t0 + s * 0.125, midi(arp[s % 8] + 12), s % 4 === 0 ? 0.2 : 0.12, s % 2 ? 0.35 : -0.35)
  }
})

// Outro: resolve to C, ring out
pad(19.0, DUR - 0.6, [48, 55, 60, 64, 67], { g: 0.32, cutoff: 1600, att: 0.05, rel: 0.6, sc: false })
tone(19.0, midi(36), { dur: 2.5, decay: 1.2, g: 0.3, partials: [[1, 1], [2, 0.25]] })
;[72, 76, 79, 84].forEach((m, k) => bell(T.outro + 0.4 + k * 0.06, midi(m), 0.075, -0.3 + k * 0.2, 2.2))

// ---------- SFX (in key, under the music) ----------
// Typing
const chars = 18
for (let k = 0; k < chars; k++) {
  const t = T.typeStart + (k + 0.5) * ((T.typeEnd - T.typeStart) / chars)
  noiseHit(t, { dur: 0.03, decay: 0.006, hp: 0.5, lp: 0.7, g: 0.07 + (k % 3) * 0.015, pan: 0.25 })
}
// Taps: soft click + E6 blip
tl.TAP_TIMES.forEach((t) => {
  noiseHit(t, { dur: 0.03, decay: 0.005, hp: 0.4, lp: 0.6, g: 0.1, pan: 0.2 })
  tone(t, midi(88), { dur: 0.25, decay: 0.06, g: 0.06, pan: 0.2, rev: 0.3, partials: [[1, 1], [2, 0.2]] })
})
// Swooshes on screen pushes and phone moves
swoosh(T.phoneIn - 0.1, 0.1, 0.6)
;[T.push1, T.push2, T.push3].forEach((t) => swoosh(t - 0.05, 0.13, 0.5))
swoosh(T.outro - 0.05, 0.1, 0.55)
// Badge stamp: thump + Am bell chord
tone(T.badge, 95, { dur: 0.4, decay: 0.09, g: 0.32 })
noiseHit(T.badge, { dur: 0.08, decay: 0.015, hp: 0.3, lp: 0.6, g: 0.12 })
;[81, 84, 88].forEach((m, k) => bell(T.badge + 0.01 + k * 0.025, midi(m), 0.07, -0.25 + k * 0.25, 2.0))

// ---------- effects + master ----------
function reverb(input) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round((d * SR) / 44100))
  const aps = [556, 441].map((d) => Math.round((d * SR) / 44100))
  const out = [new Float32Array(N), new Float32Array(N)]
  for (let ch = 0; ch < 2; ch++) {
    const spread = ch * 23
    const cs = combs.map((d) => ({ buf: new Float32Array(d + spread), p: 0, lp: 0 }))
    const as = aps.map((d) => ({ buf: new Float32Array(d + spread), p: 0 }))
    for (let n = 0; n < N; n++) {
      const x = input[n] * 0.3
      let y = 0
      for (const c of cs) {
        const v = c.buf[c.p]
        c.lp = v * 0.65 + c.lp * 0.35
        c.buf[c.p] = x + c.lp * 0.82
        c.p = (c.p + 1) % c.buf.length
        y += v
      }
      for (const a of as) {
        const v = a.buf[a.p]
        a.buf[a.p] = y + v * 0.5
        y = v - y * 0.5
        a.p = (a.p + 1) % a.buf.length
      }
      out[ch][n] = y
    }
  }
  return out
}
const [rvL, rvR] = reverb(revIn)
// ping-pong delay, dotted eighth
const D = Math.round(0.375 * SR)
const dl = new Float32Array(N), dr = new Float32Array(N)
for (let n = 0; n < N; n++) {
  const fbL = n >= D ? dr[n - D] * 0.32 : 0
  const fbR = n >= D ? dl[n - D] * 0.32 : 0
  dl[n] = (n >= D ? dlyIn[n - D] : 0) + fbR
  dr[n] = fbL
}

const L = new Float32Array(N), R = new Float32Array(N)
let peak = 0
for (let n = 0; n < N; n++) {
  const t = n / SR
  const fadeIn = Math.min(1, t / 0.02)
  const fadeOut = Math.min(1, (DUR - t) / 0.5)
  let l = (dryL[n] + rvL[n] * 0.55 + dl[n] * 0.35) * fadeIn * fadeOut
  let r = (dryR[n] + rvR[n] * 0.55 + dr[n] * 0.35) * fadeIn * fadeOut
  l = Math.tanh(l * 1.4) / 1.4
  r = Math.tanh(r * 1.4) / 1.4
  L[n] = l
  R[n] = r
  peak = Math.max(peak, Math.abs(l), Math.abs(r))
}
const gain = 0.89 / peak
const buf = Buffer.alloc(44 + N * 4)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8)
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22)
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34)
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40)
for (let n = 0; n < N; n++) {
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[n] * gain)) * 32767), 44 + n * 4)
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[n] * gain)) * 32767), 46 + n * 4)
}
fs.writeFileSync('audio.wav', buf)
console.log('audio.wav written, peak before gain', peak.toFixed(3), 'gain', gain.toFixed(2))
