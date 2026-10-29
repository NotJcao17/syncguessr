# syncguessr

Juego de adivinar canciones desde 0.1 segundos. Parte de la familia Syncora: misma paleta nocturna,
tipografía Archivo con eje de anchura e iconos Solar en estilo *broken*.

## Modos

- **Reto diario**: 5 canciones elegidas por fecha, iguales para todos. Se juega una vez al día y guarda racha.
- **Partida**: 5 canciones con los filtros que elijas. Puntos por pista (1000 en 0.1s … 200 en 15s),
  +10% por acierto seguido (hasta +50%) y un cuarto de los puntos si fallas la canción pero aciertas el artista.
  Guarda récord por mezcla de dificultad.
- **Modo artista**: 5 canciones de los artistas elegidos, con récord por selección.
- **Libre**: sin fin, con filtros, racha y opción de quitar pistas.

Las canciones escuchadas se guardan en el navegador y no se repiten hasta agotar la selección (salvo en el
reto diario y los retos, que tienen que ser iguales para todos). Partida y modo artista generan **enlaces de reto**: la semilla hace que quien lo abra escuche exactamente las
mismas canciones e intente superar tu puntuación.

## Desarrollo

```bash
npm run dev
```

En producción define `SYNCGUESSR_SECRET` (cualquier cadena larga). Cifra los tokens de ronda para que el
navegador nunca vea el id de Deezer de la canción que suena.

### Estructura

- `src/app/api/*`: rondas (`round`, `game`), verificación, búsqueda, artistas, conteos del catálogo y proxy de audio.
- `src/lib/catalog.ts`: filtros, selección aleatoria con diversidad de artistas y selección determinista por semilla.
- `src/lib/audioEngine.ts`: Web Audio con inicio en el primer sonido audible, fundidos y precarga.
- `src/hooks/useRound.ts` / `useGameSession.ts`: lógica de una ronda y de una secuencia de rondas.
- `scripts/gen-icons.mjs`: genera `src/components/Icon.tsx` desde `@iconify-json/solar`.

## Catálogo

`src/data/tracks.json` se genera con `scripts/catalog/`. `artists.mjs` es la lista de artistas con su idioma y
género (pop, rock, urbano, y "regional, baladas y soul"); para sumar artistas basta con agregarlos ahí.

0. `0-expand.mjs`: trae de Deezer las canciones más escuchadas de cada artista (entre 12 y 45 por artista).
1. `1-dedupe.mjs`: una sola grabación por canción; descarta en vivo, remixes, regrabaciones y demás versiones.
2. `2-enrich.mjs`: agrega canciones icónicas que falten (`iconic.mjs`), refresca datos de Deezer y busca el año
   original en MusicBrainz (1 petición por segundo, tarda ~1 h; todo queda en caché en `scripts/catalog/.cache/`).
3. `3-build.mjs`: año y época reales y dificultad calculada combinando popularidad actual, fama del artista,
   posición de la canción en su discografía y antigüedad. Cada nivel tiene un tamaño fijo por idioma (fácil son unas
   1,100 canciones en inglés y 800 en español), con un mínimo por género para que cualquier filtro tenga fáciles.

Los covers se quedan en el catálogo: adivinar el título correcto cuenta aunque elijas la versión de otro artista.

```bash
node scripts/catalog/0-expand.mjs
node scripts/catalog/1-dedupe.mjs
node scripts/catalog/2-enrich.mjs
node scripts/catalog/3-build.mjs
```
