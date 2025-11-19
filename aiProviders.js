/**
 * AI Provider Manager
 *
 * Manages multiple AI provider integrations (OpenAI, Anthropic, Gemini, OpenRouter)
 * with support for multimodal capabilities.
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

/**
 * Base AI Provider class
 */
class AIProvider {
    constructor(apiKey, config = {}) {
        this.apiKey = apiKey;
        this.config = config;
        this.session = new Soup.Session();
    }

    /**
     * Send a query to the AI
     * @param {string} prompt - The user prompt
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Response object
     */
    async query(prompt, options = {}) {
        throw new Error('Must implement query() method');
    }

    /**
     * Send multimodal query (text + images)
     */
    async queryMultimodal(prompt, images, options = {}) {
        throw new Error('Must implement queryMultimodal() method');
    }

    /**
     * Make HTTP request
     * @protected
     */
    async _makeRequest(url, method, headers, body) {
        try {
            const message = new Soup.Message({
                method: method,
                uri: GLib.Uri.parse(url, GLib.UriFlags.NONE),
            });

            // Set headers
            for (const [key, value] of Object.entries(headers)) {
                message.request_headers.append(key, value);
            }

            // Set body if present
            if (body) {
                const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
                message.set_request_body_from_bytes(
                    'application/json',
                    new GLib.Bytes(bodyStr)
                );
            }

            // Send request
            const bytes = await this.session.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                null
            );

            // Parse response
            const decoder = new TextDecoder('utf-8');
            const responseText = decoder.decode(bytes.get_data());

            // Check status
            if (message.status_code !== 200) {
                throw new Error(`HTTP ${message.status_code}: ${responseText}`);
            }

            return JSON.parse(responseText);

        } catch (error) {
            console.error('[AI Provider] Request error:', error);
            throw error;
        }
    }

    destroy() {
        // Cleanup
    }
}

/**
 * OpenAI Provider (GPT-4, GPT-4 Vision, etc.)
 */
class OpenAIProvider extends AIProvider {
    constructor(apiKey, config = {}) {
        super(apiKey, config);
        this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        this.model = config.model || 'gpt-4';
    }

    async query(prompt, options = {}) {
        const response = await this._makeRequest(
            `${this.baseUrl}/chat/completions`,
            'POST',
            {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            {
                model: options.model || this.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: options.maxTokens || 1000,
                temperature: options.temperature || 0.7,
            }
        );

        return {
            text: response.choices[0].message.content,
            provider: 'openai',
            model: response.model,
        };
    }

    async queryMultimodal(prompt, images, options = {}) {
        const content = [
            {
                type: 'text',
                text: prompt,
            },
        ];

        // Add images
        for (const image of images) {
            content.push({
                type: 'image_url',
                image_url: {
                    url: `data:image/png;base64,${image.base64}`,
                },
            });
        }

        const response = await this._makeRequest(
            `${this.baseUrl}/chat/completions`,
            'POST',
            {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            {
                model: options.model || 'gpt-4-vision-preview',
                messages: [
                    {
                        role: 'user',
                        content: content,
                    },
                ],
                max_tokens: options.maxTokens || 1000,
            }
        );

        return {
            text: response.choices[0].message.content,
            provider: 'openai',
            model: response.model,
        };
    }
}

/**
 * Anthropic Provider (Claude)
 */
class AnthropicProvider extends AIProvider {
    constructor(apiKey, config = {}) {
        super(apiKey, config);
        this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
        this.model = config.model || 'claude-3-5-sonnet-20241022';
    }

    async query(prompt, options = {}) {
        const response = await this._makeRequest(
            `${this.baseUrl}/messages`,
            'POST',
            {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            {
                model: options.model || this.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: options.maxTokens || 1024,
            }
        );

        return {
            text: response.content[0].text,
            provider: 'anthropic',
            model: response.model,
        };
    }

    async queryMultimodal(prompt, images, options = {}) {
        const content = [
            {
                type: 'text',
                text: prompt,
            },
        ];

        // Add images
        for (const image of images) {
            content.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: image.base64,
                },
            });
        }

        const response = await this._makeRequest(
            `${this.baseUrl}/messages`,
            'POST',
            {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            {
                model: options.model || this.model,
                messages: [
                    {
                        role: 'user',
                        content: content,
                    },
                ],
                max_tokens: options.maxTokens || 1024,
            }
        );

        return {
            text: response.content[0].text,
            provider: 'anthropic',
            model: response.model,
        };
    }
}

/**
 * Google Gemini Provider
 */
class GeminiProvider extends AIProvider {
    constructor(apiKey, config = {}) {
        super(apiKey, config);
        this.model = config.model || 'gemini-1.5-flash';
    }

    async query(prompt, options = {}) {
        const model = options.model || this.model;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const response = await this._makeRequest(
            url,
            'POST',
            {
                'Content-Type': 'application/json',
            },
            {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
            }
        );

        return {
            text: response.candidates[0].content.parts[0].text,
            provider: 'gemini',
            model: model,
        };
    }

    async queryMultimodal(prompt, images, options = {}) {
        const model = options.model || this.model;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const parts = [
            {
                text: prompt,
            },
        ];

        // Add images
        for (const image of images) {
            parts.push({
                inline_data: {
                    mime_type: 'image/png',
                    data: image.base64,
                },
            });
        }

        const response = await this._makeRequest(
            url,
            'POST',
            {
                'Content-Type': 'application/json',
            },
            {
                contents: [
                    {
                        parts: parts,
                    },
                ],
            }
        );

        return {
            text: response.candidates[0].content.parts[0].text,
            provider: 'gemini',
            model: model,
        };
    }
}

/**
 * OpenRouter Provider (access to multiple models)
 */
class OpenRouterProvider extends AIProvider {
    constructor(apiKey, config = {}) {
        super(apiKey, config);
        this.baseUrl = 'https://openrouter.ai/api/v1';
        this.model = config.model || 'anthropic/claude-3.5-sonnet';
    }

    async query(prompt, options = {}) {
        const response = await this._makeRequest(
            `${this.baseUrl}/chat/completions`,
            'POST',
            {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': 'https://github.com/Feli87/ia-ubuntu',
            },
            {
                model: options.model || this.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }
        );

        return {
            text: response.choices[0].message.content,
            provider: 'openrouter',
            model: response.model,
        };
    }

    async queryMultimodal(prompt, images, options = {}) {
        // OpenRouter supports vision models
        const content = [
            {
                type: 'text',
                text: prompt,
            },
        ];

        for (const image of images) {
            content.push({
                type: 'image_url',
                image_url: {
                    url: `data:image/png;base64,${image.base64}`,
                },
            });
        }

        const response = await this._makeRequest(
            `${this.baseUrl}/chat/completions`,
            'POST',
            {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': 'https://github.com/Feli87/ia-ubuntu',
            },
            {
                model: options.model || 'anthropic/claude-3.5-sonnet',
                messages: [
                    {
                        role: 'user',
                        content: content,
                    },
                ],
            }
        );

        return {
            text: response.choices[0].message.content,
            provider: 'openrouter',
            model: response.model,
        };
    }
}

/**
 * AI Provider Manager
 */
export class AIProviderManager {
    constructor(extension) {
        this._extension = extension;
        this._providers = new Map();
        this._initializeProviders();
    }

    _initializeProviders() {
        const settings = this._extension._settings;

        // Initialize each provider if API key is available
        const openaiKey = settings.get_string('openai-api-key');
        if (openaiKey) {
            this._providers.set('openai', new OpenAIProvider(openaiKey));
        }

        const anthropicKey = settings.get_string('anthropic-api-key');
        if (anthropicKey) {
            this._providers.set('anthropic', new AnthropicProvider(anthropicKey));
        }

        const geminiKey = settings.get_string('gemini-api-key');
        if (geminiKey) {
            this._providers.set('gemini', new GeminiProvider(geminiKey));
        }

        const openrouterKey = settings.get_string('openrouter-api-key');
        if (openrouterKey) {
            this._providers.set('openrouter', new OpenRouterProvider(openrouterKey));
        }
    }

    /**
     * Get active provider
     */
    getActiveProvider() {
        const activeProviderName = this._extension._settings.get_string('active-provider');
        const provider = this._providers.get(activeProviderName);

        if (!provider) {
            // Fall back to first available provider
            const firstProvider = this._providers.values().next().value;
            if (!firstProvider) {
                throw new Error('No AI provider configured. Please add an API key in settings.');
            }
            return firstProvider;
        }

        return provider;
    }

    /**
     * Send query to active provider
     */
    async query(prompt, options = {}) {
        const provider = this.getActiveProvider();
        return provider.query(prompt, options);
    }

    /**
     * Send multimodal query to active provider
     */
    async queryMultimodal(prompt, images, options = {}) {
        const provider = this.getActiveProvider();
        return provider.queryMultimodal(prompt, images, options);
    }

    destroy() {
        this._providers.forEach(provider => provider.destroy());
        this._providers.clear();
    }
}
