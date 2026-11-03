FROM node:22.14.0-bookworm-slim
WORKDIR /opt/brahma-seed
COPY templates/package.json ./package.json
COPY templates/package-lock.json ./package-lock.json
RUN npm ci --ignore-scripts --no-audit --no-fund \
    && mkdir -p /home/node/.npm \
    && cp -a /root/.npm/. /home/node/.npm/ \
    && chown -R node:node /home/node/.npm
USER node
WORKDIR /workspace
CMD ["node", "--version"]
