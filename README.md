# Japan Guide

### → [alantgoff.github.io/JapanGuide](https://alantgoff.github.io/JapanGuide/)

A stylised point-cloud map of Japan for planning a trip — and for handing to friends who are about to go.

Sumi ink on washi paper. The country is drawn as a field of ink dots, denser where the cities are; the Shinkansen lines thread between them, Mount Fuji is a radial cone of points, and Lake Biwa is a hole in the cloud. Vermilion marks are personal recommendations, and the whole guide travels in a single link.

**One file, no build step, no backend, nothing fetched at runtime.** Open `index.html` in a browser.

Zoom into a city and the same dots carry on being the map. Pontocho resolves into two frontages four and a half metres apart, Kiyomizu-dera into a deck cantilevered off a hillside on a lattice of stilts, Fushimi Inari into a ladder of torii climbing its ridge. Nothing switches over to a different kind of map when you get close — the drawing just says more.

## Credits

The paper surface is [Paper Shaders](https://github.com/paper-design/shaders)' `paper-texture` fragment shader (Apache-2.0), bundled and inlined — fibre, crumple and speckle rendered in WebGL2 and multiplied over the paper colour. It mounts static, so it draws once and costs nothing after. Where WebGL2 is unavailable it falls back to a generated noise tile, and the page reads correctly with neither.

---

## Using it

| | |
|---|---|
| **Move around** | Drag to pan, scroll or pinch to zoom, double-click to zoom in. Arrow keys and `+` / `−` also work. |
| **Read a place** | Click any mark for what it is, why it's worth going, and a practical note — opening hours, the hour that beats the crowds, whether it's cash-only. |
| **Search** | Takes what you'd actually type: `asakusa`, `golden pavilion`, `deer`, `glico`, `black eggs`, `東大寺`. Whole-word matches rank first, so `uji` finds Byōdō-in rather than every Fuji. |
| **Jump** | Region buttons fly between Tokyo, Fuji & Hakone, Kyoto, Nara, Osaka, and the whole country. |
| **Zoom into a district** | Keep going past the city marks and the cloud resolves: the Kamo between its banks, the Heian grid of blocks, Nishiki's five blocks of stalls, the moat around Nijō, the torii climbing Fushimi. Sixty-six places are drawn as their own shape rather than as a dot, and past about z16 they stand up — eaves, columns, a hipped roof, Kiyomizu's stage on its stilts, Sensō-ji's pagoda. |
| **Look at a place** | Opening a mark draws its picture: the same points seen from the south-east and low, instead of from straight overhead. Nothing is fetched and nothing is invented — if the map doesn't know a thing, the picture can't show it either. |
| **Tour a city** | `‹ ›` at the top of the zoom stack — or in the panel, or `[` and `]` — step through everything in the region you're looking at. Press `›` on a cold map and it opens the first stop and narrows to that city. The order is a walk: a nearest-neighbour chain from the region's most iconic place, which is roughly half the distance of visiting them best-first. Each stop flies to the scale that place needs — a 4.5m alley and a 700m park don't share one — so the drawing arrives already legible rather than as a dot you have to zoom into. Respects the category filters, so turning restaurants off keeps them out of the tour. |
| **Build an itinerary** | *Add to trip* fills a mark in, numbers it, and threads a dashed line between stops. Reorder with ↑ ↓, split into days with 日, and each stop shows how long the walk from the one above it takes. Press a day's heading to frame that day on the map — the quickest way to see whether it hangs together or has you crossing the city twice. Saved in the browser. |

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

- **Coordinates** for the built-in places were checked against Wikipedia and OpenStreetMap. **The geography is deliberately coarse at country scale** — the coastline is hand-authored at a median 33km between vertices, so the silhouette is recognisable but wrong by kilometres. It carries the shape of the country, not its shoreline.
- **The pictures in the panel are drawings, not photographs.** Each one is that place's own points under a different camera, so it is exactly as truthful as the map is and no more. Sixty-six places are drawn as a building or a street; the remaining eight show their surroundings — the lane they are on, the river bank, a neighbour's precinct — which is honest about the map knowing where they are and not what they look like. A few are deliberate: the Fuji lakes are already drawn as real polygons and an ellipse over one would be a worse copy, and Osaka Aquarium stands on reclaimed land this map's coastline doesn't have — a building there would be the drawing contradicting the map it is drawn on.
- **Most of those buildings come from archetypes**, not from individual authoring. The forms this country repeats — a gate, a courtyard, a hall, sometimes a pagoda; a torii and a honden; a keep on its stone; a lattice tower — are written once and take their numbers from the place: which way the approach runs, how big the hall is, how many storeys the pagoda has. That is the same class of claim the marker already makes, drawn more richly. Archetype drawings are deliberately sparser than the hand-authored ones, so the weight of the ink says how much the guide actually knows.
- **Buildings have height, the map does not.** Only what is authored to stand up does, so the plan stays true and distances stay honest. Height is drawn at its real value up to about 45m and compressed logarithmically above it, because a 634m tower drawn linearly leaves the frame and lays ink across half a kilometre of city that has nothing to do with it. Mount Fuji deliberately stays flat: an oblique lift is a shear, and 2,776m on a 14km cone reads as a disc pulled sideways rather than as a mountain.
- **The street and site drawings are impressionistic, not surveyed.** They are authored by hand from published layouts and from knowing the places, in metres from each site's own coordinate. A lane is in the right place to within a building or two and has the right width, length and orientation; it is not traced from a survey and you should not navigate by it. What it is for is reading a district — that Pontocho is a slot and Kawaramachi is an avenue, that Kiyomizu sits above the city and Fushimi climbs away from it.
- **Nothing is fetched, ever.** No tiles, no fonts, no analytics, no API. Open the file from a USB stick on a plane and it is complete. This is asserted in the tests rather than described, including a `file://` load with the request log required to be empty.
- **Walking times** are straight-line distance with a 1.3 detour factor at 4.5 km/h. That is a decent planning estimate on flat ground, not a route — it does not know about the hill, the river or the level crossing. Legs over 12 km say *take the train* rather than pretending.
- **The zoom stops at about 0.8 metres a pixel**, which is where the finest thing the drawing says — that four-and-a-half-metre gap down Pontocho — opens up enough for the eye to read it as a gap. Past that you would only be magnifying a fixed set of dots.
- **Kyoto's street grid between the named avenues is not stored.** A real 120m *chō* lattice over the centre would be more points than the rest of the map put together, for something nobody looks at individually. The per-frame ground fill snaps onto it instead, which costs nothing and gets the level of detail right for free.
- **Typography** relies on Hiragino Mincho / Yu Mincho, which are present on macOS, iOS and Windows Japanese installs. Elsewhere it falls back to Georgia, which changes the character of the page.
- **Single theme by design.** This is a printed map, not a UI — there's no dark mode.
- **The ground is generated per frame rather than stored**: a jittered lattice masked against the coastline, weighted by how built-up the land is, sized to hold a roughly constant on-screen density at every zoom. Deterministic from world position, so it holds still while you pan. As the authored streets and sites arrive it thins to about a quarter — enough that the drawing dominates, never so little that the paper goes blank.
- **Authored geography draws from its own random stream.** Editing the site table would otherwise reshuffle every coastline point after it, which makes visual diffs useless. The coastline does not move when a temple does.
- Renders on two stacked canvases (the cloud only redraws when the view changes) and stays comfortably inside a frame budget on a laptop.

## Serving it

Published with GitHub Pages from `main` at the repository root, so a push to `main` redeploys it. Any other static host works too, or just open `index.html` directly — there is nothing to build and nothing to fetch.
