FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN corepack enable
WORKDIR /mnt

FROM base AS builder
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --silent --frozen-lockfile --prefer-offline
RUN pnpm -F superadmin build
RUN pnpm -F superadmin --prod deploy /out

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init

COPY --from=builder /out ./
COPY --from=builder /mnt/packages/superadmin/dist ./dist
COPY --from=builder /mnt/packages/superadmin/serve.json ./serve.json

USER node
EXPOSE 80

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "serve"]
