import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';
import { AppContextMenu } from './contextMenu.js';
import { DragDropManager } from './dragDrop.js';

// ============================================
// Individual App Icon Button
// ============================================
const AppIconButton = GObject.registerClass(
class AppIconButton extends St.Button {
    _init(app, settings, previewManager, badgeManager, animator) {
        super._init({
            style_class: 'fusion-app-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            button_mask: St.ButtonMask.ONE | St.ButtonMask.THREE,
        });

        this._app = app;
        this._settings = settings;
        this._previewManager = previewManager;
        this._badgeManager = badgeManager;
        this._animator = animator;
        this._contextMenu = null;
        this._tooltip = null;
        this._tooltipTimer = null;

        let iconSize = settings.get('icon-size');
        let iconMargin = settings.get('icon-margin');

        // Main container
        this._mainBox = new St.BoxLayout({
            vertical: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
        });

        // Icon container (for badge overlay)
        this._iconContainer = new St.Widget({
            width: iconSize + 4,
            height: iconSize + 4,
            x_align: Clutter.ActorAlign.CENTER,
        });

        // App icon
        this._icon = app.create_icon_texture(iconSize);
        this._icon.set_position(2, 2);
        this._iconContainer.add_child(this._icon);

        // Badge
        if (badgeManager && settings.get('show-app-badges')) {
            this._badgeWidget = badgeManager.createBadgeWidget(app.get_id());
            this._badgeWidget.set_position(iconSize - 6, -4);
            this._iconContainer.add_child(this._badgeWidget);
        }

        this._mainBox.add_child(this._iconContainer);

        // Running indicator
        this._indicator = new St.Widget({
            style_class: 'fusion-app-indicator',
            width: 6,
            height: 3,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this._mainBox.add_child(this._indicator);

        this.set_child(this._mainBox);

        // Set margins
        this.set_style(`margin: 0 ${iconMargin}px;`);

        // Update state
        this.updateRunningState();

        // === Event Handlers ===

        // Left click
        this.connect('clicked', this._onClick.bind(this));

        // Right click (button-press-event for right click)
        this.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 3) {  // Right click
                this._onRightClick(event);
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Hover (for preview + tooltip)
        this.connect('notify::hover', this._onHoverChanged.bind(this));

        // Scroll to cycle windows
        this.connect('scroll-event', this._onScroll.bind(this));
    }

    _onClick() {
        let windows = this._app.get_windows();
        let action = this._settings.get('click-action');

        if (windows.length === 0) {
            // Launch with bounce animation
            this._app.open_new_window(-1);
            if (this._animator) {
                this._animator.animateBounce(this);
            }
            return;
        }

        switch (action) {
            case 'TOGGLE': {
                let focusedWindow = global.display.get_focus_window();
                if (focusedWindow && windows.includes(focusedWindow)) {
                    if (windows.length > 1) {
                        // Cycle to next window
                        let idx = windows.indexOf(focusedWindow);
                        let next = (idx + 1) % windows.length;
                        Main.activateWindow(windows[next]);
                    } else {
                        focusedWindow.minimize();
                    }
                } else {
                    // Focus the most recent window
                    let recentWindow = windows.sort((a, b) =>
                        b.get_user_time() - a.get_user_time()
                    )[0];
                    Main.activateWindow(recentWindow);
                }
                break;
            }

            case 'CYCLE': {
                let focused = global.display.get_focus_window();
                let currentIdx = windows.indexOf(focused);
                let nextIdx = (currentIdx + 1) % windows.length;
                Main.activateWindow(windows[nextIdx]);
                break;
            }

            case 'PREVIEW': {
                if (this._previewManager) {
                    this._previewManager.showPreview(this._app, this);
                }
                break;
            }

            case 'LAUNCH':
                this._app.open_new_window(-1);
                if (this._animator) {
                    this._animator.animateBounce(this);
                }
                break;

            default:
                Main.activateWindow(windows[0]);
        }

        // Hide preview when clicking
        if (this._previewManager &&
            this._settings.get('click-action') !== 'PREVIEW') {
            this._previewManager.hidePreview();
        }

        // Clear badge on interaction
        if (this._badgeManager) {
            this._badgeManager.clearBadge(this._app.get_id());
        }
    }

    _onRightClick(event) {
        if (!this._settings.get('show-context-menu')) return;

        // Destroy existing menu
        if (this._contextMenu) {
            this._contextMenu.destroy();
            this._contextMenu = null;
        }

        this._contextMenu = new AppContextMenu(this, this._app, this._settings);

        let [x, y] = event.get_coords();
        this._contextMenu.showAt(x, y);
    }

    _onHoverChanged() {
        if (this.hover) {
            // Show preview after delay
            if (this._previewManager) {
                this._previewManager.showPreview(this._app, this);
            }

            // Show tooltip (if no preview or no windows)
            let windows = this._app.get_windows();
            if (windows.length === 0 ||
                !this._settings.get('show-window-previews')) {
                this._showTooltip();
            }
        } else {
            // Schedule hide preview
            if (this._previewManager) {
                this._previewManager.scheduleHide();
            }

            this._hideTooltip();
        }
    }

    _onScroll(actor, event) {
        let windows = this._app.get_windows();
        if (windows.length <= 1) return Clutter.EVENT_PROPAGATE;

        let direction = event.get_scroll_direction();
        let focused = global.display.get_focus_window();
        let currentIdx = windows.indexOf(focused);

        let nextIdx;
        if (direction === Clutter.ScrollDirection.UP ||
            direction === Clutter.ScrollDirection.LEFT) {
            nextIdx = (currentIdx - 1 + windows.length) % windows.length;
        } else if (direction === Clutter.ScrollDirection.DOWN ||
                   direction === Clutter.ScrollDirection.RIGHT) {
            nextIdx = (currentIdx + 1) % windows.length;
        } else {
            return Clutter.EVENT_PROPAGATE;
        }

        Main.activateWindow(windows[nextIdx]);
        return Clutter.EVENT_STOP;
    }

    _showTooltip() {
        this._cancelTooltipTimer();

        this._tooltipTimer = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            500,
            () => {
                this._tooltipTimer = null;

                if (!this.hover) return GLib.SOURCE_REMOVE;

                this._tooltip = new St.Label({
                    style_class: 'fusion-tooltip',
                    text: this._app.get_name(),
                });

                Main.uiGroup.add_child(this._tooltip);

                let [x, y] = this.get_transformed_position();
                let [w, h] = this.get_transformed_size();
                let panelPosition = this._settings.get('panel-position');

                let tooltipX = x + (w - this._tooltip.width) / 2;
                let tooltipY;

                if (panelPosition === 'BOTTOM') {
                    tooltipY = y - this._tooltip.height - 8;
                } else {
                    tooltipY = y + h + 8;
                }

                this._tooltip.set_position(tooltipX, tooltipY);

                return GLib.SOURCE_REMOVE;
            }
        );
    }

    _hideTooltip() {
        this._cancelTooltipTimer();

        if (this._tooltip) {
            Main.uiGroup.remove_child(this._tooltip);
            this._tooltip.destroy();
            this._tooltip = null;
        }
    }

    _cancelTooltipTimer() {
        if (this._tooltipTimer) {
            GLib.source_remove(this._tooltipTimer);
            this._tooltipTimer = null;
        }
    }

    updateRunningState() {
        let windows = this._app.get_windows();
        let isRunning = windows.length > 0;
        let isFocused = false;
        let windowCount = windows.length;

        if (isRunning) {
            let focusedWindow = global.display.get_focus_window();
            isFocused = focusedWindow && windows.includes(focusedWindow);
        }

        // Running indicator
        if (isRunning) {
            this._indicator.show();
            this.add_style_class_name('running');

            // Multiple windows — wider indicator
            if (windowCount > 1) {
                this._indicator.add_style_class_name('multi-window');
                this._indicator.width = Math.min(6 * windowCount, 24);
            } else {
                this._indicator.remove_style_class_name('multi-window');
                this._indicator.width = 6;
            }
        } else {
            this._indicator.hide();
            this.remove_style_class_name('running');
            this._indicator.remove_style_class_name('multi-window');
        }

        // Focus state
        if (isFocused) {
            this.add_style_class_name('focused');
        } else {
            this.remove_style_class_name('focused');
        }
    }

    // For drag and drop
    getDragActor() {
        let iconSize = this._settings.get('icon-size');
        return this._app.create_icon_texture(iconSize);
    }

    getDragActorSource() {
        return this._icon;
    }

    getApp() {
        return this._app;
    }

    destroy() {
        this._hideTooltip();
        this._cancelTooltipTimer();

        if (this._contextMenu) {
            this._contextMenu.destroy();
            this._contextMenu = null;
        }

        super.destroy();
    }
});


// ============================================
// Main Taskbar
// ============================================
export class Taskbar {
    constructor(settings, previewManager, badgeManager, animator) {
        this._settings = settings;
        this._previewManager = previewManager;
        this._badgeManager = badgeManager;
        this._animator = animator;
        this._appButtons = new Map();
        this._dragDropManager = null;

        this.actor = new St.BoxLayout({
            style_class: 'fusion-taskbar',
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.START,
        });

        // Build taskbar
        this._refresh();

        // Setup drag and drop
        if (this._settings.get('enable-drag-drop')) {
            this._dragDropManager = new DragDropManager(this, this._settings);
        }

        // Connect signals
        this._signals = [];

        this._signals.push({
            source: AppFavorites.getAppFavorites(),
            id: AppFavorites.getAppFavorites().connect(
                'changed', this._refresh.bind(this)
            ),
        });

        this._signals.push({
            source: Shell.AppSystem.get_default(),
            id: Shell.AppSystem.get_default().connect(
                'app-state-changed', this._onAppStateChanged.bind(this)
            ),
        });

        this._signals.push({
            source: global.display,
            id: global.display.connect(
                'notify::focus-window', this._updateFocusState.bind(this)
            ),
        });

        this._signals.push({
            source: global.workspace_manager,
            id: global.workspace_manager.connect(
                'workspace-switched', () => {
                    if (this._settings.get('isolate-workspaces'))
                        this._refresh();
                    else
                        this._updateFocusState();
                }
            ),
        });

        this._settingsSignals = [
            this._settings.connect('show-favorites', () => this._refresh()),
            this._settings.connect('show-running-apps', () => this._refresh()),
            this._settings.connect('isolate-workspaces', () => this._refresh()),
            this._settings.connect('icon-size', () => this._refresh()),
            this._settings.connect('icon-margin', () => this._refresh()),
        ];
    }

    _refresh() {
        this.actor.destroy_all_children();
        this._appButtons.clear();

        let showFavorites = this._settings.get('show-favorites');
        let showRunning = this._settings.get('show-running-apps');

        // Favorites
        if (showFavorites) {
            let favorites = AppFavorites.getAppFavorites().getFavorites();
            favorites.forEach(app => {
                this._addAppButton(app);
            });
        }

        // Running apps
        if (showRunning) {
            let runningApps = this._getRunningApps();
            runningApps.forEach(app => {
                if (!this._appButtons.has(app.get_id())) {
                    this._addAppButton(app);
                }
            });
        }

        // Update all states
        this._appButtons.forEach(btn => btn.updateRunningState());
    }

    _getRunningApps() {
        let apps = Shell.AppSystem.get_default().get_running();

        if (this._settings.get('isolate-workspaces')) {
            let activeWs = global.workspace_manager.get_active_workspace();
            apps = apps.filter(app =>
                app.get_windows().some(win => win.get_workspace() === activeWs)
            );
        }

        // Sort by most recently used
        apps.sort((a, b) => {
            let aWins = a.get_windows();
            let bWins = b.get_windows();
            let aTime = aWins.length > 0 ? aWins[0].get_user_time() : 0;
            let bTime = bWins.length > 0 ? bWins[0].get_user_time() : 0;
            return bTime - aTime;
        });

        return apps;
    }

    _addAppButton(app) {
        let button = new AppIconButton(
            app,
            this._settings,
            this._previewManager,
            this._badgeManager,
            this._animator
        );

        this.actor.add_child(button);
        this._appButtons.set(app.get_id(), button);

        // Make draggable
        if (this._dragDropManager) {
            this._dragDropManager.makeDraggable(button);
        }
    }

    _onAppStateChanged(appSystem, app) {
        let state = app.get_state();

        if (state === Shell.AppState.RUNNING) {
            if (!this._appButtons.has(app.get_id()) &&
                this._settings.get('show-running-apps')) {
                this._refresh();  // Refresh to include separator logic
            }
        } else if (state === Shell.AppState.STOPPED) {
            let isFavorite = AppFavorites.getAppFavorites()
                .getFavorites()
                .some(fav => fav.get_id() === app.get_id());

            if (!isFavorite) {
                this._refresh();  // Refresh to remove and update separator
            }
        }

        this._updateAllStates();
    }

    _updateFocusState() {
        this._appButtons.forEach(btn => btn.updateRunningState());
    }

    _updateAllStates() {
        this._appButtons.forEach(btn => btn.updateRunningState());
    }

    destroy() {
        this._signals?.forEach(({ source, id }) => {
            try { source.disconnect(id); } catch (e) {}
        });
        this._signals = null;

        this._settingsSignals?.forEach(id => {
            try { this._settings.disconnect(id); } catch (e) {}
        });
        this._settingsSignals = null;

        this._dragDropManager?.destroy();
        this._dragDropManager = null;

        this._appButtons?.forEach(btn => btn.destroy());
        this._appButtons?.clear();
        this._appButtons = null;

        this.actor?.destroy();
        this.actor = null;
    }
}