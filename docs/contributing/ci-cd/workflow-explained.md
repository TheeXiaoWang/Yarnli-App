# GitHub Actions CI Workflow - Educational Guide

## 📚 Table of Contents
1. [Overview](#overview)
2. [Workflow Triggers](#workflow-triggers)
3. [Job Execution Flow](#job-execution-flow)
4. [Detailed Job Breakdown](#detailed-job-breakdown)
5. [Key Concepts](#key-concepts)
6. [Common Patterns](#common-patterns)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### What is GitHub Actions?
GitHub Actions is a **CI/CD platform** that automates your software development workflows. It runs tasks (called "workflows") automatically when certain events occur in your repository.

### What is CI/CD?
- **CI (Continuous Integration)**: Automatically test and validate code changes
- **CD (Continuous Deployment)**: Automatically deploy code to production

### Our CI Workflow Purpose
This workflow ensures every code change:
1. ✅ Follows code style guidelines (ESLint, Prettier)
2. ✅ Has correct TypeScript types
3. ✅ Passes all tests with adequate coverage
4. ✅ Builds successfully
5. ✅ Works in real browsers (E2E tests)
6. ✅ Doesn't bloat bundle size (main branch only)

---

## Workflow Triggers

### When Does This Workflow Run?

```yaml
on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main, staging, develop]
```

**Trigger Events:**

1. **Push to main/staging/develop**
   - When: You merge a PR or push directly
   - Why: Validates code immediately after it enters important branches
   - Example: `git push origin main`

2. **Pull Request to main/staging/develop**
   - When: You open a PR or push new commits to an existing PR
   - Why: Validates code BEFORE it's merged (prevents bad code)
   - Example: Opening a PR from `feature/new-button` → `main`

### Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**What it does:**
- Cancels old workflow runs when you push new code
- Saves time and resources

**Example:**
1. You push commit A → Workflow starts
2. You push commit B (30 seconds later) → Workflow for A is cancelled, B starts
3. Why: No point testing old code when newer code is available

---

## Job Execution Flow

### Visual Representation

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW TRIGGERED                        │
│              (Push or Pull Request Event)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────┐
│   JOB 1: LINT         │   │   JOB 2: TEST         │
│   - ESLint            │   │   - Unit Tests        │
│   - Prettier          │   │   - Coverage          │
│   - TypeScript        │   │   - Codecov Upload    │
└───────────────────────┘   └───────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                ┌───────────────────────┐
                │   JOB 3: BUILD        │
                │   - Vite Build        │
                │   - Upload Artifact   │
                └───────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────┐
│   JOB 4: E2E          │   │   JOB 5: ANALYZE      │
│   - Playwright        │   │   - Bundle Size       │
│   - Multi-browser     │   │   (main branch only)  │
└───────────────────────┘   └───────────────────────┘
                │
                ▼
        ✅ ALL CHECKS PASSED
```

### Execution Characteristics

| Job | Runs When | Depends On | Duration | Can Fail Build |
|-----|-----------|------------|----------|----------------|
| Lint | Always | None | ~1 min | Yes |
| Test | Always | None | ~2 min | Yes |
| Build | After Lint & Test pass | Lint, Test | ~1 min | Yes |
| E2E | After Build passes | Build | ~3 min | Yes |
| Analyze | Main branch only | Build | ~1 min | No* |

*Analyze job failure won't block deployment

---

## Detailed Job Breakdown

### Job 1: Lint & Type Check

**Purpose:** Validate code quality and style

**Steps:**
1. **Checkout code** - Download repository
2. **Setup Node.js** - Install Node 20 with npm caching
3. **Install dependencies** - `npm ci` (clean install)
4. **Run ESLint** - Check code style and catch errors
5. **Check formatting** - Verify Prettier formatting
6. **Type check** - Validate TypeScript types

**Why it matters:**
- Catches syntax errors before they reach production
- Enforces consistent code style across team
- Prevents type-related bugs

**Common failures:**
- ESLint warnings (fix with `npm run lint:fix`)
- Unformatted code (fix with `npm run format`)
- TypeScript errors (fix type issues in code)

---

### Job 2: Unit Tests

**Purpose:** Validate code functionality and coverage

**Steps:**
1. **Checkout & Setup** - Same as Job 1
2. **Install dependencies** - `npm ci`
3. **Run tests** - Execute Vitest with coverage
4. **Upload coverage** - Send results to Codecov

**Why it matters:**
- Ensures code works as expected
- Prevents regressions (breaking existing features)
- Tracks code coverage over time

**Coverage Requirements:**
- Minimum: 60% for lines, functions, branches, statements
- Configured in: `vitest.config.js`

**Common failures:**
- Failing tests (fix the code or test)
- Low coverage (add more tests)

---

### Job 3: Build

**Purpose:** Create production-ready bundle

**Steps:**
1. **Checkout & Setup** - Same as previous jobs
2. **Install dependencies** - `npm ci`
3. **Build application** - `npm run build` (Vite)
4. **Upload artifacts** - Save dist/ folder

**Why it matters:**
- Validates code can be compiled and bundled
- Creates optimized production assets
- Provides build for E2E tests

**What happens during build:**
- TypeScript → JavaScript compilation
- Module bundling and tree-shaking
- Code minification
- Asset optimization (images, CSS)
- Source map generation

**Common failures:**
- Import errors (missing dependencies)
- Build configuration issues
- Out of memory (large bundles)

---

### Job 4: E2E Tests

**Purpose:** Test complete user workflows in real browsers

**Steps:**
1. **Checkout & Setup** - Same as previous jobs
2. **Install dependencies** - `npm ci`
3. **Install browsers** - Download Chromium, Firefox, WebKit
4. **Download build** - Get dist/ from Build job
5. **Run E2E tests** - Execute Playwright tests
6. **Upload report** - Save test results and screenshots

**Why it matters:**
- Validates real user interactions
- Catches integration issues
- Tests across different browsers

**Browsers tested:**
- Desktop: Chromium, Firefox, WebKit (Safari)
- Mobile: Pixel 5, iPhone 12 viewports

**Common failures:**
- Selector changes (update test selectors)
- Timing issues (add proper waits)
- Browser-specific bugs

---

### Job 5: Bundle Analysis

**Purpose:** Monitor JavaScript bundle size

**Steps:**
1. **Checkout & Setup** - Same as previous jobs
2. **Install dependencies** - `npm ci`
3. **Download build** - Get dist/ from Build job
4. **Analyze bundle** - Generate size report
5. **Upload report** - Save HTML visualization

**Why it matters:**
- Prevents bundle size bloat
- Identifies large dependencies
- Helps optimize performance

**When it runs:**
- Only on `main` branch
- Not on PRs or other branches

**How to use:**
1. Download `bundle-analysis` artifact
2. Open `analyze-report.html` in browser
3. See interactive treemap of bundle composition

---

## Key Concepts

### 1. Jobs vs Steps

**Job:**
- Independent unit of work
- Runs in its own virtual machine
- Can run in parallel or sequence
- Example: `lint`, `test`, `build`

**Step:**
- Individual task within a job
- Runs sequentially within the job
- Shares the same environment
- Example: "Checkout code", "Install dependencies"

### 2. Runners

**What:** Virtual machines that execute jobs

**Types:**
- `ubuntu-latest` - Linux (we use this)
- `windows-latest` - Windows
- `macos-latest` - macOS

**Why ubuntu-latest:**
- Free for public repos
- Fast and reliable
- Most CI tools are optimized for Linux

### 3. Actions

**What:** Reusable units of code

**Types:**
1. **Official Actions** (by GitHub)
   - `actions/checkout@v4` - Clone repository
   - `actions/setup-node@v4` - Install Node.js
   - `actions/upload-artifact@v4` - Save files

2. **Third-party Actions**
   - `codecov/codecov-action@v4` - Upload coverage

3. **Custom Actions**
   - You can create your own!

### 4. Artifacts

**What:** Files saved from workflow runs

**Examples:**
- `dist` - Production build (7 days)
- `playwright-report` - Test results (7 days)
- `bundle-analysis` - Size report (30 days)

**How to access:**
1. Go to workflow run in GitHub
2. Scroll to "Artifacts" section
3. Download ZIP file

### 5. Secrets

**What:** Encrypted environment variables

**Examples:**
- `CODECOV_TOKEN` - Codecov API token
- `VERCEL_TOKEN` - Vercel deployment token

**How to add:**
1. Repository → Settings
2. Secrets and variables → Actions
3. New repository secret

### 6. Caching

**What:** Reusing downloaded dependencies

**Why:**
- Speeds up workflows (30-60 seconds saved)
- Reduces network usage

**How it works:**
```yaml
cache: 'npm'
```
- Creates hash of `package-lock.json`
- If hash matches, restores `node_modules`
- If hash differs, downloads fresh

---

## Common Patterns

### Pattern 1: Conditional Execution

```yaml
if: always()  # Run even if previous steps fail
if: github.ref == 'refs/heads/main'  # Only on main branch
if: success()  # Only if previous steps succeeded (default)
```

### Pattern 2: Job Dependencies

```yaml
needs: [lint, test]  # Wait for both to complete
needs: build  # Wait for single job
# No needs = runs immediately
```

### Pattern 3: Artifact Sharing

```yaml
# Job 1: Upload
- uses: actions/upload-artifact@v4
  with:
    name: dist
    path: dist/

# Job 2: Download
- uses: actions/download-artifact@v4
  with:
    name: dist
    path: dist/
```

---

## Troubleshooting

### Workflow Failed - Now What?

1. **Click on the failed job** in GitHub Actions tab
2. **Expand the failed step** to see error logs
3. **Common issues:**

#### ESLint Failures
```bash
# Locally run:
npm run lint:fix  # Auto-fix issues
npm run lint      # See remaining issues
```

#### Test Failures
```bash
# Locally run:
npm run test:ui   # Interactive debugging
npm run test      # See which tests fail
```

#### Build Failures
```bash
# Locally run:
npm run clean     # Clean old builds
npm run build     # Try building
```

#### E2E Failures
```bash
# Locally run:
npm run e2e:ui    # Visual debugging
npm run e2e       # Run tests
```

### Workflow Not Triggering?

**Check:**
1. Is your branch `main`, `staging`, or `develop`?
2. Is the workflow file in `.github/workflows/`?
3. Is the YAML syntax valid? (use YAML validator)

### Workflow Taking Too Long?

**Optimization tips:**
1. Use caching (we already do)
2. Run jobs in parallel (we already do)
3. Skip unnecessary jobs with conditionals
4. Reduce test suite size

---

## Learning Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [Our CI/CD Setup Guide](../CI_CD_SETUP_GUIDE.md)

---

**Questions?** Open an issue or check the [troubleshooting section](#troubleshooting)!

