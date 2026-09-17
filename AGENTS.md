# Instructions for AI agents

At the start of the agent session, read every tracked text file in the [./contributing](./contributing) folder and retain the instructions for the rest of the session.  
Re-read `contributing/` if a tracked file in that folder changes during the session.  
If instructions in `contributing/` conflict with standard practices, the rules in `contributing/` take precedence.  

If code was actually changed (or you didn't create/update only `.md` files), 
then verify the following all the following commands succeed:
```sh
pnpm lint
pnpm tsc
pnpm -F api db:migrate 
pnpm -F api db:seed
pnpm -r test
pnpm -r build
```

If all is successful, then execute:
```sh
pnpm -F api db:seed
```

The following files are locked down, do not attempt to change them:
```sh
./README.md
```