import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class SystemIndicators {
    constructor(settings) {
        this._settings = settings;
        this._movedIndicators = [];

        // Center actor: clock/date + notifications
        this.centerActor = new St.BoxLayout({
            style_class: 'fusion-system-indicators',
            y_align: Clutter.ActorAlign.CENTER,
        });

        // Right actor: wifi, sound, battery, etc.
        this.actor = new St.BoxLayout({
            style_class: 'fusion-system-indicators',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._stealIndicators();
    }

    _stealIndicators() {
        let statusArea = Main.panel.statusArea;

        // These go to center
        const centerNames = ['dateMenu', 'messageIndicator', 'notifications'];

        let allKeys = Object.keys(statusArea);

        for (let name of allKeys) {
            if (statusArea[name] && statusArea[name].container) {
                let indicator = statusArea[name];
                let container = indicator.container;

                if (container && container.get_parent()) {
                    this._movedIndicators.push({
                        name,
                        indicator,
                        originalParent: container.get_parent(),
                        originalIndex: container.get_parent()?.get_children().indexOf(container),
                    });

                    container.get_parent()?.remove_child(container);

                    // Route to center or right
                    if (centerNames.includes(name)) {
                        this.centerActor.add_child(container);
                    } else {
                        this.actor.add_child(container);
                    }
                }
            }
        }
    }

    destroy() {
        this._movedIndicators.forEach(({ indicator, originalParent, originalIndex }) => {
            let container = indicator.container;
            container.get_parent()?.remove_child(container);

            if (originalParent) {
                if (originalIndex >= 0 && originalIndex < originalParent.get_children().length) {
                    originalParent.insert_child_at_index(container, originalIndex);
                } else {
                    originalParent.add_child(container);
                }
            }
        });

        this._movedIndicators = [];
        this.centerActor?.destroy();
        this.centerActor = null;
        this.actor?.destroy();
        this.actor = null;
    }
}