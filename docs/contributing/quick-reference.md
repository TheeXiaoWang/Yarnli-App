# Quick Reference Card

## 🚀 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Before Committing
npm run ci               # Run all checks (lint, test, build)

# Testing
npm run test             # Run all tests
npm run test:watch       # Watch mode
npm run e2e              # E2E tests

# Code Quality
npm run lint             # Check linting
npm run lint:fix         # Fix linting issues
npm run format           # Format code
npm run typecheck        # Type check
```

## 📁 File Structure

```
src/
├── app/              # App core (stores, hooks, contexts)
├── ui/               # UI components
├── domain/           # Core business logic
├── services/         # Business services
├── constants/        # Constants
├── utils/            # Utilities
└── test/             # Test setup and examples

e2e/                  # E2E tests
.github/              # GitHub templates and workflows
```

## ✅ Pre-Commit Checklist

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds
- [ ] Code is formatted (`npm run format`)

## 🐛 Debugging

```bash
# Interactive test UI
npm run test:ui

# Playwright UI
npm run e2e:ui

# Bundle analysis
npm run analyze
```

## 📊 Coverage

- Minimum: 60% (lines, functions, branches, statements)
- View: Open `coverage/index.html` after running tests

## 🔧 Configuration Files

- `eslint.config.js` - Linting rules
- `.prettierrc` - Formatting rules
- `vitest.config.js` - Test configuration
- `playwright.config.ts` - E2E test configuration
- `tsconfig.json` - TypeScript configuration
- `vite.config.js` - Build configuration

## 🤖 CI/CD

- **Triggers**: Push/PR to main, staging, develop
- **Jobs**: Lint → Test → Build → E2E → Deploy
- **Artifacts**: Build output, test reports, coverage

## 📝 Writing Tests

### Unit Test
```typescript
import { describe, it, expect } from 'vitest'

describe('MyFunction', () => {
  it('should work', () => {
    expect(myFunction()).toBe(expected)
  })
})
```

### Component Test
```typescript
import { render, screen } from '@testing-library/react'

it('renders component', () => {
  render(<MyComponent />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

### E2E Test
```typescript
import { test, expect } from '@playwright/test'

test('navigates to page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Title/)
})
```

## 🔐 GitHub Secrets Needed

- `CODECOV_TOKEN` (optional)
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 🆘 Help

- Tests failing? → `npm run test:ui`
- Lint errors? → `npm run lint:fix`
- Format issues? → `npm run format`
- Build broken? → `npm run clean && npm run build`

