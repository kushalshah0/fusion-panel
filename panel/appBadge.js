import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

// Uses Freedesktop Notifications + Unity LauncherEntry for badge counts
export class BadgeManager {
    constructor(settings) {
        this._settings = settings;
        this._badges = new Map();  // appId -> { count, urgent }
        this._badgeWidgets = new Map();  // appId -> St.Label

        this._setupDBusListener();
    }

    _setupDBusListener() {
        // Listen for Unity LauncherEntry signals (used by many apps)
        // com.canonical.Unity.LauncherEntry
        try {
            this._busWatchId = Gio.DBus.session.signal_subscribe(
                null,
                'com.canonical.Unity.LauncherEntry',
                'Update',
                null,
                null,
                Gio.DBusSignalFlags.NONE,
                this._onUnityUpdate.bind(this)
            );
        } catch (e) {
            log(`[Fusion Panel] Badge DBus setup failed: ${e.message}`);
        }

        // Also monitor notification count via Gio.Notification
        try {
            this._notiWatchId = Gio.DBus.session.signal_subscribe(
                'org.freedesktop.Notifications',
                'org.freedesktop.Notifications',
                'Notify',
                '/org/freedesktop/Notifications',
                null,
                Gio.DBusSignalFlags.NONE,
                this._onNotification.bind(this)
            );
        } catch (e) {
            log(`[Fusion Panel] Notification listener failed: ${e.message}`);
        }
    }

    _onUnityUpdate(connection, sender, path, iface, signal, params) {
        try {
            let [appUri, properties] = params.deep_unpack();

            // Extract app ID from URI: application://org.example.app.desktop
            let appId = appUri.replace('application://', '');

            let count = 0;
            let countVisible = false;
            let urgent = false;

            if (properties['count'])
                count = properties['count'].deep_unpack();
            if (properties['count-visible'])
                countVisible = properties['count-visible'].deep_unpack();
            if (properties['urgent'])
                urgent = properties['urgent'].deep_unpack();

            if (countVisible && count > 0) {
                this._badges.set(appId, { count, urgent });
            } else {
                this._badges.delete(appId);
            }

            this._notifyUpdate(appId);
        } catch (e) {
            // Silently fail — not all apps support this
        }
    }

    _onNotification(connection, sender, path, iface, signal, params) {
        try {
            let [appName, replacesId, icon, summary, body, actions, hints, timeout] =
                params.deep_unpack();

            // Try to find the app by name
            // This is a heuristic — not always accurate
            let appId = `${appName.toLowerCase().replace(/\s/g, '')}.desktop`;

            let existing = this._badges.get(appId) || { count: 0, urgent: false };
            existing.count++;

            this._badges.set(appId, existing);
            this._notifyUpdate(appId);
        } catch (e) {
            // Silently fail
        }
    }

    // Callbacks for when badge updates
    _updateCallbacks = new Map();

    onBadgeUpdate(appId, callback) {
        this._updateCallbacks.set(appId, callback);
    }

    _notifyUpdate(appId) {
        let callback = this._updateCallbacks.get(appId);
        if (callback) {
            let badge = this._badges.get(appId);
            callback(badge);
        }
    }

    getBadge(appId) {
        return this._badges.get(appId) || null;
    }

    clearBadge(appId) {
        this._badges.delete(appId);
        this._notifyUpdate(appId);
    }

    // Create a badge widget for an app button
    createBadgeWidget(appId) {
        let badge = this._badges.get(appId);

        let widget = new St.Label({
            style_class: 'fusion-app-badge',
            text: badge ? `${badge.count}` : '',
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.START,
        });

        if (!badge || badge.count === 0) {
            widget.hide();
        }

        this._badgeWidgets.set(appId, widget);

        // Register for updates
        this.onBadgeUpdate(appId, (badgeData) => {
            if (badgeData && badgeData.count > 0) {
                widget.set_text(`${badgeData.count > 99 ? '99+' : badgeData.count}`);
                widget.show();

                if (badgeData.urgent) {
                    widget.add_style_class_name('urgent');
                }
            } else {
                widget.hide();
                widget.remove_style_class_name('urgent');
            }
        });

        return widget;
    }

    destroy() {
        try {
            if (this._busWatchId) {
                Gio.DBus.session.signal_unsubscribe(this._busWatchId);
                this._busWatchId = null;
            }
            if (this._notiWatchId) {
                Gio.DBus.session.signal_unsubscribe(this._notiWatchId);
                this._notiWatchId = null;
            }
        } catch (e) {}

        this._badges.clear();
        this._badgeWidgets.forEach(w => w.destroy());
        this._badgeWidgets.clear();
        this._updateCallbacks.clear();
    }
}