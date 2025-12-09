# Project Instructions

## Dependency Management
- This environment is sandboxed with no network access. If a change requires a new npm package (or an update), inform the user exactly which `npm install ...` command to run on their machine.
- Never attempt to run `npm install` or other networked commands yourself; always delegate those steps to the user.

## Git Workflow
- After completing each logical change, stage the relevant files and commit with a descriptive message. Example:
  ```bash
  git add <files>
  git commit -m "feat: describe change"
  ```
- Keep commits focused—avoid bundling unrelated modifications.
- Do not run `git push`; the user will handle pushing when ready.

Keep this file updated if workflow policies change.
