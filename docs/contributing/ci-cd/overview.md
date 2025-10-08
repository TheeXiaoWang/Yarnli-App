# 🚀 CI/CD Infrastructure

## Quick Start

### Automated Setup (Recommended)

**Linux/macOS:**
```bash
chmod +x setup-ci-cd.sh
./setup-ci-cd.sh
```

**Windows:**
```cmd
setup-ci-cd.bat
```

### Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npm run e2e:install

# 3. Verify setup
npm run ci
```

---

## 📋 What's Included

### Testing
- ✅ **Vitest** - Unit testing with coverage
- ✅ **Playwright** - E2E testing across browsers
- ✅ **Testing Library** - React component testing

### Code Quality
- ✅ **ESLint** - Linting with React, TypeScript, accessibility rules
- ✅ **Prettier** - Code formatting with Tailwind plugin
- ✅ **TypeScript** - Type checking

### CI/CD
- ✅ **GitHub Actions** - Automated workflows
- ✅ **Codecov** - Coverage reporting
- ✅ **Vercel** - Automated deployment

### Templates
- ✅ **Issue Templates** - Bug reports, feature requests
- ✅ **PR Template** - Standardized pull requests

---

## 🎯 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test             # Run unit tests with coverage
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Open Vitest UI
npm run e2e              # Run E2E tests
npm run e2e:ui           # Open Playwright UI

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier
npm run format:check     # Check if code is formatted
npm run typecheck        # Run TypeScript type checking

# CI (runs all checks)
npm run ci               # Run all checks locally

# Utilities
npm run clean            # Clean build artifacts
npm run analyze          # Analyze bundle size
```

---

## 📊 Quality Standards

Your code must meet these standards to pass CI:

- ✅ **Zero ESLint warnings** (`--max-warnings 0`)
- ✅ **60% code coverage** minimum
- ✅ **TypeScript strict mode** with no errors
- ✅ **Prettier formatted** code
- ✅ **All tests passing**
- ✅ **Successful build**

---

## 🔄 Development Workflow

### Before Committing

```bash
npm run ci
```

This runs:
1. Type checking
2. Linting
3. Format checking
4. Tests with coverage
5. Production build

### Writing Tests

**Unit Test:**
```typescript
// src/utils/math.test.ts
import { describe, it, expect } from 'vitest'

describe('add', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
})
```

**Component Test:**
```typescript
// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react'

it('renders button', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
```

**E2E Test:**
```typescript
// e2e/homepage.spec.ts
import { test, expect } from '@playwright/test'

test('loads homepage', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Yarnli/)
})
```

---

## 🤖 GitHub Actions

### CI Workflow

**Triggers:** Push/PR to main, staging, develop

**Jobs:**
1. Lint & Type Check
2. Unit Tests (with coverage)
3. Build
4. E2E Tests
5. Bundle Analysis (main only)

### Deploy Workflow

**Triggers:** Push to main

**Jobs:**
1. Deploy to Production (Vercel)
2. Deploy Preview (for PRs)

---

## 🔐 GitHub Secrets

Add these to your repository (Settings → Secrets and variables → Actions):

**Optional:**
- `CODECOV_TOKEN` - Coverage reporting

**Required for deployment:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

## 📁 File Structure

```
.github/
├── workflows/
│   ├── ci.yml                    # CI workflow
│   └── deploy.yml                # Deployment workflow
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml
│   └── feature_request.yml
├── PULL_REQUEST_TEMPLATE.md
└── QUICK_REFERENCE.md

src/
└── test/
    ├── setup.ts                  # Test configuration
    └── example.test.tsx          # Example tests

e2e/
└── example.spec.ts               # E2E tests

Configuration:
├── eslint.config.js              # ESLint
├── .prettierrc                   # Prettier
├── vitest.config.js              # Vitest
├── playwright.config.ts          # Playwright
└── tsconfig.json                 # TypeScript
```

---

## 🐛 Troubleshooting

### Tests Failing
```bash
npm run test:ui          # Interactive debugging
npm run test:watch       # Watch mode
```

### Lint Errors
```bash
npm run lint:fix         # Auto-fix
```

### Format Issues
```bash
npm run format           # Auto-format
```

### Build Errors
```bash
npm run clean            # Clean artifacts
npm run build            # Rebuild
```

### E2E Issues
```bash
npm run e2e:ui           # Playwright UI
```

---

## 📚 Documentation

- **[CI_CD_SETUP_GUIDE.md](./CI_CD_SETUP_GUIDE.md)** - Complete setup guide
- **[CI_CD_IMPLEMENTATION_SUMMARY.md](./CI_CD_IMPLEMENTATION_SUMMARY.md)** - What was implemented
- **[.github/QUICK_REFERENCE.md](./.github/QUICK_REFERENCE.md)** - Quick reference card

---

## 🎓 Learning Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Testing Library](https://testing-library.com/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## ✅ Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Playwright browsers installed (`npm run e2e:install`)
- [ ] All checks pass (`npm run ci`)
- [ ] GitHub secrets configured
- [ ] First test written
- [ ] CI workflow running on GitHub

---

## 🆘 Getting Help

If you encounter issues:

1. Check the [CI_CD_SETUP_GUIDE.md](./CI_CD_SETUP_GUIDE.md)
2. Review the [troubleshooting section](#-troubleshooting)
3. Open an issue using the bug report template

---

**Ready to build something amazing! 🚀**

