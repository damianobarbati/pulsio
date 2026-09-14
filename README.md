# Pulsio

Pulsio — Premium analytics made simple, privacy-first, developer-friendly, fairly priced.

## Requirements:

Dependencies:
- `fnm` (eg: `brew install fnm`)
- add `eval "$(fnm env --use-on-cd)"` into your `~/.zprofile` or `~/.profile` 

Set envs:
```sh
cp .env.sample .env
```

## Development

Setup:
```sh
fnm install
npm install -g corepack
corepack enable
corepack install
pnpm install
export $(grep -v '^#' .env | xargs)
pnpm env:down
pnpm env:up
pnpm -F api db:migrate
pnpm -F api db:seed
```

Start services:
```sh
pnpm dev
pnpm open # optional, open all client applications
# or manually...
pnpm -F api start:dev
pnpm -F website start:dev
pnpm -F webapp start:dev
pnpm -F superadmin start:dev
pnpm -F showcase start:dev
```

Linting:
```sh
pnpm lint # lint
pnpm tsc # typecheck
```

Testing:
```sh
pnpm -r test
```

Test builds:
```sh
pnpm -r build
```

To run with https locally:
```sh
npx ngrok start --all --config ngrok.yml --authtoken <authtoken>
```
