# Frontend Testing

This Angular app uses the Angular unit-test builder with Vitest and jsdom.

## Commands

- `npm test` runs the current stable unit-test gate once.
- `npm run test:all` runs every discovered spec file. Use this while hardening older generated component specs.
- `npm run test:watch` runs tests in watch mode while developing.
- `npm run test:coverage` runs tests and enforces coverage thresholds.
- `npm run ci` runs coverage and production build.

## Coverage Gate

Coverage is configured in `angular.json` under `projects.expense-tracker-fe.architect.test.options.coverageThresholds`.

Current baseline:

- Statements: 10%
- Branches: 10%
- Functions: 1%
- Lines: 8%

These are intentionally low because the project already has many components but mostly generated smoke tests. The current coverage gate is scoped to stable service specs and shared utility specs in `angular.json`. As component specs are made deterministic, add them to the `include` list and expand `coverageInclude`.

Raise the thresholds gradually as meaningful tests are added. A good next target is 30%, then 50%, then 70%+ for services, guards, interceptors, and critical components.

## What To Test First

Prioritize behavior over snapshots:

- Guards and interceptors. Guards should cover allow, reject, redirect, state update, and SSR route discovery paths. Interceptors should cover request mutation, exempt routes, CSRF behavior, credentials, and SSR cookie forwarding.
- Root services should cover state transitions, browser storage, runtime config, CSRF caching, cross-tab auth sync, notifications, and theme persistence.
- API wrapper services should cover endpoint names, request bodies, query param filtering/stringification, and side effects such as CSRF token updates.
- Shared utility behavior for date ranges, currency selection, and category colors.
- Auth/login OTP flow.
- Expense create validation and receipt scan prefilling.
- Expense list filters, pagination, edit/delete actions.
- Budget allocation calculations and over-budget states.
- Debt history filters and payment flow.

## Blocking Main

The GitHub workflow in `.github/workflows/ci.yml` runs `npm run test:coverage` and `npm run build` on pull requests to `main`.

To block direct merges, enable branch protection in GitHub:

1. Go to repository Settings.
2. Open Branches.
3. Add a rule for `main`.
4. Enable `Require status checks to pass before merging`.
5. Select the `test-and-build` check from `FE CI`.
