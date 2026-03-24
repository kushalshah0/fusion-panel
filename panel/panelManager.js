import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Taskbar } from './taskbar.js';
import { ClockWidget } from './clock.js';
import { WorkspaceIndicator } from './workspaceIndicator.js';
import { SystemIndicators } from './systemIndicators.js';

export class PanelManager {
    constructor(settings) {
        this._settings = settings;
        this._panel = null;
        this._taskbar = null;
        this._clock = null;
        this._workspaceIndicator = null;
        this._systemIndicators = null;
    }

    enable() {
        let monitor = Main.layoutManager.primaryMonitor;
        let panelHeight = this._settings.get('panel-height');
        let panelPosition = this._settings.get('panel-position');
        let panelMargin = this._settings.get('panel-margin');
        let borderRadius = this._settings.get('panel-border-radius');
        let bgColor = this._settings.get('panel-bg-color');

        // Calculate Y position
        let yPos = panelPosition === 'TOP'
            ? monitor.y + panelMargin
            : monitor.y + monitor.height - panelHeight - panelMargin;

        // Create main panel actor
        this._panel = new St.BoxLayout({
            name: 'fusionPanel',
            style_class: 'fusion-panel',
            reactive: true,
            track_hover: true,
            x: monitor.x + panelMargin,
            y: yPos,
            width: monitor.width - (panelMargin * 2),
            height: panelHeight,
            style: `
                background-color: ${bgColor};
                border-radius: ${borderRadius}px;
            `,
        });

        // Three sections with proper alignment
        this._leftBox = new St.BoxLayout({
            style_class: 'fusion-panel-left',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });

        this._centerBox = new St.BoxLayout({
            style_class: 'fusion-panel-center',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });

        this._rightBox = new St.BoxLayout({
            style_class: 'fusion-panel-right',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });

        this._panel.add_child(this._leftBox);
        this._panel.add_child(this._centerBox);
        this._panel.add_child(this._rightBox);

        // === Add Components ===

        // Workspace Indicator (left)
        if (this._settings.get('show-workspace-indicator')) {
            this._workspaceIndicator = new WorkspaceIndicator(this._settings);
            this._leftBox.add_child(this._workspaceIndicator.actor);
        }

        // Taskbar (left, after workspace indicator)
        this._taskbar = new Taskbar(this._settings);
        this._leftBox.add_child(this._taskbar.actor);

        // Clock (based on setting)
        this._clock = new ClockWidget(this._settings);
        let clockPosition = this._settings.get('clock-position');
        switch (clockPosition) {
            case 'LEFT':
                this._leftBox.insert_child_at_index(this._clock.actor, 0);
                break;
            case 'CENTER':
                this._centerBox.add_child(this._clock.actor);
                break;
            case 'RIGHT':
                this._rightBox.add_child(this._clock.actor);
                break;
        }

        // System Indicators (right)
        this._systemIndicators = new SystemIndicators(this._settings);
        this._rightBox.add_child(this._systemIndicators.actor);

        // Hide the original GNOME panel
        Main.panel.hide();

        // Add our panel to the layout
        Main.layoutManager.addChrome(this._panel, {
            affectsStruts: true,
            trackFullscreen: true,
        });

        // Listen for settings changes
        this._settingsSignals = [
            this._settings.connect('panel-position', () => this._updatePanelPosition()),
            this._settings.connect('panel-height', () => this._updatePanelPosition()),
            this._settings.connect('panel-margin', () => this._updatePanelPosition()),
            this._settings.connect('panel-border-radius', () => this._updatePanelStyle()),
            this._settings.connect('panel-bg-color', () => this._updatePanelStyle()),
        ];

        // Listen for monitor changes
        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed',
            this._updatePanelPosition.bind(this)
        );
    }

    _updatePanelPosition() {
        if (!this._panel) return;

        let monitor = Main.layoutManager.primaryMonitor;
        let panelHeight = this._settings.get('panel-height');
        let panelPosition = this._settings.get('panel-position');
        let panelMargin = this._settings.get('panel-margin');

        let yPos = panelPosition === 'TOP'
            ? monitor.y + panelMargin
            : monitor.y + monitor.height - panelHeight - panelMargin;

        this._panel.set_position(monitor.x + panelMargin, yPos);
        this._panel.set_size(monitor.width - (panelMargin * 2), panelHeight);
    }

    _updatePanelStyle() {
        if (!this._panel) return;

        let borderRadius = this._settings.get('panel-border-radius');
        let bgColor = this._settings.get('panel-bg-color');

        this._panel.set_style(`
            background-color: ${bgColor};
            border-radius: ${borderRadius}px;
        `);
    }

    getPanelActor() {
        return this._panel;
    }

    disable() {
        // Disconnect settings
        this._settingsSignals?.forEach(id => {
            try { this._settings.disconnect(id); } catch (e) {}
        });
        this._settingsSignals = null;

        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }

        // Destroy components
        this._workspaceIndicator?.destroy();
        this._workspaceIndicator = null;

        this._taskbar?.destroy();
        this._taskbar = null;

        this._clock?.destroy();
        this._clock = null;

        this._systemIndicators?.destroy();
        this._systemIndicators = null;

        // Remove our panel
        if (this._panel) {
            Main.layoutManager.removeChrome(this._panel);
            this._panel.destroy();
            this._panel = null;
        }

        // Restore original GNOME panel
        Main.panel.show();
    }
}