# DesiTadka server image (works on Oracle's free Arm servers and on Intel/AMD).
FROM node:22-bookworm-slim

# ffmpeg cuts frames; yt-dlp (needs python3) downloads reels.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
# Saved cards, plan, routine and frames live in /app/data, mounted from the server's disk.
CMD ["npm", "start"]
