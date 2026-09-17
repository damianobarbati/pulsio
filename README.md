# Pulsio

Pulsio — Premium analytics made simple, privacy-first, developer-friendly, fairly priced.

## Requirements:

Dependencies:
- `fnm` (eg: `brew install fnm`)
- `sops` and `age` (eg: `brew install sops age`)
- add `eval "$(fnm env --use-on-cd)"` into your `~/.zprofile` or `~/.profile` 

Set envs:
```sh
export SOPS_AGE_KEY_FILE=/secure/path/xyz.key
sops decrypt ./infra/test.sops.env > .env
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
pnpm -F api build
```

Start services:
```sh
pnpm dev
pnpm open

# or manually one by one...
pnpm -F api start:dev
pnpm -F website start:dev
pnpm -F webapp start:dev
pnpm -F superadmin start:dev
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

Testing E2E:
```sh
pnpm -F nfr e2e     # headless
pnpm -F nfr e2e:ui  # headed
```

Testing builds:
```sh
pnpm -r build
```

To run with https locally:
```sh
npx ngrok start --all --env ngrok.yml --authtoken <authtoken>
```
