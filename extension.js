import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { PanelManager } from './panel/panelManager.js';
import { SettingsManager } from './utils/settings.js';

export default class FusionPanelExtension extends Extension {
    enable() {
        log('[Fusion Panel] Enabling...');

        try {
            this._settings = new SettingsManager(this.dir);
            this._panelManager = new PanelManager(this._settings);
            this._panelManager.enable();

            log('[Fusion Panel] Enabled successfully!');
        } catch (e) {
            log(`[Fusion Panel] Error enabling: ${e.message}`);
            log(e.stack);
        }
    }

    disable() {
        log('[Fusion Panel] Disabling...');

        try {
            this._panelManager?.disable();
            this._panelManager = null;

            this._settings?.destroy();
            this._settings = null;

            log('[Fusion Panel] Disabled.');
        } catch (e) {
            log(`[Fusion Panel] Error disabling: ${e.message}`);
        }
    }
}