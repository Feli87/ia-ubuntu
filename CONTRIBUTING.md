# Contributing to AI Search Extension

First off, thank you for considering contributing to AI Search! 🎉

This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project and everyone participating in it is governed by a code of respect and professionalism. By participating, you are expected to uphold this code.

- Be respectful and inclusive
- Welcome newcomers
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Set up the development environment** (see below)
4. **Create a branch** for your changes
5. **Make your changes**
6. **Test thoroughly**
7. **Submit a pull request**

## How to Contribute

### Types of Contributions

We welcome many types of contributions:

- 🐛 **Bug fixes** - Fix issues and improve stability
- ✨ **New features** - Add new functionality
- 📚 **Documentation** - Improve or add documentation
- 🎨 **UI/UX improvements** - Enhance the user interface
- 🌍 **Translations** - Add support for more languages
- 🧪 **Tests** - Add or improve test coverage
- 🔧 **Refactoring** - Improve code quality

### What to Work On

- Check the [Issues](https://github.com/Feli87/ia-ubuntu/issues) page for open issues
- Look for issues labeled `good first issue` for beginner-friendly tasks
- Look for issues labeled `help wanted` for areas where we need assistance
- Check the [Roadmap](README.md#roadmap) for planned features

## Development Setup

### Prerequisites

- Ubuntu 22.04+ or compatible GNOME distribution
- GNOME Shell 45+
- Git
- Text editor (VS Code, vim, etc.)
- Basic knowledge of JavaScript and GNOME Shell extensions

### Setup Steps

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/ia-ubuntu.git
cd ia-ubuntu

# Install the extension in development mode
./install.sh

# Enable the extension
gnome-extensions enable ai-search@ubuntu.extension

# Watch logs while developing
journalctl -f -o cat /usr/bin/gnome-shell | grep "AI Search"
```

### Development Workflow

1. **Make changes** to the source files
2. **Reload GNOME Shell** to test:
   - X11: Press `Alt+F2`, type `r`, press Enter
   - Wayland: Log out and back in
3. **Check logs** for errors
4. **Test thoroughly**
5. **Commit changes**

### File Structure

```
ai-ubuntu/
├── extension.js              # Main extension entry point
├── prefs.js                  # Preferences UI
├── aiProviders.js            # AI provider integrations
├── aiSearchProvider.js       # GNOME search provider
├── aiOverlay.js              # Main overlay UI
├── multimodalCapture.js      # Screenshot functionality
├── metadata.json             # Extension metadata
├── stylesheet.css            # Styles
├── schemas/                  # GSettings schemas
│   └── *.gschema.xml
└── README.md                 # Documentation
```

## Coding Standards

### JavaScript Style

- Use **modern ES6+ JavaScript**
- Follow **ESModules** import syntax (GNOME Shell 45+)
- Use **const** and **let**, avoid **var**
- Use **arrow functions** where appropriate
- Add **JSDoc comments** for functions and classes

### Example:

```javascript
/**
 * Query the AI provider
 * @param {string} prompt - The user prompt
 * @param {Object} options - Query options
 * @returns {Promise<Object>} AI response
 */
async query(prompt, options = {}) {
    // Implementation
}
```

### Naming Conventions

- **Classes**: `PascalCase` (e.g., `AISearchProvider`)
- **Functions/Methods**: `camelCase` (e.g., `performSearch`)
- **Private methods**: Prefix with `_` (e.g., `_makeRequest`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Files**: `camelCase.js` (e.g., `aiProviders.js`)

### Code Organization

- Keep functions focused and single-purpose
- Limit file length (prefer < 500 lines)
- Extract reusable code into separate modules
- Add error handling for all async operations
- Clean up resources in `disable()` and `destroy()`

### GNOME Shell Best Practices

1. **Always clean up in disable()**
   ```javascript
   disable() {
       // Disconnect all signals
       // Destroy all UI elements
       // Clear all references
   }
   ```

2. **Don't initialize in constructor**
   ```javascript
   constructor(metadata) {
       super(metadata);
       // Only set properties, don't create UI
   }

   enable() {
       // Create UI here
   }
   ```

3. **Handle settings changes**
   ```javascript
   this._settingsChangedId = this._settings.connect('changed::key', () => {
       this._onSettingsChanged();
   });
   ```

4. **Use proper imports**
   ```javascript
   // Good
   import St from 'gi://St';
   import * as Main from 'resource:///org/gnome/shell/ui/main.js';

   // Bad
   const St = imports.gi.St; // Old style
   ```

## Submitting Changes

### Before Submitting

- [ ] Code follows the style guidelines
- [ ] Comments added for complex logic
- [ ] No console errors or warnings
- [ ] Extension loads and unloads cleanly
- [ ] Tested on GNOME Shell 45/46
- [ ] No breaking changes (or documented)
- [ ] Updated documentation if needed

### Pull Request Process

1. **Update documentation** if you changed functionality
2. **Add yourself** to contributors if this is your first PR
3. **Write a clear PR description**:
   - What does this PR do?
   - Why is this change needed?
   - How has it been tested?
   - Screenshots/GIFs if UI changes

4. **Reference related issues**: "Fixes #123" or "Relates to #456"

5. **Keep PRs focused**: One feature/fix per PR

### Commit Messages

Write clear, descriptive commit messages:

```
feat: Add streaming response support

- Implement SSE parsing for streaming
- Update UI to show responses as they arrive
- Add setting to toggle streaming mode

Fixes #42
```

**Format**: `type: Short description`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

## Reporting Bugs

### Before Reporting

1. **Check existing issues** to avoid duplicates
2. **Test with latest version** of the extension
3. **Disable other extensions** to rule out conflicts

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g., Ubuntu 24.04]
 - GNOME Shell version: [e.g., 46.0]
 - Extension version: [e.g., 1.0]
 - AI Provider: [e.g., OpenAI GPT-4]

**Additional context**
Any other relevant information.

**Logs**
```
journalctl -f -o cat /usr/bin/gnome-shell | grep "AI Search"
```
Paste relevant log output here.
```

## Feature Requests

We love feature ideas! When requesting a feature:

1. **Check existing feature requests** first
2. **Describe the problem** you're trying to solve
3. **Propose a solution** if you have one
4. **Consider alternatives** you've thought about
5. **Explain the use case** - how would this help users?

## Questions?

- **General questions**: [GitHub Discussions](https://github.com/Feli87/ia-ubuntu/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/Feli87/ia-ubuntu/issues)
- **Security issues**: Email privately (see README)

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for contributing to make AI Search better! 🚀
