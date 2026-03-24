import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class DynamicBlurManager {
    constructor(settings) {
        this._settings = settings;
        this._blurActors = [];
        this._windowClones = new Map();
        this._updateTimer = null;
    }

    enable(panelActor) {
        this._panelActor = panelActor;

        if (!this._settings.get('dynamic-blur')) return;

        this._createDynamicBlur();

        // Update when windows move/resize/change
        this._signals = [
            global.display.connect('restacked', () => this._updateClones()),
            global.display.connect('window-created', () => {
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                    this._updateClones();
                    return GLib.SOURCE_REMOVE;
                });
            }),
        ];

        // Periodic update for smooth dynamic blur
        this._updateTimer = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            100,
            () => {
                this._updateClones();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _createDynamicBlur() {
        if (!this._panelActor) return;

        let monitor = Main.layoutManager.primaryMonitor;
        let sigma = this._settings.get('blur-sigma');
        let brightness = this._settings.get('blur-brightness');

        // Container for all content behind the panel
        this._blurContainer = new Clutter.Actor({
            name: 'fusion-dynamic-blur',
            x: this._panelActor.x,
            y: this._panelActor.y,
            width: this._panelActor.width,
            height: this._panelActor.height,
            clip_to_allocation: true,
        });

        // First layer: wallpaper clone
        let backgroundGroup = Main.layoutManager._backgroundGroup;
        for (let bg of backgroundGroup) {
            if (bg.monitor === Main.layoutManager.primaryIndex) {
                this._bgClone = new Clutter.Clone({
                    source: bg,
                    x: -this._panelActor.x,
                    y: -this._panelActor.y,
                    width: monitor.width,
                    height: monitor.height,
                });
                this._blurContainer.add_child(this._bgClone);
                break;
            }
        }

        // Window clones container (rendered above wallpaper)
        this._windowClonesContainer = new Clutter.Actor({
            x: -this._panelActor.x,
            y: -this._panelActor.y,
            width: monitor.width,
            height: monitor.height,
        });
        this._blurContainer.add_child(this._windowClonesContainer);

        // Apply blur effect
        this._blurEffect = new Shell.BlurEffect({
            sigma: sigma,
            brightness: brightness,
            mode: Shell.BlurMode.ACTOR,
        });
        this._blurContainer.add_effect_with_name('dynamic-blur', this._blurEffect);

        // Insert behind panel
        let uiGroup = Main.layoutManager.uiGroup;
        let panelIndex = uiGroup.get_children().indexOf(this._panelActor);
        if (panelIndex >= 0) {
            uiGroup.insert_child_at_index(this._blurContainer, panelIndex);
        } else {
            uiGroup.add_child(this._blurContainer);
        }

        // Initial window clone update
        this._updateClones();
    }

    _updateClones() {
        if (!this._windowClonesContainer) return;

        // Remove old clones
        this._windowClonesContainer.destroy_all_children();
        this._windowClones.clear();

        // Get all visible windows on primary monitor
        let windows = global.get_window_actors().filter(actor => {
            let win = actor.get_meta_window();
            return win &&
                !win.is_hidden() &&
                !win.minimized &&
                win.get_monitor() === Main.layoutManager.primaryIndex &&
                win.get_window_type() === Meta.WindowType.NORMAL;
        });

        // Clone each window
        windows.forEach(windowActor => {
            try {
                let clone = new Clutter.Clone({
                    source: windowActor,
                });

                // Position clone at window's position
                let [x, y] = windowActor.get_position();
                clone.set_position(x, y);

                this._windowClonesContainer.add_child(clone);
                this._windowClones.set(windowActor, clone);
            } catch (e) {
                // Window might have been destroyed
            }
        });
    }

    _syncPosition() {
        if (!this._blurContainer || !this._panelActor) return;

        this._blurContainer.set_position(this._panelActor.x, this._panelActor.y);
        this._blurContainer.set_size(this._panelActor.width, this._panelActor.height);

        if (this._bgClone) {
            this._bgClone.set_position(-this._panelActor.x, -this._panelActor.y);
        }
        if (this._windowClonesContainer) {
            this._windowClonesContainer.set_position(
                -this._panelActor.x,
                -this._panelActor.y
            );
        }
    }

    disable() {
        if (this._updateTimer) {
            GLib.source_remove(this._updateTimer);
            this._updateTimer = null;
        }

        this._signals?.forEach(id => {
            try { global.display.disconnect(id); } catch (e) {}
        });
        this._signals = null;

        if (this._blurContainer) {
            this._blurContainer.remove_effect_by_name('dynamic-blur');
            this._blurContainer.destroy();
            this._blurContainer = null;
        }

        this._windowClones.clear();
        this._blurEffect = null;
        this._panelActor = null;
    }
}