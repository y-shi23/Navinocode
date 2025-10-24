# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Navinocode** is a modern single-page web application built with React 18 and Vite. It serves as a customizable start page/navigator with an Apple-inspired design featuring glass morphism effects, search functionality, and productivity widgets.

## Development Commands

```bash
# Environment Setup
nvm install 18
nvm use 18
npm install

# Development
npm run dev          # Start development server on port 8080

# Building
npm run build        # Production build
npm run build:dev    # Development build

# Quality
npm run lint         # ESLint with React rules

# Preview
npm run preview      # Preview production build
```

## Architecture Overview

### Technology Stack
- **Frontend**: React 18 with functional components and hooks
- **Build Tool**: Vite 5.4.11 for fast development and optimized builds
- **Styling**: Tailwind CSS with custom Apple-inspired design system
- **UI Components**: Radix UI primitives with shadcn/ui components
- **State Management**: React hooks with localStorage persistence
- **Routing**: React Router DOM with hash-based routing
- **Animations**: Framer Motion for smooth transitions
- **Backend**: Supabase integration for data persistence

### Key Directories Structure
```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui base components
│   ├── AppIcon.jsx      # App icon component with auto-fetching
│   ├── AppSelector.jsx  # App selector dialog
│   ├── DraggableBottomBar.jsx  # Main app launcher
│   ├── DraggableWidget.jsx     # Widget positioning system
│   ├── PomodoroTimer.jsx      # Timer widget
│   ├── GitHubUsageHeatmap.jsx # Usage analytics
│   └── TodoWidget.jsx         # Todo list
├── lib/                 # Utility functions
├── integrations/        # External service integrations (Supabase)
└── pages/               # Page components
```

## Core Features

### 1. Search System
- Multi-engine search (Google, Bing, Baidu, DuckDuckGo)
- URL validation and direct navigation
- Smart placeholder with "hitokoto" (Japanese sayings)
- Spacebar quick focus

### 2. App Launcher
- Draggable bottom bar with app icons (up to 8 apps)
- Context menu for editing apps
- Automatic icon fetching from websites
- Drag and drop reordering

### 3. Background System
- Custom background upload (drag & drop)
- Remote background URL support
- Dynamic brightness and blur controls
- Random background fallback via Unsplash API

### 4. Productivity Widgets
- **Pomodoro Timer**: Configurable timer with persistent settings
- **Usage Heatmap**: GitHub-style visualization of user activity
- **Todo Widget**: Local storage-based task management

### 5. Settings Panel
- Component toggles
- Search engine selection
- Background customization
- System information with GitHub star counter

## Development Patterns

### Custom Design System
The app uses Apple-inspired CSS classes:
- `.apple-glass`: Glass morphism effect
- `.apple-button`: Apple-style buttons
- `.apple-input`: Apple-style inputs
- `.apple-card`: Apple-style cards
- `.apple-popover`: Apple-style popovers

### State Management
- All user settings persist in localStorage
- React hooks for component state
- React Query for API calls and caching
- Settings structure: `localStorage.getItem('navinocode-settings')`

### Component Architecture
- Functional components with hooks
- Feature-based component organization
- Consistent error handling for localStorage operations
- Accessibility support through Radix UI components

## Environment Variables

```bash
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_key  # For background images
```

## Build Configuration

- **Development Server**: Hot reload on port 8080
- **Production Build**: Optimized static assets in `build/` directory
- **ESLint**: Configured with React and React Hooks rules
- **TypeScript**: JSConfig paths configured for better navigation

## Key Implementation Details

### App Icon Auto-fetching
Apps automatically fetch icons from their websites using a fallback system that tries multiple icon formats and locations.

### Widget Positioning
Widgets use a draggable positioning system with coordinates stored in localStorage for persistence across sessions.

### Usage Tracking
The app includes a usage tracking system that generates GitHub-style heatmaps based on user interaction events.

### Background Management
Supports multiple background sources with real-time brightness and blur adjustments, including custom uploads and remote URLs.