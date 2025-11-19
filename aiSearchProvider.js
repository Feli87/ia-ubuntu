/**
 * AI Search Provider
 *
 * Integrates with GNOME Shell's search system to provide AI-powered results.
 */

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {AIProviderManager} from './aiProviders.js';

export class AISearchProvider {
    constructor(extension) {
        this.id = extension.uuid;
        this.appInfo = null;
        this.canLaunchSearch = true;
        this._extension = extension;
        this._resultsCache = new Map();
        this._aiManager = new AIProviderManager(extension);
    }

    /**
     * Get initial search results
     */
    async getInitialResultSet(terms, cancellable) {
        const query = terms.join(' ');

        // Only trigger AI search if query starts with special prefix or is long enough
        if (!this._shouldTriggerAISearch(query)) {
            return [];
        }

        console.log(`[AI Search Provider] Searching: ${query}`);

        try {
            const results = await this._performAISearch(query, cancellable);
            return results.map(r => r.id);
        } catch (error) {
            console.error('[AI Search Provider] Search error:', error);
            return [];
        }
    }

    /**
     * Get refined search results
     */
    async getSubsearchResultSet(previousResults, terms, cancellable) {
        // For simplicity, perform a new search
        return this.getInitialResultSet(terms, cancellable);
    }

    /**
     * Get result metadata for display
     */
    async getResultMetas(results, cancellable) {
        const metas = [];

        for (const id of results) {
            const result = this._resultsCache.get(id);
            if (!result) continue;

            metas.push({
                id: id,
                name: result.title,
                description: result.description,
                createIcon: (size) => {
                    const {scaleFactor} = St.ThemeContext.get_for_stage(global.stage);
                    return new St.Icon({
                        icon_name: result.icon || 'dialog-question-symbolic',
                        width: size * scaleFactor,
                        height: size * scaleFactor,
                    });
                },
                clipboardText: result.clipboardText || result.description,
            });
        }

        return metas;
    }

    /**
     * Filter results to maximum count
     */
    filterResults(results, maxResults) {
        return results.slice(0, maxResults);
    }

    /**
     * Handle result activation
     */
    activateResult(result, terms) {
        const resultData = this._resultsCache.get(result);
        if (!resultData) return;

        console.log(`[AI Search Provider] Activated: ${resultData.title}`);

        if (resultData.action) {
            resultData.action();
        } else if (resultData.text) {
            // Copy to clipboard and show full response
            const clipboard = St.Clipboard.get_default();
            clipboard.set_text(St.ClipboardType.CLIPBOARD, resultData.text);
            Main.notify('AI Search', 'Response copied to clipboard');

            // Show detailed view
            this._extension._overlay.showResponse(resultData.text);
        }
    }

    /**
     * Launch full search (when clicking "Search in AI")
     */
    launchSearch(terms) {
        const query = terms.join(' ');
        this._extension._overlay.show(query);
    }

    /**
     * Create custom result display
     */
    createResultObject(meta) {
        // Use default display
        return null;
    }

    /**
     * Check if AI search should be triggered
     * @private
     */
    _shouldTriggerAISearch(query) {
        // Trigger if starts with "ai:" or "ask:" prefix
        if (query.startsWith('ai:') || query.startsWith('ask:')) {
            return true;
        }

        // Trigger if query is a question (contains ?, what, how, why, etc.)
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('?')) {
            return true;
        }

        for (const word of questionWords) {
            if (lowerQuery.startsWith(word + ' ')) {
                return true;
            }
        }

        // Trigger if query is longer than 5 words (likely a complex query)
        if (query.split(' ').length >= 5) {
            return true;
        }

        return false;
    }

    /**
     * Perform AI search
     * @private
     */
    async _performAISearch(query, cancellable) {
        this._resultsCache.clear();

        // Remove prefix if present
        let cleanQuery = query.replace(/^(ai:|ask:)\s*/i, '');

        try {
            // Get AI response
            const response = await this._aiManager.query(cleanQuery, {
                stream: false,
                maxTokens: 500,
            });

            if (!response || !response.text) {
                return [];
            }

            // Create result
            const result = {
                id: `ai-${Date.now()}`,
                title: `AI: ${this._truncate(cleanQuery, 60)}`,
                description: this._truncate(response.text, 150),
                text: response.text,
                icon: this._getProviderIcon(response.provider),
                clipboardText: response.text,
            };

            this._resultsCache.set(result.id, result);

            // Add related suggestions if any
            const results = [result];

            if (response.suggestions) {
                response.suggestions.forEach((suggestion, index) => {
                    const suggestionResult = {
                        id: `ai-suggestion-${Date.now()}-${index}`,
                        title: `💡 ${suggestion.title}`,
                        description: suggestion.description,
                        icon: 'emblem-documents-symbolic',
                        action: () => {
                            this._extension._overlay.show(suggestion.query);
                        },
                    };
                    this._resultsCache.set(suggestionResult.id, suggestionResult);
                    results.push(suggestionResult);
                });
            }

            return results;

        } catch (error) {
            console.error('[AI Search Provider] AI query error:', error);

            // Return error result
            const errorResult = {
                id: `ai-error-${Date.now()}`,
                title: '⚠️ AI Search Error',
                description: error.message || 'Failed to get AI response',
                icon: 'dialog-error-symbolic',
                action: () => {
                    this._extension.openPreferences();
                },
            };

            this._resultsCache.set(errorResult.id, errorResult);
            return [errorResult];
        }
    }

    /**
     * Get icon for AI provider
     * @private
     */
    _getProviderIcon(provider) {
        const icons = {
            'openai': 'applications-science-symbolic',
            'anthropic': 'applications-utilities-symbolic',
            'gemini': 'emblem-favorite-symbolic',
            'openrouter': 'network-server-symbolic',
        };

        return icons[provider] || 'dialog-question-symbolic';
    }

    /**
     * Truncate text to specified length
     * @private
     */
    _truncate(text, maxLength) {
        if (!text) return '';

        if (text.length <= maxLength) {
            return text;
        }

        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Clean up
     */
    destroy() {
        if (this._resultsCache) {
            this._resultsCache.clear();
            this._resultsCache = null;
        }

        if (this._aiManager) {
            this._aiManager.destroy();
            this._aiManager = null;
        }
    }
}
