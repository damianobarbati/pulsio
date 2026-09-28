# Type: summary

Type can either be `feature`, `fix`, `chore`, `perf`.  
Summary is the slug defining what was/must-be done.   
The changelog file must be named `YYYY-MM-DD-N<int>-type-summary.md`.

## Task

Specs and context provided to the developer or the agent to execute.  

---

Suggested flow is:
```sh
git checkout -b feature-xyz
cp ./changelog/0-template.md ./changelog/task.md
vim changelog/task.md
codex --yolo "act as a system architect. read changelog/task.md. analyze the codebase then ask questions needed to finalize the specification. don't write any code yet."
codex --yolo "read and implement ./changelog/task.md"
codex --yolo "generate the PR description for current branch in markdown format and save it in the ./changelog folder"
rm changelog/task.md
git add .
git commit -m "feature: xyz"
gh pr create --base main --title "Feature: xyz" --body-file changelog/
gh pr merge --auto --squash --delete-branch
gh pr checks --watch
git checkout main
git branch -D feature-xyz
git pull
git fetch --prune