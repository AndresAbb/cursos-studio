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

## Exponer a internet (port forwarding)

Para que un amigo se conecte a tu instancia desde fuera de tu red:

1. **Pon contraseña** en `APP_PASSWORD` antes de abrir el puerto — sin ella,
   cualquiera con tu IP puede leer/modificar tus cursos.
2. En tu router, redirige el puerto `3000` a la IP local de tu PC.
3. Permite el puerto en el firewall de Windows:
   `netsh advfirewall firewall add rule name="CursosStudio" dir=in action=allow protocol=TCP localport=3000`
4. Comparte `http://TU_IP_PUBLICA:3000` + la contraseña con tu amigo.
5. Si tu IP cambia (la mayoría de ISPs domésticos), usa un dynamic-DNS como
   DuckDNS para tener un hostname estable.

Ver `MULTIPLAYER.md` para el flujo de invitación de amigos (independiente
de la contraseña — los endpoints de presencia entre instancias usan tokens
por-amigo).

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
