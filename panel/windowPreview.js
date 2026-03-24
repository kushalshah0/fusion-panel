import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const WindowThumbnail = GObject.registerClass(
class WindowThumbnail extends St.Button {
    _init(metaWindow, previewWidth, previewHeight) {
        super._init({
            style_class: 'fusion-preview-thumbnail',
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        this._metaWindow = metaWindow;

        let box = new St.BoxLayout({
            vertical: true,
            style_class: 'fusion-preview-thumb-box',
        });

        // Window clone (actual thumbnail)
        let windowActor = metaWindow.get_compositor_private();

        if (windowActor) {
            let clone = new Clutter.Clone({
                source: windowActor,
            });

            // Scale to fit preview size
            let [winWidth, winHeight] = windowActor.get_size();
            let scale = Math.min(
                previewWidth / winWidth,
                previewHeight / winHeight,
                1.0
            );

            clone.set_size(winWidth * scale, winHeight * scale);

            let cloneContainer = new St.Widget({
                style_class: 'fusion-preview-clone-container',
                width: previewWidth,
                height: previewHeight,
                x_align: Clutter.ActorAlign.CENTER,
            });

            // Center the clone
            clone.set_position(
                (previewWidth - winWidth * scale) / 2,
                (previewHeight - winHeight * scale) / 2
            );

            cloneContainer.add_child(clone);
            box.add_child(cloneContainer);
        }

        // Window title
        let titleBar = new St.BoxLayout({
            style_class: 'fusion-preview-title-bar',
            x_expand: true,
        });

        let title = new St.Label({
            style_class: 'fusion-preview-title',
            text: metaWindow.get_title() || 'Untitled',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        title.clutter_text.set_ellipsize(3);  // PANGO_ELLIPSIZE_END

        // Close button
        let closeButton = new St.Button({
            style_class: 'fusion-preview-close',
            child: new St.Icon({
                icon_name: 'window-close-symbolic',
                icon_size: 14,
            }),
        });

        closeButton.connect('clicked', () => {
            metaWindow.delete(global.get_current_time());
        });

        titleBar.add_child(title);
        titleBar.add_child(closeButton);
        box.add_child(titleBar);

        this.set_child(box);

        // Click to activate window
        this.connect('clicked', () => {
            Main.activateWindow(metaWindow);
        });
    }

    getWindow() {
        return this._metaWindow;
    }
});


export class WindowPreviewManager {
    constructor(settings, animator) {
        this._settings = settings;
        this._animator = animator;
        this._previewPopup = null;
        this._showTimer = null;
        this._hideTimer = null;
        this._currentApp = null;
    }

    // Called when hovering over an app icon
    showPreview(app, sourceActor) {
        if (!this._settings.get('show-window-previews')) return;

        let windows = app.get_windows();
        if (windows.length === 0) return;

        // Delay before showing
        let delay = this._settings.get('preview-delay');

        this._cancelTimers();

        this._showTimer = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            delay,
            () => {
                this._showTimer = null;
                this._createPreview(app, windows, sourceActor);
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    _createPreview(app, windows, sourceActor) {
        this.hidePreview();

        let previewWidth = this._settings.get('preview-width');
        let previewHeight = this._settings.get('preview-height');
        let panelPosition = this._settings.get('panel-position');

        // Create popup container
        this._previewPopup = new St.BoxLayout({
            style_class: 'fusion-preview-popup',
            vertical: false,
            reactive: true,
            track_hover: true,
        });

        // Add thumbnails for each window
        windows.forEach(win => {
            if (win.skip_taskbar) return;

            let thumbnail = new WindowThumbnail(win, previewWidth, previewHeight);
            this._previewPopup.add_child(thumbnail);
        });

        // Keep preview open when hovering over it
        this._previewPopup.connect('notify::hover', () => {
            if (this._previewPopup.hover) {
                this._cancelHideTimer();
            } else {
                this._scheduleHide();
            }
        });

        Main.uiGroup.add_child(this._previewPopup);

        // Position relative to source button
        let [sourceX, sourceY] = sourceActor.get_transformed_position();
        let [sourceW, sourceH] = sourceActor.get_transformed_size();

        // Wait for popup to be allocated to get its size
        this._previewPopup.set_opacity(0);

        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            if (!this._previewPopup) return GLib.SOURCE_REMOVE;

            let popupWidth = this._previewPopup.width;
            let popupHeight = this._previewPopup.height;
            let monitor = Main.layoutManager.primaryMonitor;

            let x = sourceX + (sourceW - popupWidth) / 2;
            let y;

            if (panelPosition === 'BOTTOM') {
                y = sourceY - popupHeight - 8;
            } else {
                y = sourceY + sourceH + 8;
            }

            // Keep within screen bounds
            x = Math.max(monitor.x + 4, Math.min(x, monitor.x + monitor.width - popupWidth - 4));
            y = Math.max(monitor.y + 4, Math.min(y, monitor.y + monitor.height - popupHeight - 4));

            this._previewPopup.set_position(x, y);

            // Animate in
            if (this._animator) {
                this._animator.animatePreviewShow(this._previewPopup);
            } else {
                this._previewPopup.set_opacity(255);
            }

            return GLib.SOURCE_REMOVE;
        });

        this._currentApp = app;
    }

    // Schedule hiding the preview
    scheduleHide() {
        this._scheduleHide();
    }

    _scheduleHide() {
        this._cancelHideTimer();

        this._hideTimer = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            200,
            () => {
                this._hideTimer = null;

                // Don't hide if still hovering over preview
                if (this._previewPopup && this._previewPopup.hover)
                    return GLib.SOURCE_REMOVE;

                this.hidePreview();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    hidePreview() {
        this._cancelTimers();

        if (this._previewPopup) {
            if (this._animator) {
                this._animator.animatePreviewHide(this._previewPopup, () => {
                    this._destroyPopup();
                });
            } else {
                this._destroyPopup();
            }
        }

        this._currentApp = null;
    }

    _destroyPopup() {
        if (this._previewPopup) {
            Main.uiGroup.remove_child(this._previewPopup);
            this._previewPopup.destroy();
            this._previewPopup = null;
        }
    }

    _cancelTimers() {
        this._cancelShowTimer();
        this._cancelHideTimer();
    }

    _cancelShowTimer() {
        if (this._showTimer) {
            GLib.source_remove(this._showTimer);
            this._showTimer = null;
        }
    }

    _cancelHideTimer() {
        if (this._hideTimer) {
            GLib.source_remove(this._hideTimer);
            this._hideTimer = null;
        }
    }

    destroy() {
        this._cancelTimers();
        this._destroyPopup();
        this._settings = null;
        this._animator = null;
    }
}