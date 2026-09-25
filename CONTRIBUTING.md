## General

- Keep local development fast; contributions increasing start time or change-reflection time are rejected.
- ESM-first; TypeScript-first. `biome` config enforces code style.
- KISS; readable without comments. Solve only present problem: no future-proofing, Chinese boxes, unneeded problems/features/abstractions. Avoid comments unless essential for clarity. Use descriptive variables/functions; avoid repetition, over-complication, over-engineering.
- Do not use optional chaining to silence access on possibly falsy objects.
- Use only `async`/`await` with `try/catch`; no promises/promise chaining/callbacks. If forced, wrap callback with `node:util` `promisify`.
- Save every result to dedicated local variable/constant; return it, never inline/direct function-call returns.
- Leave 1 blank line: between class methods; between route definitions; before `if`, `for`, `try/except`; before block explanatory comments.

## TypeScript

- ESM only: `import`/`export`; never `require`/`module.exports`.
- Prefer `type` over `interface`; Zod inference for cross-layer types, dedicated types for layer-internal use.
- Prefer arrow functions; use classes only to maintain internal state. Prefer named exports; default export only for app entrypoint, singletons, db connection.
- Prefer pure single-purpose functions; consider splitting functions beyond ~40 lines.
- Use object-destructured named parameters. Define named input and return types for multiple values/complex objects; do not for a simple single-primitive return. Prefer readable, not overcomplicated, typings.
- Define each entity/pg schema and controller request/response payload in `services/types`.

## Entities

- Tables plural (e.g., `users`); type singular (e.g., `User`).
- Entity types:
```ts
export type UserRow = {}
export type UserRowInsert = Partial<UserRow> & NonNullable<Pick<UserRow, 'email' | 'password'>>
export type UserRowUpdate = Partial<UserRow>
export type User = Omit<UserRow, 'role'> & { foe: Foe[] }
export type UserFormValues = Omit<UserRow, 'password'>
```
- `UserRow`: raw `select`; `UserRowInsert`: allowed/required raw `insert`; `UserRowUpdate`: allowed raw `update`; `User`: joined/computed entity; `UserFormValues`: raw browser form input for new row.

## Backend

- Enforce `controller` > `service` > `repository`; data flows user → controller → service → repository → data layer.
- Enforce data/presentation separation: backend returns raw data (e.g., ISO8601 dates, numeric amounts); frontend localizes/formats/presents it (e.g., localized dates, number separators, currency symbols).
- Every user/agent state retrieval/change goes through controller. Controller parses/casts/validates client input; routes validated input to service; presents service output; manages authN/authZ; exposes service functions as HTTP routes and possibly timed-job CLI commands. Controller receives no `ctx`, only needed request params/body; redirects/routing stay in route definition.
- Service implements business logic and orchestrates repositories/external services. Repository accesses datasources (pg, cache) and retrieves/persists data.
```text
index.ts                      # nodejs entry point
router.ts                     # HTTP route definitions
cli.ts                        # CLI commands definitions
<resource>/
├── <Resource>Controller.ts   # Default export class with static methods
├── <Resource>Service.ts      # Default export class with static methods
└── <Resource>Repository.ts   # Default export object for datasource access
```
- Use `console.log`/`console.error` appropriately. Throw `new <HttpError>(<code>, <message>)` in controllers/services/repositories; thrown errors are constants. Validate request input and response output. Document API inputs/outputs. Provide API health-check endpoint returning API state.
- Do not repeat resource name in method names: `UserService.greetUser()` incorrect; `UserService.greet()` correct.

## Frontend

- React: functional components/hooks. Each component: own named file; `export const Component = () => {}`; `<ComponentName>Props` type above; built-in hooks via `React` namespace (e.g., `React.useState()`). Use `useMemo`/`useCallback` only when React Compiler does not optimize them and performance benefit exceeds maintenance cost; custom hooks only when reuse/performance benefit exceeds maintenance cost. Avoid external libraries unless strictly necessary; always assess bundle-size impact. No nested JSX ternaries; use early-return/guard clauses for multi-branch rendering or clean single-level conditions.
- Style: Tailwind utilities. Put frequent reused styles in reusable `ui/` components. Avoid inline `style` unless dynamically computed; avoid CSS-in-JS. 
- Classname: every component accepts am optional `className` prop as the first prop, which is passed after the default classes to the root element of the component.
- Use `cx` from `classnames` to combine multiple classnames, cx is imported from `clsx-tw`; don't use string interpolation.
- All project icons reside in `icons.tsx`, re-exported individually.
- UX board uses application UI kit: typography; `react-icons` icon set; buttons/inputs with all statuses/interactions (inputs by type, e.g., text/number/date/currency); snackbars (success/warning/error); yes/no confirmation prompts; searchable/filterable table. Provide every view at Desktop `1280 x 700`, Tablet `768x1024`, Smartphone `390x844`. Responsive shrinking may only stack or hide elements; DOM structure never changes by resolution/user.
- State: `zustand` plain objects for application/domain state; no global React Context (except scoped compound UI components).
- Data: `useSWR` retrieval; `useSWRMutation` backend mutations; no `fetch`/`axios` + manual `useState`/`useEffect` fetching. Use meaningful cache-friendly fetcher keys; show spinners/skeletons for async operations.
- Forms: `react-hook-form`; native `<form>` with proper input/button types for `Enter` submission.
- Entity `User` components: `User` full page; `UserGrid` card explorer; `UserGridItem` card; `UserList` table dashboard; `UserListItem` row; `UserCreationForm`; `UserUpdateForm`.
```text
main.tsx                # root React element
Router.tsx              # react-router routes
components/
├── Offer.tsx
├── OfferList.tsx
├── OfferListItem.tsx   
hooks/
├── useMe.ts
ui/                     # reused UI primitives
├── icons.tsx           # exported react-icons 
├── Button.tsx
views/                  # route-level components (except shared layouts)
├── Layout.tsx
├── Header.tsx
├── Footer.tsx
├── Home.tsx
├── Offers.tsx
```

## Tests

- Add minimal unit/integration (e.g., vitest), interaction (e.g., React Story components), and happy-path e2e (e.g., Playwright) tests. Unit-test only complex pure functions/algorithms; integration-test feature flows.
- No clever helpers: explicit setup. Load required fixture in test when possible; no default `beforeEach` fixture when only some tests need it; test input visible without hidden setup.
- Avoid redundant expectations: one proves one behavior; remove duplicate proof; retain explicit exclusion check when exclusion is tested. No meaningless no-value tests.
- Prefer vitest `expect.matchObject` to group object-property expectations; prefer `expect.toEqual`, avoid `expect.toBe` for single assertions.

## Environment

- Centralize environment variables in `[.env](./env)`; list available envs in root `sample.env`. Each service `env.ts` reads/parses/exports `process.env` with `zod`; NodeJS services import/read exported `Env`. New env: update `sample.env`.
- `NODE_ENV`: `test` test build; `development` unminified/unoptimized development build; `production` minified/optimized production build. Business logic is `NODE_ENV`-agnostic.
- `APP_ENV`: `local` developer machine; `development` deployed development; `staging` deployed staging; `production` deployed production.

## Database

- Migrations: only `database.raw` with plain raw sql; never knex querybuilder; leave `down` handler empty.

## Git

- Branch: `<type>-<ticker-number>-<summary>` (`feat-34-users-view`, `fix-89-unity-sync`); PR: `<type> <number>: <summary>` (`Feature 34: Users view`, `Fix 89: Unity sync`); types: `feat`, `fix`, `chore`, `perf`.
- PR description: `Problem` and `Solution` sections summarizing work. Squash-merge PRs into `main`.
- GitHub Actions workflow: [ci.yml](../.github/workflows/ci.yml). PRs on `main`: tested, not deployed; commits: `main` → tested/development, `staging` → tested/staging, `production` → tested/production.

## Communication

- If requirements unclear, ask clarification; ask confirmation on design decisions. English and ASD-STE100 Simplified Technical English (STE) only, for answers/code.
- Be concise/direct; no chatty/verbose text, dashes, emojis, or wall of text. Complex plan: use HTML visualization. Clarification request: ELI12 mode. Never install dependencies without user confirmation.

## Specs

- Specs: assume AI coding-agent-only consumer; mandatory token efficiency/absolute density. English ASD-STE100 Simplified Technical English (STE); LLM parser, not humans; no prose/intros/background/articles (`a`, `an`, `the`)/conversational filler/passive voice. Only H2 (`##`) headings, bullets, code blocks; list required changes as bullets.
