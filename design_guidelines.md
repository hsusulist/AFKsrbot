# AFKsrbot Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from Discord's interface design and gaming dashboard aesthetics, creating a technical yet approachable monitoring interface that reflects the Minecraft gaming context.

## Core Design Elements

### Color Palette
**Dark Mode Primary** (matching Discord/gaming aesthetic):
- Background: 220 13% 9% (deep dark blue-gray)
- Surface: 220 13% 14% (elevated surfaces)
- Primary: 235 85% 65% (Discord-like blurple)
- Success: 140 65% 55% (online status green)
- Warning: 38 95% 65% (attention yellow)
- Danger: 358 75% 59% (offline/error red)
- Text: 210 40% 95% (high contrast white)
- Muted: 215 25% 65% (secondary text)

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Monospace Font**: JetBrains Mono (for logs/technical data)
- Headers: font-bold, tracking-tight
- Body: font-medium for readability in dark theme
- Code/logs: font-mono, smaller sizes

### Layout System
**Tailwind Spacing Units**: Consistent use of 2, 4, 6, 8, 12, 16
- Base padding: p-4, p-6
- Component spacing: space-y-4, gap-6
- Large sections: p-8, py-12
- Tight elements: p-2, gap-2

### Component Library

**Navigation**:
- Sidebar navigation with collapsible sections
- Active states with subtle background highlights
- Icon + text layout with proper spacing (gap-3)

**Status Cards**:
- Rounded corners (rounded-lg)
- Subtle borders with elevated shadows
- Status indicators with colored dots/badges
- Real-time updating elements with smooth transitions

**Command Interface**:
- Discord-style command input with slash command suggestions
- Message bubbles for chat logs
- Monospace formatting for technical outputs
- Timestamp formatting with muted colors

**Data Displays**:
- Real-time metrics in card layouts
- Progress bars for health/food levels
- Inventory grid layouts with item slots
- Connection status with clear online/offline states

**Control Panels**:
- Grouped action buttons with clear hierarchy
- Primary actions (Start/Stop) with prominent styling
- Secondary actions with outline variants
- Danger actions (Restart/Kill) with warning colors

### Key Design Principles
1. **Gaming Aesthetic**: Dark theme with accent colors that feel at home in gaming interfaces
2. **Real-time Focus**: Clear visual hierarchy for live data and status updates
3. **Technical Readability**: Monospace fonts for logs, clear data presentation
4. **Discord Familiarity**: Interface patterns that Discord users will recognize
5. **Status Clarity**: Immediate visual feedback for bot status, server health, and connection state

### Images
No large hero images needed. Focus on:
- Small status icons and indicators
- Minecraft-style item sprites for inventory display
- Simple server status graphics
- Discord integration badges/logos where appropriate

The interface should feel like a professional gaming dashboard - technical and functional while maintaining visual appeal through thoughtful use of color, typography, and spacing.