# ─── CursosStudio app image ──────────────────────────────────────
# Node/Express server. MongoDB runs directly on the host (not a
# container — see docker-compose.yml), so this image only contains the
# app + the optional yt-dlp/ffmpeg toolchain used by the bulk-import
# feature.
FROM node:20-alpine

# yt-dlp + ffmpeg make the YouTube playlist import work inside the
# container (server/ytdlp.js degrades gracefully if they're missing).
RUN apk add --no-cache yt-dlp ffmpeg

WORKDIR /app
ENV NODE_ENV=production

# Install deps first for better layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

# App source.
COPY . .

# Uploads land here; mounted as a volume in compose so they persist.
RUN mkdir -p public/uploads

EXPOSE 3000
CMD ["npm", "start"]
