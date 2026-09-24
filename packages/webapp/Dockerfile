FROM node:24-alpine AS base
Env PNPM_HOME="/pnpm"
Env PATH="$PNPM_HOME:$PATH"
Env PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN corepack enable
WORKDIR /mnt

FROM base AS builder
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --silent --frozen-lockfile --prefer-offline
RUN pnpm -F webapp build
RUN pnpm -F webapp --prod deploy /out

FROM node:24-alpine AS runtime
Env NODE_ENV=production

RUN apk add --no-cache dumb-init
RUN npm install --global --omit=dev --no-audit --no-fund serve@14.2.6

COPY --from=builder /out ./
COPY --from=builder /mnt/packages/webapp/dist ./dist
COPY --from=builder /mnt/packages/webapp/serve.json ./serve.json

RUN chown -R node:node /dist
USER node
EXPOSE 80

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "serve"]
