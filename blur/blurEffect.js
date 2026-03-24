import Shell from 'gi://Shell';
import Clutter from 'gi://Clutter';

export class PanelBlurEffect {
    constructor(sigma = 30, brightness = 0.6) {
        this._effect = new Shell.BlurEffect({
            radius: sigma,
            brightness: brightness,
            mode: Shell.BlurMode.ACTOR,
        });
    }

    get effect() {
        return this._effect;
    }

    set sigma(value) {
        this._effect.radius = value;
    }

    get sigma() {
        return this._effect.radius;
    }

    set brightness(value) {
        this._effect.brightness = value;
    }

    get brightness() {
        return this._effect.brightness;
    }

    destroy() {
        this._effect = null;
    }
}