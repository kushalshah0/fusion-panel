import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class FusionPanelPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        let settings = this.getSettings();

        // ==========================================
        // PAGE 1: PANEL
        // ==========================================
        let panelPage = new Adw.PreferencesPage({
            title: 'Panel',
            icon_name: 'view-app-grid-symbolic',
        });

        // --- Position & Size ---
        let posGroup = new Adw.PreferencesGroup({
            title: 'Position & Size',
            description: 'Configure panel placement and dimensions',
        });

        let posRow = new Adw.ComboRow({ title: 'Panel Position' });
        posRow.set_model(new Gtk.StringList({ strings: ['TOP', 'BOTTOM'] }));
        posRow.set_selected(settings.get_string('panel-position') === 'TOP' ? 0 : 1);
        posRow.connect('notify::selected', () => {
            settings.set_string('panel-position', posRow.get_selected() === 0 ? 'TOP' : 'BOTTOM');
        });
        posGroup.add(posRow);

        posGroup.add(this._createSpinRow(settings, 'panel-height', 'Panel Height', 'Height in pixels', 24, 80, 2));
        posGroup.add(this._createSpinRow(settings, 'panel-margin', 'Panel Margin', 'Creates floating effect', 0, 20, 1));
        posGroup.add(this._createSpinRow(settings, 'panel-border-radius', 'Border Radius', 'Corner rounding', 0, 30, 1));

        panelPage.add(posGroup);

        // --- Multi Monitor ---
        let monitorGroup = new Adw.PreferencesGroup({
            title: 'Multi-Monitor',
        });

        monitorGroup.add(this._createSwitchRow(settings, 'multi-monitor', 'Panel on All Monitors', 'Show panel on every connected monitor'));

        panelPage.add(monitorGroup);

        // ==========================================
        // PAGE 2: BLUR
        // ==========================================
        let blurPage = new Adw.PreferencesPage({
            title: 'Blur',
            icon_name: 'preferences-desktop-wallpaper-symbolic',
        });

        let blurGroup = new Adw.PreferencesGroup({
            title: 'Blur Effect',
            description: 'Background blur settings',
        });

        blurGroup.add(this._createSwitchRow(settings, 'blur-enabled', 'Enable Blur', 'Apply blur to panel background'));
        blurGroup.add(this._createSpinRow(settings, 'blur-sigma', 'Blur Intensity', 'Higher = more blur (0-100)', 0, 100, 1));

        let brightnessRow = new Adw.SpinRow({
            title: 'Blur Brightness',
            subtitle: '0.0 (dark) to 1.0 (bright)',
            adjustment: new Gtk.Adjustment({
                lower: 0.0, upper: 1.0, step_increment: 0.05,
                value: settings.get_double('blur-brightness'),
            }),
            digits: 2,
        });
        brightnessRow.connect('notify::value', () => {
            settings.set_double('blur-brightness', brightnessRow.get_value());
        });
        blurGroup.add(brightnessRow);

        blurGroup.add(this._createSwitchRow(settings, 'dynamic-blur', 'Dynamic Blur', 'Blur windows behind panel (more GPU intensive)'));

        blurPage.add(blurGroup);

        // ==========================================
        // PAGE 3: TASKBAR
        // ==========================================
        let taskbarPage = new Adw.PreferencesPage({
            title: 'Taskbar',
            icon_name: 'application-x-executable-symbolic',
        });

        let taskbarGroup = new Adw.PreferencesGroup({
            title: 'Taskbar',
            description: 'App icons and behavior',
        });

        taskbarGroup.add(this._createSpinRow(settings, 'icon-size', 'Icon Size', 'Size in pixels', 16, 64, 2));
        taskbarGroup.add(this._createSpinRow(settings, 'icon-margin', 'Icon Spacing', 'Margin between icons', 0, 16, 1));
        taskbarGroup.add(this._createSwitchRow(settings, 'show-favorites', 'Show Favorites', 'Display pinned apps'));
        taskbarGroup.add(this._createSwitchRow(settings, 'show-running-apps', 'Show Running Apps', 'Display open applications'));
        taskbarGroup.add(this._createSwitchRow(settings, 'isolate-workspaces', 'Isolate Workspaces', 'Only show apps from current workspace'));
        taskbarGroup.add(this._createSwitchRow(settings, 'enable-drag-drop', 'Enable Drag & Drop', 'Reorder icons by dragging'));
        taskbarGroup.add(this._createSwitchRow(settings, 'show-context-menu', 'Right-Click Menu', 'Show context menu on right click'));

        let clickRow = new Adw.ComboRow({
            title: 'Click Action',
            subtitle: 'What happens when clicking an app icon',
        });
        let clickActions = ['TOGGLE', 'CYCLE', 'PREVIEW', 'LAUNCH'];
        clickRow.set_model(new Gtk.StringList({ strings: clickActions }));
        clickRow.set_selected(clickActions.indexOf(settings.get_string('click-action')));
        clickRow.connect('notify::selected', () => {
            settings.set_string('click-action', clickActions[clickRow.get_selected()]);
        });
        taskbarGroup.add(clickRow);

        taskbarPage.add(taskbarGroup);

        // --- Window Previews ---
        let previewGroup = new Adw.PreferencesGroup({
            title: 'Window Previews',
            description: 'Thumbnail previews on hover',
        });

        previewGroup.add(this._createSwitchRow(settings, 'show-window-previews', 'Enable Previews', 'Show window thumbnails on hover'));
        previewGroup.add(this._createSpinRow(settings, 'preview-width', 'Preview Width', 'Thumbnail width', 120, 400, 10));
        previewGroup.add(this._createSpinRow(settings, 'preview-height', 'Preview Height', 'Thumbnail height', 80, 300, 10));
        previewGroup.add(this._createSpinRow(settings, 'preview-delay', 'Preview Delay', 'Delay before showing (ms)', 0, 1000, 50));

        taskbarPage.add(previewGroup);

        // --- Badges ---
        let badgeGroup = new Adw.PreferencesGroup({
            title: 'Notification Badges',
        });

        badgeGroup.add(this._createSwitchRow(settings, 'show-app-badges', 'Show Badges', 'Display notification count on app icons'));

        taskbarPage.add(badgeGroup);

        // ==========================================
        // PAGE 4: CLOCK
        // ==========================================
        let clockPage = new Adw.PreferencesPage({
            title: 'Clock',
            icon_name: 'preferences-system-time-symbolic',
        });

        let clockGroup = new Adw.PreferencesGroup({
            title: 'Clock',
        });

        let clockPosRow = new Adw.ComboRow({ title: 'Clock Position' });
        let clockPositions = ['LEFT', 'CENTER', 'RIGHT'];
        clockPosRow.set_model(new Gtk.StringList({ strings: clockPositions }));
        clockPosRow.set_selected(clockPositions.indexOf(settings.get_string('clock-position')));
        clockPosRow.connect('notify::selected', () => {
            settings.set_string('clock-position', clockPositions[clockPosRow.get_selected()]);
        });
        clockGroup.add(clockPosRow);

        let formatRow = new Adw.EntryRow({ title: 'Clock Format' });
        formatRow.set_text(settings.get_string('clock-format'));
        formatRow.connect('changed', () => {
            settings.set_string('clock-format', formatRow.get_text());
        });
        clockGroup.add(formatRow);

        // Format help
        let formatHelpGroup = new Adw.PreferencesGroup({
            title: 'Format Reference',
            description: '%H = 24h hour, %I = 12h hour, %M = minutes, %S = seconds, %p = AM/PM, %A = weekday, %B = month, %d = day, %Y = year',
        });

        clockGroup.add(this._createSwitchRow(settings, 'show-date', 'Show Date', 'Display date next to time'));
        clockGroup.add(this._createSwitchRow(settings, 'show-workspace-indicator', 'Workspace Indicator', 'Show workspace dots'));

        clockPage.add(clockGroup);
        clockPage.add(formatHelpGroup);

        // ==========================================
        // PAGE 5: BEHAVIOR
        // ==========================================
        let behaviorPage = new Adw.PreferencesPage({
            title: 'Behavior',
            icon_name: 'preferences-system-symbolic',
        });

        // --- Auto-Hide ---
        let autoHideGroup = new Adw.PreferencesGroup({
            title: 'Auto-Hide',
            description: 'Automatically hide the panel when not in use',
        });

        autoHideGroup.add(this._createSwitchRow(settings, 'auto-hide', 'Enable Auto-Hide', 'Panel hides after inactivity'));
        autoHideGroup.add(this._createSpinRow(settings, 'auto-hide-delay', 'Hide Delay', 'Milliseconds before hiding', 200, 5000, 100));
        autoHideGroup.add(this._createSpinRow(settings, 'pressure-threshold', 'Reveal Pressure', 'Mouse pressure to reveal panel', 10, 500, 10));
        autoHideGroup.add(this._createSwitchRow(settings, 'show-panel-on-overview', 'Show in Overview', 'Keep panel visible in Activities'));

        behaviorPage.add(autoHideGroup);

        // --- Animations ---
        let animGroup = new Adw.PreferencesGroup({
            title: 'Animations',
        });

        let animRow = new Adw.ComboRow({
            title: 'Animation Type',
            subtitle: 'Panel show/hide animation style',
        });
        let animTypes = ['NONE', 'SLIDE', 'FADE', 'SCALE'];
        animRow.set_model(new Gtk.StringList({ strings: animTypes }));
        animRow.set_selected(animTypes.indexOf(settings.get_string('animation-type')));
        animRow.connect('notify::selected', () => {
            settings.set_string('animation-type', animTypes[animRow.get_selected()]);
        });
        animGroup.add(animRow);

        animGroup.add(this._createSpinRow(settings, 'animation-duration', 'Animation Duration', 'Duration in milliseconds', 50, 1000, 25));

        behaviorPage.add(animGroup);

        // ==========================================
        // PAGE 6: ABOUT
        // ==========================================
        let aboutPage = new Adw.PreferencesPage({
            title: 'About',
            icon_name: 'help-about-symbolic',
        });

        let aboutGroup = new Adw.PreferencesGroup({
            title: 'Fusion Panel',
            description: 'A minimal taskbar panel with built-in blur effect.\n\n' +
                        'Inspired by Dash to Panel and Blur my Shell.\n\n' +
                        'Version 1.0\n' +
                        'License: GPL v3',
        });

        let resetRow = new Adw.ActionRow({
            title: 'Reset All Settings',
            subtitle: 'Restore all settings to defaults',
        });

        let resetButton = new Gtk.Button({
            label: 'Reset',
            valign: Gtk.Align.CENTER,
            css_classes: ['destructive-action'],
        });

        resetButton.connect('clicked', () => {
            let keys = settings.settings_schema.list_keys();
            keys.forEach(key => settings.reset(key));

            // Show toast
            let toast = new Adw.Toast({ title: 'All settings reset to defaults' });
            window.add_toast(toast);
        });

        resetRow.add_suffix(resetButton);
        aboutGroup.add(resetRow);

        aboutPage.add(aboutGroup);

        // ==========================================
        // ADD ALL PAGES
        // ==========================================
        window.add(panelPage);
        window.add(blurPage);
        window.add(taskbarPage);
        window.add(clockPage);
        window.add(behaviorPage);
        window.add(aboutPage);

        window.set_default_size(650, 750);
    }

    // Helper: Create a switch row bound to a setting
    _createSwitchRow(settings, key, title, subtitle) {
        let row = new Adw.SwitchRow({
            title: title,
            subtitle: subtitle || '',
        });
        settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }

    // Helper: Create a spin row bound to a setting
    _createSpinRow(settings, key, title, subtitle, lower, upper, step) {
        let row = new Adw.SpinRow({
            title: title,
            subtitle: subtitle || '',
            adjustment: new Gtk.Adjustment({
                lower: lower,
                upper: upper,
                step_increment: step,
                value: settings.get_int(key),
            }),
        });

        row.connect('notify::value', () => {
            settings.set_int(key, row.get_value());
        });

        return row;
    }
}