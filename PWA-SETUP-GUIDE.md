# Progressive Web App (PWA) Setup Guide

## What is a PWA?
A Progressive Web App (PWA) allows users to install your web app on their device (phone, tablet, or desktop) just like a native app. Once installed, it can work offline, appear in the app drawer/home screen, and provide an app-like experience.

## Installation Instructions

### For Mobile Devices (iOS & Android)

#### **Android (Chrome/Edge):**
1. Open your Food Finder app in Chrome or Edge browser
2. Look for an **"Install"** banner at the bottom of the screen, OR
3. Tap the **menu** (three dots) in the top-right corner
4. Select **"Install app"** or **"Add to Home screen"**
5. Tap **"Install"** in the popup
6. The app will appear on your home screen!

#### **iOS (Safari):**
1. Open your Food Finder app in Safari
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Edit the name if desired, then tap **"Add"**
5. The app will appear on your home screen!

### For Desktop (Chrome/Edge/Opera)

#### **Chrome/Edge/Opera:**
1. Open your Food Finder app in the browser
2. Look for an **"Install"** button in the address bar (or a popup), OR
3. Click the **menu** (three dots) in the top-right
4. Select **"Install Food Finder"** or **"Install app"**
5. Click **"Install"** in the popup
6. The app will open in its own window!

## Requirements

### For Development (localhost):
- ✅ Works on `http://localhost` (no HTTPS needed)
- ✅ Service Worker will register automatically
- ✅ Manifest will be recognized

### For Production (Deployed):
- ✅ **HTTPS required** (Service Workers only work over HTTPS)
- ✅ Valid SSL certificate
- ✅ Proper MIME types for `.json` and `.js` files (already configured)

## Testing Your PWA

### Check if PWA is working:
1. Open your app in the browser
2. Open **Developer Tools** (F12 or Cmd+Option+I)
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Check:
   - **Manifest** - Should show your app details
   - **Service Workers** - Should show "activated and running"
   - **Storage** - Cache should be populated

### Test Installation Prompt:
- On mobile: Look for install banner or menu option
- On desktop: Check address bar for install icon

## Troubleshooting

### "Install" button doesn't appear:
- ✅ Make sure you're using **HTTPS** (or localhost for development)
- ✅ Check that `manifest.json` is accessible at `/manifest.json`
- ✅ Verify service worker is registered (check browser console)
- ✅ Clear browser cache and reload

### Service Worker not registering:
- ✅ Check browser console for errors
- ✅ Ensure `sw.js` is accessible at `/sw.js`
- ✅ Verify the service worker code is valid
- ✅ Try unregistering old service workers in DevTools

### App won't install:
- ✅ Make sure all required manifest fields are present
- ✅ Icons must be at least 192x192 pixels
- ✅ `start_url` must be within the app's scope
- ✅ Browser must support PWA (modern browsers do)

## Features Enabled

Your Food Finder PWA includes:
- ✅ **Offline support** - Basic caching of static files
- ✅ **Installable** - Can be added to home screen
- ✅ **App-like experience** - Standalone window mode
- ✅ **Fast loading** - Cached assets load instantly
- ✅ **Responsive design** - Works on all screen sizes

## Next Steps (Optional Enhancements)

You can enhance the PWA further by:
- Adding **offline restaurant data caching**
- Implementing **background sync** for recommendations
- Adding **push notifications** for matches
- Creating **app shortcuts** for quick actions
- Adding **share target** functionality

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify all files are accessible (manifest.json, sw.js, icons)
3. Ensure HTTPS is properly configured (for production)
4. Test on different browsers/devices

Happy installing! 🎉
