# Generate App Icons from SVG

The `assets/icon.svg` contains the Sudarshan Chakra logo for the app icon.
You need to convert it to PNG files for the app stores.

## Required Files (from icon.svg)

| File | Size | Purpose |
|------|------|---------|
| `assets/icon.png` | 1024x1024 | App icon (iOS/Android/Play Store) |
| `assets/adaptive-icon.png` | 1024x1024 | Android adaptive icon foreground |
| `assets/splash.png` | 1284x2778 | Splash screen (just chakra centered on dark bg) |
| `assets/favicon.png` | 48x48 | Web favicon |

## How to Convert

### Option A: Online (Easiest)
1. Go to [cloudconvert.com/svg-to-png](https://cloudconvert.com/svg-to-png)
2. Upload `assets/icon.svg`
3. Set width: 1024, height: 1024
4. Download → save as `assets/icon.png`
5. Copy same file as `assets/adaptive-icon.png`
6. For splash: create 1284x2778 dark bg (#0F0F14) with chakra centered

### Option B: Command Line (if you have Inkscape or ImageMagick)
```bash
# Using Inkscape
inkscape icon.svg --export-png=icon.png -w 1024 -h 1024
inkscape icon.svg --export-png=favicon.png -w 48 -h 48
cp icon.png adaptive-icon.png

# Using ImageMagick
magick convert icon.svg -resize 1024x1024 icon.png
magick convert icon.svg -resize 48x48 favicon.png
```

### Option C: Figma
1. Import icon.svg into Figma
2. Export at 1024x1024 PNG
3. For splash: create 1284x2778 frame, dark fill, paste chakra centered

## Notes
- The icon uses rounded corners (rx=108 in SVG) which gives the iOS-style rounding
- Android adaptive icon: the system adds its own mask, so `adaptive-icon.png` 
  should be the full bleed (no rounded corners needed — Android does it)
- For the Play Store listing you also need a 512x512 version (just resize icon.png)
