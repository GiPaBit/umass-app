# syntax=docker/dockerfile:1

# Pinned to the *builder's* architecture on purpose. Nothing this stage produces is
# arch-specific — dist/ is plain JS/CSS, and neither server/ nor api/ needs
# node_modules — so the amd64 runner builds once, natively, instead of running npm's
# native lightningcss/rollup/esbuild binaries under QEMU. BuildKit also dedupes this
# stage across both target platforms, so a two-arch push runs npm ci and vite build
# exactly once.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

# NODE_ENV is deliberately left unset here: `npm ci` omits devDependencies when it is
# "production", and vite is a devDependency, so the build would fail with "vite: not found".
COPY package.json package-lock.json ./
RUN npm ci

# Vite inlines VITE_* at build time, so anything the browser needs has to be present
# now — none of these can be changed by an env var at run time. An empty API base means
# the bundle talks to whatever origin served it, which is this same container.
ARG APP_BASE="/"
ARG VITE_API_BASE=""
ARG VITE_GOOGLE_CLIENT_ID=""
ENV APP_BASE=$APP_BASE \
    VITE_API_BASE=$VITE_API_BASE \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Explicit rather than `COPY . .`, which would drop the host's node_modules — full of
# darwin-arm64 native binaries — over the Linux tree just installed above.
# dev-api-plugin.js and server/ are here because vite.config.js imports the plugin,
# which in turn imports server/api-router.js.
COPY index.html vite.config.js dev-api-plugin.js ./
COPY src ./src
COPY public ./public
COPY api ./api
COPY server ./server
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# package.json rides along so Node reads "type": "module" for server/ and api/. There is
# nothing to install: both use Node built-ins and global fetch only.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/server ./server

# The official node images already ship an unprivileged `node` user (uid 1000). Using it
# keeps this stage free of any RUN — the one thing that would force QEMU emulation on
# the arm64 leg and cost minutes per build.
USER node

EXPOSE 8080

# node -e rather than curl or wget: alpine guarantees neither, and installing one would
# mean a RUN in this stage. fetch is global in Node 22.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD \
  node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
