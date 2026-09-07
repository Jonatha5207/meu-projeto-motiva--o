FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js schema.sql ./
COPY src ./src
COPY scripts ./scripts
COPY index.html ./index.html

# Usuário sem privilégios: o node:alpine já traz "node" (uid 1000) pronto para uso.
# .data/ precisa ser gravável por ele (só é usada no modo sem DATABASE_URL).
RUN mkdir -p .data && chown -R node:node /app
USER node

EXPOSE 8000
CMD ["node", "server.js"]
