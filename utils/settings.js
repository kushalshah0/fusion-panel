import Gio from 'gi://Gio';

export class SettingsManager {
    constructor(extensionDir) {
        const schemaDir = extensionDir.get_child('schemas');
        let schemaSource;

        if (schemaDir.query_exists(null)) {
            schemaSource = Gio.SettingsSchemaSource.new_from_directory(
                schemaDir.get_path(),
                Gio.SettingsSchemaSource.get_default(),
                false
            );
        } else {
            schemaSource = Gio.SettingsSchemaSource.get_default();
        }

        const schemaObj = schemaSource.lookup(
            'org.gnome.shell.extensions.fusion-panel',
            true
        );

        if (!schemaObj) {
            throw new Error('Schema not found. Did you compile it?');
        }

        this._settings = new Gio.Settings({ settings_schema: schemaObj });
        this._connections = [];
    }

    get(key) {
        const schemaKey = this._settings.settings_schema.get_key(key);
        const type = schemaKey.get_value_type().dup_string();

        switch (type) {
            case 'b': return this._settings.get_boolean(key);
            case 'i': return this._settings.get_int(key);
            case 'd': return this._settings.get_double(key);
            case 's': return this._settings.get_string(key);
            default: return this._settings.get_value(key);
        }
    }

    set(key, value) {
        const schemaKey = this._settings.settings_schema.get_key(key);
        const type = schemaKey.get_value_type().dup_string();

        switch (type) {
            case 'b': this._settings.set_boolean(key, value); break;
            case 'i': this._settings.set_int(key, value); break;
            case 'd': this._settings.set_double(key, value); break;
            case 's': this._settings.set_string(key, value); break;
        }
    }

    connect(key, callback) {
        const id = this._settings.connect(`changed::${key}`, callback);
        this._connections.push(id);
        return id;
    }

    disconnect(id) {
        this._settings.disconnect(id);
        this._connections = this._connections.filter(c => c !== id);
    }

    disconnectAll() {
        this._connections.forEach(id => {
            try { this._settings.disconnect(id); } catch (e) {}
        });
        this._connections = [];
    }

    destroy() {
        this.disconnectAll();
        this._settings = null;
    }
}