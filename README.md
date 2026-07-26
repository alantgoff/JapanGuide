# Japan Guide

### → [alantgoff.github.io/JapanGuide](https://alantgoff.github.io/JapanGuide/)

A stylised point-cloud map of Japan for planning a trip — and for handing to friends who are about to go.

Sumi ink on washi paper. The country is drawn as a field of ink dots, denser where the cities are; the Shinkansen lines thread between them, Mount Fuji is a radial cone of points, and Lake Biwa is a hole in the cloud. Vermilion marks are personal recommendations, and the whole guide travels in a single link.

**One file, no build step, no backend.** Open `index.html` in a browser.

Zoom into a city and the ground becomes a real survey — streets and hillshade, so you can see which side of the station a place is on and how far it is on foot. That part is fetched; everything else is in the file. The opening view fetches nothing, the *Ink* setting fetches nothing ever, and with no network at all the drawn map is exactly what it always was.

## Credits

The paper surface is [Paper Shaders](https://github.com/paper-design/shaders)' `paper-texture` fragment shader (Apache-2.0), bundled and inlined — fibre, crumple and speckle rendered in WebGL2 and multiplied over the paper colour. It mounts static, so it draws once and costs nothing after. Where WebGL2 is unavailable it falls back to a generated noise tile, and the page reads correctly with neither.

Streets and terrain are [地理院タイル](https://maps.gsi.go.jp/development/ichiran.html) — 出典：国土地理院 — from the Geospatial Information Authority of Japan. Free, no key, no account. They are desaturated, multiplied into the paper and tinted toward sumi, so they print into the drawing rather than sitting on top of it.

---

## Using it

| | |
|---|---|
| **Move around** | Drag to pan, scroll or pinch to zoom, double-click to zoom in. Arrow keys and `+` / `−` also work. |
| **Read a place** | Click any mark for what it is, why it's worth going, and a practical note — opening hours, the hour that beats the crowds, whether it's cash-only. |
| **Search** | Takes what you'd actually type: `asakusa`, `golden pavilion`, `deer`, `glico`, `black eggs`, `東大寺`. Whole-word matches rank first, so `uji` finds Byōdō-in rather than every Fuji. |
| **Jump** | Region buttons fly between Tokyo, Fuji & Hakone, Kyoto, Nara, Osaka, and the whole country. |
| **Choose the ground** | *Ink* is the drawn map alone. *Terrain* puts hillshade under it — useful for Hakone and the hills behind Kyoto. *Streets* adds the survey, and is what makes the city zoom usable. 名 turns the Japanese names on the base on and off. |
| **Build an itinerary** | *Add to trip* fills a mark in, numbers it, and threads a dashed line between stops. Reorder with ↑ ↓, split into days with 日, and each stop shows how long the walk from the one above it takes. Saved in the browser. |

## Adding your own places

**Add a place** → click the map where it is → give it a name, optionally the Japanese name (useful for taxi drivers and signage), a kind, and why you send people there.

Seven kinds: temples & shrines, gardens & nature, views & districts, museums & culture, markets & street food, **matcha, tea & coffee**, and **restaurants & bars**.

Your places are drawn in vermilion so they read apart from the built-in route. Edit, move or delete any of them. Anything dropped well away from the five cities files under *Elsewhere* rather than being mislabelled.

## Before you go

Eighteen practical and cultural notes ship with the guide — escalator sides (Tokyo stands left, Osaka right), whether the JR Pass still pays since the 2023 price rise, shrine versus temple protocol, onsen and tattoo rules, luggage forwarding, and the fact that there are no bins anywhere. All of them are editable, and you can add your own.

## Sharing

**Share → Copy link.** Everything you've added — places, notes, itinerary, and the guide's title and seal — is encoded into the link's fragment. There is no account and nothing stored on a server.

Whoever opens it sees your guide as you left it, with a short welcome card in your words. They can edit it and share their own version; nothing is written to their browser unless they choose *Save a copy here*.

An untouched guide's link is under 800 characters, because the built-in notes are only transmitted if you've actually changed them. A guide with a few dozen places runs to a few kilobytes — long, but well inside what browsers accept.

**Anything you put in the link is readable by anyone who has the link.** Treat it like a public document: no addresses, door codes, or anything you wouldn't post.

## Guide details

Set the title, the opening note, the vertical characters and the seal character so it reads as yours rather than as a template.

---

## Notes and caveats

- **Coordinates** for the 73 built-in places were checked against Wikipedia and OpenStreetMap. **The drawn geography is deliberately coarse** — the coastlines are hand-authored, so the silhouette is recognisable but not survey-accurate. It carries the country; the GSI tiles carry the cities, and they fade in over each other from about z10.
- **Walking times** are straight-line distance with a 1.3 detour factor at 4.5 km/h. That is a decent planning estimate on flat ground, not a route — it does not know about the hill, the river or the level crossing. Legs over 12 km say *take the train* rather than pretending.
- **Turning the base labels off** drops to GSI's `blank` layer, which stops at z14. Rather than stretch it into mush, the labelled sheet comes back one level past that and the 名 control marks itself to say so. `pale` runs to z18 and is the default.
- **The ink treatment is tuned to GSI's `pale` palette**, which is much lighter than it looks — its water is luma 220 against a 242 ground. The transfer curve is solved so the ground clips to white and multiplies away while water still prints; measured end to end, buildings darken the paper 6%, parks 8%, water 14%, arterials 14%, lane casings 25%, rail 49%, lettering 62%. All of it lives in the `INK` object, which is the thing to nudge if it reads too heavy or too faint on your screen.
- **Water and arterial roads land on the same tone**, because in greyscale they genuinely are the same luminance. Shape separates them — water is areal, roads are linear.
- **The zoom pick ignores device pixel ratio.** GSI serves no @2x tiles, so a retina bump would mean four times the requests for sharpness this treatment throws away anyway.
- **Typography** relies on Hiragino Mincho / Yu Mincho, which are present on macOS, iOS and Windows Japanese installs. Elsewhere it falls back to Georgia, which changes the character of the page.
- **Single theme by design.** This is a printed map, not a UI — there's no dark mode.
- Points are generated per frame rather than stored: a jittered lattice masked against the coastline, weighted by how built-up the ground is, sized to hold a constant on-screen density at every zoom. Deterministic from world position, so it holds still while you pan.
- Renders on two stacked canvases (the cloud only redraws when the view changes) and stays comfortably inside a frame budget on a laptop.

## Serving it

Published with GitHub Pages from `main` at the repository root, so a push to `main` redeploys it. Any other static host works too, or just open `index.html` directly — there is nothing to build and nothing to fetch.
