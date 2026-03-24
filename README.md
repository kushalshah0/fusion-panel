# Fusion Panel

A modern, customizable panel replacement for GNOME Shell with a floating taskbar design, blur effects, window previews, drag-and-drop, and multi-monitor support.

## Overview

Fusion Panel replaces the default GNOME top panel with a minimal, floating-style panel that provides:

- Customizable position (top or bottom of screen)
- Floating panel effect with adjustable margin
- Multi-monitor support with per-monitor panels
- Built-in blur effect behind the panel
- Dynamic blur that tracks windows behind the panel
- App taskbar with favorite and running app indicators
- Drag-and-drop reordering of app icons
- Window thumbnail previews on hover
- Right-click context menus on app icons
- Notification badges on app icons
- Auto-hide functionality
- Workspace indicator dots
- Clock widget with customizable format
- System tray integration (network, volume, power, etc.)
- Smooth animations

## Requirements

- GNOME Shell 45, 46, or 47
- GLib for compiling schemas

## Installation

1. Clone or download this extension to your GNOME Shell extensions directory:
   ```
   ~/.local/share/gnome-shell/extensions/fusion-panel@kushalshah0/
   ```

2. Compile the GSettings schema:
   ```bash
   glib-compile-schemas schemas/
   ```

3. Restart GNOME Shell:
   - Press `Alt+F2`, type `r`, press Enter (X11)
   - Or log out and log back in (Wayland)

4. Enable the extension:
   - Via Extensions app
   - Or via command line: `gnome-extensions enable fusion-panel@kushalshah0`

## Project Structure

```
fusion-panel@kushalshah0/
├── extension.js                 # Main entry point, extension lifecycle
├── prefs.js                    # Preferences window (GTK4/Adwaita)
├── stylesheet.css              # All styling for panel components
├── metadata.json               # Extension metadata
├── panel/
│   ├── panelManager.js         # Panel creation, layout, multi-monitor, auto-hide
│   ├── taskbar.js             # App icons, favorites, running apps, DnD, badges
│   ├── clock.js               # Clock widget with format support
│   ├── systemIndicators.js    # System tray reparenting
│   ├── workspaceIndicator.js  # Workspace dots/numbers
│   ├── windowPreview.js       # Thumbnail previews on hover
│   ├── contextMenu.js         # Right-click menus on app icons
│   ├── appBadge.js            # Notification badges
│   ├── dragDrop.js            # Drag and drop for reordering
│   └── autoHide.js            # Auto-hide logic
├── blur/
│   ├── blurManager.js         # Static blur pipeline and positioning
│   ├── blurEffect.js          # Shell.BlurEffect wrapper
│   └── dynamicBlur.js        # Dynamic blur tracking windows behind panel
├── animations/
│   └── animator.js           # Animation effects (show/hide, transitions)
├── utils/
│   └── settings.js           # GSettings helper class
└── schemas/
    └── org.gnome.shell.extensions.fusion-panel.gschema.xml
```

## Features

### Multi-Monitor Support

- Panels on all connected monitors
- Per-monitor configuration
- Auto-creation/removal on monitor connect/disconnect
- Primary monitor indicator

### Panel Customization

- **Position**: Place the panel at the top or bottom of the screen
- **Height**: Adjust panel height (24-80 pixels)
- **Margin**: Create a floating panel effect with side margins
- **Border Radius**: Round the panel corners (0-30 pixels)
- **Background Color**: Custom background color with alpha transparency
- **Auto-Hide**: Automatically hide panel when windows overlap

### Blur Effects

- **Static Blur**: Blur the wallpaper behind the panel
  - Toggle blur on/off
  - Adjust blur intensity (sigma: 0-100)
  - Adjust blur brightness (0.0-1.0)
  - Automatic synchronization with panel position

- **Dynamic Blur**: Track and blur windows behind the panel
  - Real-time window tracking
  - Works with fullscreen windows
  - Performance optimized with timer-based updates

### Taskbar

- Display favorite apps (pinned in GNOME)
- Show running applications
- Running indicator dots (white for running, blue for focused)
- Three click actions:
  - **TOGGLE**: Focus window or minimize if focused
  - **CYCLE**: Cycle through windows
  - **LAUNCH**: Always launch new window
- Icon size adjustment (16-64 pixels)
- Workspace isolation option
- **Drag and Drop**: Reorder app icons by dragging
- **Window Previews**: Thumbnail previews on hover
- **Context Menu**: Right-click for app options
- **Notification Badges**: Show unread counts

### Clock

- Configurable position (LEFT, CENTER, RIGHT)
- Custom time format (strftime format)
- Optional date display

### Workspace Indicator

- Visual dots showing workspace count
- Active workspace highlighted in blue
- Click to switch workspaces

### System Indicators

- Network, Bluetooth, Volume, Power indicators
- Quick Settings menu (GNOME 45+)
- Aggregate menu (GNOME 44 and below)

### Animations

- Smooth show/hide transitions
- Panel visibility animations
- Icon transitions on state change

## Settings

All settings are stored in GSettings and can be configured via the Preferences window or dconf/gsettings commands.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `panel-position` | string | "BOTTOM" | Panel position: TOP or BOTTOM |
| `panel-height` | int | 48 | Panel height in pixels |
| `panel-margin` | int | 0 | Side margin for floating effect |
| `panel-border-radius` | int | 0 | Corner radius in pixels |
| `panel-bg-color` | string | "rgba(0, 0, 0, 0.3)" | Background color |
| `blur-enabled` | boolean | true | Enable static blur |
| `blur-sigma` | int | 30 | Blur intensity |
| `blur-brightness` | double | 0.6 | Blur brightness |
| `dynamic-blur` | boolean | false | Enable dynamic blur |
| `multi-monitor` | boolean | true | Show panel on all monitors |
| `auto-hide` | boolean | false | Auto-hide panel |
| `auto-hide-timeout` | int | 300 | Delay before hiding (ms) |
| `show-on-all-workspaces` | boolean | false | Show panel on all workspaces |
| `icon-size` | int | 32 | App icon size |
| `show-favorites` | boolean | true | Show favorite apps |
| `show-running-apps` | boolean | true | Show running apps |
| `isolate-workspaces` | boolean | false | Show only current workspace apps |
| `click-action` | string | "TOGGLE" | App icon click behavior |
| `show-window-previews` | boolean | true | Show window thumbnails |
| `preview-delay` | int | 300 | Delay before showing preview (ms) |
| `enable-drag-drop` | boolean | true | Enable drag and drop |
| `enable-badges` | boolean | true | Show notification badges |
| `clock-position` | string | "CENTER" | Clock position |
| `clock-format` | string | "%H:%M" | Time format |
| `show-date` | boolean | true | Show date |
| `show-workspace-indicator` | boolean | true | Show workspace dots |

## Architecture

### Extension Lifecycle

1. **init()**: Called when extension is loaded
2. **enable()**: 
   - Initialize SettingsManager
   - Create Animator for animations
   - Create WindowPreviewManager and BadgeManager
   - Create PanelManager and enable it (creates per-monitor panels)
   - Create BlurManager and DynamicBlurManager
3. **disable()**:
   - Disable and destroy BlurManager
   - Disable and destroy DynamicBlurManager
   - Disable and destroy PanelManager (restores original GNOME panel)
   - Clean up settings

### Panel Structure

The panel uses a three-box layout:
- **Left Box**: Workspace indicator, Taskbar
- **Center Box**: Clock (optional)
- **Right Box**: System indicators

### Multi-Monitor Architecture

- `PanelInstance` class manages individual monitor panels
- `PanelManager` creates and coordinates multiple instances
- Each monitor gets its own panel with independent positioning
- Settings changes propagate to all instances

### Signal Handling

All components listen for:
- Settings changes (via GSettings signals)
- Workspace switches
- App state changes
- Monitor changes (for multi-monitor support)
- Window focus changes
- Drag and drop events

## Development

### Building

No build step required. This is a pure JavaScript extension.

### Compiling Schemas

After modifying the schema file, recompile:
```bash
glib-compile-schemas schemas/
```

### Debugging

View extension logs:
```bash
journalctl -f -o cat | grep "Fusion Panel"
```

Enable debugging in extension.js by adding more log statements.

## Compatibility

- Tested on GNOME Shell 45, 46, 47
- Should work on 44+ with minor modifications to systemIndicators.js
- Wayland and X11 compatible

## License

MIT License

## Author

Kushal Shah

## Contributing

Contributions are welcome. Please submit pull requests or open issues on the GitHub repository.
