# Architecture Documentation

[Home](../../README.md) > [Docs](../README.md) > Architecture

Technical documentation of Yarnli-CAD's architecture and design.

---

## 📚 Architecture Documents

### Core Architecture
- **[Overview](overview.md)** - High-level system architecture and design principles
- **[Domain Model](domain-model.md)** - Core domain concepts and relationships
- **[File Structure](file-structure.md)** - Project organization and file layout
- **[Glossary](glossary.md)** - Technical terms and definitions

### Algorithms & Strategies
- **[Layer Strategies](layer-strategies.md)** - Layerline generation algorithms and approaches
- **[Implementation Summary](implementation-summary.md)** - Technical implementation details

---

## 🎯 Quick Navigation

### Understanding the System
1. Start with [Overview](overview.md) for the big picture
2. Review [Domain Model](domain-model.md) for core concepts
3. Explore [Layer Strategies](layer-strategies.md) for algorithms
4. Reference [Glossary](glossary.md) for terminology

### For New Contributors
1. Read [Overview](overview.md)
2. Understand [File Structure](file-structure.md)
3. Review [Domain Model](domain-model.md)
4. Check [Contributing Guide](../../CONTRIBUTING.md)

---

## 🏗️ Key Architectural Concepts

### Domain-Driven Design
Yarnli-CAD follows domain-driven design principles:
- **Shapes** - 3D geometric primitives
- **Layerlines** - Horizontal slices for crochet patterns
- **Nodes** - Individual stitch positions
- **Patterns** - Generated crochet instructions

### Rendering Pipeline
1. 3D shape definition
2. Layerline generation
3. Node placement
4. Stitch assignment
5. Pattern output

### Technology Stack
- **Frontend:** React + Three.js
- **State Management:** Zustand
- **3D Rendering:** Three.js + React Three Fiber
- **Build Tool:** Vite
- **Language:** JavaScript/TypeScript

---

## 📖 Document Descriptions

### [Overview](overview.md)
High-level architecture, system components, and design decisions.

### [Domain Model](domain-model.md)
Core domain entities, their relationships, and business logic.

### [File Structure](file-structure.md)
Project organization, directory layout, and file naming conventions.

### [Layer Strategies](layer-strategies.md)
Algorithms for generating layerlines from 3D geometry.

### [Implementation Summary](implementation-summary.md)
Technical implementation details and key features.

### [Glossary](glossary.md)
Definitions of technical terms used throughout the codebase.

---

## Related Documentation

- **Previous:** [API Reference](../api/) - API documentation
- **Next:** [Contributing](../contributing/) - Developer guides
- **See also:** [User Guides](../guides/) - Feature documentation
- **Parent:** [Documentation Home](../README.md)

---

[Back to Documentation Home](../README.md)

