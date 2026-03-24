import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Taskbar } from './taskbar.js';
import { WorkspaceIndicator } from './workspaceIndicator.js';
import { SystemIndicators } from './systemIndicators.js';
import { WindowPreviewManager } from './windowPreview.js';
import { BadgeManager } from './appBadge.js';
import { AutoHideManager } from './autoHide.js';
import { Animator } from '../animations/animator.js';
import { BlurManager } from '../blur/blurManager.js';
import { DynamicBlurManager } from '../blur/dynamicBlur.js';

// Single monitor panel instance
class PanelInstance {
    constructor(monitorIndex, settings, animator, previewManager, badgeManager) {
        this._monitorIndex = monitorIndex;
        this._settings = settings;
        this._animator = animator;
        this._previewManager = previewManager;
        this._badgeManager = badgeManager;
        this._isPrimary = monitorIndex === Main.layoutManager.primaryIndex;

        this._panel = null;
        this._taskbar = null;
        this._clock = null;
        this._workspaceIndicator = null;
        this._systemIndicators = null;
        this._blurManager = null;
        this._dynamicBlurManager = null;
        this._autoHideManager = null;
    }

    enable() {
        let monitor = Main.layoutManager.monitors[this._monitorIndex];
        if (!monitor) return;

        let panelHeight = this._settings.get('panel-height');
        let panelPosition = this._settings.get('panel-position');
        let panelMargin = this._settings.get('panel-margin');
        let borderRadius = this._settings.get('panel-border-radius');
        let bgColor = this._settings.get('panel-bg-color');

        let yPos = panelPosition === 'TOP'
            ? monitor.y + panelMargin
            : monitor.y + monitor.height - panelHeight - panelMargin;

        // Create panel
        this._panel = new St.BoxLayout({
            name: `fusionPanel-${this._monitorIndex}`,
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

        // Three sections
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

        // === Components ===

        // Workspace indicator
        if (this._settings.get('show-workspace-indicator')) {
            this._workspaceIndicator = new WorkspaceIndicator(this._settings);
            this._leftBox.add_child(this._workspaceIndicator.actor);
        }

        // Taskbar
        this._taskbar = new Taskbar(
            this._settings,
            this._previewManager,
            this._badgeManager,
            this._animator
        );
        this._leftBox.add_child(this._taskbar.actor);

        // System indicators (primary monitor only)
        if (this._isPrimary) {
            this._systemIndicators = new SystemIndicators(this._settings);
            this._centerBox.add_child(this._systemIndicators.centerActor);
            this._rightBox.add_child(this._systemIndicators.actor);
        }

        // Add panel to layout
        Main.layoutManager.addChrome(this._panel, {
            affectsStruts: true,
            trackFullscreen: true,
        });

        // === Blur ===
        if (this._settings.get('dynamic-blur')) {
            this._dynamicBlurManager = new DynamicBlurManager(this._settings);
            this._dynamicBlurManager.enable(this._panel);
        } else if (this._settings.get('blur-enabled')) {
            this._blurManager = new BlurManager(this._settings);
            this._blurManager.enable(this._panel);
        }

        // === Auto-hide ===
        let blurActor = this._dynamicBlurManager?._blurContainer ||
                        this._blurManager?._blurActor || null;

        this._autoHideManager = new AutoHideManager(
            this._panel, blurActor, this._settings, this._animator
        );
        this._autoHideManager.enable();

        // Entrance animation
        if (this._animator) {
            let position = this._settings.get('panel-position');
            this._panel.hide();
            this._animator.animateShow(this._panel, position);
        }
    }

    getPanelActor() {
        return this._panel;
    }

    getMonitorIndex() {
        return this._monitorIndex;
    }

    disable() {
        // Exit animation
        this._autoHideManager?.disable();
        this._autoHideManager = null;

        this._dynamicBlurManager?.disable();
        this._dynamicBlurManager = null;

        this._blurManager?.disable();
        this._blurManager = null;

        this._workspaceIndicator?.destroy();
        this._workspaceIndicator = null;

        this._taskbar?.destroy();
        this._taskbar = null;

        // this._clock?.destroy();
        // this._clock = null;

        this._systemIndicators?.destroy();
        this._systemIndicators = null;

        if (this._panel) {
            Main.layoutManager.removeChrome(this._panel);
            this._panel.destroy();
            this._panel = null;
        }
    }
}


// ============================================
// Main Panel Manager (Multi-Monitor)
// ============================================
export class PanelManager {
    constructor(settings) {
        this._settings = settings;
        this._panels = [];
        this._animator = null;
        this._previewManager = null;
        this._badgeManager = null;
    }

    enable() {
        // Create shared services
        this._animator = new Animator(this._settings);
        this._previewManager = new WindowPreviewManager(this._settings, this._animator);
        this._badgeManager = new BadgeManager(this._settings);

        // Hide original GNOME panel
        Main.panel.hide();

        // Create panels
        let multiMonitor = this._settings.get('multi-monitor');
        let monitorCount = Main.layoutManager.monitors.length;

        if (multiMonitor && monitorCount > 1) {
            // Panel on each monitor
            for (let i = 0; i < monitorCount; i++) {
                let panel = new PanelInstance(
                    i, this._settings, this._animator,
                    this._previewManager, this._badgeManager
                );
                panel.enable();
                this._panels.push(panel);
            }
        } else {
            // Panel on primary monitor only
            let panel = new PanelInstance(
                Main.layoutManager.primaryIndex,
                this._settings, this._animator,
                this._previewManager, this._badgeManager
            );
            panel.enable();
            this._panels.push(panel);
        }

        // Monitor configuration changes
        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed',
            this._onMonitorsChanged.bind(this)
        );

        // Settings changes that require full rebuild
        this._settingsSignals = [
            this._settings.connect('multi-monitor', () => this._rebuild()),
            this._settings.connect('panel-position', () => this._rebuild()),
            this._settings.connect('panel-height', () => this._updateAllPositions()),
            this._settings.connect('panel-margin', () => this._updateAllPositions()),
            this._settings.connect('panel-border-radius', () => this._updateAllStyles()),
            this._settings.connect('panel-bg-color', () => this._updateAllStyles()),
        ];
    }

    _onMonitorsChanged() {
        this._rebuild();
    }

    _rebuild() {
        // Disable all panels
        this._panels.forEach(p => p.disable());
        this._panels = [];

        // Re-enable
        let multiMonitor = this._settings.get('multi-monitor');
        let monitorCount = Main.layoutManager.monitors.length;

        if (multiMonitor && monitorCount > 1) {
            for (let i = 0; i < monitorCount; i++) {
                let panel = new PanelInstance(
                    i, this._settings, this._animator,
                    this._previewManager, this._badgeManager
                );
                panel.enable();
                this._panels.push(panel);
            }
        } else {
            let panel = new PanelInstance(
                Main.layoutManager.primaryIndex,
                this._settings, this._animator,
                this._previewManager, this._badgeManager
            );
            panel.enable();
            this._panels.push(panel);
        }
    }

    _updateAllPositions() {
        this._panels.forEach(p => {
            // Easiest to just rebuild each panel
            let idx = p.getMonitorIndex();
            p.disable();

            let newPanel = new PanelInstance(
                idx, this._settings, this._animator,
                this._previewManager, this._badgeManager
            );
            newPanel.enable();
            this._panels[this._panels.indexOf(p)] = newPanel;
        });
    }

    _updateAllStyles() {
        this._panels.forEach(p => {
            let actor = p.getPanelActor();
            if (actor) {
                let borderRadius = this._settings.get('panel-border-radius');
                let bgColor = this._settings.get('panel-bg-color');
                actor.set_style(`
                    background-color: ${bgColor};
                    border-radius: ${borderRadius}px;
                `);
            }
        });
    }

    getPanelActor() {
        // Return primary panel actor
        return this._panels[0]?.getPanelActor() || null;
    }

    disable() {
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }

        this._settingsSignals?.forEach(id => {
            try { this._settings.disconnect(id); } catch (e) {}
        });
        this._settingsSignals = null;

        // Disable all panels
        this._panels.forEach(p => p.disable());
        this._panels = [];

        // Destroy shared services
        this._previewManager?.destroy();
        this._previewManager = null;

        this._badgeManager?.destroy();
        this._badgeManager = null;

        this._animator?.destroy();
        this._animator = null;

        // Restore GNOME panel
        Main.panel.show();
    }
}