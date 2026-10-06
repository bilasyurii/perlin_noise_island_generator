# Perlin Noise Island Generator

A small, dependency-free browser project that procedurally generates a random island map on an HTML canvas using Perlin-style gradient noise and renders it as a biome map.

![Example island](photos/photo_2026-10-07%2000.32.13.jpeg)

## History

I originally made this in 2017 in C++ with SFML. I later converted it to JavaScript using an automatic code conversion tool I found online, so parts of `script.js` (such as the commented-out C++ block) still show that origin.

## Usage

**Live demo:** https://bilasyurii.github.io/perlin_noise_island_generator/

Or open `index.html` locally in a browser. A new 600×600 map is generated on every page load (reload for a new island). There is no build step.

## How it works

1. **Noise**: `script.js` implements 2D gradient noise: hashed lattice gradients, a quintic fade curve and bilinear interpolation. It is summed over 5 octaves (fractal Brownian motion), with the frequency doubling and the amplitude halving each octave. The seed is random on every load.
2. **Height map**: noise is remapped (`remap`) to steepen the mid-range and compress the extremes. An island mask then subtracts `b * d^(2c)` based on the distance from the map centre, pushing the edges below sea level so land stays in the middle and surrounded by ocean.
3. **Moisture map**: a second, offset noise sample gives a moisture value per tile.
4. **Biomes**: `biome(height, moisture)` picks a biome from thresholds on the two values.

| Height | Biome |
| --- | --- |
| < -0.1 | Ocean |
| -0.1 to 0 | Coast (shallow water) |
| 0 to 0.02 | Beach (dry) or grassland (wet) |
| 0.02 to 0.2 | Steppe (dry) or grassland |
| 0.2 to 0.3 | Forest (wet) or grassland |
| 0.3 to 0.4 | Forest |
| 0.4 to 0.5 | Mountains |
| > 0.5 | Snow (wet) or mountains |

5. **Rendering**: each tile is painted as one pixel with a flat colour per biome and drawn with `putImageData`.

## Tunable parameters

At the top of `script.js`:

- `WIDTH`, `HEIGHT`: map size (must match the canvas size in `index.html`)
- `SCALE`: noise zoom for the height map
- `octaves`: noise detail levels
- `a`, `b`, `c`: island mask (base height offset, edge falloff strength, falloff curve)

## Status / notes

- Rivers and lakes are defined (`BIOME.RIVER`, `BIOME.LAKE`, `MAX_RIVERS`) and coloured, but not currently generated. The code that would do it (small-region cleanup and lake detection, a C++ port in a commented-out block) is disabled. The screenshots in `photos/` show earlier output that included rivers and lakes.
- Several constants and helper structures (`HEIGHT_FACTOR`, `MOISTURE_FACTOR`, `flowMap`, `DIRECTION`) are unused leftovers.
