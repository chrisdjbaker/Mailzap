# Mailzap Rebranding Setup Checklist

## ✅ Completed Code Changes
- [x] Extension name changed to "Mailzap" in all files
- [x] All HTML titles updated
- [x] Color palette applied (Gmail-inspired colors)
- [x] Button colors: Delete (Red #D93025), Unsubscribe (Green #34A853)  
- [x] Primary brand color: Blue (#4285F4)
- [x] Background colors: White (#FFFFFF) with Light Gray (#F1F3F4) sections
- [x] Text colors: Dark Charcoal (#202124) and Medium Gray (#5F6368)
- [x] Content script iframe ID updated from "inboxwhiz-tutorial" to "mailzap-tutorial"
- [x] Unsubscribe email signature updated to "Mailzap"
- [x] README.md updated with new branding

## 🔧 External Services You Need to Set Up

### 1. Google Cloud Console & Gmail API
**CRITICAL - Extension won't work without this**

1. **Create New Google Cloud Project**:
   - Go to https://console.cloud.google.com/
   - Create a new project named "Mailzap"
   - Note the Project ID

2. **Enable Required APIs**:
   - Gmail API v1
   - Google+ API (for userinfo)

3. **Create OAuth 2.0 Client ID**:
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Select "Chrome Extension" as application type
   - You'll need your extension's public key (see step 4)

4. **Generate Extension Key**:
   - Go to chrome://extensions/
   - Enable Developer Mode
   - Use "Pack Extension" to create a .crx file
   - Extract the public key from the .crx metadata
   - Use this key as your extension ID in OAuth settings

5. **Update manifest.json**:
   ```json
   {
     "key": "[YOUR_NEW_EXTENSION_PUBLIC_KEY]",
     "oauth2": {
       "client_id": "[YOUR_NEW_OAUTH_CLIENT_ID]",
       "scopes": [
         "https://www.googleapis.com/auth/gmail.modify",
         "https://www.googleapis.com/auth/gmail.settings.basic", 
         "https://www.googleapis.com/auth/userinfo.email"
       ]
     }
   }
   ```

### 2. Website & Domain Setup
**Current placeholders that need real URLs**:

- **Main Website**: https://www.mailzap.net/
- **Support Page**: https://www.mailzap.net/support.html
- **Privacy Policy**: Required for Chrome Web Store (create at https://www.mailzap.net/privacy.html)

### 3. Chrome Web Store Setup
1. **Developer Account**: 
   - Register at https://chrome.google.com/webstore/developer/dashboard
   - Pay one-time $5 registration fee

2. **Extension Listing**:
   - Upload your packaged extension
   - Category: Productivity
   - Detailed description highlighting features
   - Screenshots (update the ones in extras/cws_screenshots/)

### 4. Support & Feedback Channels

1. **Donation Platform**:
   - Current: https://buymeacoffee.com/mailzap (create account)
   - Alternative: Ko-fi, PayPal, or Patreon

2. **Support System**:
   - Create support page/email
   - Update link in popup: https://www.mailzap.net/support.html

3. **Uninstall Survey**:
   - Create survey at https://tally.so/ 
   - Update background.js with new survey ID
   - Current placeholder: https://tally.so/r/[NEW_SURVEY_ID]

### 5. Visual Assets to Create/Replace

**Extension Icons** (in public/images/):
- icon-16.png (16x16px)
- icon-32.png (32x32px) 
- icon-48.png (48x48px)
- icon-128.png (128x128px)

**Logos**:
- extras/logo.svg (vector logo)
- extras/logo.png (raster logo)
- src/sidebar/assets/logo.svg
- public/assets/logo.svg

**Tutorial Assets**:
- public/assets/extension-button.png (screenshot of extension button)
- public/assets/top-senders.gif (demo animation)
- public/assets/unsubscribe.gif (demo animation)
- src/tutorial/assets/* (duplicate set)

**Chrome Web Store Assets**:
- extras/promo_tile.png (440x280px promo tile)
- Update screenshots in extras/cws_screenshots/

## 🎨 Design System Applied

### Color Palette
- **Primary (Gmail Red)**: #D93025 - Delete buttons, important actions
- **Success (Fresh Green)**: #34A853 - Unsubscribe buttons, success states
- **Info (Calm Blue)**: #4285F4 - Headers, links, primary buttons
- **Background**: #FFFFFF - Main backgrounds
- **Secondary Background**: #F1F3F4 - Section dividers, loading bars
- **Text Primary**: #202124 - Main text
- **Text Secondary**: #5F6368 - Secondary text, email addresses

### Button Assignments
- **Delete Button**: Red (#D93025) - Destructive action
- **Unsubscribe Button**: Green (#34A853) - Positive action
- **Primary Actions**: Blue (#4285F4) - Navigation, confirmations
- **Login Background**: Blue (#4285F4) - Brand recognition

## 🚀 Deployment Steps

1. **Build Extension**:
   ```bash
   npm run build
   ```

2. **Test Locally**:
   - Load unpacked extension from `dist/` folder
   - Test with your new OAuth client ID

3. **Package for Store**:
   ```bash
   cd dist
   zip -r ../mailzap-extension.zip *
   ```

4. **Upload to Chrome Web Store**:
   - Submit for review
   - Include privacy policy URL
   - Justify all permissions in description

## ⚠️ Important Notes

1. **OAuth Client ID**: Extension will not work until you create and configure your own Google Cloud OAuth client
2. **Extension Key**: Must be consistent between development and production
3. **Privacy Policy**: Required for Chrome Web Store approval
4. **Screenshots**: Update all marketing screenshots to reflect Mailzap branding
5. **Testing**: Thoroughly test OAuth flow before publishing

## 🔍 Files Still Containing Placeholder URLs
- `src/popup/Popup.tsx` - Line 4-6 (support, donate, feedback links)
- `public/background.js` - Line 43 (uninstall survey URL)
- `public/manifest.json` - OAuth client_id and extension key
- `README.md` - Chrome Web Store and website links

## 📋 Pre-Launch Testing Checklist
- [ ] OAuth authentication works with new client ID
- [ ] All buttons have correct colors (Delete=Red, Unsubscribe=Green)
- [ ] Extension loads properly in Gmail sidebar
- [ ] Tutorial displays correctly with new branding
- [ ] Popup shows Mailzap name and links
- [ ] All external links work (website, support, donate)
- [ ] Extension icons display correctly in Chrome
- [ ] Privacy policy page exists and is accessible

Your extension has been successfully rebranded to Mailzap with the new Gmail-inspired color scheme! The main remaining task is setting up the external services, especially the Google Cloud OAuth configuration.
