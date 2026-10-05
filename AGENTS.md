# Instructions for AI agents

At the start of the agent session:
- read the instructions at the https://raw.githubusercontent.com/damianobarbati/contributing/refs/heads/main/contributing.md
- load envs from `.env`

If backend code was actually changed, then verify the following all the following commands succeed:
```sh
pnpm lint
pnpm tsc
pnpm -F api db:migrate 
pnpm -F api db:seed
pnpm -r build
pnpm -r test
pnpm -F nfr e2e
```

If frontend code was actually changed, then verify the following all the following commands succeed:
```sh
pnpm lint
pnpm tsc
pnpm -r build
pnpm -F nfr e2e
```

Use the following files as reference for the style when coding backend:
```sh
/packages/api/src/index.ts
/packages/api/src/user/*
```

Use the following files as reference for the style when coding frontend:
```sh
/packages/webapp/src/main.tsx
/packages/webapp/src/Layout.tsx
```

The following files are locked down, do not attempt to change them unless explicitly consented:
```sh
./README.md
./CONTRIBUTING.md
product/*
packages/api/client/*
packages/api/dao/migrations/20260101000000_schema.ts
packages/api/dao/*-schema.sql
EventService.ts
EventRepository.ts
```

Changes on this files applied by the `pnpm lint` and `pnpm format` are allowed.  
Do not change the `scripts` inside any package.json if not explicitly consented.
