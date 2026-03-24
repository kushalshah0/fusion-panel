import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class WorkspaceIndicator {
    constructor(settings) {
        this._settings = settings;
        this._dots = [];

        this.actor = new St.BoxLayout({
            style_class: 'fusion-workspace-indicator',
            y_align: Clutter.ActorAlign.CENTER,
            reactive: true,
        });

        this._buildIndicator();

        // Listen for workspace changes
        this._workspaceSignals = [
            global.workspace_manager.connect(
                'workspace-switched',
                this._onWorkspaceSwitched.bind(this)
            ),
            global.workspace_manager.connect(
                'notify::n-workspaces',
                this._buildIndicator.bind(this)
            ),
        ];
    }

    _buildIndicator() {
        this.actor.destroy_all_children();
        this._dots = [];

        let nWorkspaces = global.workspace_manager.get_n_workspaces();
        let activeIndex = global.workspace_manager.get_active_workspace_index();

        for (let i = 0; i < nWorkspaces; i++) {
            let dot = new St.Button({
                style_class: i === activeIndex
                    ? 'fusion-workspace-dot active'
                    : 'fusion-workspace-dot',
                reactive: true,
                can_focus: true,
            });

            let workspaceIndex = i;
            dot.connect('clicked', () => {
                let ws = global.workspace_manager.get_workspace_by_index(workspaceIndex);
                ws.activate(global.get_current_time());
            });

            this.actor.add_child(dot);
            this._dots.push(dot);
        }
    }

    _onWorkspaceSwitched() {
        let activeIndex = global.workspace_manager.get_active_workspace_index();

        this._dots.forEach((dot, i) => {
            if (i === activeIndex) {
                dot.add_style_class_name('active');
            } else {
                dot.remove_style_class_name('active');
            }
        });
    }

    destroy() {
        this._workspaceSignals?.forEach(id => {
            global.workspace_manager.disconnect(id);
        });
        this._workspaceSignals = null;

        this.actor?.destroy();
        this.actor = null;
        this._dots = [];
    }
}