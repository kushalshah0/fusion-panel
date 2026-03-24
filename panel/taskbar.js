import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';

// Individual app icon button
const AppIconButton = GObject.registerClass(
class AppIconButton extends St.Button {
    _init(app, settings) {
        super._init({
            style_class: 'fusion-app-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        this._app = app;
        this._settings = settings;

        let iconSize = settings.get('icon-size');

        // Container for icon + indicator
        this._box = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
        });

        // App icon
        this._icon = app.create_icon_texture(iconSize);
        this._box.add_child(this._icon);

        // Running indicator dot
        this._indicator = new St.Widget({
            style_class: 'fusion-app-indicator',
            width: 6,
            height: 6,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END,
        });
        this._box.add_child(this._indicator);

        this.set_child(this._box);

        // Update running state
        this.updateRunningState();

        // Click handler
        this.connect('clicked', this._onClick.bind(this));

        // Hover tooltip
        this._tooltip = null;
        this.connect('notify::hover', this._onHover.bind(this));
    }

    _onClick() {
        let windows = this._app.get_windows();
        let action = this._settings.get('click-action');

        if (windows.length === 0) {
            // Launch the app
            this._app.open_new_window(-1);
            return;
        }

        switch (action) {
            case 'TOGGLE':
                // If focused, minimize. Otherwise focus.
                let focusedWindow = global.display.get_focus_window();
                if (focusedWindow && windows.includes(focusedWindow)) {
                    focusedWindow.minimize();
                } else {
                    Main.activateWindow(windows[0]);
                }
                break;

            case 'CYCLE':
                // Cycle through windows
                let focused = global.display.get_focus_window();
                let currentIdx = windows.indexOf(focused);
                let nextIdx = (currentIdx + 1) % windows.length;
                Main.activateWindow(windows[nextIdx]);
                break;

            case 'LAUNCH':
                this._app.open_new_window(-1);
                break;

            default:
                Main.activateWindow(windows[0]);
        }
    }

    _onHover() {
        if (this.hover) {
            this._showTooltip();
        } else {
            this._hideTooltip();
        }
    }

    _showTooltip() {
        if (this._tooltip) return;

        this._tooltip = new St.Label({
            style_class: 'fusion-tooltip',
            text: this._app.get_name(),
        });

        Main.uiGroup.add_child(this._tooltip);

        // Position above the button
        let [x, y] = this.get_transformed_position();
        let [w, h] = this.get_transformed_size();

        this._tooltip.set_position(
            x + (w - this._tooltip.width) / 2,
            y - this._tooltip.height - 8
        );
    }

    _hideTooltip() {
        if (this._tooltip) {
            this._tooltip.destroy();
            this._tooltip = null;
        }
    }

    updateRunningState() {
        let windows = this._app.get_windows();
        let isRunning = windows.length > 0;
        let isFocused = false;

        if (isRunning) {
            let focusedWindow = global.display.get_focus_window();
            isFocused = focusedWindow && windows.includes(focusedWindow);
        }

        if (isRunning) {
            this._indicator.show();
            this.add_style_class_name('running');
        } else {
            this._indicator.hide();
            this.remove_style_class_name('running');
        }

        if (isFocused) {
            this.add_style_class_name('focused');
        } else {
            this.remove_style_class_name('focused');
        }
    }

    getApp() {
        return this._app;
    }

    destroy() {
        this._hideTooltip();
        super.destroy();
    }
});


// Main Taskbar
export class Taskbar {
    constructor(settings) {
        this._settings = settings;
        this._appButtons = new Map();  // appId -> AppIconButton

        this.actor = new St.BoxLayout({
            style_class: 'fusion-taskbar',
            y_align: Clutter.ActorAlign.CENTER,
        });

        // Build initial state
        this._refresh();

        // Connect signals
        this._signals = [];

        // Favorites changed
        this._signals.push({
            source: AppFavorites.getAppFavorites(),
            id: AppFavorites.getAppFavorites().connect(
                'changed', this._refresh.bind(this)
            ),
        });

        // App state changed (opened/closed)
        this._signals.push({
            source: Shell.AppSystem.get_default(),
            id: Shell.AppSystem.get_default().connect(
                'app-state-changed', this._onAppStateChanged.bind(this)
            ),
        });

        // Window focus changed
        this._signals.push({
            source: global.display,
            id: global.display.connect(
                'notify::focus-window', this._updateFocusState.bind(this)
            ),
        });

        // Workspace switched (for isolate workspaces)
        this._signals.push({
            source: global.workspace_manager,
            id: global.workspace_manager.connect(
                'workspace-switched', () => {
                    if (this._settings.get('isolate-workspaces'))
                        this._refresh();
                }
            ),
        });

        // Settings changes
        this._settingsSignals = [
            this._settings.connect('show-favorites', () => this._refresh()),
            this._settings.connect('show-running-apps', () => this._refresh()),
            this._settings.connect('isolate-workspaces', () => this._refresh()),
            this._settings.connect('icon-size', () => this._refresh()),
        ];
    }

    _refresh() {
        // Clear existing buttons
        this.actor.destroy_all_children();
        this._appButtons.clear();

        let showFavorites = this._settings.get('show-favorites');
        let showRunning = this._settings.get('show-running-apps');

        // Add favorites
        if (showFavorites) {
            let favorites = AppFavorites.getAppFavorites().getFavorites();
            favorites.forEach(app => {
                this._addAppButton(app);
            });
        }

        // Add running apps (that aren't already shown as favorites)
        if (showRunning) {
            let runningApps = this._getRunningApps();
            runningApps.forEach(app => {
                if (!this._appButtons.has(app.get_id())) {
                    this._addAppButton(app);
                }
            });
        }

        // Update all running states
        this._appButtons.forEach(button => button.updateRunningState());
    }

    _getRunningApps() {
        let apps = Shell.AppSystem.get_default().get_running();

        if (this._settings.get('isolate-workspaces')) {
            let activeWs = global.workspace_manager.get_active_workspace();
            apps = apps.filter(app => {
                return app.get_windows().some(
                    win => win.get_workspace() === activeWs
                );
            });
        }

        return apps;
    }

    _addAppButton(app) {
        let button = new AppIconButton(app, this._settings);
        this.actor.add_child(button);
        this._appButtons.set(app.get_id(), button);
    }

    _onAppStateChanged(appSystem, app) {
        let state = app.get_state();

        if (state === Shell.AppState.RUNNING) {
            // App started
            if (!this._appButtons.has(app.get_id()) &&
                this._settings.get('show-running-apps')) {
                this._addAppButton(app);
            }
        } else if (state === Shell.AppState.STOPPED) {
            // App closed — remove if not a favorite
            let isFavorite = AppFavorites.getAppFavorites()
                .getFavorites()
                .some(fav => fav.get_id() === app.get_id());

            if (!isFavorite) {
                let button = this._appButtons.get(app.get_id());
                if (button) {
                    button.destroy();
                    this._appButtons.delete(app.get_id());
                }
            }
        }

        // Update all button states
        this._updateAllStates();
    }

    _updateFocusState() {
        this._appButtons.forEach(button => button.updateRunningState());
    }

    _updateAllStates() {
        this._appButtons.forEach(button => button.updateRunningState());
    }

    destroy() {
        // Disconnect signals
        this._signals?.forEach(({ source, id }) => {
            try { source.disconnect(id); } catch (e) {}
        });
        this._signals = null;

        this._settingsSignals?.forEach(id => {
            try { this._settings.disconnect(id); } catch (e) {}
        });
        this._settingsSignals = null;

        this._appButtons?.forEach(button => button.destroy());
        this._appButtons?.clear();
        this._appButtons = null;

        this.actor?.destroy();
        this.actor = null;
    }
}