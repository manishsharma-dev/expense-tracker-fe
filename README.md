# Xpense Frontend

Angular frontend for **Xpense**, a personal finance tracker for expenses, earnings, budgets, debts, receipts, and dashboard insights.

The app is built as an Angular SSR/PWA project, but the recommended production setup is currently **single-origin deployment**: build the frontend and copy the browser output into the backend `public` folder so the backend serves both the UI and `/api/v1`. This keeps HttpOnly cookie authentication reliable on desktop and mobile browsers.

## What The App Does

- OTP-based login and registration with email or phone.
- Cookie-based authentication with guard validation through `/auth/me`.
- Dashboard with spending, earning, budget, category, and recent transaction summaries.
- Expense list with server-side pagination, sorting, search, date range filters, total amount, edit, delete, and receipt viewing.
- Add/edit expense form with:
  - currency autocomplete from country/currency data
  - user categories, subcategories, and payment methods
  - smart merchant suggestions learned from prior expenses
  - receipt/payment screenshot scan with review-safe OCR results
  - option to scan a file without saving it to the expense
- Earnings with earning categories and currency support.
- Budget setup with total and category-level budgets.
- Debt management for credit cards, loans, charges, and payments.
- Profile page with name, gender, phone/email, country, and preferences.
- PWA support with service worker registration.

## Screenshots

Screenshots live in `docs/screenshots`.

![Dashboard desktop](docs/screenshots/dashboard-desktop.png)

![Dashboard mobile](docs/screenshots/dashboard-mobile.png)

![Create expense smart fill](docs/screenshots/expense-create.png)

The UI has changed significantly with smart fill, receipt scan review, debts, budgets, earnings, and profile flows. Refresh these screenshots after running the app with a logged-in test account.

## Tech Stack

- Angular 21
- Angular SSR with Express server support
- Angular Material
- Angular CDK
- Chart.js
- Service Worker / PWA
- RxJS

## Project Structure

```text
src/app
  core/
    guards/              auth route guard
    interceptors/        API, CSRF, and service-worker bypass handling
    services/            auth state, API wrappers, CSRF helpers
    shared/              reusable components, types, utilities
  features/
    auth/                login/register/OTP screens
    pages/
      dashboard/
      expenses/
      earnings/
      budget/
      debts/
      profile/
      main/              authenticated shell with header/navigation
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the Angular dev server:

```bash
npm run start
```

Open:

```text
http://localhost:4200
```

For local development, API calls use `/api/v1` and can be proxied/served depending on how you start the backend.

## Build

Build the Angular app:

```bash
npm run build
```

Run the SSR build directly:

```bash
npm run serve:ssr:expense-tracker-fe
```

## Recommended Production Build

To deploy as a same-origin app, build the frontend and copy the browser bundle into the backend:

```bash
npm run build:be-public
```

This script:

1. Runs `npm run build`.
2. Copies `dist/expense-tracker-fe/browser` to `../expense-tracker-be/public`.
3. Ensures the backend has an `index.html` fallback for Angular routes.

Then deploy/start the backend service. The backend serves:

```text
/              Angular app
/api/config    runtime frontend API config
/api/v1        backend API
```

## Runtime Config

The frontend reads runtime API configuration from:

```text
GET /api/config
```

For same-origin deployment, the backend returns:

```json
{
  "apiBaseUrl": "/api/v1"
}
```

The standalone SSR server also supports:

```env
PUBLIC_API_BASE_URL=/api/v1
BACKEND_API_BASE_URL=http://localhost:3000/api/v1
ENABLE_RENDER_PROXY_429_WORKAROUND=false
```

The Render proxy workaround exists in the SSR server for experimentation, but the current recommended path is same-origin backend hosting.

## Useful Scripts

```bash
npm run start              # Angular dev server
npm run build              # Angular build
npm run build:be-public    # Build FE and copy browser output to BE public
npm run start:ssr          # Build and run SSR server
npm run test               # Angular tests
```

## Notes For First-Time Contributors

- The app uses standalone Angular components.
- Most API models live in `src/app/core/shared/types`.
- Most HTTP wrappers live in `src/app/core/services/apis`.
- Auth state is kept in memory; the real session is the HttpOnly cookie.
- Avoid storing auth tokens in localStorage.
- For UI work, prefer existing Angular Material patterns already used in the app.
