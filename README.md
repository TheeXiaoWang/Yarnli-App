# 🧶 Yarnli-CAD

**Open-source 3D CAD tool for generating crochet patterns from 3D models**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Yarnli-CAD is a revolutionary web-based application that bridges the gap between 3D modeling and crochet pattern generation. Design amigurumi, plushies, and complex crochet projects in 3D, then automatically generate stitch-by-stitch instructions.

---

## ✨ Features

### 🎨 **3D Design Tools**
- **Primitive Shapes**: Spheres, cones, cylinders, capsules, pyramids, and torus
- **Interactive Transformation**: Scale, rotate, and position objects with precision
- **Real-time Preview**: See your design update instantly as you work
- **Layer Visualization**: Photoshop-style layers panel for managing objects

### 🧵 **Crochet Pattern Generation**
- **Automatic Layerline Generation**: Converts 3D geometry into crochet-friendly horizontal layers
- **Stitch Type Support**: Single crochet (sc), half-double crochet (hdc), double crochet (dc), and more
- **Node Placement**: Intelligent stitch positioning with proper spacing and orientation
- **Magic Ring Support**: Automatic magic ring generation for closed shapes
- **Tilt Calculation**: Accurate stitch angle computation for spherical and conical surfaces

### 🎯 **Advanced Features**
- **Multi-Object Scenes**: Combine multiple shapes to create complex designs
- **Intersection Handling**: Smart layerline generation around object intersections
- **Measurement Overlays**: Visual feedback for dimensions and stitch counts
- **Yarn Size Customization**: Adjust for different yarn weights and hook sizes
- **Export Capabilities**: (Coming soon) Export patterns as PDF or text files

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v16 or higher
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TheeXiaoWang/New_CrochetCAD123.git
   cd New_CrochetCAD123
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The production build will be output to the `dist/` directory.

---

## 📖 Usage Guide

### Creating Your First Design

1. **Add a Shape**: Click on a primitive button (sphere, cone, etc.) in the left sidebar
2. **Transform**: Select the object and use the transform controls or input fields to adjust size, position, and rotation
3. **Generate Layers**: The layerlines are automatically generated based on your 3D geometry
4. **View Nodes**: Toggle node visibility to see individual stitch placements
5. **Adjust Settings**: Modify yarn size, stitch types, and spacing in the settings panel

### Camera Controls
- **Rotate**: Left-click and drag
- **Pan**: Right-click and drag
- **Zoom**: Scroll wheel

### Keyboard Shortcuts
- `Delete`: Remove selected object
- `Ctrl+Z`: Undo (coming soon)
- `Ctrl+Y`: Redo (coming soon)

---

## 🏗️ Project Structure

```
Yarnli-CAD/
├── src/
│   ├── app/                    # Application core (stores, hooks, contexts)
│   ├── ui/                     # React components (editor, decor, home, gallery)
│   ├── domain/                 # Core crochet logic
│   │   ├── layerlines/         # Layer generation algorithms
│   │   ├── nodes/              # Stitch node placement
│   │   ├── shapes/             # 3D shape definitions
│   │   └── utils/              # Shared utilities
│   ├── services/               # Business logic services
│   │   ├── nodeOrientation/    # Stitch orientation calculations
│   │   ├── nodePlanning/       # Node spacing and placement
│   │   ├── scaffoldPlanning/   # Scaffold chain generation
│   │   └── sphereTiltPipeline/ # Sphere tilt angle computation
│   ├── constants/              # Stitch types, orientation constants
│   └── utils/                  # Math and helper utilities
├── docs/                       # Documentation
├── LICENSE                     # AGPL-3.0 license
└── README.md                   # This file
```

---

## 🛠️ Technology Stack

- **React 18** - Modern UI framework with hooks
- **Three.js** - 3D graphics rendering
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers and abstractions
- **Zustand** - Lightweight state management
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before getting started.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit with clear messages (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request


---

## 📚 Documentation

- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and component structure
- **[Glossary](docs/GLOSSARY.md)** - Crochet and technical terminology
- **[File Structure](docs/FILES.md)** - Detailed file organization
- **[Node Structure](docs/NODES_STRUCTURE.md)** - Stitch node data format

---

## 🗺️ Roadmap

### Current Focus (v1.0)
- [x] Basic 3D shape primitives
- [x] Layerline generation for spheres and cones
- [x] Node placement with orientation
- [x] Magic ring support
- [ ] Pattern export (PDF/text)
- [ ] Undo/redo functionality

### Future Plans (v2.0+)
- [ ] Custom shape import (STL/OBJ files)
- [ ] Color work and stripe patterns
- [ ] Decrease/increase stitch markers
- [ ] Assembly instructions for multi-part designs
- [ ] Community pattern library
- [ ] Mobile app version

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

**What this means:**
- ✅ You can use, modify, and distribute this software
- ✅ You must share your modifications under the same license
- ✅ If you run a modified version as a web service, you must make the source code available
- ✅ Commercial use is allowed

---

## 🙏 Acknowledgments

- Inspired by the amazing crochet community
- Built with love for makers and crafters worldwide
- Special thanks to all contributors and testers

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/TheeXiaoWang/New_CrochetCAD123/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TheeXiaoWang/New_CrochetCAD123/discussions)

---

**Made with 🧶 by the Yarnli-CAD community**

