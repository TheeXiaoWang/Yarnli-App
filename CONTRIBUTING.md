# Contributing to Yarnli-CAD

Thank you for your interest in contributing to Yarnli-CAD! 🧶

We welcome contributions from developers, crocheters, designers, and anyone passionate about making crochet pattern generation more accessible.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Project Structure](#project-structure)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

---

## 📜 Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Environment details** (browser, OS, Node version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear use case** - Why is this enhancement useful?
- **Detailed description** - How should it work?
- **Mockups or examples** if applicable

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:
- `good first issue` - Simple issues perfect for newcomers
- `help wanted` - Issues where we need community help
- `documentation` - Documentation improvements

### Pull Requests

1. **Fork the repository** and create your branch from `staging`
2. **Make your changes** following our coding standards
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Submit a pull request** with a clear description

---

## 🛠️ Development Setup

### Prerequisites

- Node.js v16 or higher
- npm or yarn
- Git
- A code editor (VS Code recommended)

### Setup Steps

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/New_CrochetCAD123.git
   cd New_CrochetCAD123
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

---

## 🔄 Pull Request Process

### Before Submitting

- [ ] Code follows the project's coding standards
- [ ] All tests pass (when test suite is available)
- [ ] Documentation is updated
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with `staging`

### PR Title Format

Use conventional commit format:
- `feat: Add new primitive shape`
- `fix: Correct node orientation for cones`
- `docs: Update installation instructions`
- `refactor: Simplify layerline generation`
- `style: Format code with prettier`
- `test: Add tests for magic ring`

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated checks** must pass (linting, build)
2. **Code review** by at least one maintainer
3. **Testing** on multiple browsers if UI changes
4. **Approval** and merge by maintainer

---

## 💻 Coding Standards

### JavaScript/React

- Use **functional components** with hooks
- Follow **ES6+ syntax**
- Use **meaningful variable names**
- Add **comments** for complex logic
- Keep functions **small and focused**

### File Organization

- Place components in appropriate directories
- Keep related files together
- Use index files for clean imports

### Naming Conventions

- **Components**: PascalCase (`NodeViewer.jsx`)
- **Functions**: camelCase (`calculateOrientation`)
- **Constants**: UPPER_SNAKE_CASE (`STITCH_TYPES`)
- **Files**: Match component name or use kebab-case

### Code Style

```javascript
// ✅ Good
function calculateNodePosition(node, center, radius) {
  const position = node.p || [0, 0, 0]
  const offset = calculateOffset(center, radius)
  return addVectors(position, offset)
}

// ❌ Avoid
function calc(n,c,r){return n.p?add(n.p,off(c,r)):[0,0,0]}
```

---

## 🏗️ Project Structure

```
src/
├── app/                    # Application core
│   ├── stores/            # Zustand state management
│   ├── hooks/             # Custom React hooks
│   └── contexts/          # React contexts
├── ui/                    # React components
│   ├── editor/            # CAD editor UI
│   ├── decor/             # Decoration/plushie UI
│   └── home/              # Landing page
├── domain/                # Core business logic
│   ├── layerlines/        # Layer generation
│   ├── nodes/             # Node placement
│   └── shapes/            # 3D shape definitions
├── services/              # Service layer
│   ├── nodeOrientation/   # Orientation calculations
│   └── scaffoldPlanning/  # Scaffold generation
└── utils/                 # Shared utilities
```

---

## 🧪 Testing Guidelines

### Manual Testing

Before submitting a PR, test:
- [ ] Feature works as expected
- [ ] No console errors
- [ ] UI is responsive
- [ ] Works in Chrome, Firefox, Safari
- [ ] No performance regressions

### Future: Automated Testing

We plan to add:
- Unit tests with Jest
- Component tests with React Testing Library
- E2E tests with Playwright

---

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for complex functions
- Document parameters and return values
- Explain non-obvious logic

```javascript
/**
 * Calculate node orientation for cone surfaces
 * @param {Array} position - Node position [x, y, z]
 * @param {Array} center - Cone center point
 * @param {number} tiltRad - Tilt angle in radians
 * @returns {Array} Quaternion [x, y, z, w]
 */
function calculateConeOrientation(position, center, tiltRad) {
  // Implementation
}
```

### README Updates

Update README.md when:
- Adding new features
- Changing installation steps
- Modifying project structure

### Changelog

Significant changes should be noted in commit messages for future changelog generation.

---

## 🎯 Areas We Need Help

- **Algorithm Optimization**: Improve layerline generation performance
- **Pattern Export**: Implement PDF/text pattern export
- **Mobile Support**: Make the UI responsive for tablets/phones
- **Accessibility**: Improve keyboard navigation and screen reader support
- **Documentation**: Expand tutorials and API documentation
- **Testing**: Add automated test coverage

---

## 💬 Questions?

- **GitHub Discussions**: Ask questions and share ideas
- **GitHub Issues**: Report bugs or request features
- **Code Review**: Learn from PR feedback

---

## 🙏 Thank You!

Your contributions make Yarnli-CAD better for everyone. Whether you're fixing a typo or implementing a major feature, we appreciate your time and effort!

**Happy coding! 🧶**

