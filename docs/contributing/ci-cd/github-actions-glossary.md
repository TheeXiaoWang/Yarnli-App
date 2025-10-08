# GitHub Actions Glossary

A beginner-friendly guide to GitHub Actions terminology used in our CI/CD workflows.

---

## Core Concepts

### Action
**What:** A reusable unit of code that performs a specific task.

**Example:**
```yaml
- uses: actions/checkout@v4  # This is an action
```

**Types:**
- **Official Actions:** Created by GitHub (e.g., `actions/checkout`)
- **Third-party Actions:** Created by community (e.g., `codecov/codecov-action`)
- **Custom Actions:** Created by you

**Real-world analogy:** Like a function or library you import in code.

---

### Artifact
**What:** Files generated during a workflow that you want to save and download.

**Example:**
```yaml
- uses: actions/upload-artifact@v4
  with:
    name: dist
    path: dist/
```

**Common uses:**
- Build outputs (dist/, build/)
- Test reports (coverage/, playwright-report/)
- Logs and debugging files

**Real-world analogy:** Like saving a file to cloud storage for later download.

---

### Branch
**What:** A parallel version of your code repository.

**Example:**
```yaml
on:
  push:
    branches: [main, staging, develop]
```

**Common branches:**
- `main` - Production code
- `staging` - Pre-production testing
- `develop` - Active development
- `feature/*` - New features

**Real-world analogy:** Like different versions of a document (draft, review, final).

---

### Cache
**What:** Stored data that speeds up future workflow runs.

**Example:**
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'  # Caches node_modules
```

**What gets cached:**
- `node_modules` (npm dependencies)
- Build outputs
- Downloaded files

**Real-world analogy:** Like browser cache - stores frequently used data locally.

---

### Checkout
**What:** Downloading your repository code to the runner.

**Example:**
```yaml
- uses: actions/checkout@v4
```

**Why needed:** Runners start empty; checkout gets your code.

**Real-world analogy:** Like `git clone` but for CI/CD.

---

### CI/CD
**What:** Continuous Integration / Continuous Deployment

**CI (Continuous Integration):**
- Automatically test code changes
- Merge code frequently
- Catch bugs early

**CD (Continuous Deployment):**
- Automatically deploy to production
- Release features faster
- Reduce manual work

**Real-world analogy:** Like an assembly line that automatically builds and ships products.

---

### Concurrency
**What:** Control over how many workflow runs can execute simultaneously.

**Example:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Why useful:** Saves resources by canceling old runs when new code is pushed.

**Real-world analogy:** Like canceling an old print job when you submit a new one.

---

### Context
**What:** Information about the workflow run (branch, commit, user, etc.).

**Example:**
```yaml
if: github.ref == 'refs/heads/main'  # Using github context
```

**Common contexts:**
- `github.ref` - Branch reference
- `github.actor` - User who triggered workflow
- `github.event_name` - Event type (push, pull_request)
- `secrets.TOKEN` - Secret values

**Real-world analogy:** Like environment variables in programming.

---

### Event
**What:** Something that triggers a workflow to run.

**Example:**
```yaml
on:
  push:           # Event type
  pull_request:   # Event type
```

**Common events:**
- `push` - Code pushed to repository
- `pull_request` - PR opened/updated
- `schedule` - Cron-based timing
- `workflow_dispatch` - Manual trigger

**Real-world analogy:** Like event listeners in JavaScript.

---

### Job
**What:** A set of steps that execute on the same runner.

**Example:**
```yaml
jobs:
  test:           # Job name
    runs-on: ubuntu-latest
    steps:
      - name: Run tests
        run: npm test
```

**Characteristics:**
- Runs in fresh virtual machine
- Can run in parallel or sequence
- Can depend on other jobs

**Real-world analogy:** Like a chapter in a book - part of a larger workflow.

---

### Matrix
**What:** Run the same job with different configurations.

**Example:**
```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
    os: [ubuntu-latest, windows-latest]
```

**Result:** Creates 6 jobs (3 Node versions × 2 OSes)

**Real-world analogy:** Like testing a product in different environments.

---

### Needs
**What:** Specifies job dependencies (which jobs must complete first).

**Example:**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
  
  deploy:
    needs: build  # Wait for build to finish
```

**Real-world analogy:** Like prerequisites for a college course.

---

### Pull Request (PR)
**What:** A request to merge code changes from one branch to another.

**Example:**
```yaml
on:
  pull_request:
    branches: [main]
```

**Workflow:** Feature branch → PR → Review → Merge → Main branch

**Real-world analogy:** Like submitting a draft for review before publishing.

---

### Runner
**What:** A virtual machine that executes your workflow jobs.

**Example:**
```yaml
runs-on: ubuntu-latest  # Specifies runner type
```

**Types:**
- `ubuntu-latest` - Linux (most common)
- `windows-latest` - Windows
- `macos-latest` - macOS
- Self-hosted - Your own machine

**Real-world analogy:** Like a computer in the cloud that runs your code.

---

### Secret
**What:** Encrypted environment variable for sensitive data.

**Example:**
```yaml
env:
  API_TOKEN: ${{ secrets.API_TOKEN }}
```

**Common secrets:**
- API tokens
- Passwords
- SSH keys
- Deployment credentials

**How to add:** Repository → Settings → Secrets and variables → Actions

**Real-world analogy:** Like a password manager for your CI/CD.

---

### Step
**What:** An individual task within a job.

**Example:**
```yaml
steps:
  - name: Checkout code      # Step 1
    uses: actions/checkout@v4
  
  - name: Run tests          # Step 2
    run: npm test
```

**Types:**
- `uses` - Run an action
- `run` - Execute shell command

**Real-world analogy:** Like steps in a recipe.

---

### Trigger
**What:** An event that starts a workflow.

**Example:**
```yaml
on:
  push:              # Trigger
  pull_request:      # Trigger
  workflow_dispatch: # Manual trigger
```

**Real-world analogy:** Like an alarm that starts a process.

---

### Workflow
**What:** An automated process defined in a YAML file.

**Example:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
```

**Location:** `.github/workflows/*.yml`

**Real-world analogy:** Like a recipe or instruction manual.

---

## YAML Syntax

### `on:`
**What:** Defines when the workflow runs.

**Example:**
```yaml
on:
  push:
    branches: [main]
```

---

### `jobs:`
**What:** Defines the jobs in the workflow.

**Example:**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
```

---

### `steps:`
**What:** Defines the steps within a job.

**Example:**
```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4
```

---

### `uses:`
**What:** Runs a pre-built action.

**Example:**
```yaml
- uses: actions/checkout@v4
```

---

### `run:`
**What:** Executes a shell command.

**Example:**
```yaml
- run: npm install
```

---

### `with:`
**What:** Provides input parameters to an action.

**Example:**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
```

---

### `env:`
**What:** Sets environment variables.

**Example:**
```yaml
env:
  NODE_ENV: production
```

---

### `if:`
**What:** Conditional execution of a step or job.

**Example:**
```yaml
if: github.ref == 'refs/heads/main'
```

---

### `needs:`
**What:** Specifies job dependencies.

**Example:**
```yaml
needs: [build, test]
```

---

## Common Expressions

### `${{ }}`
**What:** Expression syntax for accessing contexts and variables.

**Example:**
```yaml
${{ github.ref }}
${{ secrets.TOKEN }}
```

---

### `always()`
**What:** Run step even if previous steps failed.

**Example:**
```yaml
if: always()
```

---

### `success()`
**What:** Run step only if previous steps succeeded (default).

**Example:**
```yaml
if: success()
```

---

### `failure()`
**What:** Run step only if previous steps failed.

**Example:**
```yaml
if: failure()
```

---

## Quick Reference

| Term | One-line Definition |
|------|---------------------|
| Action | Reusable code unit |
| Artifact | Saved workflow files |
| Cache | Stored data for speed |
| Checkout | Download repo code |
| CI/CD | Automated testing & deployment |
| Concurrency | Control parallel runs |
| Context | Workflow information |
| Event | Workflow trigger |
| Job | Set of steps on one runner |
| Matrix | Multiple configurations |
| Needs | Job dependencies |
| PR | Code merge request |
| Runner | Virtual machine |
| Secret | Encrypted variable |
| Step | Individual task |
| Trigger | Event that starts workflow |
| Workflow | Automated process |

---

## Learning Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Our CI Workflow Explained](./CI_WORKFLOW_EXPLAINED.md)
- [CI Quick Reference](./CI_QUICK_REFERENCE.md)

---

**Tip:** Bookmark this page for quick reference while reading workflow files!

