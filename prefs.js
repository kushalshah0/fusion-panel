import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class FusionPanelPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        let settings = this.getSettings();

        // ========== PANEL PAGE ==========
        let panelPage = new Adw.PreferencesPage({
            title: 'Panel',
            icon_name: 'view-app-grid-symbolic',
        });

        // Position group
        let posGroup = new Adw.PreferencesGroup({ title: 'Position & Size' });

        // Panel Position
        let posRow = new Adw.ComboRow({
            title: 'Panel Position',
            subtitle: 'Where to place the panel',
        });
        posRow.set_model(new Gtk.StringList({ strings: ['TOP', 'BOTTOM'] }));
        posRow.set_selected(settings.get_string('panel-position') === 'TOP' ? 0 : 1);
        posRow.connect('notify::selected', () => {
            settings.set_string('panel-position', posRow.get_selected() === 0 ? 'TOP' : 'BOTTOM');
        });
        posGroup.add(posRow);

        // Panel Height
        let heightRow = new Adw.SpinRow({
            title: 'Panel Height',
            subtitle: 'Height in pixels',
            adjustment: new Gtk.Adjustment({
                lower: 24, upper: 80, step_increment: 2, value: settings.get_int('panel-height'),
            }),
        });
        heightRow.connect('notify::value', () => {
            settings.set_int('panel-height', heightRow.get_value());
        });
        posGroup.add(heightRow);

        // Panel Margin (floating)
        let marginRow = new Adw.SpinRow({
            title: 'Panel Margin',
            subtitle: 'Creates a floating panel effect',
            adjustment: new Gtk.Adjustment({
                lower: 0, upper: 20, step_increment: 1, value: settings.get_int('panel-margin'),
            }),
        });
        marginRow.connect('notify::value', () => {
            settings.set_int('panel-margin', marginRow.get_value());
        });
        posGroup.add(marginRow);

        // Border Radius
        let radiusRow = new Adw.SpinRow({
            title: 'Border Radius',
            subtitle: 'Corner rounding',
            adjustment: new Gtk.Adjustment({
                lower: 0, upper: 30, step_increment: 1, value: settings.get_int('panel-border-radius'),
            }),
        });
        radiusRow.connect('notify::value', () => {
            settings.set_int('panel-border-radius', radiusRow.get_value());
        });
        posGroup.add(radiusRow);

        panelPage.add(posGroup);

        // ========== BLUR PAGE ==========
        let blurPage = new Adw.PreferencesPage({
            title: 'Blur',
            icon_name: 'preferences-desktop-wallpaper-symbolic',
        });

        let blurGroup = new Adw.PreferencesGroup({ title: 'Blur Settings' });

        // Enable Blur
        let blurEnableRow = new Adw.SwitchRow({
            title: 'Enable Blur',
            subtitle: 'Apply blur effect to panel background',
        });
        settings.bind('blur-enabled', blurEnableRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        blurGroup.add(blurEnableRow);

        // Blur Sigma
        let sigmaRow = new Adw.SpinRow({
            title: 'Blur Intensity (Sigma)',
            subtitle: 'Higher = more blur',
            adjustment: new Gtk.Adjustment({
                lower: 0, upper: 100, step_increment: 1, value: settings.get_int('blur-sigma'),
            }),
        });
        sigmaRow.connect('notify::value', () => {
            settings.set_int('blur-sigma', sigmaRow.get_value());
        });
        blurGroup.add(sigmaRow);

        // Blur Brightness
        let brightnessRow = new Adw.SpinRow({
            title: 'Blur Brightness',
            subtitle: '0.0 = dark, 1.0 = bright',
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

        blurPage.add(blurGroup);

        // ========== TASKBAR PAGE ==========
        let taskbarPage = new Adw.PreferencesPage({
            title: 'Taskbar',
            icon_name: 'application-x-executable-symbolic',
        });

        let taskbarGroup = new Adw.PreferencesGroup({ title: 'Taskbar Settings' });

        // Icon Size
        let iconSizeRow = new Adw.SpinRow({
            title: 'Icon Size',
            adjustment: new Gtk.Adjustment({
                lower: 16, upper: 64, step_increment: 2, value: settings.get_int('icon-size'),
            }),
        });
        iconSizeRow.connect('notify::value', () => {
            settings.set_int('icon-size', iconSizeRow.get_value());
        });
        taskbarGroup.add(iconSizeRow);

        // Show Favorites
        let favRow = new Adw.SwitchRow({
            title: 'Show Favorites',
            subtitle: 'Display pinned favorite apps',
        });
        settings.bind('show-favorites', favRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        taskbarGroup.add(favRow);

        // Show Running Apps
        let runningRow = new Adw.SwitchRow({
            title: 'Show Running Apps',
            subtitle: 'Display currently running applications',
        });
        settings.bind('show-running-apps', runningRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        taskbarGroup.add(runningRow);

        // Isolate Workspaces
        let isolateRow = new Adw.SwitchRow({
            title: 'Isolate Workspaces',
            subtitle: 'Only show apps from current workspace',
        });
        settings.bind('isolate-workspaces', isolateRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        taskbarGroup.add(isolateRow);

        // Click Action
        let clickRow = new Adw.ComboRow({
            title: 'Click Action',
            subtitle: 'What happens when you click an app icon',
        });
        let clickActions = ['TOGGLE', 'CYCLE', 'LAUNCH'];
        clickRow.set_model(new Gtk.StringList({ strings: clickActions }));
        clickRow.set_selected(clickActions.indexOf(settings.get_string('click-action')));
        clickRow.connect('notify::selected', () => {
            settings.set_string('click-action', clickActions[clickRow.get_selected()]);
        });
        taskbarGroup.add(clickRow);

        taskbarPage.add(taskbarGroup);

        // ========== CLOCK PAGE ==========
        let clockPage = new Adw.PreferencesPage({
            title: 'Clock',
            icon_name: 'preferences-system-time-symbolic',
        });

        let clockGroup = new Adw.PreferencesGroup({ title: 'Clock Settings' });

        // Clock Position
        let clockPosRow = new Adw.ComboRow({
            title: 'Clock Position',
        });
        let clockPositions = ['LEFT', 'CENTER', 'RIGHT'];
        clockPosRow.set_model(new Gtk.StringList({ strings: clockPositions }));
        clockPosRow.set_selected(clockPositions.indexOf(settings.get_string('clock-position')));
        clockPosRow.connect('notify::selected', () => {
            settings.set_string('clock-position', clockPositions[clockPosRow.get_selected()]);
        });
        clockGroup.add(clockPosRow);

        // Clock Format
        let formatRow = new Adw.EntryRow({
            title: 'Clock Format',
        });
        formatRow.set_text(settings.get_string('clock-format'));
        formatRow.connect('changed', () => {
            settings.set_string('clock-format', formatRow.get_text());
        });
        clockGroup.add(formatRow);

        // Show Date
        let dateRow = new Adw.SwitchRow({
            title: 'Show Date',
        });
        settings.bind('show-date', dateRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        clockGroup.add(dateRow);

        clockPage.add(clockGroup);

        // ========== ADD ALL PAGES ==========
        window.add(panelPage);
        window.add(blurPage);
        window.add(taskbarPage);
        window.add(clockPage);

        window.set_default_size(600, 700);
    }
}