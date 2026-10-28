# syncguessr — Documento de Planificación y Estado del Proyecto

> **Proyecto:** syncguessr  
> **Ubicación:** `c:\Users\j_c_o\Documents\proyectosPersonales\music-guessr`  
> **Inspiración y Estilo:** `syncoraplayer.app` / `syncora-web` (diseño nocturno OKLCH, tipografía Archivo, acento índigo) y `songspot.net` (mecánica de 0.1s a 15s).  
> **Fuente de Audio:** API gratuita de Deezer (fragmentos preview de 30s + Web Audio API).

---

## 1. Reglas Críticas de Integridad de Juego (Búsqueda y Descubrimiento)

1. **Búsqueda Exclusiva en Catálogo Curado (Anti-Covers & Cero Duplicados):**
   - El autocompletado `/api/search` consulta **únicamente** las canciones verificadas del juego, no la base de datos abierta de Deezer.
   - **Beneficios demostrados en test suite:**
     - Eliminación total de bandas de garaje, imitadores o covers no oficiales (cero resultados basura como "Stantough" o "Dorian Electra").
     - Exactamente **una única versión canónica de estudio** por canción (se eliminaron versiones repetidas de álbumes compilatorios o en vivo).
     - Búsqueda tolerante a acentos (`de musica` encuentra `De Música Ligera`, `el triste` encuentra `El Triste`).
     - Respuestas en menos de 1 ms al no depender de peticiones externas por cada tecla pulsada.
2. **Pureza Lingüística y Depuración de Artistas Bilingües:**
   - Se reclasificaron manualmente y algorítmicamente canciones en inglés de artistas hispanos (e.g. *Hips Don't Lie*, *Whenever, Wherever*, *She Wolf*, *Hero*, *Livin' La Vida Loca*) para que pertenezcan estrictamente al catálogo en inglés (`en`).
   - Se eliminaron versiones *Live*, *Unplugged*, *Anniversary* o compilaciones de terceros (*Filtr presents...*) donde hablaban o cantaban invitados en otro idioma.
3. **Sincronización Estricta Audio ↔ Pista Activa (Anti-Desincronización):**
   - `AudioEngine` y `GamePage` usan un contador monotónico de secuencia (`roundSeqRef`) y verificación de `trackId`.
   - Se descarta cualquier buffer de audio antiguo en vuelo para que **jamás** suene una canción diferente a la que el sistema está evaluando o revelando.
4. **Control de Volumen Dinámico:**
   - Slider de volumen interactivo con botón de silenciar (mute/unmute), porcentaje visual y persistencia en `localStorage`.

---

## 2. Sistema de Diseño (Syncora Night Palette)

Tokens OKLCH configurados en `src/app/globals.css`:
* `--color-night: oklch(0.228 0.022 269.1);` (`#181C27` fondo principal)
* `--color-night-deep: oklch(0.175 0.019 270.3);` (fondos profundos)
* `--color-surface: oklch(0.267 0.027 260);` (`#1E2633` tarjetas/buscador)
* `--color-surface-2: oklch(0.3 0.03 260.5);` (hover de tarjetas)
* `--color-line: oklch(0.392 0.038 260.5);` (bordes finos translúcidos)
* `--color-indigo: oklch(0.585 0.204 277.1);` (`#6366F1` acento de marca)
* `--color-indigo-deep: oklch(0.52 0.21 277.5);` (botones primarios)
* `--color-indigo-soft: oklch(0.785 0.104 274.7);` (brillo/focus ring)
* `--color-ink: oklch(1 0 0);` (blanco texto)
* `--color-ink-2: oklch(0.78 0.022 256);` (texto secundario)
* `--color-ink-3: oklch(0.66 0.028 255);` (texto apoyo)

---

## 3. Fases y Registro de Progreso

### 📋 Estado de las Fases

- [x] **Fase 1: Inicialización del Proyecto y Configuración Base**
  - Next.js 16 (App Router + Turbopack) inicializado con TypeScript, Tailwind CSS v4 y ESLint.
  - Paleta de colores OKLCH de Syncora y clases de utilidad (`.btn`, `.btn-primary`, `.btn-ghost`, `.pill`) añadidas a `globals.css`.
  - Fuente `Archivo` de Google Fonts y metadatos configurados en `layout.tsx`.
- [x] **Fase 2: Catálogo Curado y Endpoints API Deezer con Anti-Covers**
  - Catálogo masivo y depurado de **3,896 canciones** de estudio canónicas (1,908 español puro / 1,988 inglés puro).
  - Eliminación de versiones en vivo, acústicos, recopilatorios no oficiales y reclasificación de canciones bilingües.
  - Endpoint `/api/round`: provee la pista del juego sin revelar título ni artista en texto plano (anti-trampas).
  - Endpoint `/api/verify`: valida los intentos y entrega los datos completos al ganar o terminar.
  - Endpoint `/api/search`: búsqueda ultrarrápida (0ms) en catálogo local con normalización de acentos y cero duplicados.
- [x] **Fase 3: Motor de Audio con Web Audio API (Precisión Milimétrica)**
  - Implementación de `src/lib/audioEngine.ts` con Web Audio API (`AudioContext`).
  - Decodificación y precarga de buffer en memoria (`decodeAudioData`).
  - Reproducción de precisión exacta sin latencia para 0.1s, 0.5s, 2s, 8s, 15s y 30s.
  - Control de volumen fluido integrado con `GainNode`.
  - Protección contra race conditions verificando el `trackId` en el buffer decodificado.
- [x] **Fase 4: Interfaz de Usuario y Gameplay Loop Principal**
  - Componente `Navbar` con logo vectorizado de Syncora y selector de idioma (Español / Inglés / Ambos).
  - Componente `StageTimeline` (5 etapas visuales con estados interactivos).
  - Componente `AudioController` con ondas de sonido, barra de progreso, **slider de volumen con mute** y botón de Reroll.
  - Componente `SearchBar` con autocompletado en tiempo real, dropdown limpio sin versiones falsas y navegación por teclado.
  - Componente `ResultCard` (pantalla de victoria o derrota con reveal de portada HD, metadatos y reproductor de 30s).
- [x] **Fase 5: Filtros, Configuración y Persistencia Local**
  - Modal de ajustes `SettingsModal`: dificultad (Fácil, Medio, Difícil), épocas, géneros.
  - Personalización de etapas (activar/desactivar etapas individuales de 0.1s a 15s).
  - Persistencia en `localStorage` (evitar repetir canciones ya vistas/resueltas, volumen guardado e idioma elegido).
  - Modal de ayuda `HelpModal` con instrucciones de juego.
- [x] **Fase 6: Pruebas Automatizadas y Verificación de Calidad**
  - Suite de pruebas automatizadas `scratch/test_suite.py` ejecutada contra servidor local:
    - **Test 1:** Deduplicación y eliminación de covers en `/api/search` (100% aprobado).
    - **Test 2:** Pureza de 10 rondas consecutivas en español sin canciones en inglés (100% aprobado).
    - **Test 3:** Verificación de 5 rondas en inglés (100% aprobado).
    - Compilación de producción con Turbopack validada sin errores.
- [x] **Fase 7: Balanceo de Dificultad, Eliminación de Covers y Proxy de Streaming de Audio**
  - **Eliminación de covers engañosos:** Se purgaron del catálogo las versiones cover (*Si No Te Hubieras Ido* de David Bisbal y Maná, *Vivir Así Es Morir De Amor* de David Bisbal, *Flaca* de Cultura Profética, *Afuera* de Bunbury, etc.), manteniendo exclusivamente las versiones originales canónicas (Marco Antonio Solís, Camilo Sesto, Andrés Calamaro, Caifanes, etc.).
  - **Rebalanceo de dificultad:** Se ampliaron las canciones fáciles en español a 534 canciones distribuidas entre 110 artistas reconocidos (asignando los 3-4 temas insignia de cada artista).
  - **Selección de artistas uniforme y anti-repetición:** `getRandomTrack` selecciona equiprobablemente entre artistas disponibles y filtra el artista previo (`excludeArtist`). En 20 rondas consecutivas de español fácil se obtuvieron 18 artistas distintos.
  - **Proxy de streaming `/api/stream`:** Resuelve la expiración de tokens CDN de Deezer mediante stream dinámico con caché en memoria (20ms) y elimina cualquier error 403 o pantalla roja en consola.
  - **Suite de pruebas `verify_fixes.py`:** 100% de éxito en todas las pruebas.
- [x] **Fase 8: Enriquecimiento Masivo de Géneros Existentes (14,277 Canciones)**
  - **Sin géneros nuevos:** Se mantuvieron estrictamente los 5 géneros existentes en la aplicación (`pop`, `rock`, `urban`, `hiphop`, `classics`).
  - **Ampliación de artistas legendarios:** Se sumaron los catálogos y grandes éxitos de más de 450 artistas emblemáticos repartidos equitativamente entre los 5 géneros.
  - **Desglose de canciones por categoría:**
    - Pop: 1,706 en español | 2,154 en inglés
    - Rock: 2,103 en español | 2,222 en inglés
    - Urbano / Hip-Hop: 1,376 en español (Urbano) | 1,602 en inglés (Hip-Hop)
    - Clásicos: 1,661 en español | 1,521 en inglés
    - **Total catálogo canónico:** **14,277 canciones**.
  - **Depuración fina de covers y coincidencias erróneas:** Se eliminaron versiones remix duplicadas y covers (*El Triste* de Cristian Castro/Julieta Venegas/Bunbury manteniendo a José José; *Amor Eterno* manteniendo a Rocío Dúrcal y Juan Gabriel; *Vivir Así Es Morir De Amor* de El Canto del Loco manteniendo a Camilo Sesto, etc.).
  - **Diversidad perfecta probada:** En 20 rondas consecutivas de dificultad fácil en español se obtuvieron **20 artistas distintos sobre 20 rondas (100% de diversidad)** sin ninguna repetición.
- [x] **Fase 9: Curva Logarítmica de Volumen y Blindaje de Dificultad Fácil**
  - **Curva logarítmica de audición ($v^{2.5}$):** Se implementó una curva de ganancia exponencial en `audioEngine.ts`. A volúmenes mínimos (1% o 2%) la ganancia cae a niveles imperceptibles/susurro (-85 dB), y en 0% se silencia por completo, solucionando que sonara fuerte al mínimo.
  - **Re-aplicación garantizada del volumen:** `applyVolume()` se invoca obligatoriamente antes de arrancar cada reproducción (`playSegment`), asegurando que ningún cambio de volumen se ignore.
  - **Dificultad Fácil estrictamente reservada para Himnos Universales:**
    - Se limitó "Fácil" a 334 canciones en español y 699 en inglés compuestas exclusivamente por los 2-3 himnos más universales de superestrellas Tier-1 (*Gasolina*, *La Incondicional*, *De Música Ligera*, *Rayando el Sol*, *Como La Flor*, *El Triste*, *Torero*, *Afuera*, *Bohemian Rhapsody*, *Billie Jean*, *Smells Like Teen Spirit*, etc.) o temas con ranking global $\ge 680,000$.
    - Canciones de bandas indie o temas menos conocidos pasaron a categorías *Media* o *Difícil*.
  - **Eliminación de pistas en otros idiomas:** Se purgaron temas en portugués (músicas de Roberto Carlos en portugués, sertanejo/Panda brasileño), alemán (SaikO.) y francés (Julio Iglesias).
- [x] **Fase 10: Búsqueda de Artista con Orden Alfabético (A-Z) y Protección Anti-Spoilers**
  - **Orden alfabético estricto:** Al buscar por nombre de artista (e.g. *Shakira*, *Queen*, *Bad Bunny*, *Soda Stereo*), las canciones del artista se listan en orden alfabético de la A a la Z, evitando que los mayores éxitos aparezcan al inicio por popularidad.
  - **Protección anti-spoilers en búsquedas de artista:** Si una canción secreta de ese artista está sonando, ya no se fuerza a la posición #1 de la lista para no delatar la respuesta; se mantiene en su posición alfabética natural.
  - **Búsqueda por título preservada:** Si el jugador busca por el título de la canción (e.g. *Bohemian*, *Gasolina*), el resultado con coincidencia exacta de título continúa apareciendo en primer lugar.
  - **Límite de resultados ampliado:** Se amplió a 50 canciones para permitir visualizar la discografía completa disponible del artista en el menú desplegable.



