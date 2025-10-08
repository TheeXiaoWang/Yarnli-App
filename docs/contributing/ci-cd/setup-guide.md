# CI/CD Setup Guide

## 🎉 What's Been Set Up

Your project now has a complete CI/CD infrastructure with:

- ✅ **ESLint** - Code linting with React, TypeScript, and accessibility rules
- ✅ **Prettier** - Code formatting with Tailwind CSS plugin
- ✅ **Vitest** - Unit testing with coverage reporting
- ✅ **Playwright** - End-to-end testing across browsers
- ✅ **GitHub Actions** - Automated CI/CD workflows
- ✅ **Issue Templates** - Structured bug reports and feature requests
- ✅ **PR Template** - Standardized pull request format

---

## 📦 Installation

### 1. Install Dependencies

Run the following command to install all new dependencies:

```bash
npm install
```

This will install:
- Testing tools (Vitest, Playwright, Testing Library)
- Linting tools (ESLint, Prettier)
- Build tools (rimraf, source-map-explorer)
- Type definitions

### 2. Install Playwright Browsers (for E2E tests)

```bash
npm run e2e:install
```

---

## 🚀 Available Scripts

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run clean            # Clean build artifacts
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
npm run format           # Format code with Prettier
npm run format:check     # Check if code is formatted
npm run typecheck        # Run TypeScript type checking
```

### Testing
```bash
npm run test             # Run unit tests with coverage
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Open Vitest UI
npm run e2e              # Run E2E tests
npm run e2e:ui           # Open Playwright UI
```

### Analysis
```bash
npm run analyze          # Analyze bundle size
```

### CI (runs all checks)
```bash
npm run ci               # Run all CI checks locally
```

---

## 🔧 Configuration Files

### ESLint (`eslint.config.js`)
- Uses new flat config format (ESLint 9+)
- Configured for React, TypeScript, and JSX
- Includes accessibility rules
- Integrates with Prettier

### Prettier (`.prettierrc`)
- Single quotes
- No semicolons
- 2-space indentation
- 100 character line width
- Tailwind CSS class sorting

### Vitest (`vitest.config.js`)
- Happy DOM environment for React testing
- Coverage thresholds: 60% (lines, functions, branches, statements)
- Configured with Testing Library
- Mocks for WebGL, IntersectionObserver, ResizeObserver

### Playwright (`playwright.config.ts`)
- Tests across Chrome, Firefox, Safari
- Mobile viewport testing
- Automatic dev server startup
- Screenshot on failure
- Trace on retry

---

## 🤖 GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main`, `staging`, and `develop` branches.

**Jobs:**
1. **Lint & Type Check** - ESLint, Prettier, TypeScript
2. **Unit Tests** - Vitest with coverage upload to Codecov
3. **Build** - Production build with artifact upload
4. **E2E Tests** - Playwright tests across browsers
5. **Bundle Analysis** - Size analysis (main branch only)

**Concurrency:** Cancels in-progress runs for the same branch

### Deploy Workflow (`.github/workflows/deploy.yml`)

Deploys to Vercel on push to `main` branch.

**Jobs:**
1. **Deploy to Production** - Automatic deployment
2. **Deploy Preview** - Preview deployments for PRs

---

## 🔐 Required GitHub Secrets

To enable full CI/CD functionality, add these secrets to your GitHub repository:

### For Codecov (Optional)
- `CODECOV_TOKEN` - Get from https://codecov.io

### For Vercel Deployment
- `VERCEL_TOKEN` - Get from Vercel dashboard
- `VERCEL_ORG_ID` - Found in Vercel project settings
- `VERCEL_PROJECT_ID` - Found in Vercel project settings

**How to add secrets:**
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret

---

## 📝 Writing Tests

### Unit Tests (Vitest)

Create test files with `.test.ts` or `.test.tsx` extension:

```typescript
// src/utils/math.test.ts
import { describe, it, expect } from 'vitest'
import { add } from './math'

describe('Math utilities', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
})
```

### Component Tests

```typescript
// src/components/Button.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### E2E Tests (Playwright)

Create test files in the `e2e/` directory:

```typescript
// e2e/homepage.spec.ts
import { test, expect } from '@playwright/test'

test('should load homepage', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Yarnli/)
})
```

---

## 🎯 Pre-Commit Checklist

Before committing code, run:

```bash
npm run ci
```

This runs:
1. Type checking
2. Linting
3. Format checking
4. Tests
5. Build

All must pass before pushing to ensure CI succeeds.

---

## 🐛 Troubleshooting

### ESLint Errors

If you see ESLint errors:
```bash
npm run lint:fix  # Auto-fix what's possible
npm run lint      # See remaining issues
```

### Prettier Formatting

If formatting fails:
```bash
npm run format    # Auto-format all files
```

### Test Failures

If tests fail:
```bash
npm run test:ui   # Open interactive UI
npm run test:watch # Run in watch mode
```

### E2E Test Issues

If E2E tests fail:
```bash
npm run e2e:ui    # Open Playwright UI for debugging
```

### Build Failures

If build fails:
```bash
npm run clean     # Clean artifacts
npm run build     # Try building again
```

---

## 📊 Coverage Reports

After running tests, coverage reports are generated in:
- `coverage/` - HTML and LCOV reports
- Open `coverage/index.html` in a browser to view

---

## 🔄 Continuous Improvement

### Adding New Tests
1. Create test files alongside source files
2. Aim for >60% coverage
3. Test critical paths first

### Updating Linting Rules
Edit `eslint.config.js` to add/modify rules

### Adjusting Coverage Thresholds
Edit `vitest.config.js` coverage settings

### Adding E2E Tests
Add new `.spec.ts` files in `e2e/` directory

---

## 📚 Additional Resources

### Our Documentation
- **[CI Workflow Explained](.github/CI_WORKFLOW_EXPLAINED.md)** - Complete guide to understanding the CI/CD pipeline
- **[CI Quick Reference](.github/CI_QUICK_REFERENCE.md)** - Quick reference card for common tasks
- **[GitHub Actions Glossary](.github/GITHUB_ACTIONS_GLOSSARY.md)** - Beginner-friendly terminology guide

### External Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Testing Library](https://testing-library.com/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## ✅ Next Steps

1. **Install dependencies**: `npm install`
2. **Install Playwright**: `npm run e2e:install`
3. **Run tests**: `npm run test`
4. **Run linting**: `npm run lint`
5. **Add GitHub secrets** for Vercel deployment
6. **Write your first test** in `src/test/`
7. **Push to GitHub** and watch CI run!

---

## 🎊 You're All Set!

Your project now has enterprise-grade CI/CD infrastructure. Every push will be automatically:
- Linted
- Type-checked
- Tested
- Built
- Analyzed

Happy coding! 🚀

