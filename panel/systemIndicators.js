import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class SystemIndicators {
    constructor(settings) {
        this._settings = settings;
        this._movedIndicators = [];

        this.actor = new St.BoxLayout({
            style_class: 'fusion-system-indicators',
            y_align: Clutter.ActorAlign.CENTER,
        });

        // Steal indicators from GNOME's top panel
        this._stealIndicators();
    }

    _stealIndicators() {
        // We'll clone the aggregate menu (the one with power, network, etc.)
        // This is tricky — we essentially reparent GNOME's system indicators

        let statusArea = Main.panel.statusArea;

        // The aggregate menu contains: network, bluetooth, volume, power, etc.
        let indicatorsToMove = [
            'aggregateMenu',      // GNOME 44 and below
            'quickSettings',      // GNOME 45+
        ];

        for (let name of indicatorsToMove) {
            if (statusArea[name]) {
                let indicator = statusArea[name];
                let container = indicator.container;

                // Store original parent for restoration
                this._movedIndicators.push({
                    name: name,
                    indicator: indicator,
                    originalParent: container.get_parent(),
                    originalIndex: container.get_parent()?.get_children().indexOf(container),
                });

                // Reparent to our panel
                container.get_parent()?.remove_child(container);
                this.actor.add_child(container);
            }
        }
    }

    destroy() {
        // Restore indicators to original panel
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
        this.actor?.destroy();
        this.actor = null;
    }
}