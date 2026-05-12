# 📚 Cursos Studio v2

Plataforma de cursos auto-hosteable con calendario, decoración, apuntes en Markdown, exámenes generados por IA, soporte de Obsidian, e integración real con YouTube y Spotify.

## ✨ Novedades v2

- **Tipos de módulo nuevos**: texto en Markdown, exámenes IA (con OpenAI/Anthropic o modo manual), y enlaces web (cuando el sitio bloquea embed)
- **Importación masiva multi-día**: distribuye una playlist en varios días por semana (ej. Lun+Jue → items 1,2 sem 1; 3,4 sem 2)
- **yt-dlp + Spotify Web API**: extrae items reales en vez de abrir la playlist completa
- **Auto-fallback a link**: si un sitio rechaza embed, se guarda como tarjeta con favicon + título
- **Obsidian**: guarda tus apuntes directamente al filesystem en una ruta configurable
- **Calendario global**: vista única con todos los cursos + cursos externos recurrentes
- **Cursos externos**: para clases que viven en otra plataforma (Zoom, Classroom)
- **Gradebook**: registra y visualiza calificaciones de exámenes
- **Auto-text claro sobre fondos oscuros**: detección por luminancia
- **Status diario**: ✓ completo · ~ parcial · ✗ perdido
- **Candelabro rediseñado** y otros detalles cozy en stickers

## Requisitos

- Node.js 18+
- MongoDB 6+
- (opcional) yt-dlp para playlists reales de YouTube
- (opcional) Spotify Developer App para playlists/podcasts reales
- (opcional) OpenAI o Anthropic API key para exámenes auto-generados

## Instalación

```bash
git clone <repo> cursos-studio
cd cursos-studio
npm install
cp .env.example .env  # editar variables
npm run seed          # opcional: datos demo
npm start             # http://localhost:3000
```

## Variables de entorno (`.env`)

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/cursos_studio

# IA para exámenes (opcional, ambos opcionales)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Spotify (opcional pero necesario para extraer tracks reales)
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# Autenticación (opcional)
# Si exposes el servidor a internet (port forwarding, túnel, VPS),
# pon una contraseña aquí — el resto del mundo verá una pantalla de login.
# Déjalo vacío para uso local sin contraseña.
APP_PASSWORD=
AUTH_SECRET=          # opcional: mantén sesiones activas tras reinicio
```

## Arquitectura: cada instancia es tuya

Cursos Studio sigue el modelo de **Minecraft en modo servidor propio**:

- **Tus datos viven en tu máquina.** Nadie más tiene acceso a tus cursos,
  notas, calificaciones o configuración — ni tus amigos.
- **Tu amigo tiene su propia instancia.** Sus datos viven en su máquina.
- **El port forwarding sirve exclusivamente para que los servidores se
  comuniquen entre sí** — para enviarse señales de presencia ("Alice está
  estudiando", "Bob completó un módulo"). Eso es todo.

Tu amigo **nunca** visita tu URL en el navegador ni necesita tu contraseña.
Su servidor le hace POST a los únicos dos endpoints que son públicos en tu
instancia:

| Endpoint | Qué hace | Qué devuelve |
|---|---|---|
| `POST /api/friends/accept/:token` | Acepta un enlace de invitación | Solo: nombre, emoji, userId — sin datos de cursos |
| `POST /api/friends/presence` | Recibe una señal de presencia | Solo: `{ ok: true }` |

**Todo lo demás — cursos, módulos, notas, calificaciones, ajustes — está
protegido por contraseña y es inaccesible desde fuera.**

---

## Port forwarding (configuración)

Necesitas abrir tu servidor al exterior para que el servidor de tu amigo
pueda enviarte señales de presencia. Los pasos:

1. **Pon contraseña** en `APP_PASSWORD` antes de abrir el puerto.
   Sin ella, cualquiera que encuentre tu IP puede leer y modificar tus datos.
   Tu amigo pone la suya en su propia instancia — no comparten contraseña.

2. **Redirige el puerto en tu router:** puerto externo `3000` → IP local de
   tu PC → puerto `3000`. El menú suele llamarse "Port Forwarding",
   "Virtual Server" o "NAT" (varía por marca de router).

3. **Permite el puerto en el firewall de Windows** (como Administrador):
   ```
   netsh advfirewall firewall add rule name="CursosStudio" dir=in action=allow protocol=TCP localport=3000
   ```

4. **IP pública dinámica:** la mayoría de ISPs domésticos cambian tu IP
   cada pocos días. Usa DuckDNS (gratis) para tener un hostname estable
   como `tualias.duckdns.org`.

5. **El flujo de invitación** (intercambio de enlace con tu amigo) se
   describe en `MULTIPLAYER.md`.

Tu amigo hace los mismos pasos en su máquina. Luego intercambian un enlace
de invitación una sola vez — después los servidores se hablan solos.

## Instalación de yt-dlp

```bash
# Windows (PowerShell)
winget install yt-dlp.yt-dlp

# macOS
brew install yt-dlp

# Linux / pip
pip install --user yt-dlp

# Verificar
yt-dlp --version
```

Sin yt-dlp puedes seguir creando módulos individuales de YouTube; solo perderás la importación masiva.

## Spotify

1. Ve a [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Crea una app (cualquier nombre)
3. Copia el `Client ID` y `Client Secret` al `.env`
4. Soporta playlists, shows (podcasts), álbumes, tracks y episodios individuales

## Tipos de módulo

| Tipo | Uso | Notas |
|------|-----|-------|
| **YouTube** | videos, lives, shorts | Extrae playlists con yt-dlp |
| **Spotify** | tracks, episodios, álbumes | Embed oficial + Web API |
| **Web** | sitios embebibles | Si X-Frame-Options bloquea, cae a `web-link` automáticamente |
| **Web-link** | sitios no embebibles | Tarjeta con favicon + abre en pestaña nueva |
| **Texto** | instrucciones, notas guía | Markdown con preview |
| **Examen IA** | exámenes recurrentes | OpenAI/Anthropic, o modo manual |

## Modo de exámenes IA

1. **Auto (con key)**: define un prompt + cantidad de preguntas + tiempo. El examen se genera y queda **bloqueado** hasta la fecha del módulo. Si lo regeneras, se vuelve a bloquear.
2. **Manual (sin key)**: copia el prompt sugerido a tu IA externa favorita (ChatGPT, Gemini, etc.), pega el resultado de vuelta. Auto-calificas tu intento.

Las calificaciones se acumulan en la pestaña **📊 Notas** del curso.

## Obsidian

1. Abre ⚙️ → Obsidian
2. Pega la ruta absoluta de tu vault (ej. `C:\Users\Tu\Documents\Obsidian\MiVault`)
3. Activa "Auto-guardar"
4. Las notas se escriben en `<vault>/Cursos Studio/<nombre del curso>/<título del módulo>.md`

Si no quieres usar la integración, descarga el `.md` con el botón 💾 (browser fallback).

## Estructura

```
cursos-studio/
├── server/
│   ├── index.js
│   ├── models.js
│   ├── seed.js
│   └── services/
│       ├── ytdlp.js
│       ├── spotify.js
│       ├── embedCheck.js
│       ├── obsidian.js
│       └── ai.js
├── public/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── api.js
│       ├── utils.js
│       ├── stickers.js
│       ├── notes.js
│       ├── player.js
│       ├── calendar.js
│       ├── courses.js
│       ├── externals.js
│       ├── exams.js
│       ├── settings.js
│       └── app.js
├── .env.example
├── package.json
└── README.md
```

## Hotkeys

- `Esc` — cerrar player
- Decorar: arrastra stickers, suelta sobre la zona roja para eliminar

## Licencia

MIT
