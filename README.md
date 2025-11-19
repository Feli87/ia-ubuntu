# 🤖 AI Search - Multimodal Assistant for Ubuntu

> A futuristic, experimental GNOME Shell extension that brings AI-powered search and multimodal capabilities to your Ubuntu desktop.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-45%2B-blue)](https://www.gnome.org/)
[![Ubuntu](https://img.shields.io/badge/Ubuntu-22.04%2B-orange)](https://ubuntu.com/)

## ✨ Features

### 🎨 **Futuristic UI Design**
- Modern glassmorphism aesthetic with blur effects
- Smooth animations and transitions
- Responsive, floating overlay interface
- Dark theme optimized (light theme compatible)

### 🤖 **Multiple AI Providers**
- **OpenAI** - GPT-4, GPT-4 Vision, GPT-3.5 Turbo
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus/Sonnet/Haiku
- **Google Gemini** - Gemini 1.5 Pro/Flash
- **OpenRouter** - Access to 100+ AI models

### 🖼️ **Multimodal Capabilities**
- Screenshot capture with interactive region selection
- Full screen & window capture modes
- Image analysis with AI vision models
- Drag & drop image support

### 🔍 **GNOME Search Integration**
- AI-powered search results in GNOME Shell search
- Smart query detection (questions, complex queries)
- Custom trigger words (`ai:`, `ask:`)
- Quick actions and suggestions

### ⌨️ **Keyboard Shortcuts**
- `Super + Space` - Open AI Search overlay
- `Super + Shift + S` - Screenshot & AI analyze
- Customizable shortcuts via settings

### 💾 **Conversation Management**
- Save conversation history
- Multi-turn conversations with context
- Copy responses to clipboard
- Clear conversations

## 📸 Screenshots

*Coming soon - Extension in action!*

## 🚀 Installation

### Prerequisites

- Ubuntu 22.04+ (or any GNOME 45+ distribution)
- GNOME Shell 45 or 46
- `gnome-screenshot` or `imagemagick` (for screenshot functionality)

### Method 1: From Source (Recommended)

```bash
# Clone the repository
git clone https://github.com/Feli87/ia-ubuntu.git
cd ia-ubuntu

# Create extension directory
mkdir -p ~/.local/share/gnome-shell/extensions/ai-search@ubuntu.extension

# Copy files
cp -r * ~/.local/share/gnome-shell/extensions/ai-search@ubuntu.extension/

# Compile schemas
glib-compile-schemas ~/.local/share/gnome-shell/extensions/ai-search@ubuntu.extension/schemas/

# Restart GNOME Shell
# On X11: Press Alt+F2, type 'r', press Enter
# On Wayland: Log out and log back in

# Enable the extension
gnome-extensions enable ai-search@ubuntu.extension
```

### Method 2: Quick Install Script

```bash
# Download and run the install script
curl -sSL https://raw.githubusercontent.com/Feli87/ia-ubuntu/main/install.sh | bash
```

### Installing Dependencies

```bash
# For screenshot functionality (choose one):
sudo apt install gnome-screenshot  # Recommended
# OR
sudo apt install imagemagick
```

## ⚙️ Configuration

### 1. Get API Keys

You'll need at least one AI provider API key:

- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic**: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- **Google Gemini**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **OpenRouter**: [openrouter.ai/keys](https://openrouter.ai/keys)

### 2. Configure the Extension

Open extension settings:

```bash
gnome-extensions prefs ai-search@ubuntu.extension
```

Or click the AI Search icon in the top panel and select **Settings**.

#### General Settings
- Toggle panel indicator visibility
- Choose theme style (Auto, Light, Dark, Futuristic)
- Adjust overlay dimensions

#### AI Providers
- Enter API keys for your preferred providers
- Select active provider
- Configure model names
- Adjust advanced parameters (temperature, max tokens)

#### Keyboard Shortcuts
- Customize keyboard shortcuts
- Enable/disable GNOME Search integration
- Configure search trigger words

#### Advanced
- Conversation history settings
- Screenshot cleanup interval
- AI model parameters

## 📖 Usage Guide

### Basic Usage

1. **Open the overlay**
   - Press `Super + Space`
   - Click the AI Search icon in the top panel
   - Search "ai: your question" in GNOME search

2. **Ask a question**
   - Type your question in the input field
   - Press Enter or click the send button
   - Wait for AI response

3. **Analyze a screenshot**
   - Click the camera button in the overlay
   - Select a screen region
   - Type your question about the image
   - Get AI analysis

### Advanced Features

#### Multi-turn Conversations
Continue asking follow-up questions. The AI maintains context throughout the conversation.

#### GNOME Search Integration
- Type questions directly in GNOME search (Activities)
- Prefix with `ai:` or `ask:` for explicit AI search
- Questions are auto-detected (starts with what, how, why, etc.)

#### Image Analysis Examples
- "What's in this screenshot?"
- "Translate the text in this image"
- "Explain this code/diagram/chart"
- "Find errors in this UI design"

#### Switching AI Providers
- Click the AI Search icon → select provider
- Or open Settings → AI Providers → choose provider
- Different providers have different strengths

### Tips & Tricks

- **Quick access**: Pin `Super + Space` for instant AI access
- **Screenshot workflow**: `Super + Shift + S` for immediate capture + analysis
- **Copy responses**: Click the copy button on any AI message
- **Clear context**: Click "🔄 New Chat" to start fresh
- **Model selection**: Advanced users can customize model names in settings

## 🎯 Use Cases

### For Developers
- Explain code snippets from screenshots
- Debug error messages
- Get quick API documentation
- Generate code examples

### For Students
- Ask questions about study material
- Analyze diagrams and charts
- Get explanations of complex topics
- Translate foreign text from screenshots

### For Productivity
- Summarize text from images
- OCR and text extraction
- Quick information lookup
- Task planning and brainstorming

### For Creative Work
- Analyze design mockups
- Get UI/UX feedback
- Color scheme suggestions
- Creative inspiration

## 🛠️ Development

### Project Structure

```
ai-search@ubuntu.extension/
├── extension.js              # Main extension entry point
├── prefs.js                  # Preferences UI
├── metadata.json             # Extension metadata
├── stylesheet.css            # Futuristic styles
├── aiProviders.js            # AI provider integrations
├── aiSearchProvider.js       # GNOME search integration
├── aiOverlay.js              # Overlay UI
├── multimodalCapture.js      # Screenshot functionality
├── schemas/                  # GSettings schemas
│   └── org.gnome.shell.extensions.ai-search.gschema.xml
└── README.md                 # This file
```

### Building from Source

```bash
# Clone and navigate
git clone https://github.com/Feli87/ia-ubuntu.git
cd ia-ubuntu

# Install to local extensions directory
make install  # (if Makefile is provided)

# Or manually:
./install.sh
```

### Debugging

View extension logs:

```bash
# Real-time logs
journalctl -f -o cat /usr/bin/gnome-shell

# Filter for AI Search
journalctl -f -o cat /usr/bin/gnome-shell | grep "AI Search"
```

Enable/disable extension:

```bash
gnome-extensions enable ai-search@ubuntu.extension
gnome-extensions disable ai-search@ubuntu.extension
```

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔒 Privacy & Security

### Data Handling
- API keys are stored locally in GNOME settings (encrypted)
- No telemetry or analytics
- Screenshots are stored temporarily in `/tmp`
- Automatic cleanup of old screenshots
- Conversations stored locally (optional)

### API Communication
- Direct HTTPS connections to AI providers
- No intermediary servers
- Your data is sent only to your chosen AI provider
- Follow each provider's privacy policy

### Security Best Practices
- Never share your API keys
- Review API usage in provider dashboards
- Use environment-specific API keys
- Disable history if handling sensitive information

## 🐛 Troubleshooting

### Extension won't enable
```bash
# Check GNOME Shell version
gnome-shell --version

# Verify extension installation
ls -la ~/.local/share/gnome-shell/extensions/ai-search@ubuntu.extension

# Check for errors
journalctl -f -o cat /usr/bin/gnome-shell
```

### Screenshots not working
```bash
# Install gnome-screenshot
sudo apt install gnome-screenshot

# Or ImageMagick as alternative
sudo apt install imagemagick
```

### API errors
- Verify API key is correct
- Check API quota/credits
- Ensure internet connection
- Try different AI provider

### Overlay not showing
- Check keyboard shortcut conflicts
- Verify extension is enabled
- Restart GNOME Shell (Alt+F2, 'r' on X11)

## 📋 Roadmap

- [ ] Streaming responses for real-time feedback
- [ ] Conversation history browser
- [ ] Export conversations to Markdown
- [ ] Custom AI prompt templates
- [ ] Voice input support
- [ ] OCR integration for text extraction
- [ ] Multiple image attachments
- [ ] Drag & drop file support
- [ ] Custom keyboard shortcuts per action
- [ ] Integration with more AI providers
- [ ] Mobile companion app (via KDE Connect)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- GNOME Shell development team
- OpenAI, Anthropic, Google for AI APIs
- Ubuntu and GNOME community
- All contributors and testers

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Feli87/ia-ubuntu/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Feli87/ia-ubuntu/discussions)
- **Email**: [Your contact email]

## 🌟 Star History

If you find this project useful, please consider giving it a star on GitHub!

---

**Made with ❤️ for the Ubuntu/GNOME community**

*Experimental • Open Source • Privacy-First • Futuristic*
