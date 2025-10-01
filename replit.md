# AFKSRBot Dashboard

## Overview

The AFKSRBot Dashboard is a React-based web application designed to manage and control a Discord bot that operates on Minecraft servers. The system provides a comprehensive management interface for monitoring bot status, controlling Discord and Minecraft server connections, viewing logs, managing inventory, and configuring various bot settings. The dashboard serves as a central control panel for administrators to oversee an automated bot that performs anti-AFK behaviors, player interactions, and server monitoring functions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Components**: Shadcn/ui component library built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom Discord-inspired dark theme and gaming aesthetics
- **State Management**: React hooks for local state, TanStack Query for server state management
- **Routing**: React Router for client-side navigation with dedicated pages for each dashboard section

### Component Structure
- **Layout System**: Centralized layout component with persistent sidebar navigation
- **Page-Based Architecture**: Modular pages for Dashboard, Discord Bot control, Server Config, Inventory, Logs, Console, and Settings
- **Reusable Components**: StatCard for metrics display, custom UI components extending Shadcn/ui base
- **Theme System**: Discord-inspired color palette with CSS custom properties for consistent theming

### Data Flow
- **Full-Stack Integration**: Complete frontend-backend integration with Express.js server
- **Real API Endpoints**: Live API endpoints for Discord bot and Minecraft server management
- **In-Memory Storage**: MemStorage implementation for development and testing
- **Real-time Communication**: WebSocket-ready architecture for live bot status updates
- **Form Validation**: Client-side and server-side validation using react-hook-form with Zod schemas

### Configuration Management
- **Environment Agnostic**: No environment-specific configurations currently implemented
- **Development Setup**: Configured for local development with hot module replacement
- **Production Ready**: Build configuration optimized for production deployment

### Navigation Structure
The application follows a hub-and-spoke navigation pattern with these main sections:
- Dashboard (main overview with stats and controls)
- Discord Bot (token configuration and connection management)
- Server Config (Minecraft server connection settings)
- Inventory (bot inventory viewing and management)
- Discord Logs (Discord command and interaction history)
- Minecraft Logs (server chat and event monitoring)
- Console (server command execution interface)
- Settings (application configuration)
- How to Use (user documentation)

## External Dependencies

### Core Framework Dependencies
- **React & React DOM**: Frontend framework for component-based UI development
- **TypeScript**: Static typing for enhanced development experience and code reliability
- **Vite**: Modern build tool for fast development and optimized production builds

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Radix UI**: Headless component primitives for accessible UI components (@radix-ui/react-*)
- **Shadcn/ui**: Pre-built component library extending Radix UI with consistent styling
- **Lucide React**: Icon library providing consistent iconography throughout the application
- **Class Variance Authority**: Utility for creating variant-based component APIs

### State Management and Data Fetching
- **TanStack React Query**: Server state management and caching (prepared for future backend integration)
- **React Hook Form**: Form state management and validation
- **Hookform Resolvers**: Validation resolver integration for form handling

### Routing and Navigation
- **React Router DOM**: Client-side routing for single-page application navigation

### Development and Build Tools
- **ESLint**: Code linting with TypeScript and React-specific rules
- **PostCSS**: CSS processing for Tailwind CSS integration
- **React Refresh**: Hot module replacement for development experience

### Utility Libraries
- **clsx & Tailwind Merge**: Conditional CSS class name management
- **Date-fns**: Date manipulation and formatting utilities
- **CMDK**: Command menu implementation for search and navigation
- **Embla Carousel**: Carousel component implementation

### Theme and UI Enhancement
- **Next Themes**: Theme switching capabilities for light/dark mode support
- **Sonner**: Toast notification system for user feedback
- **Input OTP**: One-time password input component
- **React Day Picker**: Date picker component for form inputs

## Recent Changes

### October 1, 2025: Discord /logs Command Improvements (Latest)
**Enhanced Discord bot logging functionality with duplicate prevention and command aliasing:**
- **Duplicate Message Fix**: Improved message filtering with robust regex patterns to eliminate duplicates between generic message handler and dedicated event handlers
  - Player chat regex: `/^<([A-Za-z0-9_]{1,16})>\s.+$/` for strict username matching (1-16 characters, vanilla Minecraft compatible)
  - Join/leave detection: `/^\w{1,16} (joined|left) the (game|server)/i` to skip events already handled by dedicated handlers
  - Generic message handler now skips both player chat AND join/leave events, forwarding only system messages to Discord
- **Command Execution Logging**: Added logging to Discord log channel when `/command` is used, showing executed commands with formatting
- **User Experience**: Added `/logs` alias for the `/log` command - both commands work identically to set Discord log channel
- **Message Formatting**: Player chat shows with bold usernames, system messages in code blocks, maintaining clear distinction
- **No Data Loss**: All message types (player chat, join/leave, system messages, command executions) properly forwarded exactly once to configured Discord log channel

### October 1, 2025: Fresh GitHub Import Setup
- Successfully completed fresh GitHub import to Replit environment
- Installed all project dependencies (786 packages) including concurrently, Express.js, Discord.js, and Mineflayer
- Resolved all TypeScript LSP diagnostics and dependency issues completely
- Configured development workflow running both frontend (Vite on port 5000) and backend (Express on port 3001) concurrently
- Frontend properly configured with 0.0.0.0 host, allowedHosts: true, HMR disabled, and proxy settings for Replit environment
- Backend Express.js server running on port 3001 in dev, port 5000 in production with CORS configured for Replit compatibility
- Verified complete application functionality with working dashboard interface showing Discord-themed UI
- Set up autoscale deployment configuration with `npm run build` and `npm start` commands
- Production server correctly configured to serve built frontend from dist/ folder
- Project is fully operational and ready for development/production deployment
- Dashboard displays correctly with statistics, navigation, and all controls functional

### September 30, 2025: Previous GitHub Import Setup
- Successfully completed fresh GitHub import to Replit environment
- Installed all project dependencies (786 packages) including concurrently, Express.js, Discord.js, and Mineflayer
- Resolved all TypeScript LSP diagnostics and dependency issues completely
- Configured development workflow running both frontend (Vite on port 5000) and backend (Express on port 3001) concurrently
- Frontend properly configured with 0.0.0.0 host, allowedHosts: true, HMR disabled, and proxy settings for Replit environment
- Backend Express.js server running on port 3001 in dev, port 5000 in production with CORS configured for Replit compatibility
- Verified complete application functionality with working dashboard interface showing Discord-themed UI
- Set up autoscale deployment configuration with `npm run build` and `npm start` commands
- Production server correctly configured to serve built frontend from dist/ folder
- Project is fully operational and ready for development/production deployment
- Dashboard displays correctly with statistics, navigation, and all controls functional

### September 29, 2025: Previous GitHub Import Setup
- Successfully completed fresh GitHub import to Replit environment
- Installed all project dependencies (787 packages) including concurrently, Express.js, Discord.js, and Mineflayer
- Resolved all TypeScript LSP diagnostics and dependency issues completely
- Configured development workflow running both frontend (port 5000) and backend (port 3001) concurrently
- Frontend properly configured with 0.0.0.0 host, allowedHosts: true, and proxy settings for Replit environment
- Backend Express.js server running on port 3001 with CORS configured for Replit compatibility
- Verified complete application functionality with working dashboard interface showing Discord-themed UI
- Comprehensive API testing confirmed all endpoints working correctly (/api/status endpoint verified)
- Set up deployment configuration for autoscale production deployment with proper build and start commands
- Project is fully operational and ready for development/production deployment
- Dashboard displays correctly with statistics, navigation, and controls all functional

### September 28, 2025: Previous GitHub Import Setup
- Successfully completed fresh GitHub import to Replit environment
- Installed all project dependencies (707 packages) including concurrently, Express.js, Discord.js, and Mineflayer
- Resolved TypeScript LSP diagnostics and dependency issues
- Configured development workflow running both frontend (port 5000) and backend (port 3001) concurrently
- Frontend properly configured with 0.0.0.0 host, allowedHosts: true, and proxy settings for Replit environment
- Backend Express.js server running on port 3001 with CORS configured for Replit compatibility
- Verified complete application functionality with working dashboard interface showing Discord-themed UI
- Set up deployment configuration for autoscale production deployment with proper build and start commands
- Project is fully operational and ready for development/production deployment

### September 27, 2025: Replit Environment Setup and Bug Fixes
- Successfully imported GitHub repository to Replit environment
- Installed all required dependencies including concurrently, Express.js, Discord.js, and Mineflayer
- Configured full-stack development with concurrent frontend/backend execution
- Frontend runs on port 5000 (Replit standard) with proper host configuration (0.0.0.0)
- Backend runs on port 3001 with CORS configured for Replit environment
- Deployment configuration set for autoscale production deployment
- Verified complete application functionality with screenshot testing

**Critical Bug Fixes Implemented:**
- **Discord Token Persistence**: Fixed DiscordBot.tsx to use backend APIs instead of local state
- **Token Reconnection**: Added ability to reconnect with stored tokens without re-entering
- **Settings Persistence**: Implemented PATCH endpoint for autoStart/logCommands persistence  
- **Connection Logic**: Fixed Discord bot connection to use real Discord.js integration
- **Console & Logs**: Verified all endpoints working correctly for command execution and log viewing
- **UI Improvements**: Added proper loading states, disabled controls, and better user feedback
- **Security**: Ensured tokens are never exposed in API responses while maintaining functionality

### Backend Integration Features
- **Discord Bot Management**: Complete Discord.js integration with slash commands
- **Minecraft Bot Control**: Mineflayer integration for AFK bot behaviors
- **API Endpoints**: RESTful API for all bot management operations
- **Real-time Updates**: Status monitoring and live activity feeds
- **Security**: Token validation and sensitive data protection