# TaxiPrijs — brag plan

**What it is:** A mobile web app that shows what a taxi ride will cost *before* you get in, then tracks the meter live and compares the final price to the estimate.
**For:** Anyone getting into a taxi in the Netherlands, especially a traveller at Schiphol who has no idea what the meter is about to do.
**What sets it apart:** The price is fully transparent: a price *range* up front, a breakdown (starttarief + km + minuten), a live meter whose "verwachte eindprijs" narrows during the ride, and a verdict at the end: "Binnen schatting".
**Most impressive claim:** A real 26.5 km route from Schiphol to Amsterdam Centraal, priced up front at € 63–80, ending at € 71,58: *Binnen schatting*.
**Visual hook:** A huge taxi meter ticking up on a dark screen, with the question "Wat gaat dit kosten?"
**Real UI shown:** The app's actual React screens (`DestinationScreen`, `EstimateScreen`, `RideScreen`, `SummaryScreen`, `Header`, `MapView` with Leaflet/OSM), with real ORS route data, inside a phone frame.
**Tone:** `default` leaning `polished`. Monochrome like the app (#1a1a1a / #2b2b2b / white, system-ui), calm confidence, with one wink at Schiphol taxi anxiety.
**Share caption:** "Schiphol → Centraal met de taxi? TaxiPrijs vertelt je vooraf wat het kost."

## Angle
Taxi meter anxiety → certainty. The hook is the fear (a meter running away), and the payoff is the stamp "Binnen schatting".

## Storyboard (landscape 1920×1080, 30fps, 21.5s, 120 BPM)

| # | Time | Scene | On screen | Sound |
|---|---|---|---|---|
| 1 | 0.0–3.0 | Hook | Muted "Schiphol → Amsterdam Centraal" with the app's icons. A giant meter ticks up in 16ths from € 4,15. "Wat gaat dit kosten?" lands at 0.8s | Woodblock ticks on each meter step, low Am pad swelling, riser into the drop |
| 2 | 3.0–7.5 | Reveal + destination | Phone rises with the real DestinationScreen. Left: TaxiPrijs logo + "Weet wat je rit kost — vóór je instapt." Camera pushes in on "Bestemming": "Amsterdam Centraal" is typed, a real ORS suggestion appears and is tapped, the map fits both points, then "Bekijk prijsschatting" is tapped | Drop at 3.0 (kick, bass, pad). Soft key clicks while typing, tap blips |
| 3 | 7.5–11.5 | Estimate | Push transition to EstimateScreen. Camera pushes in on the black "Geschatte prijsvork € 63–80" card. Left: "Een eerlijke prijs. Vooraf." / "Starttarief, kilometers en minuten — alles zichtbaar." Tap "Start en volg deze rit" | Swoosh, groove continues |
| 4 | 11.5–15.5 | Live ride | RideScreen: the taxi dot drives the real route on the map, the meter counts, the progress bar fills, "verwachte eindprijs" narrows, and it arrives. Left: "De meter, live in je hand." Tap "Bekijk ritoverzicht" | Swoosh, groove |
| 5 | 15.5–19.0 | Payoff | SummaryScreen: Eindprijs € 71,58. The "BINNEN SCHATTING" badge pops. Left: "Binnen schatting." / "Vooraf € 63–80. Betaald € 71,58." | Bell chord stamp on the badge |
| 6 | 19.0–21.5 | Outro | Phone exits. Centered logo square + "TaxiPrijs" / "Geen verrassingen op de meter." | Drums out, C major resolve, bell rings out |

Total: 21.5s.

## Build
- Vite page in `work/video/` imports the project's real components and CSS. Each frame is a pure function of `t`; the ORS calls are answered from `work/data.json`, a single real API fetch.
- Puppeteer (system Chrome) steps through frames and waits for map tiles. Audio is synthesized in Node (music and SFX as one mix). ffmpeg muxes the result.
