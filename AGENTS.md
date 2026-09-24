# Instructions for AI agents

At the start of the agent session, read the instructions in the ./[CONTRIBUTING.md](contributing.md) file.  
If instructions in `CONTRIBUTING.md` conflict with standard practices, the rules in `CONTRIBUTING.md` take precedence.  

At the start of the agent session, load envs from `.env`.  

If code was actually changed, then verify the following all the following commands succeed:
```sh
pnpm lint
pnpm tsc
pnpm -F api db:migrate 
pnpm -F api db:seed
pnpm -r test
pnpm -r build
```

Use the following files as reference for the style when coding back-end:
```sh
/packages/api/src/index.ts
/packages/src/src/user/*
```

Use the following files as reference for the style when coding front-end:
```sh
/packages/webapp/src/main.tsx
/packages/webapp/src/Layout.tsx
```

The following files are locked down, do not attempt to change them:
```sh
./README.md
./CONTRIBUTING.md
product/*
packages/api/client/*
packages/api/dao/migrations/20260101000000_schema.ts
packages/api/dao/pg-schema.sql
packages/api/dao/ch-schema.sql
```

Do not change the `scripts` inside any package.json if not explicitly consented.