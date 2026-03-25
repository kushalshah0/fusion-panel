import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class AutoHideManager {
    constructor(panelActor, blurActor, settings, animator) {
        this._panelActor = panelActor;
        this._blurActor = blurActor;
        this._settings = settings;
        this._animator = animator;

        this._isHidden = false;
        this._hideTimer = null;
        this._barrier = null;
        this._pressureBarrier = null;

        this._signals = [];
    }

    enable() {
        if (!this._settings.get('auto-hide')) return;

        // Hide after initial delay
        this._scheduleHide();

        // Show on panel hover
        this._signals.push({
            source: this._panelActor,
            id: this._panelActor.connect('notify::hover', () => {
                if (this._panelActor.hover) {
                    this._cancelHideTimer();
                    this._showPanel();
                } else {
                    this._scheduleHide();
                }
            }),
        });

        // Show when overview opens
        if (this._settings.get('show-panel-on-overview')) {
            this._signals.push({
                source: Main.overview,
                id: Main.overview.connect('showing', () => {
                    this._cancelHideTimer();
                    this._showPanel();
                }),
            });

            this._signals.push({
                source: Main.overview,
                id: Main.overview.connect('hiding', () => {
                    this._scheduleHide();
                }),
            });
        }

        // Show on fullscreen changes
        this._signals.push({
            source: global.display,
            id: global.display.connect('in-fullscreen-changed', () => {
                if (global.display.get_monitor_in_fullscreen(
                    Main.layoutManager.primaryIndex
                )) {
                    this._hidePanel();
                }
            }),
        });

        // Setup pressure barrier (hot edge to reveal panel)
        this._setupPressureBarrier();

        // Listen for settings changes
        this._signals.push({
            source: null,
            id: this._settings.connect('auto-hide', () => {
                if (this._settings.get('auto-hide')) {
                    this._scheduleHide();
                    this._setupPressureBarrier();
                } else {
                    this._showPanel();
                    this._destroyPressureBarrier();
                }
            }),
        });
    }

    _setupPressureBarrier() {
        this._destroyPressureBarrier();

        let threshold = this._settings.get('pressure-threshold');
        let monitor = Main.layoutManager.primaryMonitor;
        let panelPosition = this._settings.get('panel-position');

        this._pressureBarrier = new Meta.PressureBarrier(
            threshold,
            1000,                               // timeout (ms)
            Shell?.ActionMode?.NORMAL           // action mode
        );

        this._pressureBarrier.connect('trigger', () => {
            this._cancelHideTimer();
            this._showPanel();
            this._scheduleHide();
        });

        // Create barrier at panel edge
        let barrierY;
        let directions;

        if (panelPosition === 'BOTTOM') {
            barrierY = monitor.y + monitor.height;
            directions = Meta.BarrierDirection.NEGATIVE_Y;
        } else {
            barrierY = monitor.y;
            directions = Meta.BarrierDirection.POSITIVE_Y;
        }

        try {
            this._barrier = new Meta.Barrier({
                display: global.display,
                x1: monitor.x,
                x2: monitor.x + monitor.width,
                y1: barrierY,
                y2: barrierY,
                directions: directions,
            });

            this._pressureBarrier.addBarrier(this._barrier);
        } catch (e) {
            log(`[Fusion Panel] Barrier creation failed: ${e.message}`);
        }
    }

    _showPanel() {
        this._isHidden = false;
        let panelPosition = this._settings.get('panel-position');

        this._panelActor.show();
        if (this._blurActor) this._blurActor.show();

        if (this._animator) {
            this._animator.animateShow(this._panelActor, panelPosition);
            if (this._blurActor)
                this._animator.animateShow(this._blurActor, panelPosition);
        }

        Main.layoutManager._updateHotCorners();
    }

    _hidePanel() {
        this._isHidden = true;
        let panelPosition = this._settings.get('panel-position');

        if (this._animator) {
            this._animator.animateHide(this._panelActor, panelPosition, () => {
                this._panelActor.hide();
            });
            if (this._blurActor)
                this._animator.animateHide(this._blurActor, panelPosition, () => {
                    this._blurActor.hide();
                });
        } else {
            this._panelActor.hide();
            if (this._blurActor) this._blurActor.hide();
        }
    }

    _scheduleHide() {
        this._cancelHideTimer();

        if (!this._settings.get('auto-hide')) return;

        let delay = this._settings.get('auto-hide-delay');

        this._hideTimer = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            delay,
            () => {
                this._hideTimer = null;

                // Don't hide if hovering
                if (this._panelActor.hover) return GLib.SOURCE_REMOVE;

                // Don't hide if overview is open
                if (Main.overview.visible &&
                    this._settings.get('show-panel-on-overview'))
                    return GLib.SOURCE_REMOVE;

                this._hidePanel();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    _cancelHideTimer() {
        if (this._hideTimer) {
            GLib.source_remove(this._hideTimer);
            this._hideTimer = null;
        }
    }

    _destroyPressureBarrier() {
        if (this._pressureBarrier) {
            if (this._barrier) {
                this._pressureBarrier.removeBarrier(this._barrier);
                this._barrier.destroy();
                this._barrier = null;
            }
            this._pressureBarrier.destroy();
            this._pressureBarrier = null;
        }
    }

    get isHidden() {
        return this._isHidden;
    }

    disable() {
        this._cancelHideTimer();
        this._destroyPressureBarrier();

        this._signals.forEach(({ source, id }) => {
            try {
                if (source)
                    source.disconnect(id);
                else
                    this._settings.disconnect(id);
            } catch (e) { }
        });
        this._signals = [];

        // Make sure panel is visible
        this._panelActor?.show();
        this._blurActor?.show();

        this._isHidden = false;
    }
}