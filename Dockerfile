# ---- Stage 1: build the Vite client ----
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: server runtime ----
FROM node:20-slim AS server
WORKDIR /app/server

# Install ALL deps (incl. devDependencies) so the Prisma CLI is available to
# run `prisma generate`, then prune dev deps to keep the final image small.
COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npx prisma generate

RUN npm prune --omit=dev

# Bring in the built client so Express can serve it (see server.js)
COPY --from=client-build /app/client/dist /app/client/dist

ENV NODE_ENV=production
# Cloud Run injects PORT (defaults to 8080); server.js already reads it.
EXPOSE 8080

CMD ["node", "server.js"]
