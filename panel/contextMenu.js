import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';

export class AppContextMenu extends PopupMenu.PopupMenu {
    constructor(sourceActor, app, settings) {
        super(sourceActor, 0.5, St.Side.BOTTOM);

        this._app = app;
        this._settings = settings;

        this._buildMenu();

        // Add to uiGroup so it renders above everything
        Main.uiGroup.add_child(this.actor);
        this.actor.hide();
    }

    _buildMenu() {
        let app = this._app;
        let appInfo = app.get_app_info();
        let isFavorite = AppFavorites.getAppFavorites()
            .getFavorites()
            .some(fav => fav.get_id() === app.get_id());
        let windows = app.get_windows();
        let isRunning = windows.length > 0;

        // ---- App Name (header) ----
        let headerItem = new PopupMenu.PopupMenuItem(app.get_name(), {
            reactive: false,
            style_class: 'fusion-context-header',
        });
        this.addMenuItem(headerItem);

        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // ---- New Window ----
        if (appInfo && appInfo.supports_uris() || isRunning || appInfo) {
            let newWindowItem = new PopupMenu.PopupMenuItem('New Window');
            newWindowItem.connect('activate', () => {
                app.open_new_window(-1);
            });
            this.addMenuItem(newWindowItem);
        }

        // ---- App Actions (custom desktop actions) ----
        if (appInfo) {
            let actions = appInfo.list_actions();
            if (actions.length > 0) {
                this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

                actions.forEach(action => {
                    let actionName = appInfo.get_action_name(action);
                    let actionItem = new PopupMenu.PopupMenuItem(actionName);
                    actionItem.connect('activate', () => {
                        appInfo.launch_action(action, null);
                    });
                    this.addMenuItem(actionItem);
                });
            }
        }

        this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // ---- Pin / Unpin ----
        if (isFavorite) {
            let unpinItem = new PopupMenu.PopupMenuItem('Unpin from Panel');
            unpinItem.connect('activate', () => {
                AppFavorites.getAppFavorites().removeFavorite(app.get_id());
            });
            this.addMenuItem(unpinItem);
        } else {
            let pinItem = new PopupMenu.PopupMenuItem('Pin to Panel');
            pinItem.connect('activate', () => {
                AppFavorites.getAppFavorites().addFavorite(app.get_id());
            });
            this.addMenuItem(pinItem);
        }

        // ---- Window Management ----
        if (isRunning) {
            this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Show All Windows
            if (windows.length > 1) {
                let showAllItem = new PopupMenu.PopupMenuItem(
                    `Show All Windows (${windows.length})`
                );
                showAllItem.connect('activate', () => {
                    windows.forEach(win => {
                        Main.activateWindow(win);
                    });
                });
                this.addMenuItem(showAllItem);
            }

            // Minimize All
            let minimizeAllItem = new PopupMenu.PopupMenuItem('Minimize All Windows');
            minimizeAllItem.connect('activate', () => {
                windows.forEach(win => win.minimize());
            });
            this.addMenuItem(minimizeAllItem);

            // Move to Workspace submenu
            let nWorkspaces = global.workspace_manager.get_n_workspaces();
            if (nWorkspaces > 1) {
                let moveMenu = new PopupMenu.PopupSubMenuMenuItem('Move to Workspace');

                for (let i = 0; i < nWorkspaces; i++) {
                    let wsItem = new PopupMenu.PopupMenuItem(`Workspace ${i + 1}`);
                    let wsIndex = i;
                    wsItem.connect('activate', () => {
                        windows.forEach(win => {
                            win.change_workspace_by_index(wsIndex, false);
                        });
                    });
                    moveMenu.menu.addMenuItem(wsItem);
                }

                this.addMenuItem(moveMenu);
            }

            this.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Close All / Quit
            let closeItem = new PopupMenu.PopupMenuItem('Quit');
            closeItem.connect('activate', () => {
                app.request_quit();
            });
            closeItem.add_style_class_name('fusion-context-quit');
            this.addMenuItem(closeItem);
        }
    }

    showAt(x, y) {
        this.open();

        // Position the menu
        let monitor = Main.layoutManager.primaryMonitor;
        let menuWidth = this.actor.width;
        let menuHeight = this.actor.height;

        // Keep within screen bounds
        if (x + menuWidth > monitor.x + monitor.width)
            x = monitor.x + monitor.width - menuWidth;
        if (y + menuHeight > monitor.y + monitor.height)
            y = y - menuHeight;

        this.actor.set_position(x, y);
    }

    destroy() {
        Main.uiGroup.remove_child(this.actor);
        super.destroy();
    }
}