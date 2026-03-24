import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { PanelManager } from './panel/panelManager.js';
import { BlurManager } from './blur/blurManager.js';
import { SettingsManager } from './utils/settings.js';

export default class FusionPanelExtension extends Extension {
    enable() {
        log('[Fusion Panel] Enabling...');

        // Initialize settings
        this._settings = new SettingsManager(this.dir);

        // Create and enable the panel
        this._panelManager = new PanelManager(this._settings);
        this._panelManager.enable();

        // Create and enable blur
        this._blurManager = new BlurManager(this._settings);
        this._blurManager.enable(this._panelManager.getPanelActor());

        log('[Fusion Panel] Enabled successfully!');
    }

    disable() {
        log('[Fusion Panel] Disabling...');

        // Disable blur first
        this._blurManager?.disable();
        this._blurManager = null;

        // Then disable panel (restores original GNOME panel)
        this._panelManager?.disable();
        this._panelManager = null;

        // Clean up settings
        this._settings?.destroy();
        this._settings = null;

        log('[Fusion Panel] Disabled.');
    }
}