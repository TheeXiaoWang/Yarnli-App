# CrochetCAD - 3D Layerline Generator

A React.js application for creating and manipulating 3D objects with dynamic layerline generation capabilities. Built with Three.js and React Three Fiber.

## Features

### Current Features
- **3D Scene Management**: Add spheres and cones to a 3D environment
- **Object Transformation**: Scale, rotate, and position objects along any axis
- **Interactive Controls**: Click to select objects and use transform controls
- **Real-time Updates**: Live transformation with visual feedback
- **Modern UI**: Clean, responsive interface with glassmorphism design
- **Scene Information**: Real-time display of object properties and scene statistics

### Planned Features
- **Layerline Generation**: Algorithm to generate layerlines based on object intersections
- **Dynamic Interactions**: Real-time response to object collisions and intersections
- **Advanced Geometry**: Support for more complex 3D shapes
- **Export Capabilities**: Export layerlines and 3D models
- **Animation System**: Animated layerline generation and object interactions

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd New_CrochetCAD
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

## Usage

### Adding Objects
- Click "Add Sphere" to add a sphere to the scene
- Click "Add Cone" to add a cone to the scene
- Objects are placed at random positions initially

### Selecting Objects
- Click on any object in the 3D scene to select it
- Selected objects show a green wireframe outline
- Transform controls appear for selected objects

### Transforming Objects
- **Scale**: Use the scale inputs in the control panel or drag the transform controls
- **Position**: Use the position inputs or drag the transform controls
- **Rotation**: Use the rotation inputs or drag the transform controls
- All transformations can be done along any axis (X, Y, Z)

### Scene Management
- "Remove Selected" removes the currently selected object
- "Clear Scene" removes all objects from the scene
- The info panel shows real-time statistics about the scene

### Camera Controls
- **Rotate**: Left click and drag
- **Pan**: Right click and drag
- **Zoom**: Scroll wheel

## Technology Stack

- **React 18**: Modern React with hooks and functional components
- **Three.js**: 3D graphics library
- **React Three Fiber**: React renderer for Three.js
- **React Three Drei**: Useful helpers for React Three Fiber
- **Zustand**: Lightweight state management
- **Vite**: Fast build tool and development server

## Project Structure

```
src/
├── components/
│   ├── Scene3D.jsx          # Main 3D scene component
│   ├── SceneObject.jsx      # Individual 3D object component
│   ├── ControlsPanel.jsx    # UI controls panel
│   └── InfoPanel.jsx        # Scene information panel
├── stores/
│   └── sceneStore.js        # Zustand store for scene state
├── App.jsx                  # Main application component
├── main.jsx                 # Application entry point
└── index.css               # Global styles
```

## Development

### Key Components

1. **Scene3D**: Renders all 3D objects and manages the scene
2. **SceneObject**: Individual object with transform controls and selection
3. **ControlsPanel**: UI for adding objects and transforming selected objects
4. **InfoPanel**: Displays scene statistics and selected object properties
5. **sceneStore**: Centralized state management using Zustand

### State Management

The application uses Zustand for state management with the following key state:
- `objects`: Array of all objects in the scene
- `selectedObject`: Currently selected object
- `nextId`: Counter for generating unique object IDs

### Adding New Features

To add new object types or features:
1. Update the `sceneStore.js` to handle new object types
2. Modify `SceneObject.jsx` to render new geometries
3. Add UI controls in `ControlsPanel.jsx`
4. Update the info panel if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Future Roadmap

- [ ] Layerline generation algorithm
- [ ] Object intersection detection
- [ ] Dynamic layerline updates
- [ ] More geometric primitives
- [ ] Import/export functionality
- [ ] Animation system
- [ ] Performance optimizations
- [ ] Mobile support
