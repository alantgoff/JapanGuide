# Japan Guide

### → [alantgoff.github.io/JapanGuide](https://alantgoff.github.io/JapanGuide/)

A stylised point-cloud map of Japan for planning a trip — and for handing to friends who are about to go.

Sumi ink on washi paper. The country is drawn as a field of ink dots, denser where the cities are; the Shinkansen lines thread between them, Mount Fuji is a radial cone of points, and Lake Biwa is a hole in the cloud. Vermilion marks are personal recommendations, and the whole guide travels in a single link.

**One file, no build step, no backend, nothing fetched at runtime.** Open `index.html` in a browser.

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
| **Build an itinerary** | *Add to trip* fills a mark in, numbers it, and threads a dashed line between stops — grouped by city with running distance. Saved in the browser. |

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

- **Coordinates** for the 73 built-in places were checked against Wikipedia and OpenStreetMap. **The geography is deliberately coarse** — the coastlines are hand-authored, so the silhouette is recognisable but not survey-accurate. Plan shapes with it, don't navigate by it.
- **Typography** relies on Hiragino Mincho / Yu Mincho, which are present on macOS, iOS and Windows Japanese installs. Elsewhere it falls back to Georgia, which changes the character of the page.
- **Single theme by design.** This is a printed map, not a UI — there's no dark mode.
- Points are generated per frame rather than stored: a jittered lattice masked against the coastline, weighted by how built-up the ground is, sized to hold a constant on-screen density at every zoom. Deterministic from world position, so it holds still while you pan.
- Renders on two stacked canvases (the cloud only redraws when the view changes) and stays comfortably inside a frame budget on a laptop.

## Serving it

Published with GitHub Pages from `main` at the repository root, so a push to `main` redeploys it. Any other static host works too, or just open `index.html` directly — there is nothing to build and nothing to fetch.
