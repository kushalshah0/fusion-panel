import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';

export class DragDropManager {
    constructor(taskbar, settings) {
        this._taskbar = taskbar;
        this._settings = settings;
        this._dragPlaceholder = null;
        this._dragOriginalIndex = -1;
    }

    makeDraggable(appButton) {
        if (!this._settings.get('enable-drag-drop')) return;

        let draggable = DND.makeDraggable(appButton, {
            manualMode: false,
            dragActorMaxSize: 48,
            dragActorOpacity: 200,
        });

        draggable.connect('drag-begin', this._onDragBegin.bind(this));
        draggable.connect('drag-end', this._onDragEnd.bind(this));
        draggable.connect('drag-cancelled', this._onDragCancelled.bind(this));

        appButton._draggable = draggable;
        appButton._delegate = appButton;

        // Make the taskbar a drop target
        this._taskbar.actor._delegate = this._taskbar.actor;
        this._taskbar.actor._delegate.acceptDrop = this._acceptDrop.bind(this);
        this._taskbar.actor._delegate.handleDragOver = this._handleDragOver.bind(this);
    }

    _onDragBegin(draggable, time) {
        let actor = draggable.actor;
        let parent = actor.get_parent();

        if (parent) {
            this._dragOriginalIndex = parent.get_children().indexOf(actor);
        }

        // Create a placeholder
        this._dragPlaceholder = new St.Widget({
            style_class: 'fusion-drag-placeholder',
            width: actor.width,
            height: actor.height,
        });
    }

    _handleDragOver(source, actor, x, y) {
        if (!source || !source._app) return DND.DragMotionResult.NO_DROP;

        let taskbarActor = this._taskbar.actor;
        let children = taskbarActor.get_children().filter(
            c => c !== this._dragPlaceholder
        );

        // Find the position where the dragged icon should go
        let insertIndex = children.length;

        for (let i = 0; i < children.length; i++) {
            let childX = children[i].get_transformed_position()[0];
            let childW = children[i].width;

            if (x < childX + childW / 2) {
                insertIndex = i;
                break;
            }
        }

        // Remove existing placeholder
        if (this._dragPlaceholder.get_parent()) {
            this._dragPlaceholder.get_parent().remove_child(this._dragPlaceholder);
        }

        // Insert placeholder at position
        taskbarActor.insert_child_at_index(this._dragPlaceholder, insertIndex);

        return DND.DragMotionResult.MOVE_DROP;
    }

    _acceptDrop(source, actor, x, y) {
        if (!source || !source._app) return false;

        let app = source._app;
        let taskbarActor = this._taskbar.actor;

        // Find the new index (where placeholder is)
        let placeholderIndex = taskbarActor.get_children().indexOf(this._dragPlaceholder);

        // Remove placeholder
        if (this._dragPlaceholder.get_parent()) {
            this._dragPlaceholder.get_parent().remove_child(this._dragPlaceholder);
        }

        // Update favorites order
        let favorites = AppFavorites.getAppFavorites();
        let favIds = favorites.getFavoriteMap();

        if (favIds[app.get_id()]) {
            // It's a favorite — reorder it
            favorites.moveFavoriteToPos(app.get_id(), placeholderIndex);
        } else {
            // Not a favorite — pin it at the dropped position
            favorites.addFavoriteAtPos(app.get_id(), placeholderIndex);
        }

        // Save custom order
        this._saveIconOrder();

        return true;
    }

    _onDragEnd(draggable, time, snapback) {
        this._cleanupPlaceholder();
    }

    _onDragCancelled(draggable, time) {
        this._cleanupPlaceholder();
    }

    _cleanupPlaceholder() {
        if (this._dragPlaceholder) {
            if (this._dragPlaceholder.get_parent()) {
                this._dragPlaceholder.get_parent().remove_child(this._dragPlaceholder);
            }
            this._dragPlaceholder.destroy();
            this._dragPlaceholder = null;
        }
    }

    _saveIconOrder() {
        let taskbarActor = this._taskbar.actor;
        let children = taskbarActor.get_children();
        let order = [];

        children.forEach(child => {
            if (child._app) {
                order.push(child._app.get_id());
            }
        });

        this._settings.set('icon-order', order);
    }

    getCustomOrder() {
        return this._settings.get('icon-order') || [];
    }

    destroy() {
        this._cleanupPlaceholder();
        this._taskbar = null;
        this._settings = null;
    }
}