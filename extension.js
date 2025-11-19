/**
 * AI Search Extension - Main Entry Point
 *
 * A futuristic, experimental GNOME Shell extension that integrates multiple
 * AI providers (OpenAI, Anthropic, Google Gemini) with multimodal capabilities
 * for an enhanced search and assistant experience.
 *
 * @author AI Search Extension Team
 * @license MIT
 */

import St from 'gi://St';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

// Import local modules
import {AISearchProvider} from './aiSearchProvider.js';
import {AIOverlay} from './aiOverlay.js';

/**
 * Panel indicator button for AI Search
 */
const AISearchIndicator = GObject.registerClass(
class AISearchIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'AI Search', false);

        this._extension = extension;

        // Create icon with pulse animation support
        this._icon = new St.Icon({
            icon_name: 'system-search-symbolic',
            style_class: 'system-status-icon ai-search-icon',
        });
        this.add_child(this._icon);

        // Build menu
        this._buildMenu();

        // Status label
        this._statusLabel = new St.Label({
            text: 'Ready',
            style_class: 'ai-search-status',
        });
    }

    _buildMenu() {
        // Quick search item
        const searchItem = new PopupMenu.PopupMenuItem('🔍 Quick AI Search');
        searchItem.connect('activate', () => {
            this._extension._overlay.show();
        });
        this.menu.addMenuItem(searchItem);

        // Screenshot + AI analysis
        const screenshotItem = new PopupMenu.PopupMenuItem('📸 Screenshot & Analyze');
        screenshotItem.connect('activate', () => {
            this._extension._captureScreenshot();
        });
        this.menu.addMenuItem(screenshotItem);

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Provider submenu
        const providerSubmenu = new PopupMenu.PopupSubMenuMenuItem('🤖 AI Provider');

        const providers = [
            { name: 'OpenAI GPT', key: 'openai' },
            { name: 'Anthropic Claude', key: 'anthropic' },
            { name: 'Google Gemini', key: 'gemini' },
            { name: 'OpenRouter', key: 'openrouter' },
        ];

        providers.forEach(provider => {
            const item = new PopupMenu.PopupMenuItem(provider.name);
            item.connect('activate', () => {
                this._extension._settings.set_string('active-provider', provider.key);
                Main.notify('AI Search', `Switched to ${provider.name}`);
            });
            providerSubmenu.menu.addMenuItem(item);
        });

        this.menu.addMenuItem(providerSubmenu);

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // History
        const historyItem = new PopupMenu.PopupMenuItem('📜 Chat History');
        historyItem.connect('activate', () => {
            this._extension._showHistory();
        });
        this.menu.addMenuItem(historyItem);

        // Settings
        const settingsItem = new PopupMenu.PopupMenuItem('⚙️ Settings');
        settingsItem.connect('activate', () => {
            this._extension.openPreferences();
        });
        this.menu.addMenuItem(settingsItem);
    }

    setLoading(loading) {
        if (loading) {
            this._icon.add_style_class_name('ai-search-loading');
        } else {
            this._icon.remove_style_class_name('ai-search-loading');
        }
    }

    updateStatus(text) {
        this._statusLabel.text = text;
    }
});

/**
 * Main Extension Class
 */
export default class AISearchExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._settings = null;
        this._searchProvider = null;
        this._overlay = null;
        this._signalIds = [];
    }

    enable() {
        console.log(`[AI Search] Enabling ${this.metadata.name} v${this.metadata.version}`);

        try {
            // Initialize settings
            this._settings = this.getSettings();

            // Create panel indicator
            if (this._settings.get_boolean('show-indicator')) {
                this._createIndicator();
            }

            // Create AI overlay
            this._overlay = new AIOverlay(this);

            // Register search provider
            this._searchProvider = new AISearchProvider(this);
            Main.overview.searchController.addProvider(this._searchProvider);

            // Add keyboard shortcuts
            this._addKeybindings();

            // Connect settings changes
            this._connectSettings();

            console.log('[AI Search] Extension enabled successfully');

        } catch (error) {
            console.error('[AI Search] Error enabling extension:', error);
            Main.notifyError('AI Search', `Failed to enable: ${error.message}`);
        }
    }

    disable() {
        console.log('[AI Search] Disabling extension');

        try {
            // Remove keyboard shortcuts
            this._removeKeybindings();

            // Disconnect settings
            this._disconnectSettings();

            // Remove search provider
            if (this._searchProvider) {
                Main.overview.searchController.removeProvider(this._searchProvider);
                this._searchProvider.destroy();
                this._searchProvider = null;
            }

            // Destroy overlay
            if (this._overlay) {
                this._overlay.destroy();
                this._overlay = null;
            }

            // Destroy indicator
            if (this._indicator) {
                this._indicator.destroy();
                this._indicator = null;
            }

            this._settings = null;

            console.log('[AI Search] Extension disabled successfully');

        } catch (error) {
            console.error('[AI Search] Error disabling extension:', error);
        }
    }

    _createIndicator() {
        this._indicator = new AISearchIndicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    _addKeybindings() {
        // Main search shortcut
        Main.wm.addKeybinding(
            'show-search-overlay',
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._overlay.toggle()
        );

        // Screenshot + AI shortcut
        Main.wm.addKeybinding(
            'screenshot-ai-analyze',
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL,
            () => this._captureScreenshot()
        );
    }

    _removeKeybindings() {
        Main.wm.removeKeybinding('show-search-overlay');
        Main.wm.removeKeybinding('screenshot-ai-analyze');
    }

    _connectSettings() {
        const settingsChangedId = this._settings.connect('changed::show-indicator', () => {
            if (this._settings.get_boolean('show-indicator') && !this._indicator) {
                this._createIndicator();
            } else if (!this._settings.get_boolean('show-indicator') && this._indicator) {
                this._indicator.destroy();
                this._indicator = null;
            }
        });

        this._signalIds.push({
            object: this._settings,
            id: settingsChangedId,
        });
    }

    _disconnectSettings() {
        this._signalIds.forEach(signal => {
            signal.object.disconnect(signal.id);
        });
        this._signalIds = [];
    }

    _captureScreenshot() {
        console.log('[AI Search] Capturing screenshot for AI analysis');

        if (this._overlay) {
            this._overlay.showScreenshotMode();
        }
    }

    _showHistory() {
        console.log('[AI Search] Showing chat history');

        if (this._overlay) {
            this._overlay.showHistory();
        }
    }

    setIndicatorLoading(loading) {
        if (this._indicator) {
            this._indicator.setLoading(loading);
        }
    }

    getActiveProvider() {
        return this._settings.get_string('active-provider');
    }

    getApiKey(provider) {
        const key = `${provider}-api-key`;
        return this._settings.get_string(key);
    }
}
