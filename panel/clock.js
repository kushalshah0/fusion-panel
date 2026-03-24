import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

export class ClockWidget {
    constructor(settings) {
        this._settings = settings;
        this._timer = null;

        this.actor = new St.BoxLayout({
            style_class: 'fusion-clock-container',
            y_align: Clutter.ActorAlign.CENTER,
            reactive: true,
        });

        this._timeLabel = new St.Label({
            style_class: 'fusion-clock-time',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._dateLabel = new St.Label({
            style_class: 'fusion-clock-date',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.actor.add_child(this._timeLabel);
        this.actor.add_child(this._dateLabel);

        this._updateClock();
        this._startTimer();

        // React to settings changes
        this._settingsIds = [
            this._settings.connect('clock-format', () => this._updateClock()),
            this._settings.connect('show-date', () => this._updateClock()),
        ];
    }

    _updateClock() {
        let now = GLib.DateTime.new_now_local();
        let format = this._settings.get('clock-format');
        let timeText = now.format(format);
        this._timeLabel.set_text(timeText);

        if (this._settings.get('show-date')) {
            let dateText = now.format(' %b %d');
            this._dateLabel.set_text(dateText);
            this._dateLabel.show();
        } else {
            this._dateLabel.hide();
        }
    }

    _startTimer() {
        this._timer = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            1,
            () => {
                this._updateClock();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    destroy() {
        if (this._timer) {
            GLib.source_remove(this._timer);
            this._timer = null;
        }

        this._settingsIds?.forEach(id => this._settings.disconnect(id));
        this._settingsIds = null;

        this.actor?.destroy();
        this.actor = null;
    }
}