# CI Workflow Quick Reference

## 🎯 Workflow Overview

**File:** `.github/workflows/ci.yml`  
**Purpose:** Automated quality checks on every code change  
**Triggers:** Push or PR to `main`, `staging`, `develop`  
**Duration:** ~5-8 minutes

---

## 📋 Jobs Summary

| # | Job | Duration | Runs When | Blocks Merge |
|---|-----|----------|-----------|--------------|
| 1 | Lint & Type Check | ~1 min | Always (parallel) | ✅ Yes |
| 2 | Unit Tests | ~2 min | Always (parallel) | ✅ Yes |
| 3 | Build | ~1 min | After 1 & 2 pass | ✅ Yes |
| 4 | E2E Tests | ~3 min | After 3 passes | ✅ Yes |
| 5 | Bundle Analysis | ~1 min | Main branch only | ❌ No |

---

## 🔍 What Each Job Checks

### Job 1: Lint & Type Check
- ✅ ESLint rules (0 warnings allowed)
- ✅ Prettier formatting
- ✅ TypeScript types

**Fix locally:**
```bash
npm run lint:fix      # Auto-fix ESLint
npm run format        # Auto-format code
npm run typecheck     # Check types
```

### Job 2: Unit Tests
- ✅ All tests pass
- ✅ 60% code coverage minimum
- ✅ Coverage uploaded to Codecov

**Fix locally:**
```bash
npm run test          # Run tests
npm run test:ui       # Debug tests
npm run test:watch    # Watch mode
```

### Job 3: Build
- ✅ Production build succeeds
- ✅ No build errors
- ✅ Artifacts uploaded

**Fix locally:**
```bash
npm run build         # Test build
npm run clean         # Clean cache
```

### Job 4: E2E Tests
- ✅ Tests pass in Chromium
- ✅ Tests pass in Firefox
- ✅ Tests pass in WebKit
- ✅ Mobile viewports work

**Fix locally:**
```bash
npm run e2e           # Run E2E tests
npm run e2e:ui        # Debug E2E tests
```

### Job 5: Bundle Analysis
- 📊 Bundle size report
- 📊 Dependency treemap
- 📊 Performance metrics

**View locally:**
```bash
npm run analyze       # Generate report
# Open analyze-report.html
```

---

## 🚨 Common Failures & Fixes

### ❌ ESLint Failed
**Error:** "Expected 0 warnings but got X"

**Fix:**
```bash
npm run lint:fix      # Auto-fix
npm run lint          # Check remaining
```

### ❌ Prettier Failed
**Error:** "Code style issues found"

**Fix:**
```bash
npm run format        # Auto-format all files
```

### ❌ TypeScript Failed
**Error:** "Type 'X' is not assignable to type 'Y'"

**Fix:**
- Fix type errors in your code
- Add proper type annotations
- Check imports and exports

### ❌ Tests Failed
**Error:** "X test(s) failed"

**Fix:**
```bash
npm run test:ui       # Interactive debugging
# Fix failing tests
npm run test          # Verify fix
```

### ❌ Build Failed
**Error:** "Build failed with X errors"

**Fix:**
```bash
npm run clean         # Clean old builds
npm install           # Reinstall deps
npm run build         # Try again
```

### ❌ E2E Failed
**Error:** "Playwright test failed"

**Fix:**
```bash
npm run e2e:ui        # Visual debugging
# Check screenshots in test report
# Update selectors if needed
```

---

## 🔄 Workflow Execution Flow

```
Push/PR → Triggers Workflow
    ↓
┌───────────────────────┐
│ Concurrency Check     │ ← Cancels old runs
└───────────────────────┘
    ↓
┌───────────────────────┬───────────────────────┐
│ Job 1: Lint           │ Job 2: Test           │ ← Parallel
└───────────────────────┴───────────────────────┘
    ↓
┌───────────────────────┐
│ Job 3: Build          │ ← Sequential (needs 1 & 2)
└───────────────────────┘
    ↓
┌───────────────────────┬───────────────────────┐
│ Job 4: E2E            │ Job 5: Analyze*       │ ← Parallel
└───────────────────────┴───────────────────────┘
    ↓
✅ All Checks Passed
```

*Job 5 only runs on `main` branch

---

## 📦 Artifacts Generated

| Artifact | Retention | Size | Purpose |
|----------|-----------|------|---------|
| `dist` | 7 days | ~2 MB | Production build |
| `playwright-report` | 7 days | ~5 MB | E2E test results |
| `bundle-analysis` | 30 days | ~100 KB | Bundle size report |

**Download artifacts:**
1. Go to workflow run in GitHub
2. Scroll to "Artifacts" section
3. Click to download ZIP

---

## 🔐 Required Secrets

| Secret | Required | Purpose |
|--------|----------|---------|
| `CODECOV_TOKEN` | Optional | Coverage reporting |
| `VERCEL_TOKEN` | For deploy | Vercel deployment |
| `VERCEL_ORG_ID` | For deploy | Vercel org ID |
| `VERCEL_PROJECT_ID` | For deploy | Vercel project ID |

**Add secrets:**
Repository → Settings → Secrets and variables → Actions

---

## ⚡ Performance Tips

### Speed Up Workflow
1. ✅ **Caching enabled** - `cache: 'npm'` saves ~30s
2. ✅ **Parallel jobs** - Jobs 1 & 2 run simultaneously
3. ✅ **Concurrency control** - Cancels old runs
4. ✅ **Conditional jobs** - Bundle analysis only on main

### Reduce Failures
1. **Run locally first:**
   ```bash
   npm run ci  # Runs all checks
   ```

2. **Use pre-commit hooks:**
   - Auto-format on commit
   - Run lint before push

3. **Watch test coverage:**
   - Keep coverage above 60%
   - Add tests for new features

---

## 📊 Monitoring

### View Workflow Status
1. Go to repository on GitHub
2. Click "Actions" tab
3. See all workflow runs

### Check Specific Run
1. Click on workflow run
2. See job status (✅ or ❌)
3. Click job to see logs
4. Expand steps to see details

### Coverage Trends
1. Go to Codecov.io
2. Link your repository
3. View coverage over time
4. See coverage on PRs

---

## 🎓 Learning Path

### Beginner
1. Read [CI_WORKFLOW_EXPLAINED.md](./CI_WORKFLOW_EXPLAINED.md)
2. Understand workflow triggers
3. Learn about jobs and steps
4. Practice fixing common failures

### Intermediate
1. Understand job dependencies
2. Learn about artifacts
3. Explore conditional execution
4. Customize workflow for your needs

### Advanced
1. Create custom actions
2. Optimize workflow performance
3. Add matrix builds
4. Implement deployment strategies

---

## 🆘 Getting Help

### Workflow Not Running?
- Check branch name (must be main/staging/develop)
- Verify YAML syntax
- Check GitHub Actions tab for errors

### Workflow Always Failing?
- Run `npm run ci` locally first
- Check error logs in GitHub Actions
- Review [troubleshooting guide](./CI_WORKFLOW_EXPLAINED.md#troubleshooting)

### Need More Info?
- [Full CI Workflow Guide](./CI_WORKFLOW_EXPLAINED.md)
- [CI/CD Setup Guide](../CI_CD_SETUP_GUIDE.md)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

---

## ✅ Pre-Push Checklist

Before pushing code:

- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds

**Or just run:**
```bash
npm run ci  # Runs all checks
```

---

**Remember:** The CI workflow is your safety net. It catches issues before they reach production! 🛡️

