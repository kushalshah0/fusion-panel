import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

export const AnimationType = {
    NONE: 'NONE',
    SLIDE: 'SLIDE',
    FADE: 'FADE',
    SCALE: 'SCALE',
};

export class Animator {
    constructor(settings) {
        this._settings = settings;
    }

    // Animate panel showing
    animateShow(actor, panelPosition, callback) {
        let type = this._settings.get('animation-type');
        let duration = this._settings.get('animation-duration');

        switch (type) {
            case AnimationType.SLIDE:
                this._slideIn(actor, panelPosition, duration, callback);
                break;
            case AnimationType.FADE:
                this._fadeIn(actor, duration, callback);
                break;
            case AnimationType.SCALE:
                this._scaleIn(actor, duration, callback);
                break;
            case AnimationType.NONE:
            default:
                actor.show();
                actor.opacity = 255;
                if (callback) callback();
                break;
        }
    }

    // Animate panel hiding
    animateHide(actor, panelPosition, callback) {
        let type = this._settings.get('animation-type');
        let duration = this._settings.get('animation-duration');

        switch (type) {
            case AnimationType.SLIDE:
                this._slideOut(actor, panelPosition, duration, callback);
                break;
            case AnimationType.FADE:
                this._fadeOut(actor, duration, callback);
                break;
            case AnimationType.SCALE:
                this._scaleOut(actor, duration, callback);
                break;
            case AnimationType.NONE:
            default:
                actor.hide();
                if (callback) callback();
                break;
        }
    }

    // Bounce animation for app icon when launched
    animateBounce(actor) {
        let origY = actor.translation_y;

        actor.ease({
            translation_y: origY - 12,
            duration: 150,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                actor.ease({
                    translation_y: origY + 4,
                    duration: 100,
                    mode: Clutter.AnimationMode.EASE_IN_QUAD,
                    onComplete: () => {
                        actor.ease({
                            translation_y: origY - 6,
                            duration: 100,
                            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                            onComplete: () => {
                                actor.ease({
                                    translation_y: origY,
                                    duration: 80,
                                    mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
                                });
                            },
                        });
                    },
                });
            },
        });
    }

    // Pulse animation for notification badges
    animatePulse(actor) {
        actor.ease({
            scale_x: 1.3,
            scale_y: 1.3,
            duration: 200,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                actor.ease({
                    scale_x: 1.0,
                    scale_y: 1.0,
                    duration: 200,
                    mode: Clutter.AnimationMode.EASE_IN_QUAD,
                });
            },
        });
    }

    // Preview popup animation
    animatePreviewShow(actor) {
        actor.opacity = 0;
        actor.scale_y = 0.8;
        actor.show();

        actor.ease({
            opacity: 255,
            scale_y: 1.0,
            duration: 150,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    animatePreviewHide(actor, callback) {
        actor.ease({
            opacity: 0,
            scale_y: 0.8,
            duration: 100,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                actor.hide();
                if (callback) callback();
            },
        });
    }

    // ---- Private animation methods ----

    _slideIn(actor, position, duration, callback) {
        actor.show();
        let targetY = actor.y;

        if (position === 'BOTTOM') {
            actor.y = targetY + actor.height;
        } else {
            actor.y = targetY - actor.height;
        }

        actor.ease({
            y: targetY,
            duration: duration,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => { if (callback) callback(); },
        });
    }

    _slideOut(actor, position, duration, callback) {
        let targetY;

        if (position === 'BOTTOM') {
            targetY = actor.y + actor.height;
        } else {
            targetY = actor.y - actor.height;
        }

        actor.ease({
            y: targetY,
            duration: duration,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                actor.hide();
                if (callback) callback();
            },
        });
    }

    _fadeIn(actor, duration, callback) {
        actor.opacity = 0;
        actor.show();

        actor.ease({
            opacity: 255,
            duration: duration,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => { if (callback) callback(); },
        });
    }

    _fadeOut(actor, duration, callback) {
        actor.ease({
            opacity: 0,
            duration: duration,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                actor.hide();
                if (callback) callback();
            },
        });
    }

    _scaleIn(actor, duration, callback) {
        actor.scale_x = 0.8;
        actor.scale_y = 0.8;
        actor.opacity = 0;
        actor.show();

        actor.ease({
            scale_x: 1.0,
            scale_y: 1.0,
            opacity: 255,
            duration: duration,
            mode: Clutter.AnimationMode.EASE_OUT_BACK,
            onComplete: () => { if (callback) callback(); },
        });
    }

    _scaleOut(actor, duration, callback) {
        actor.ease({
            scale_x: 0.8,
            scale_y: 0.8,
            opacity: 0,
            duration: duration,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                actor.hide();
                if (callback) callback();
            },
        });
    }

    destroy() {
        this._settings = null;
    }
}