# Fusion Panel

A modern, customizable top panel replacement for GNOME Shell with a floating taskbar design, blur effects, and system indicators.

## Overview

Fusion Panel replaces the default GNOME top panel with a minimal, floating-style panel that provides:

- Customizable position (top or bottom of screen)
- Floating panel effect with adjustable margin
- Built-in blur effect behind the panel
- App taskbar with favorite and running app indicators
- Workspace indicator dots
- Clock widget with customizable format
- System tray integration (network, volume, power, etc.)

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
├── extension.js           # Main entry point, extension lifecycle
├── prefs.js               # Preferences window (GTK4/Adwaita)
├── stylesheet.css         # All styling for panel components
├── metadata.json          # Extension metadata
├── panel/
│   ├── panelManager.js    # Creates and manages the panel actor
│   ├── taskbar.js         # App icons, favorites, running apps
│   ├── clock.js           # Clock widget with format support
│   ├── workspaceIndicator.js  # Workspace dots/numbers
│   └── systemIndicators.js    # System tray reparenting
├── blur/
│   ├── blurManager.js     # Blur pipeline and positioning
│   └── blurEffect.js      # Shell.BlurEffect wrapper
├── utils/
│   └── settings.js        # GSettings helper class
└── schemas/
    └── org.gnome.shell.extensions.fusion-panel.gschema.xml
```

## Features

### Panel Customization

- **Position**: Place the panel at the top or bottom of the screen
- **Height**: Adjust panel height (24-80 pixels)
- **Margin**: Create a floating panel effect with side margins
- **Border Radius**: Round the panel corners (0-30 pixels)
- **Background Color**: Custom background color with alpha transparency

### Blur Effect

- Toggle blur on/off
- Adjust blur intensity (sigma: 0-100)
- Adjust blur brightness (0.0-1.0)
- Automatic synchronization with panel position

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

## Settings

All settings are stored in GSettings and can be configured via the Preferences window or dconf/gsettings commands.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `panel-position` | string | "BOTTOM" | Panel position: TOP or BOTTOM |
| `panel-height` | int | 48 | Panel height in pixels |
| `panel-margin` | int | 0 | Side margin for floating effect |
| `panel-border-radius` | int | 0 | Corner radius in pixels |
| `panel-bg-color` | string | "rgba(0, 0, 0, 0.3)" | Background color |
| `blur-enabled` | boolean | true | Enable blur effect |
| `blur-sigma` | int | 30 | Blur intensity |
| `blur-brightness` | double | 0.6 | Blur brightness |
| `icon-size` | int | 32 | App icon size |
| `show-favorites` | boolean | true | Show favorite apps |
| `show-running-apps` | boolean | true | Show running apps |
| `isolate-workspaces` | boolean | false | Show only current workspace apps |
| `click-action` | string | "TOGGLE" | App icon click behavior |
| `clock-position` | string | "CENTER" | Clock position |
| `clock-format` | string | "%H:%M" | Time format |
| `show-date` | boolean | true | Show date |
| `show-workspace-indicator` | boolean | true | Show workspace dots |

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

## Architecture

### Extension Lifecycle

1. **init()**: Called when extension is loaded
2. **enable()**: 
   - Initialize SettingsManager
   - Create PanelManager and enable it
   - Create BlurManager and enable it with panel actor
3. **disable()**:
   - Disable and destroy BlurManager
   - Disable and destroy PanelManager (restores original GNOME panel)
   - Clean up settings

### Panel Structure

The panel uses a three-box layout:
- **Left Box**: Workspace indicator, Taskbar
- **Center Box**: Clock (optional)
- **Right Box**: System indicators

### Signal Handling

All components listen for:
- Settings changes (via GSettings signals)
- Workspace switches
- App state changes
- Monitor changes (for multi-monitor support)

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
