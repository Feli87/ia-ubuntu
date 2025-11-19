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
 * Custom error class for AI provider errors
 */
class AIProviderError extends Error {
    constructor(message, code, retryable = false, details = null) {
        super(message);
        this.name = 'AIProviderError';
        this.code = code;
        this.retryable = retryable;
        this.details = details;
    }
}

/**
 * Base AI Provider class with enhanced error handling and retry logic
 */
class AIProvider {
    constructor(apiKey, config = {}) {
        this.apiKey = apiKey;
        this.config = config;
        this.session = new Soup.Session();

        // Retry configuration
        this.maxRetries = config.maxRetries || 3;
        this.retryDelay = config.retryDelay || 1000; // ms
        this.timeout = config.timeout || 30000; // 30 seconds

        // Set timeout on session
        this.session.timeout = Math.floor(this.timeout / 1000);
    }

    /**
     * Validate API key format
     * @returns {boolean} True if API key appears valid
     */
    validateApiKey() {
        if (!this.apiKey || typeof this.apiKey !== 'string') {
            return false;
        }

        if (this.apiKey.trim().length === 0) {
            return false;
        }

        // Basic format checks (override in subclasses for specific validation)
        return this.apiKey.length > 10;
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
     * Make HTTP request with retry logic and better error handling
     * @protected
     */
    async _makeRequest(url, method, headers, body, retryCount = 0) {
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

            const statusCode = message.status_code;

            // Handle different status codes
            if (statusCode === 200 || statusCode === 201) {
                try {
                    return JSON.parse(responseText);
                } catch (parseError) {
                    throw new AIProviderError(
                        'Invalid JSON response from API',
                        'PARSE_ERROR',
                        false,
                        { responseText, parseError }
                    );
                }
            }

            // Handle error responses
            return this._handleErrorResponse(statusCode, responseText, retryCount);

        } catch (error) {
            return this._handleRequestError(error, url, method, headers, body, retryCount);
        }
    }

    /**
     * Handle HTTP error responses
     * @private
     */
    _handleErrorResponse(statusCode, responseText, retryCount) {
        let errorMessage = responseText;
        let errorCode = `HTTP_${statusCode}`;
        let retryable = false;

        // Try to parse error details from response
        try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error?.message || errorData.message || responseText;
        } catch (e) {
            // Use raw response text
        }

        // Determine if error is retryable
        switch (statusCode) {
            case 401:
                errorCode = 'INVALID_API_KEY';
                errorMessage = 'Invalid API key. Please check your settings.';
                retryable = false;
                break;
            case 403:
                errorCode = 'FORBIDDEN';
                errorMessage = 'Access forbidden. Check API key permissions.';
                retryable = false;
                break;
            case 429:
                errorCode = 'RATE_LIMIT';
                errorMessage = 'Rate limit exceeded. Please try again later.';
                retryable = true;
                break;
            case 500:
            case 502:
            case 503:
            case 504:
                errorCode = 'SERVER_ERROR';
                errorMessage = 'AI service temporarily unavailable. Retrying...';
                retryable = true;
                break;
            case 400:
                errorCode = 'BAD_REQUEST';
                retryable = false;
                break;
        }

        const error = new AIProviderError(errorMessage, errorCode, retryable, {
            statusCode,
            responseText,
        });

        // Retry if applicable
        if (retryable && retryCount < this.maxRetries) {
            return this._retryRequest(error, retryCount);
        }

        throw error;
    }

    /**
     * Handle network and other request errors
     * @private
     */
    async _handleRequestError(error, url, method, headers, body, retryCount) {
        console.error('[AI Provider] Request error:', error);

        let aiError;

        // Check if it's a network error
        if (error.message && (
            error.message.includes('network') ||
            error.message.includes('connection') ||
            error.message.includes('timeout') ||
            error.message.includes('unreachable')
        )) {
            aiError = new AIProviderError(
                'Network error. Please check your internet connection.',
                'NETWORK_ERROR',
                true,
                { originalError: error.message }
            );
        } else if (error instanceof AIProviderError) {
            aiError = error;
        } else {
            aiError = new AIProviderError(
                error.message || 'Unknown error occurred',
                'UNKNOWN_ERROR',
                false,
                { originalError: error }
            );
        }

        // Retry if error is retryable
        if (aiError.retryable && retryCount < this.maxRetries) {
            console.log(`[AI Provider] Retrying request (attempt ${retryCount + 1}/${this.maxRetries})`);

            // Exponential backoff
            const delay = this.retryDelay * Math.pow(2, retryCount);
            await this._sleep(delay);

            return this._makeRequest(url, method, headers, body, retryCount + 1);
        }

        throw aiError;
    }

    /**
     * Retry request wrapper
     * @private
     */
    async _retryRequest(error, retryCount) {
        console.log(`[AI Provider] ${error.message} Retrying... (${retryCount + 1}/${this.maxRetries})`);

        // Exponential backoff: 1s, 2s, 4s, 8s, etc.
        const delay = this.retryDelay * Math.pow(2, retryCount);
        await this._sleep(delay);

        throw new Error('Retry logic should be handled in _makeRequest');
    }

    /**
     * Sleep utility for retry delays
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => {
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
                resolve();
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyError(error) {
        if (error instanceof AIProviderError) {
            return error.message;
        }

        // Fallback for unknown errors
        return 'An unexpected error occurred. Please try again.';
    }

    destroy() {
        // Cleanup
        if (this.session) {
            this.session.abort();
        }
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

    /**
     * Validate OpenAI API key format
     * OpenAI keys start with 'sk-' or 'sk-proj-'
     */
    validateApiKey() {
        if (!super.validateApiKey()) {
            return false;
        }

        return this.apiKey.startsWith('sk-');
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
                stream: false,
            }
        );

        return {
            text: response.choices[0].message.content,
            provider: 'openai',
            model: response.model,
        };
    }

    /**
     * Query with streaming support
     * @param {string} prompt - The user prompt
     * @param {Function} onChunk - Callback for each chunk (text) => void
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Final response object
     */
    async queryStream(prompt, onChunk, options = {}) {
        const url = `${this.baseUrl}/chat/completions`;
        const requestBody = {
            model: options.model || this.model,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7,
            stream: true,
        };

        let fullText = '';
        let model = '';

        try {
            const chunks = await this._makeStreamRequest(
                url,
                'POST',
                {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                requestBody
            );

            for await (const chunk of chunks) {
                if (chunk.choices && chunk.choices[0]) {
                    const delta = chunk.choices[0].delta;
                    if (delta && delta.content) {
                        const text = delta.content;
                        fullText += text;
                        if (onChunk) {
                            onChunk(text);
                        }
                    }
                }

                if (chunk.model) {
                    model = chunk.model;
                }

                // Check for finish
                if (chunk.choices && chunk.choices[0].finish_reason) {
                    break;
                }
            }

            return {
                text: fullText,
                provider: 'openai',
                model: model || this.model,
            };

        } catch (error) {
            console.error('[OpenAI] Stream error:', error);
            throw error;
        }
    }

    /**
     * Make streaming HTTP request
     * @private
     */
    async *_makeStreamRequest(url, method, headers, body) {
        const message = new Soup.Message({
            method: method,
            uri: GLib.Uri.parse(url, GLib.UriFlags.NONE),
        });

        // Set headers
        for (const [key, value] of Object.entries(headers)) {
            message.request_headers.append(key, value);
        }

        // Set body
        const bodyStr = JSON.stringify(body);
        message.set_request_body_from_bytes(
            'application/json',
            new GLib.Bytes(bodyStr)
        );

        // Send request and get input stream
        const inputStream = await this.session.send_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );

        const dataInputStream = Gio.DataInputStream.new(inputStream);
        let buffer = '';

        try {
            while (true) {
                // Read line by line
                const [line] = await dataInputStream.read_line_async(
                    GLib.PRIORITY_DEFAULT,
                    null
                );

                if (!line) {
                    break; // End of stream
                }

                const lineStr = new TextDecoder('utf-8').decode(line);

                // Skip empty lines and comments
                if (!lineStr.trim() || lineStr.startsWith(':')) {
                    continue;
                }

                // SSE format: "data: {...}"
                if (lineStr.startsWith('data: ')) {
                    const data = lineStr.substring(6).trim();

                    // Check for [DONE] marker
                    if (data === '[DONE]') {
                        break;
                    }

                    try {
                        const chunk = JSON.parse(data);
                        yield chunk;
                    } catch (parseError) {
                        console.warn('[OpenAI] Failed to parse chunk:', data);
                    }
                }
            }
        } finally {
            dataInputStream.close(null);
            inputStream.close(null);
        }
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

    /**
     * Validate Anthropic API key format
     * Anthropic keys start with 'sk-ant-'
     */
    validateApiKey() {
        if (!super.validateApiKey()) {
            return false;
        }

        return this.apiKey.startsWith('sk-ant-');
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
                stream: false,
            }
        );

        return {
            text: response.content[0].text,
            provider: 'anthropic',
            model: response.model,
        };
    }

    /**
     * Query with streaming support (Anthropic format)
     * @param {string} prompt - The user prompt
     * @param {Function} onChunk - Callback for each chunk (text) => void
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Final response object
     */
    async queryStream(prompt, onChunk, options = {}) {
        const url = `${this.baseUrl}/messages`;
        const requestBody = {
            model: options.model || this.model,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: options.maxTokens || 1024,
            stream: true,
        };

        let fullText = '';
        let model = '';

        try {
            const chunks = await this._makeStreamRequestAnthropic(
                url,
                'POST',
                {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                },
                requestBody
            );

            for await (const chunk of chunks) {
                // Anthropic streaming format
                if (chunk.type === 'content_block_delta') {
                    if (chunk.delta && chunk.delta.text) {
                        const text = chunk.delta.text;
                        fullText += text;
                        if (onChunk) {
                            onChunk(text);
                        }
                    }
                } else if (chunk.type === 'message_start') {
                    if (chunk.message && chunk.message.model) {
                        model = chunk.message.model;
                    }
                } else if (chunk.type === 'message_delta') {
                    // Message metadata updates
                    continue;
                } else if (chunk.type === 'message_stop') {
                    break;
                }
            }

            return {
                text: fullText,
                provider: 'anthropic',
                model: model || this.model,
            };

        } catch (error) {
            console.error('[Anthropic] Stream error:', error);
            throw error;
        }
    }

    /**
     * Make streaming HTTP request for Anthropic
     * @private
     */
    async *_makeStreamRequestAnthropic(url, method, headers, body) {
        const message = new Soup.Message({
            method: method,
            uri: GLib.Uri.parse(url, GLib.UriFlags.NONE),
        });

        // Set headers
        for (const [key, value] of Object.entries(headers)) {
            message.request_headers.append(key, value);
        }

        // Set body
        const bodyStr = JSON.stringify(body);
        message.set_request_body_from_bytes(
            'application/json',
            new GLib.Bytes(bodyStr)
        );

        // Send request and get input stream
        const inputStream = await this.session.send_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );

        const dataInputStream = Gio.DataInputStream.new(inputStream);

        try {
            while (true) {
                const [line] = await dataInputStream.read_line_async(
                    GLib.PRIORITY_DEFAULT,
                    null
                );

                if (!line) {
                    break;
                }

                const lineStr = new TextDecoder('utf-8').decode(line);

                // Skip empty lines
                if (!lineStr.trim()) {
                    continue;
                }

                // Anthropic SSE format: "event: ...\ndata: {...}"
                if (lineStr.startsWith('data: ')) {
                    const data = lineStr.substring(6).trim();

                    try {
                        const chunk = JSON.parse(data);
                        yield chunk;
                    } catch (parseError) {
                        console.warn('[Anthropic] Failed to parse chunk:', data);
                    }
                }
            }
        } finally {
            dataInputStream.close(null);
            inputStream.close(null);
        }
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

    /**
     * Validate Google Gemini API key format
     * Gemini keys are typically 39 characters alphanumeric
     */
    validateApiKey() {
        if (!super.validateApiKey()) {
            return false;
        }

        // Google API keys are typically 39 characters
        return this.apiKey.length >= 30 && /^[A-Za-z0-9_-]+$/.test(this.apiKey);
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

    /**
     * Validate OpenRouter API key format
     * OpenRouter keys start with 'sk-or-'
     */
    validateApiKey() {
        if (!super.validateApiKey()) {
            return false;
        }

        return this.apiKey.startsWith('sk-or-');
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

    /**
     * Send streaming query to active provider
     * @param {string} prompt - The user prompt
     * @param {Function} onChunk - Callback for each chunk
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Final response
     */
    async queryStream(prompt, onChunk, options = {}) {
        const provider = this.getActiveProvider();

        // Check if provider supports streaming
        if (typeof provider.queryStream !== 'function') {
            console.warn(`[AI Manager] Provider does not support streaming, falling back to regular query`);
            const response = await provider.query(prompt, options);
            // Simulate streaming by calling onChunk with full text
            if (onChunk) {
                onChunk(response.text);
            }
            return response;
        }

        return provider.queryStream(prompt, onChunk, options);
    }

    /**
     * Check if active provider supports streaming
     */
    supportsStreaming() {
        try {
            const provider = this.getActiveProvider();
            return typeof provider.queryStream === 'function';
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if streaming is enabled in settings
     */
    isStreamingEnabled() {
        return this._extension._settings.get_boolean('enable-streaming');
    }

    destroy() {
        this._providers.forEach(provider => provider.destroy());
        this._providers.clear();
    }
}
