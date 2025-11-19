#!/bin/bash

# AI Search Extension - Installation Script
# Installs the extension to the local GNOME Shell extensions directory

set -e

echo "🤖 AI Search Extension Installer"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Extension info
EXTENSION_UUID="ai-search@ubuntu.extension"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"

# Check GNOME Shell version
echo -e "${BLUE}Checking GNOME Shell version...${NC}"
if ! command -v gnome-shell &> /dev/null; then
    echo -e "${RED}Error: GNOME Shell not found. This extension requires GNOME Shell.${NC}"
    exit 1
fi

GNOME_VERSION=$(gnome-shell --version | cut -d ' ' -f 3 | cut -d '.' -f 1)
echo -e "${GREEN}GNOME Shell version: $GNOME_VERSION${NC}"

if [ "$GNOME_VERSION" -lt 45 ]; then
    echo -e "${RED}Error: This extension requires GNOME Shell 45 or newer.${NC}"
    exit 1
fi

# Check for dependencies
echo -e "\n${BLUE}Checking dependencies...${NC}"

MISSING_DEPS=()

if ! command -v glib-compile-schemas &> /dev/null; then
    MISSING_DEPS+=("glib-2.0-dev")
fi

if ! command -v gnome-screenshot &> /dev/null && ! command -v import &> /dev/null; then
    echo -e "${YELLOW}Warning: Neither gnome-screenshot nor imagemagick found.${NC}"
    echo -e "${YELLOW}Screenshot functionality will not work without one of these.${NC}"
    MISSING_DEPS+=("gnome-screenshot or imagemagick")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Missing dependencies: ${MISSING_DEPS[*]}${NC}"
    echo -e "${YELLOW}Install with: sudo apt install gnome-screenshot${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create extension directory
echo -e "\n${BLUE}Creating extension directory...${NC}"
mkdir -p "$EXTENSION_DIR"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy files
echo -e "${BLUE}Copying extension files...${NC}"

# List of files to copy
FILES=(
    "extension.js"
    "prefs.js"
    "metadata.json"
    "stylesheet.css"
    "aiProviders.js"
    "aiSearchProvider.js"
    "aiOverlay.js"
    "multimodalCapture.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        cp "$SCRIPT_DIR/$file" "$EXTENSION_DIR/"
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file (not found)"
    fi
done

# Copy schemas directory
if [ -d "$SCRIPT_DIR/schemas" ]; then
    echo -e "${BLUE}Copying schemas...${NC}"
    cp -r "$SCRIPT_DIR/schemas" "$EXTENSION_DIR/"
    echo -e "  ${GREEN}✓${NC} schemas/"
else
    echo -e "  ${RED}✗${NC} schemas/ (not found)"
    exit 1
fi

# Compile schemas
echo -e "\n${BLUE}Compiling GSettings schemas...${NC}"
glib-compile-schemas "$EXTENSION_DIR/schemas/"
echo -e "${GREEN}✓ Schemas compiled${NC}"

# Set permissions
echo -e "\n${BLUE}Setting permissions...${NC}"
chmod +x "$EXTENSION_DIR/extension.js"
chmod +x "$EXTENSION_DIR/prefs.js"
echo -e "${GREEN}✓ Permissions set${NC}"

# Restart GNOME Shell instruction
echo -e "\n${YELLOW}=================================="
echo -e "Installation complete! 🎉"
echo -e "==================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""

# Check if running X11 or Wayland
if [ "$XDG_SESSION_TYPE" = "wayland" ]; then
    echo -e "1. ${YELLOW}Log out and log back in${NC} (Wayland session)"
else
    echo -e "1. ${YELLOW}Restart GNOME Shell${NC}:"
    echo -e "   Press ${GREEN}Alt+F2${NC}, type ${GREEN}'r'${NC}, press Enter"
fi

echo -e ""
echo -e "2. ${YELLOW}Enable the extension${NC}:"
echo -e "   ${GREEN}gnome-extensions enable $EXTENSION_UUID${NC}"
echo -e ""
echo -e "3. ${YELLOW}Configure your AI provider${NC}:"
echo -e "   ${GREEN}gnome-extensions prefs $EXTENSION_UUID${NC}"
echo -e ""
echo -e "4. ${YELLOW}Get an API key${NC} from one of:"
echo -e "   • OpenAI: ${BLUE}https://platform.openai.com/api-keys${NC}"
echo -e "   • Anthropic: ${BLUE}https://console.anthropic.com/settings/keys${NC}"
echo -e "   • Google Gemini: ${BLUE}https://aistudio.google.com/app/apikey${NC}"
echo -e "   • OpenRouter: ${BLUE}https://openrouter.ai/keys${NC}"
echo -e ""
echo -e "5. ${YELLOW}Start using${NC}:"
echo -e "   Press ${GREEN}Super+Space${NC} to open AI Search"
echo -e ""

# Offer to enable extension
read -p "Would you like to enable the extension now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if gnome-extensions enable "$EXTENSION_UUID" 2>/dev/null; then
        echo -e "${GREEN}✓ Extension enabled!${NC}"
        echo -e "${YELLOW}Remember to restart GNOME Shell or log out/in.${NC}"
    else
        echo -e "${RED}Could not enable extension automatically.${NC}"
        echo -e "Enable manually with: ${GREEN}gnome-extensions enable $EXTENSION_UUID${NC}"
    fi
fi

echo ""
echo -e "${GREEN}Thank you for installing AI Search! 🚀${NC}"
echo ""
