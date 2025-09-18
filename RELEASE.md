# Release Guide

## Creating a New Release

This project uses GitHub Actions to automatically build and create releases when you push a version tag.

### Step 1: Update Version
Update the version in `package.json` and `manifest.json`:

```json
// package.json
{
  "version": "1.0.1"
}

// manifest.json
{
  "version": "1.0.1"
}
```

### Step 2: Commit Changes
```bash
git add .
git commit -m "Bump version to 1.0.1"
```

### Step 3: Create and Push Tag
```bash
# Create a version tag
git tag v1.0.1

# Push the tag to GitHub
git push origin v1.0.1
```

### Step 4: Automatic Release
GitHub Actions will automatically:
1. ✅ Build the extension
2. ✅ Run type checking and validation
3. ✅ Create `prayer-times-chrome.zip` (for Chrome Web Store)
4. ✅ Generate `prayer-times-chrome.crx` (for direct installation)
5. ✅ Create a GitHub release with both files
6. ✅ Generate `updates.xml` for auto-updates

## Installation Methods for Users

### 🏪 Chrome Web Store (Recommended)
- Search "Prayer Times by Masaajid" in Chrome Web Store
- Click "Add to Chrome"
- Automatic updates

### 📦 Direct Installation (.crx file)
1. Download `prayer-times-chrome.crx` from GitHub releases
2. Open Chrome: `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Drag and drop the `.crx` file onto the page

### 🔧 Developer Installation (.zip file)
1. Download `prayer-times-chrome.zip` from GitHub releases
2. Extract the ZIP file
3. Open Chrome: `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder

## Release Assets

Each release includes:

| File | Purpose | Target Users |
|------|---------|--------------|
| `prayer-times-chrome.zip` | Chrome Web Store submission | Store distribution |
| `prayer-times-chrome.crx` | Direct installation | Power users, offline installs |
| `updates.xml` | Auto-update manifest | Advanced deployment |

## Version Numbering

Follow semantic versioning (semver):
- `v1.0.0` - Major release (breaking changes)
- `v1.1.0` - Minor release (new features)
- `v1.0.1` - Patch release (bug fixes)

## Release Checklist

Before creating a release:

- [ ] Update version in `package.json`
- [ ] Update version in `manifest.json`
- [ ] Test the extension locally (`bun run build` and load in Chrome)
- [ ] Update README.md if needed
- [ ] Write release notes (what's new, bug fixes)
- [ ] Commit all changes
- [ ] Create and push version tag

## Troubleshooting

### Build Fails
- Check GitHub Actions logs
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles locally: `bun run typecheck`

### CRX Generation Issues
- CRX files are generated with a temporary private key
- Each release gets a new key (this is normal)
- Users need to reinstall CRX files for each release

### Auto-Updates
- Only works for CRX installations
- Chrome Web Store handles updates automatically
- Update URL points to GitHub releases

## Development Workflow

```bash
# Regular development
git checkout main
git pull origin main

# Make changes...
bun run dev  # Development with watch mode
bun run build  # Test production build

# When ready to release
git add .
git commit -m "Add new feature"
git push origin main

# Create release
git tag v1.1.0
git push origin v1.1.0  # Triggers automatic build and release
```

## Security Notes

- Private keys for CRX signing are generated fresh for each release
- No secrets are stored in the repository
- CRX files should be downloaded only from official GitHub releases
- Chrome Web Store version is always the most secure option