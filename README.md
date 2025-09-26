# Prayer Times Chrome Extension

A Chrome extension for calculating prayer times using the [@masaajid/prayer-times](https://www.npmjs.com/package/@masaajid/prayer-times) library.

## Features

- **Location Search**: Search for any city or use current location via GPS
- **Multiple Calculation Methods**: Support for all major Islamic calculation authorities
- **Madhab Selection**: Hanafi and Shafi/Maliki/Hanbali Asr calculations
- **Today's Prayer Times**: Clean display of all prayer times for the current day
- **Persistent Settings**: Remembers your location and calculation preferences
- **Responsive Design**: Optimized for Chrome extension popup (400x600px)

## Installation

### From Chrome Web Store

[Install from Chrome Web Store](https://chromewebstore.google.com/detail/ndpfjpaapbhnjhifbodknlcnfpbfembh)

### Development Installation

1. **Clone and Build**:

   ```bash
   git clone https://github.com/masaajid-hub/prayer-times-chrome.git
   cd prayer-times-chrome
   bun install
   bun run build
   ```

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `dist/` folder

3. **Pin the Extension**:
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Prayer Times by Masaajid"
   - Click the pin icon to keep it visible

## Usage

### First Time Setup

1. **Click the extension icon** in your Chrome toolbar
2. **Choose your location**:
   - Search for your city (e.g., "Kuala Lumpur, Malaysia")
   - Or click "Use Current Location" to use GPS
   - Or enter coordinates manually
3. **Select calculation method** (defaults to Muslim World League)
4. **Choose your madhab** for Asr calculation
5. **Click "Calculate Prayer Times"**

### Daily Usage

- Click the extension icon to see today's prayer times
- The current prayer time is highlighted
- Use "Refresh" to recalculate for the current date
- Use "Change Location" to update your location or settings

### Settings Persistence

Your location and calculation preferences are automatically saved and will be remembered across browser sessions.

## Calculation Methods

The extension supports all major Islamic calculation authorities:

- **Muslim World League** (Default)
- **Egyptian General Authority of Survey**
- **University of Islamic Sciences, Karachi**
- **Umm Al-Qura University, Makkah**
- **Dubai**
- **Moonsighting Committee Worldwide**
- **Islamic Society of North America (ISNA)**
- **Qatar**
- **Singapore**
- **Jabatan Kemajuan Islam Malaysia (JAKIM)**
- **JAKIM Kelantan**
- **Kementerian Agama, Indonesia**
- **Institute of Geophysics, University of Tehran**
- **Turkey Diyanet**
- **France (12°, 15°, 18°)**
- **Russia**

## Privacy & Permissions

The extension requests minimal permissions:

- **Storage**: To remember your location and settings
- **Geolocation**: To use current location (only when you click the button)
- **Network Access**: To search for locations using OpenStreetMap

Privacy notes:

- No personal data is collected or transmitted
- Location data stays on your device
- No tracking or analytics

## Development

### Tech Stack

- **Runtime**: Bun (primary build tool)
- **Language**: TypeScript with strict typing
- **Library**: @masaajid/prayer-times for calculations
- **Location Services**: Nominatim (OpenStreetMap) for geocoding
- **Storage**: Chrome Sync Storage for settings
- **UI**: Vanilla HTML/CSS/TypeScript (no frameworks)

### Project Structure

```
src/
├── popup/
│   ├── popup.html      # Extension popup interface
│   ├── popup.css       # Styling (matches web version)
│   └── popup.ts        # Main popup logic
├── background/
│   └── service-worker.ts  # Background service worker
└── assets/
    └── icons/          # Extension icons (16, 32, 48, 128px)

dist/                   # Built extension (load this in Chrome)
manifest.json           # Chrome extension manifest v3
```

### Development Commands

```bash
# Install dependencies
bun install

# Development build with watch mode
bun run dev

# Production build
bun run build

# Type checking
bun run typecheck

# Package for distribution
bun run package
```

### Building Icons

The extension needs icons in 16x16, 32x32, 48x48, and 128x128 pixels. Place them in `src/assets/icons/`.

### Testing

1. Make changes to source files
2. Run `bun run build`
3. Reload the extension in Chrome (go to `chrome://extensions/` and click reload)
4. Test the changes in the extension popup

## Contributing

Contributions are welcome. Areas for improvement:

- Icon design and UI enhancements
- Prayer time notifications
- Localization support
- Testing across Chrome versions

## Accuracy & Validation

Prayer time calculations use the [@masaajid/prayer-times](https://www.npmjs.com/package/@masaajid/prayer-times) library. For questions about calculation methods and accuracy, refer to the library documentation.

## Support

- **Issues**: [GitHub Issues](https://github.com/masaajid-hub/prayer-times-chrome/issues)
- **Library Issues**: [@masaajid/prayer-times Issues](https://github.com/masaajid-hub/prayer-times/issues)
- **Discussions**: [GitHub Discussions](https://github.com/masaajid-hub/prayer-times-chrome/discussions)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related Projects

- [@masaajid/prayer-times](https://github.com/masaajid-hub/prayer-times) - TypeScript prayer times calculation library
- [Masaajid Platform](https://github.com/masaajid-hub) - Masjid discovery and management platform
