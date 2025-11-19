/**
 * AI Overlay
 *
 * Futuristic floating overlay UI for AI interaction
 */

import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {AIProviderManager} from './aiProviders.js';
import {ScreenshotCapture} from './multimodalCapture.js';

export class AIOverlay {
    constructor(extension) {
        this._extension = extension;
        this._aiManager = new AIProviderManager(extension);
        this._screenshotCapture = new ScreenshotCapture();
        this._visible = false;
        this._conversation = [];
        this._attachedImages = [];

        this._createUI();
    }

    _createUI() {
        // Main container with glassmorphism effect
        this._container = new St.BoxLayout({
            style_class: 'ai-overlay-container',
            vertical: true,
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        // Header
        this._createHeader();

        // Messages container (scrollable)
        this._createMessagesArea();

        // Input area
        this._createInputArea();

        // Position overlay in center
        this._positionOverlay();

        // Add to UI
        Main.layoutManager.addChrome(this._container, {
            affectsInputRegion: true,
            affectsStruts: false,
            trackFullscreen: true,
        });

        // Initially hidden
        this._container.hide();
        this._container.opacity = 0;

        // Connect escape key to close
        this._connectEscapeKey();
    }

    _createHeader() {
        const header = new St.BoxLayout({
            style_class: 'ai-overlay-header',
            x_expand: true,
        });

        // Title with AI provider indicator
        this._titleLabel = new St.Label({
            text: '🤖 AI Search Assistant',
            style_class: 'ai-overlay-title',
            x_expand: true,
        });
        header.add_child(this._titleLabel);

        // Provider indicator
        this._providerLabel = new St.Label({
            text: this._getProviderName(),
            style_class: 'ai-overlay-provider',
        });
        header.add_child(this._providerLabel);

        // Close button
        const closeButton = new St.Button({
            style_class: 'ai-overlay-close-button',
            child: new St.Icon({
                icon_name: 'window-close-symbolic',
                icon_size: 16,
            }),
        });
        closeButton.connect('clicked', () => this.hide());
        header.add_child(closeButton);

        this._container.add_child(header);
    }

    _createMessagesArea() {
        // Scroll view for messages
        this._scrollView = new St.ScrollView({
            style_class: 'ai-overlay-messages-scroll',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            overlay_scrollbars: true,
        });

        this._messagesBox = new St.BoxLayout({
            style_class: 'ai-overlay-messages',
            vertical: true,
        });

        this._scrollView.add_child(this._messagesBox);
        this._container.add_child(this._scrollView);

        // Welcome message
        this._addWelcomeMessage();
    }

    _createInputArea() {
        const inputArea = new St.BoxLayout({
            style_class: 'ai-overlay-input-area',
            vertical: true,
        });

        // Image attachments preview
        this._imagesPreview = new St.BoxLayout({
            style_class: 'ai-overlay-images-preview',
            visible: false,
        });
        inputArea.add_child(this._imagesPreview);

        // Input row
        const inputRow = new St.BoxLayout({
            style_class: 'ai-overlay-input-row',
        });

        // Text entry
        this._entry = new St.Entry({
            style_class: 'ai-overlay-entry',
            hint_text: 'Ask anything, or attach a screenshot...',
            can_focus: true,
            x_expand: true,
        });

        this._entry.clutter_text.connect('activate', () => {
            this._handleSend();
        });

        // Handle text changes
        this._entry.clutter_text.connect('text-changed', () => {
            this._updateSendButton();
        });

        inputRow.add_child(this._entry);

        // Screenshot button
        const screenshotButton = new St.Button({
            style_class: 'ai-overlay-button ai-overlay-screenshot-button',
            child: new St.Icon({
                icon_name: 'camera-photo-symbolic',
                icon_size: 18,
            }),
        });
        screenshotButton.connect('clicked', () => this._handleScreenshot());
        inputRow.add_child(screenshotButton);

        // Send button
        this._sendButton = new St.Button({
            style_class: 'ai-overlay-button ai-overlay-send-button',
            child: new St.Icon({
                icon_name: 'document-send-symbolic',
                icon_size: 18,
            }),
        });
        this._sendButton.connect('clicked', () => this._handleSend());
        inputRow.add_child(this._sendButton);

        inputArea.add_child(inputRow);

        // Action buttons row
        const actionsRow = new St.BoxLayout({
            style_class: 'ai-overlay-actions-row',
        });

        const newChatButton = new St.Button({
            style_class: 'ai-overlay-action-button',
            label: '🔄 New Chat',
        });
        newChatButton.connect('clicked', () => this._clearConversation());
        actionsRow.add_child(newChatButton);

        const historyButton = new St.Button({
            style_class: 'ai-overlay-action-button',
            label: '📜 History',
        });
        historyButton.connect('clicked', () => this.showHistory());
        actionsRow.add_child(historyButton);

        inputArea.add_child(actionsRow);

        this._container.add_child(inputArea);
    }

    _positionOverlay() {
        const monitor = Main.layoutManager.primaryMonitor;
        const width = 700;
        const height = 600;

        this._container.set_size(width, height);
        this._container.set_position(
            monitor.x + Math.floor((monitor.width - width) / 2),
            monitor.y + Math.floor((monitor.height - height) / 2)
        );
    }

    _connectEscapeKey() {
        this._container.connect('key-press-event', (actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Escape) {
                this.hide();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    _addWelcomeMessage() {
        const welcome = new St.Label({
            text: `Welcome to AI Search! 👋\n\n` +
                  `Ask me anything, or press the camera button to analyze a screenshot.\n\n` +
                  `Current provider: ${this._getProviderName()}`,
            style_class: 'ai-message ai-message-system',
        });

        this._messagesBox.add_child(welcome);
    }

    _addUserMessage(text, images = []) {
        const messageBox = new St.BoxLayout({
            style_class: 'ai-message-box ai-message-user-box',
            vertical: true,
        });

        // Show images if any
        if (images.length > 0) {
            const imagesBox = new St.BoxLayout({
                style_class: 'ai-message-images',
            });

            images.forEach(image => {
                const imageWidget = new St.Icon({
                    gicon: Gio.icon_new_for_string(image.path),
                    icon_size: 100,
                    style_class: 'ai-message-image',
                });
                imagesBox.add_child(imageWidget);
            });

            messageBox.add_child(imagesBox);
        }

        const messageLabel = new St.Label({
            text: text || '🖼️ [Image]',
            style_class: 'ai-message ai-message-user',
        });
        messageLabel.clutter_text.line_wrap = true;
        messageBox.add_child(messageLabel);

        this._messagesBox.add_child(messageBox);
        this._scrollToBottom();
    }

    _addAssistantMessage(text, streaming = false) {
        const messageBox = new St.BoxLayout({
            style_class: 'ai-message-box ai-message-assistant-box',
            vertical: true,
        });

        const providerBadge = new St.Label({
            text: `${this._getProviderEmoji()} ${this._getProviderName()}`,
            style_class: 'ai-message-provider',
        });
        messageBox.add_child(providerBadge);

        const messageLabel = new St.Label({
            text: text,
            style_class: 'ai-message ai-message-assistant',
        });
        messageLabel.clutter_text.line_wrap = true;
        messageBox.add_child(messageLabel);

        // Copy button
        const copyButton = new St.Button({
            style_class: 'ai-message-copy-button',
            child: new St.Icon({
                icon_name: 'edit-copy-symbolic',
                icon_size: 14,
            }),
        });
        copyButton.connect('clicked', () => {
            const clipboard = St.Clipboard.get_default();
            clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
            Main.notify('AI Search', 'Response copied to clipboard');
        });
        messageBox.add_child(copyButton);

        this._messagesBox.add_child(messageBox);
        this._scrollToBottom();

        return messageLabel;
    }

    _addLoadingMessage() {
        const loadingBox = new St.BoxLayout({
            style_class: 'ai-message-box ai-message-loading-box',
        });

        const loadingLabel = new St.Label({
            text: '⏳ Thinking...',
            style_class: 'ai-message ai-message-loading',
        });

        loadingBox.add_child(loadingLabel);
        this._messagesBox.add_child(loadingBox);
        this._scrollToBottom();

        return loadingBox;
    }

    _removeLoadingMessage(loadingWidget) {
        if (loadingWidget && loadingWidget.get_parent()) {
            this._messagesBox.remove_child(loadingWidget);
        }
    }

    _scrollToBottom() {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            const adjustment = this._scrollView.get_vscroll_bar().get_adjustment();
            adjustment.set_value(adjustment.upper);
            return GLib.SOURCE_REMOVE;
        });
    }

    async _handleSend() {
        const text = this._entry.get_text().trim();

        if (!text && this._attachedImages.length === 0) {
            return;
        }

        // Disable input
        this._setInputEnabled(false);

        // Add user message
        this._addUserMessage(text, this._attachedImages);

        // Clear input
        this._entry.set_text('');
        this._clearAttachedImages();

        // Show loading
        const loadingWidget = this._addLoadingMessage();

        try {
            // Get AI response
            let response;
            if (this._attachedImages.length > 0) {
                // Multimodal query
                const images = await Promise.all(
                    this._attachedImages.map(img => this._imageToBase64(img.path))
                );
                response = await this._aiManager.queryMultimodal(text || 'What is in this image?', images);
            } else {
                // Text-only query
                response = await this._aiManager.query(text);
            }

            // Remove loading
            this._removeLoadingMessage(loadingWidget);

            // Add response
            this._addAssistantMessage(response.text);

            // Store in conversation
            this._conversation.push({
                role: 'user',
                content: text,
                images: this._attachedImages,
                timestamp: Date.now(),
            });

            this._conversation.push({
                role: 'assistant',
                content: response.text,
                timestamp: Date.now(),
            });

        } catch (error) {
            console.error('[AI Overlay] Query error:', error);

            // Remove loading
            this._removeLoadingMessage(loadingWidget);

            // Show error
            this._addAssistantMessage(`⚠️ Error: ${error.message}\n\nPlease check your API key in settings.`);
        }

        // Re-enable input
        this._setInputEnabled(true);
        this._entry.grab_key_focus();
    }

    async _handleScreenshot() {
        console.log('[AI Overlay] Triggering screenshot capture');

        try {
            // Hide overlay temporarily
            this.hide();

            // Wait a bit for overlay to close
            await new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                resolve();
                return GLib.SOURCE_REMOVE;
            }));

            // Capture screenshot
            const imagePath = await this._screenshotCapture.captureArea();

            if (imagePath) {
                // Show overlay again
                this.show();

                // Attach image
                this._attachImage(imagePath);

                Main.notify('AI Search', 'Screenshot captured! Send your question.');
            } else {
                this.show();
            }

        } catch (error) {
            console.error('[AI Overlay] Screenshot error:', error);
            this.show();
            Main.notify('AI Search', `Screenshot failed: ${error.message}`);
        }
    }

    _attachImage(path) {
        this._attachedImages.push({
            path: path,
            timestamp: Date.now(),
        });

        this._updateImagesPreview();
        this._updateSendButton();
    }

    _updateImagesPreview() {
        // Clear preview
        this._imagesPreview.destroy_all_children();

        if (this._attachedImages.length === 0) {
            this._imagesPreview.hide();
            return;
        }

        this._imagesPreview.show();

        this._attachedImages.forEach((image, index) => {
            const imageBox = new St.BoxLayout({
                style_class: 'ai-image-preview-box',
                vertical: true,
            });

            const imageWidget = new St.Icon({
                gicon: Gio.icon_new_for_string(image.path),
                icon_size: 80,
                style_class: 'ai-image-preview',
            });

            const removeButton = new St.Button({
                style_class: 'ai-image-preview-remove',
                child: new St.Icon({
                    icon_name: 'window-close-symbolic',
                    icon_size: 14,
                }),
            });
            removeButton.connect('clicked', () => {
                this._attachedImages.splice(index, 1);
                this._updateImagesPreview();
                this._updateSendButton();
            });

            imageBox.add_child(imageWidget);
            imageBox.add_child(removeButton);

            this._imagesPreview.add_child(imageBox);
        });
    }

    _clearAttachedImages() {
        this._attachedImages = [];
        this._updateImagesPreview();
    }

    async _imageToBase64(path) {
        try {
            const file = Gio.File.new_for_path(path);
            const [success, contents] = file.load_contents(null);

            if (!success) {
                throw new Error('Failed to load image');
            }

            // Convert to base64
            const base64 = GLib.base64_encode(contents);

            return {
                base64: base64,
                mimeType: 'image/png',
            };

        } catch (error) {
            console.error('[AI Overlay] Image to base64 error:', error);
            throw error;
        }
    }

    _setInputEnabled(enabled) {
        this._entry.reactive = enabled;
        this._entry.can_focus = enabled;
        this._sendButton.reactive = enabled;
    }

    _updateSendButton() {
        const hasText = this._entry.get_text().trim().length > 0;
        const hasImages = this._attachedImages.length > 0;

        this._sendButton.reactive = hasText || hasImages;
        this._sendButton.opacity = (hasText || hasImages) ? 255 : 128;
    }

    _clearConversation() {
        this._messagesBox.destroy_all_children();
        this._conversation = [];
        this._addWelcomeMessage();
        Main.notify('AI Search', 'Conversation cleared');
    }

    _getProviderName() {
        const provider = this._extension._settings.get_string('active-provider');
        const names = {
            'openai': 'OpenAI GPT',
            'anthropic': 'Claude',
            'gemini': 'Google Gemini',
            'openrouter': 'OpenRouter',
        };
        return names[provider] || 'AI';
    }

    _getProviderEmoji() {
        const provider = this._extension._settings.get_string('active-provider');
        const emojis = {
            'openai': '🟢',
            'anthropic': '🟣',
            'gemini': '🔵',
            'openrouter': '🌐',
        };
        return emojis[provider] || '🤖';
    }

    show(initialQuery = null) {
        if (this._visible) return;

        this._visible = true;
        this._container.show();

        // Animate in
        this._container.ease({
            opacity: 255,
            duration: 200,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                this._entry.grab_key_focus();

                if (initialQuery) {
                    this._entry.set_text(initialQuery);
                }
            },
        });

        // Update provider label
        this._providerLabel.text = this._getProviderName();
    }

    hide() {
        if (!this._visible) return;

        this._visible = false;

        // Animate out
        this._container.ease({
            opacity: 0,
            duration: 200,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                this._container.hide();
            },
        });
    }

    toggle() {
        if (this._visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    showResponse(text) {
        this.show();
        this._addAssistantMessage(text);
    }

    showScreenshotMode() {
        this._handleScreenshot();
    }

    showHistory() {
        Main.notify('AI Search', 'History feature coming soon!');
    }

    destroy() {
        if (this._container) {
            Main.layoutManager.removeChrome(this._container);
            this._container.destroy();
            this._container = null;
        }

        if (this._aiManager) {
            this._aiManager.destroy();
            this._aiManager = null;
        }

        if (this._screenshotCapture) {
            this._screenshotCapture.destroy();
            this._screenshotCapture = null;
        }
    }
}
