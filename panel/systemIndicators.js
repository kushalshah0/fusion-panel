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

    const centerNames = ['dateMenu', 'messageIndicator', 'notifications'];

    // These always stay at the far right, in this order
    const pinnedRight = ['keyboard', 'a11y', 'quickSettings', 'aggregateMenu'];

    let allKeys = Object.keys(statusArea);

    const moveIndicator = (name, targetActor) => {
        let indicator = statusArea[name];
        if (!indicator?.container) return;
        let container = indicator.container;
        if (!container.get_parent()) return;

        this._movedIndicators.push({
            name,
            indicator,
            originalParent: container.get_parent(),
            originalIndex: container.get_parent()?.get_children().indexOf(container),
        });

        container.get_parent()?.remove_child(container);
        targetActor.add_child(container);
    };

    // First: center indicators
    for (let name of allKeys) {
        if (centerNames.includes(name)) {
            moveIndicator(name, this.centerActor);
        }
    }

    // Second: any third-party/unknown extensions (not center, not pinned-right)
    for (let name of allKeys) {
        if (centerNames.includes(name)) continue;
        if (pinnedRight.includes(name)) continue;
        moveIndicator(name, this.actor);
    }

    // Last: pinned system indicators always at the far right
    for (let name of pinnedRight) {
        if (statusArea[name]) {
            moveIndicator(name, this.actor);
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