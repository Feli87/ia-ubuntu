# Changelog

All notable changes to the AI Search Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Error Handling & Stability (P0)**
  - Advanced error handling with retry logic and exponential backoff
  - Network error detection and user-friendly error messages
  - API key format validation for all providers (OpenAI, Anthropic, Gemini, OpenRouter)
  - Real-time API key validation in preferences UI with visual indicators
  - Custom `AIProviderError` class for better error categorization
  - Timeout handling for API requests (30 seconds default)
  - Retryable vs non-retryable error classification
  - Rate limit detection and automatic retry
  - Server error (500, 502, 503, 504) automatic retry
  - Invalid API key detection (401, 403)
  - Parse error handling for invalid JSON responses

- **Memory Management (P0)**
  - Conversation history size limits (max 50 messages)
  - UI message display limits (max 100 messages)
  - Automatic trimming of old messages to prevent memory bloat
  - Image attachment size limits (10MB total)
  - Image size validation before attachment
  - Size tracking for all attached images
  - User notifications when limits are exceeded
  - Automatic cleanup on conversation clear

### Changed
- Improved HTTP request handling with detailed error codes
- Enhanced user experience with descriptive error messages
- Better cleanup in provider destroy() methods
- Session timeout configuration
- Conversation management with automatic memory optimization
- Image attachment handling with size validation

### Fixed
- Potential memory leaks in long-running sessions
- Network errors not being properly caught
- Missing error handling for malformed API responses
- Memory bloat from unlimited conversation history
- Image attachment accumulation without limits
- UI slowdown from too many displayed messages

## [1.0.0] - 2025-11-19

### Added
- Initial release of AI Search Extension
- Multiple AI provider support:
  - OpenAI (GPT-4, GPT-4 Vision, GPT-3.5 Turbo)
  - Anthropic (Claude 3.5 Sonnet, Claude 3 Opus/Sonnet/Haiku)
  - Google Gemini (1.5 Pro/Flash)
  - OpenRouter (access to 100+ models)
- Futuristic glassmorphism UI design
- Floating overlay interface
- GNOME Search integration
- Multimodal capabilities:
  - Screenshot capture (area, window, full screen)
  - Image analysis with vision models
  - Multiple image attachment support
- Keyboard shortcuts:
  - `Super + Space`: Open AI overlay
  - `Super + Shift + S`: Screenshot & analyze
- Modern preferences UI with Adwaita widgets
- Conversation management:
  - Multi-turn conversations with context
  - Copy responses to clipboard
  - Clear/reset conversations
- Configuration via GSettings:
  - API keys for each provider
  - Model selection
  - Advanced parameters (temperature, max_tokens)
  - UI customization
- Comprehensive documentation:
  - README with installation guide
  - Contributing guidelines
  - MIT License
  - Installation script
- Automatic screenshot cleanup
- Panel indicator with menu
- Provider switching
- Search provider with smart query detection
- Trigger words (ai:, ask:) for explicit AI search

### Technical Details
- Built with modern JavaScript ESModules (GNOME Shell 45+)
- Async/await for all asynchronous operations
- Soup 3.0 for HTTP requests
- GSettings for persistent configuration
- St (Shell Toolkit) for UI components
- Complete resource cleanup on disable
- Memory leak prevention
- Cross-platform support (X11 and Wayland)

---

## Version Numbering

- **Major version** (x.0.0): Breaking changes or major feature additions
- **Minor version** (0.x.0): New features, backward compatible
- **Patch version** (0.0.x): Bug fixes and minor improvements

## Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

*For the full roadmap and planned features, see [ROADMAP.md](ROADMAP.md)*
