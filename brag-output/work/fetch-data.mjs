import fs from 'node:fs'
const env = fs.readFileSync('../../.env', 'utf8')
const KEY = (env.match(/VITE_ORS_API_KEY=(.*)/) || [])[1]?.trim()
if (!KEY) throw new Error('no key')
const B = 'https://api.openrouteservice.org'
const j = async (r) => { if (!r.ok) throw new Error(r.status + ' ' + await r.text()); return r.json() }
const ac = await j(await fetch(`${B}/geocode/autocomplete?` + new URLSearchParams({ api_key: KEY, text: 'Amsterdam Centraal', 'boundary.country': 'NL', size: '5' })))
const rev = await j(await fetch(`${B}/geocode/reverse?` + new URLSearchParams({ api_key: KEY, 'point.lon': '4.76113', 'point.lat': '52.30960', size: '1' })))
const toCoord = ac.features[0].geometry.coordinates
const dir = await j(await fetch(`${B}/v2/directions/driving-car/geojson`, { method: 'POST', headers: { Authorization: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ coordinates: [[4.76113, 52.30960], toCoord] }) }))
fs.writeFileSync('data.json', JSON.stringify({ autocomplete: ac, reverse: rev, directions: dir }))
console.log(ac.features.map(f => f.properties.label), rev.features[0]?.properties.label, dir.features[0].properties.summary, dir.features[0].geometry.coordinates.length)
