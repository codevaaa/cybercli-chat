FROM docker:29.8.1-cli AS docker-cli
FROM node:24.21.0-bookworm-slim
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npx playwright install --with-deps chromium
RUN apt-get update && apt-get install -y --no-install-recommends python3 python-is-python3 git && rm -rf /var/lib/apt/lists/*
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY backend/src ./src
COPY shared/editor-release.mjs /app/shared/editor-release.mjs
ENV NODE_ENV=production PYTHONUNBUFFERED=1
EXPOSE 3000
CMD ["node", "src/server.js"]
