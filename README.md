# 🎮 Retro Game Hub

An AI-enhanced classic games platform with authentic retro aesthetics, featuring intelligent assistants for Snake, Tetris, and Minesweeper.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🎯 Classic Games
- **Snake** - Grid-based snake with AI pathfinding assistance
- **Tetris** - Falling blocks with AI piece placement advisor
- **Minesweeper** - Mine detection with AI constraint satisfaction hints

### 🤖 AI Assistants
- **Intelligent Hints** - Context-aware suggestions for optimal gameplay
- **Difficulty Levels** - Adjustable AI assistance from beginner to expert
- **Educational Mode** - Detailed explanations of AI decision-making
- **Debug Mode** - Transparent AI reasoning and confidence indicators

### 🎨 Retro Aesthetics
- **Win95 Theme** - Authentic Windows 95 styling with beveled borders
- **CRT Effects** - Optional scanlines and phosphor glow
- **Pixel-Perfect Rendering** - Crisp retro graphics
- **Retro Audio** - Classic sound effects and feedback

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd retro-game-hub

# Install dependencies
npm install

# Start development server
npm run dev -- --port 5174
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🎮 How to Play

### Navigation
- **Arrow Keys** - Navigate menu and games
- **Enter/Space** - Select options and confirm actions
- **ESC** - Pause/resume games or return to menu

### Game Controls

#### Snake
- **Arrow Keys** - Change direction
- **H** - Toggle AI pathfinding hints
- **P** - Pause/resume

#### Tetris  
- **Arrow Keys** - Move pieces left/right/down
- **Up Arrow** - Rotate piece
- **Space** - Hard drop
- **H** - Toggle AI piece advisor
- **P** - Pause/resume

#### Minesweeper
- **Left Click** - Reveal cell
- **F + Click** - Flag suspected mines
- **H** - Toggle AI hints (shows safe cells)
- **E** - Toggle detailed AI explanations
- **D** - Debug mode (show mine positions)
- **T** - Create test scenario
- **R** - Reset game

## 🤖 AI Features

### Minesweeper AI
- **Constraint Satisfaction** - Logical deduction from revealed numbers
- **Probability Analysis** - Risk assessment for uncertain moves
- **Visual Indicators** - Green pulsing borders around safe cells
- **Confidence Scoring** - Percentage confidence in suggestions

### Snake AI
- **Pathfinding** - A* algorithm for optimal food collection
- **Collision Avoidance** - Smart navigation around obstacles
- **Tail Management** - Strategic planning for growing snake

### Tetris AI
- **Piece Placement** - Optimal positioning analysis
- **Line Clearing** - Strategic setup for Tetris combinations
- **Board Evaluation** - Height and hole minimization

## 🛠️ Development

### Project Structure
```
src/
├── games/           # Individual game implementations
│   ├── snake/
│   ├── tetris/
│   └── minesweeper/
├── ai/              # AI assistants for each game
│   ├── snake/
│   ├── tetris/
│   └── minesweeper/
├── shared/          # Common utilities and interfaces
│   ├── interfaces/  # TypeScript interfaces
│   ├── types/       # Type definitions
│   ├── ui/          # UI components and theming
│   ├── audio/       # Audio system
│   └── rendering/   # Canvas rendering utilities
└── index.ts         # Main entry point
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production

# Testing
npm test             # Run all tests once
npm run test:watch   # Run tests in watch mode

# Type Checking
npx tsc --noEmit     # Check TypeScript types
```

### Testing

The project uses **Vitest** for testing with comprehensive coverage:

- **Unit Tests** - Individual component testing
- **Integration Tests** - Cross-system functionality
- **Property-Based Tests** - AI correctness validation using fast-check
- **Game Logic Tests** - Core mechanics verification

```bash
# Run specific test suites
npm test -- src/games/minesweeper
npm test -- src/ai/snake
npm test -- src/shared/GameHubController
```

## 🎨 Customization

### Themes
The project supports multiple retro themes:
- **Win95** - Classic Windows 95 styling (default)
- **Arcade** - Bright neon colors
- **DOS** - Green monochrome terminal

### AI Configuration
AI assistants can be configured via the `AIConfig` system:
- **Difficulty Level** - 0 (easy) to 1 (hard)
- **Debug Mode** - Show AI decision processes
- **Educational Mode** - Detailed explanations
- **Confidence Display** - Show AI certainty levels

## 🏗️ Architecture

### Core Systems
- **GameHubController** - Main application controller
- **StateManager** - Game state persistence
- **RetroAudio** - Sound system with retro effects
- **CanvasRenderer** - Hardware-accelerated rendering
- **WindowFrame** - Win95-style UI components

### AI System
- **Modular Design** - Each game has its own AI assistant
- **Configurable Difficulty** - Adaptive assistance levels
- **Transparent Reasoning** - Explainable AI decisions
- **Performance Optimized** - Real-time analysis without lag

## 🧪 Testing Strategy

### Property-Based Testing
Critical game logic is validated using property-based tests:
- **Minesweeper** - Constraint satisfaction correctness
- **Snake** - Pathfinding optimality
- **Tetris** - Piece placement validity

### AI Validation
- **Determinism Tests** - Consistent AI behavior
- **Performance Tests** - Real-time response requirements
- **Correctness Tests** - Logical reasoning validation

## 📦 Dependencies

### Runtime
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server

### Development
- **Vitest** - Fast unit testing framework
- **fast-check** - Property-based testing
- **Canvas** - Server-side canvas for testing
- **JSDOM** - DOM simulation for tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Maintain retro aesthetic consistency
- Document AI algorithms and decisions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] Additional classic games (Pac-Man, Space Invaders)
- [ ] Multiplayer support
- [ ] Advanced AI training modes
- [ ] Custom theme editor
- [ ] Mobile responsive design
- [ ] Achievement system
- [ ] Leaderboards and statistics

## 🙏 Acknowledgments

- Inspired by classic arcade and PC games
- AI algorithms based on established game theory
- Retro aesthetics faithful to 1990s computing
- Built with modern web technologies for performance

---

**Enjoy playing these AI-enhanced retro games! 🎮✨**