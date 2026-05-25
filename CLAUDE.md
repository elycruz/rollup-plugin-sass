# AGENTS

## Git

- Do not commit code to directly 'main' branch.
- Ensure you are on a feature branch before committing any work.
- Ensure a github issue ticket is already created before you carry out any work, unless asked otherwise.
- Include github issue ticket number in commit messages (e.g., `feat(ez-button): #7-hello-world ....`).  If the issue is not known ask the user if they would like you to create an issue ticket for the changes.

## After implementation

If you are not committing your changes:

- Run lint fix.
- All tests must pass.
- Build must pass.

## Code scanning / File scanning

Ignore the following directories:

- `**/dist`
- `**/.nyc_output`
- `**/coverage`
- `**/.idea`

## Typescript conventions

1. Use optional chaining and proper null checks instead of `!`.
2. Don't use `await` in `for/while/do` loops; Prefer `Promise.all` with array mapping, instead.
3. Adhere to eslint rules and use `npm run lint:fix` to automatically fix issues when possible.
