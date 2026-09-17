FROM node:26.7-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack && corepack enable
WORKDIR /mnt

FROM base AS builder
COPY .. .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --silent --frozen-lockfile --prefer-offline
RUN pnpm -F api build
RUN pnpm -F api --prod deploy /out

FROM node:26.7-alpine AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
WORKDIR /mnt
COPY --from=builder /out ./
COPY ./pnpm-workspace.yaml ./pnpm-workspace.yaml
USER node
EXPOSE 8080
CMD ["/usr/bin/dumb-init", "--", "npm", "run", "start"]
