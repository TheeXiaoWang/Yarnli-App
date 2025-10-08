# CI/CD Documentation

[Home](../../../README.md) > [Docs](../../README.md) > [Contributing](../README.md) > CI/CD

Complete guide to Yarnli-CAD's continuous integration and deployment setup.

---

## 📚 CI/CD Guides

### Getting Started
- **[Setup Guide](setup-guide.md)** - Installing and configuring CI/CD tools
- **[Quick Reference](quick-reference.md)** - Common commands and troubleshooting

### Understanding the System
- **[Workflow Explained](workflow-explained.md)** - Detailed explanation of GitHub Actions workflows
- **[Implementation](implementation.md)** - Technical implementation summary
- **[GitHub Actions Glossary](github-actions-glossary.md)** - Terminology and concepts

---

## 🎯 Quick Start

### New to CI/CD?
1. Read [Setup Guide](setup-guide.md) to install tools
2. Review [Workflow Explained](workflow-explained.md) to understand the pipeline
3. Use [Quick Reference](quick-reference.md) for daily tasks

### Troubleshooting?
- Check [Quick Reference](quick-reference.md#troubleshooting)
- Review [Workflow Explained](workflow-explained.md#troubleshooting)
- See [GitHub Actions Glossary](github-actions-glossary.md) for terminology

---

## 🔄 CI/CD Pipeline Overview

Our CI/CD pipeline automatically:
1. **Lints** code for style and quality
2. **Type checks** TypeScript code
3. **Tests** with coverage reporting
4. **Builds** production bundles
5. **Runs E2E tests** across browsers
6. **Analyzes** bundle size (main branch)
7. **Deploys** to Vercel (main branch)

---

## 📖 Document Descriptions

### [Setup Guide](setup-guide.md)
Complete installation and configuration instructions for all CI/CD tools.

**Covers:**
- Installing dependencies
- Configuring tools
- Setting up GitHub secrets
- Verifying installation

### [Workflow Explained](workflow-explained.md)
Educational guide to understanding the GitHub Actions workflow.

**Covers:**
- What is GitHub Actions
- How workflows are triggered
- Job execution flow
- Detailed job breakdowns
- Troubleshooting

### [Quick Reference](quick-reference.md)
Quick reference card for common tasks and commands.

**Covers:**
- Common commands
- Workflow status
- Troubleshooting
- Pre-commit checklist

### [Implementation](implementation.md)
Technical summary of what was implemented.

**Covers:**
- Package configuration
- Dependencies installed
- Configuration files
- GitHub Actions workflows
- Documentation created

### [GitHub Actions Glossary](github-actions-glossary.md)
Beginner-friendly terminology guide.

**Covers:**
- Core concepts (actions, jobs, steps, runners)
- YAML syntax
- Common expressions
- Quick reference table

---

## 🚀 Common Tasks

### Run All Checks Locally
```bash
npm run ci
```

### Run Individual Checks
```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm run typecheck     # TypeScript
npm run test          # Unit tests
npm run build         # Production build
npm run e2e           # E2E tests
```

### Debug Tests
```bash
npm run test:ui       # Interactive test UI
npm run e2e:ui        # Playwright UI
```

---

## 🎓 Learning Path

**Beginner:**
1. [Setup Guide](setup-guide.md)
2. [Quick Reference](quick-reference.md)
3. [GitHub Actions Glossary](github-actions-glossary.md)

**Intermediate:**
1. [Workflow Explained](workflow-explained.md)
2. [Implementation](implementation.md)
3. Practice with local commands

**Advanced:**
1. Customize workflows
2. Add new CI jobs
3. Optimize performance

---

## 🆘 Getting Help

- **Setup issues?** See [Setup Guide](setup-guide.md#troubleshooting)
- **Workflow failures?** Check [Quick Reference](quick-reference.md#common-failures--fixes)
- **Terminology?** Look up in [Glossary](github-actions-glossary.md)

---

## Related Documentation

- **Previous:** [Contributing](../README.md) - Developer guides
- **See also:** [Architecture](../../architecture/) - Technical design
- **Parent:** [Contributing Home](../README.md)

---

[Back to Contributing](../README.md) | [Back to Documentation Home](../../README.md)

