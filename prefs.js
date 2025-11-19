/**
 * AI Search Extension - Preferences
 *
 * Modern preferences UI using Adwaita widgets
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AISearchPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // General Page
        const generalPage = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(generalPage);

        // UI Settings Group
        const uiGroup = new Adw.PreferencesGroup({
            title: 'User Interface',
            description: 'Configure the appearance and behavior',
        });
        generalPage.add(uiGroup);

        // Show indicator
        const showIndicatorRow = new Adw.SwitchRow({
            title: 'Show Panel Indicator',
            subtitle: 'Display AI Search icon in the top panel',
        });
        settings.bind('show-indicator', showIndicatorRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        uiGroup.add(showIndicatorRow);

        // Theme style
        const themeRow = new Adw.ComboRow({
            title: 'Theme Style',
            subtitle: 'Choose the UI theme style',
        });
        const themeModel = new Gtk.StringList();
        themeModel.append('Auto (Follow system)');
        themeModel.append('Light');
        themeModel.append('Dark');
        themeModel.append('Futuristic');
        themeRow.model = themeModel;
        themeRow.selected = ['auto', 'light', 'dark', 'futuristic'].indexOf(
            settings.get_string('theme-style')
        );
        themeRow.connect('notify::selected', (widget) => {
            const themes = ['auto', 'light', 'dark', 'futuristic'];
            settings.set_string('theme-style', themes[widget.selected]);
        });
        uiGroup.add(themeRow);

        // Overlay dimensions group
        const dimensionsGroup = new Adw.PreferencesGroup({
            title: 'Overlay Dimensions',
        });
        generalPage.add(dimensionsGroup);

        // Width
        const widthRow = new Adw.SpinRow({
            title: 'Overlay Width',
            subtitle: 'Width in pixels',
            adjustment: new Gtk.Adjustment({
                lower: 400,
                upper: 1200,
                step_increment: 50,
                value: settings.get_int('overlay-width'),
            }),
        });
        settings.bind('overlay-width', widthRow, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        dimensionsGroup.add(widthRow);

        // Height
        const heightRow = new Adw.SpinRow({
            title: 'Overlay Height',
            subtitle: 'Height in pixels',
            adjustment: new Gtk.Adjustment({
                lower: 300,
                upper: 1000,
                step_increment: 50,
                value: settings.get_int('overlay-height'),
            }),
        });
        settings.bind('overlay-height', heightRow, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        dimensionsGroup.add(heightRow);

        // AI Providers Page
        const providersPage = new Adw.PreferencesPage({
            title: 'AI Providers',
            icon_name: 'network-wireless-symbolic',
        });
        window.add(providersPage);

        // Active provider group
        const activeProviderGroup = new Adw.PreferencesGroup({
            title: 'Active Provider',
            description: 'Select which AI provider to use',
        });
        providersPage.add(activeProviderGroup);

        // Active provider selector
        const providerRow = new Adw.ComboRow({
            title: 'AI Provider',
            subtitle: 'Choose your preferred AI provider',
        });
        const providerModel = new Gtk.StringList();
        providerModel.append('OpenAI GPT');
        providerModel.append('Anthropic Claude');
        providerModel.append('Google Gemini');
        providerModel.append('OpenRouter');
        providerRow.model = providerModel;
        providerRow.selected = ['openai', 'anthropic', 'gemini', 'openrouter'].indexOf(
            settings.get_string('active-provider')
        );
        providerRow.connect('notify::selected', (widget) => {
            const providers = ['openai', 'anthropic', 'gemini', 'openrouter'];
            settings.set_string('active-provider', providers[widget.selected]);
        });
        activeProviderGroup.add(providerRow);

        // OpenAI Group
        const openaiGroup = new Adw.PreferencesGroup({
            title: '🟢 OpenAI',
            description: 'Configure OpenAI GPT models',
        });
        providersPage.add(openaiGroup);

        const openaiKeyRow = new Adw.PasswordEntryRow({
            title: 'API Key',
        });
        settings.bind('openai-api-key', openaiKeyRow, 'text',
            Gio.SettingsBindFlags.DEFAULT);

        // Add validation indicator
        openaiKeyRow.connect('changed', () => {
            const key = openaiKeyRow.get_text();
            if (key.length === 0) {
                openaiKeyRow.remove_css_class('error');
                openaiKeyRow.remove_css_class('success');
                return;
            }

            // Validate OpenAI key format (starts with 'sk-')
            if (key.startsWith('sk-') && key.length > 20) {
                openaiKeyRow.remove_css_class('error');
                openaiKeyRow.add_css_class('success');
            } else {
                openaiKeyRow.add_css_class('error');
                openaiKeyRow.remove_css_class('success');
            }
        });

        openaiGroup.add(openaiKeyRow);

        const openaiModelRow = new Adw.EntryRow({
            title: 'Model',
            text: settings.get_string('openai-model'),
        });
        settings.bind('openai-model', openaiModelRow, 'text',
            Gio.SettingsBindFlags.DEFAULT);
        openaiGroup.add(openaiModelRow);

        // Info button for OpenAI
        const openaiInfoButton = new Gtk.Button({
            label: 'Get API Key',
            valign: Gtk.Align.CENTER,
        });
        openaiInfoButton.connect('clicked', () => {
            Gtk.show_uri(window, 'https://platform.openai.com/api-keys', Gtk.get_current_event_time());
        });
        const openaiButtonRow = new Adw.ActionRow({
            title: 'Need an API key?',
        });
        openaiButtonRow.add_suffix(openaiInfoButton);
        openaiGroup.add(openaiButtonRow);

        // Anthropic Group
        const anthropicGroup = new Adw.PreferencesGroup({
            title: '🟣 Anthropic Claude',
            description: 'Configure Anthropic Claude models',
        });
        providersPage.add(anthropicGroup);

        const anthropicKeyRow = new Adw.PasswordEntryRow({
            title: 'API Key',
        });
        settings.bind('anthropic-api-key', anthropicKeyRow, 'text',
            Gio.SettingsBindFlags.DEFAULT);

        // Add validation for Anthropic API key
        anthropicKeyRow.connect('changed', () => {
            const key = anthropicKeyRow.get_text();
            if (key.length === 0) {
                anthropicKeyRow.remove_css_class('error');
                anthropicKeyRow.remove_css_class('success');
                return;
            }

            // Validate Anthropic key format (starts with 'sk-ant-')
            if (key.startsWith('sk-ant-') && key.length > 30) {
                anthropicKeyRow.remove_css_class('error');
                anthropicKeyRow.add_css_class('success');
            } else {
                anthropicKeyRow.add_css_class('error');
                anthropicKeyRow.remove_css_class('success');
            }
        });

        anthropicGroup.add(anthropicKeyRow);

        const anthropicModelRow = new Adw.EntryRow({
            title: 'Model',
            text: settings.get_string('anthropic-model'),
        });
        settings.bind('anthropic-model', anthropicModelRow, 'text',
            Gio.SettingsBindFlags.DEFAULT);
        anthropicGroup.add(anthropicModelRow);

        const anthropicInfoButton = new Gtk.Button({
            label: 'Get API Key',
            valign: Gtk.Align.CENTER,
        });
        anthropicInfoButton.connect('clicked', () => {
            Gtk.show_uri(window, 'https://console.anthropic.com/settings/keys', Gtk.get_current_event_time());
        });
        const anthropicButtonRow = new Adw.ActionRow({
            title: 'Need an API key?',
        });
        anthropicButtonRow.add_suffix(anthropicInfoButton);
        anthropicGroup.add(anthropicButtonRow);

        // Gemini Group
        const geminiGroup = new Adw.PreferencesGroup({
            title: '🔵 Google Gemini',
            description: 'Configure Google Gemini models',
        });
        providersPage.add(geminiGroup);

        const geminiKeyRow = new Adw.PasswordEntryRow({
            title: 'API Key',
        });
        settings.bind('gemini-api-key', geminiKeyRow, 'text',
            Gio.SettingsBindFlags.DEFAULT);

        // Add validation for Gemini API key
        geminiKeyRow.connect('changed', () => {
            const key = geminiKeyRow.get_text();
            if (key.length === 0) {
                geminiKeyRow.remove_css_class('error');
                geminiKeyRow.remove_css_class('success');
                return;
            }

            // Validate Gemini key format (alphanumeric, typically 39 chars)
            if (key.length >= 30 && /^[A-Za-z0-9_-]+$/.test(key)) {
                geminiKeyRow.remove_css_class('error');
                geminiKeyRow.add_css_class('success');
            } else {
                geminiKeyRow.add_css_class('error');
                geminiKeyRow.remove_css_class('success');
            }
        });

        geminiGroup.add(geminiKeyRow);

        const geminiModelRow = new Adw.EntryRow({
            title: 'Model',
            text: settings.get_string('gemini-model'),
        });
        settings.bind('gemini-model', geminiModelRow, 'text',
            Gio.SettingsBindFlags.DEFAULT);
        geminiGroup.add(geminiModelRow);

        const geminiInfoButton = new Gtk.Button({
            label: 'Get API Key',
            valign: Gtk.Align.CENTER,
        });
        geminiInfoButton.connect('clicked', () => {
            Gtk.show_uri(window, 'https://aistudio.google.com/app/apikey', Gtk.get_current_event_time());
        });
        const geminiButtonRow = new Adw.ActionRow({
            title: 'Need an API key?',
        });
        geminiButtonRow.add_suffix(geminiInfoButton);
        geminiGroup.add(geminiButtonRow);

        // OpenRouter Group
        const openrouterGroup = new Adw.PreferencesGroup({
            title: '🌐 OpenRouter',
            description: 'Access to multiple AI models via OpenRouter',
        });
        providersPage.add(openrouterGroup);

        const openrouterKeyRow = new Adw.PasswordEntryRow({
            title: 'API Key',
        });
        settings.bind('openrouter-api-key', openrouterKeyRow, 'text',
            Gio.SettingsBindFlags.DEFAULT);

        // Add validation for OpenRouter API key
        openrouterKeyRow.connect('changed', () => {
            const key = openrouterKeyRow.get_text();
            if (key.length === 0) {
                openrouterKeyRow.remove_css_class('error');
                openrouterKeyRow.remove_css_class('success');
                return;
            }

            // Validate OpenRouter key format (starts with 'sk-or-')
            if (key.startsWith('sk-or-') && key.length > 30) {
                openrouterKeyRow.remove_css_class('error');
                openrouterKeyRow.add_css_class('success');
            } else {
                openrouterKeyRow.add_css_class('error');
                openrouterKeyRow.remove_css_class('success');
            }
        });

        openrouterGroup.add(openrouterKeyRow);

        const openrouterModelRow = new Adw.EntryRow({
            title: 'Model',
            text: settings.get_string('openrouter-model'),
        });
        settings.bind('openrouter-model', openrouterModelRow, 'text',
            Gio.SettingsBindFlags.DEFAULT);
        openrouterGroup.add(openrouterModelRow);

        const openrouterInfoButton = new Gtk.Button({
            label: 'Get API Key',
            valign: Gtk.Align.CENTER,
        });
        openrouterInfoButton.connect('clicked', () => {
            Gtk.show_uri(window, 'https://openrouter.ai/keys', Gtk.get_current_event_time());
        });
        const openrouterButtonRow = new Adw.ActionRow({
            title: 'Need an API key?',
        });
        openrouterButtonRow.add_suffix(openrouterInfoButton);
        openrouterGroup.add(openrouterButtonRow);

        // Advanced Page
        const advancedPage = new Adw.PreferencesPage({
            title: 'Advanced',
            icon_name: 'preferences-other-symbolic',
        });
        window.add(advancedPage);

        // AI Settings Group
        const aiSettingsGroup = new Adw.PreferencesGroup({
            title: 'AI Parameters',
        });
        advancedPage.add(aiSettingsGroup);

        // Max tokens
        const maxTokensRow = new Adw.SpinRow({
            title: 'Maximum Tokens',
            subtitle: 'Maximum length of AI responses',
            adjustment: new Gtk.Adjustment({
                lower: 100,
                upper: 4000,
                step_increment: 100,
                value: settings.get_int('max-tokens'),
            }),
        });
        settings.bind('max-tokens', maxTokensRow, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        aiSettingsGroup.add(maxTokensRow);

        // Temperature
        const temperatureRow = new Adw.SpinRow({
            title: 'Temperature',
            subtitle: 'Creativity level (0.0 = focused, 1.0 = creative)',
            adjustment: new Gtk.Adjustment({
                lower: 0.0,
                upper: 1.0,
                step_increment: 0.1,
                value: settings.get_double('temperature'),
            }),
            digits: 1,
        });
        settings.bind('temperature', temperatureRow, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        aiSettingsGroup.add(temperatureRow);

        // Search Provider Group
        const searchGroup = new Adw.PreferencesGroup({
            title: 'GNOME Search Integration',
        });
        advancedPage.add(searchGroup);

        const enableSearchRow = new Adw.SwitchRow({
            title: 'Enable Search Provider',
            subtitle: 'Show AI results in GNOME Shell search',
        });
        settings.bind('enable-search-provider', enableSearchRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        searchGroup.add(enableSearchRow);

        // History Group
        const historyGroup = new Adw.PreferencesGroup({
            title: 'Conversation History',
        });
        advancedPage.add(historyGroup);

        const saveHistoryRow = new Adw.SwitchRow({
            title: 'Save Conversation History',
            subtitle: 'Store conversations locally',
        });
        settings.bind('save-conversation-history', saveHistoryRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);
        historyGroup.add(saveHistoryRow);

        // Screenshot cleanup
        const cleanupGroup = new Adw.PreferencesGroup({
            title: 'Screenshot Cleanup',
        });
        advancedPage.add(cleanupGroup);

        const cleanupRow = new Adw.SpinRow({
            title: 'Delete Screenshots After',
            subtitle: 'Hours after which temporary screenshots are deleted',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 168,
                step_increment: 1,
                value: settings.get_int('cleanup-screenshots-hours'),
            }),
        });
        settings.bind('cleanup-screenshots-hours', cleanupRow, 'value',
            Gio.SettingsBindFlags.DEFAULT);
        cleanupGroup.add(cleanupRow);

        // About Page
        const aboutPage = new Adw.PreferencesPage({
            title: 'About',
            icon_name: 'help-about-symbolic',
        });
        window.add(aboutPage);

        const aboutGroup = new Adw.PreferencesGroup();
        aboutPage.add(aboutGroup);

        const aboutRow = new Adw.ActionRow({
            title: 'AI Search - Multimodal Assistant',
            subtitle: 'Futuristic AI-powered search with multimodal capabilities\n\n' +
                      'Version 1.0\n\n' +
                      'A modern GNOME Shell extension that integrates OpenAI GPT, ' +
                      'Anthropic Claude, and Google Gemini with advanced screenshot ' +
                      'and image processing capabilities.',
        });
        aboutGroup.add(aboutRow);

        const githubButton = new Gtk.Button({
            label: 'View on GitHub',
            valign: Gtk.Align.CENTER,
        });
        githubButton.connect('clicked', () => {
            Gtk.show_uri(window, 'https://github.com/Feli87/ia-ubuntu', Gtk.get_current_event_time());
        });
        const githubRow = new Adw.ActionRow({
            title: 'Source Code',
        });
        githubRow.add_suffix(githubButton);
        aboutGroup.add(githubRow);

        // License
        const licenseRow = new Adw.ActionRow({
            title: 'License',
            subtitle: 'MIT License - Open Source',
        });
        aboutGroup.add(licenseRow);
    }
}
