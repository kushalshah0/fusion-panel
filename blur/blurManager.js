import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { PanelBlurEffect } from './blurEffect.js';

export class BlurManager {
    constructor(settings) {
        this._settings = settings;
        this._blurActor = null;
        this._blurEffect = null;
        this._backgroundClone = null;
        this._panelActor = null;

        this._settingsSignals = [
            this._settings.connect('blur-enabled', () => this._onBlurSettingChanged()),
            this._settings.connect('blur-sigma', () => this._updateBlurParams()),
            this._settings.connect('blur-brightness', () => this._updateBlurParams()),
        ];
    }

    enable(panelActor) {
        this._panelActor = panelActor;

        if (this._settings.get('blur-enabled')) {
            this._createBlur();
        }
    }

    _createBlur() {
        if (this._blurActor || !this._panelActor) return;

        let monitor = Main.layoutManager.primaryMonitor;
        let backgroundGroup = Main.layoutManager._backgroundGroup;

        // Find the primary monitor background
        let primaryBg = null;
        for (let child of backgroundGroup) {
            if (child.monitor === Main.layoutManager.primaryIndex) {
                primaryBg = child;
                break;
            }
        }

        if (!primaryBg) {
            log('[Fusion Panel] Could not find primary background');
            return;
        }

        // Create blur container matching panel position/size
        this._blurActor = new Clutter.Actor({
            name: 'fusion-blur-actor',
            x: this._panelActor.x,
            y: this._panelActor.y,
            width: this._panelActor.width,
            height: this._panelActor.height,
            clip_to_allocation: true,
        });

        // Clone the wallpaper background
        this._backgroundClone = new Clutter.Clone({
            source: primaryBg,
            x: -this._panelActor.x,
            y: -this._panelActor.y,
            width: monitor.width,
            height: monitor.height,
        });

        this._blurActor.add_child(this._backgroundClone);

        // Apply blur effect
        let sigma = this._settings.get('blur-sigma');
        let brightness = this._settings.get('blur-brightness');
        this._blurEffect = new PanelBlurEffect(sigma, brightness);

        this._blurActor.add_effect_with_name('blur', this._blurEffect.effect);

        // Insert into UI group just behind the panel
        let uiGroup = Main.layoutManager.uiGroup;
        let panelIndex = uiGroup.get_children().indexOf(this._panelActor);

        if (panelIndex >= 0) {
            uiGroup.insert_child_at_index(this._blurActor, panelIndex);
        } else {
            uiGroup.add_child(this._blurActor);
        }

        // Track panel position/size changes
        this._panelAllocationId = this._panelActor.connect(
            'notify::allocation',
            this._syncBlurPosition.bind(this)
        );

        // Track wallpaper changes
        this._bgChangedId = Main.layoutManager.connect(
            'monitors-changed',
            () => {
                this._destroyBlur();
                this._createBlur();
            }
        );
    }

    _syncBlurPosition() {
        if (!this._blurActor || !this._panelActor) return;

        this._blurActor.set_position(this._panelActor.x, this._panelActor.y);
        this._blurActor.set_size(this._panelActor.width, this._panelActor.height);

        if (this._backgroundClone) {
            this._backgroundClone.set_position(
                -this._panelActor.x,
                -this._panelActor.y
            );
        }
    }

    _updateBlurParams() {
        if (!this._blurEffect) return;

        this._blurEffect.sigma = this._settings.get('blur-sigma');
        this._blurEffect.brightness = this._settings.get('blur-brightness');
    }

    _onBlurSettingChanged() {
        if (this._settings.get('blur-enabled')) {
            this._createBlur();
        } else {
            this._destroyBlur();
        }
    }

    _destroyBlur() {
        if (this._panelAllocationId && this._panelActor) {
            this._panelActor.disconnect(this._panelAllocationId);
            this._panelAllocationId = null;
        }

        if (this._bgChangedId) {
            Main.layoutManager.disconnect(this._bgChangedId);
            this._bgChangedId = null;
        }

        if (this._blurActor) {
            this._blurActor.remove_effect_by_name('blur');
            this._blurActor.destroy();
            this._blurActor = null;
        }

        this._blurEffect?.destroy();
        this._blurEffect = null;
        this._backgroundClone = null;
    }

    disable() {
        this._settingsSignals?.forEach(id => {
            try { this._settings.disconnect(id); } catch (e) {}
        });
        this._settingsSignals = null;

        this._destroyBlur();
        this._panelActor = null;
    }
}