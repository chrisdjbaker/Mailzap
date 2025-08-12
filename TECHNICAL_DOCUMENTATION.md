# InboxWhiz Gmail Declutter Extension - Complete Technical Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Project Structure](#project-structure)
4. [Extension Components](#extension-components)
5. [Feature Analysis](#feature-analysis)
6. [APIs & Dependencies](#apis--dependencies)
7. [Authentication & Security](#authentication--security)
8. [UI Components & Styling](#ui-components--styling)
9. [Extension Flow & Event Handling](#extension-flow--event-handling)
10. [Branding & Customization Guide](#branding--customization-guide)
11. [Build & Deployment](#build--deployment)
12. [Testing](#testing)
13. [Potential Issues & Limitations](#potential-issues--limitations)

---

## Project Overview

InboxWhiz is a Chrome extension that helps users declutter their Gmail inbox by:
- Analyzing email senders and their message frequency
- Providing bulk unsubscribe functionality with intelligent automation
- Allowing bulk deletion of emails from selected senders
- Offering a clean, intuitive interface integrated into Gmail's side panel

The extension uses Gmail API with OAuth 2.0 authentication and processes all data client-side for privacy.

---

## Architecture & Technology Stack

### Frontend Framework
- **React 19.0.0** - Modern React with latest features
- **TypeScript** - Type safety throughout the codebase
- **Vite 6.2.0** - Fast build system with hot module replacement

### Chrome Extension APIs
- **Manifest V3** - Latest Chrome extension format
- **Side Panel API** - For Gmail integration
- **Content Scripts** - For Gmail page interaction
- **Background Service Worker** - For extension lifecycle management
- **Chrome Storage API** - For local data persistence
- **Chrome Identity API** - For OAuth 2.0 authentication

### Google APIs
- **Gmail API v1** - Email access and manipulation
- **Google OAuth 2.0** - User authentication
- **Google User Info API** - Account verification

### UI & Styling
- **FontAwesome 6.7.2** - Icons throughout the interface
- **React Loading Skeleton 3.5.0** - Loading states
- **Custom CSS** - Tailored styling for Gmail integration

### Development Tools
- **Jest 29.7.0** - Unit testing framework
- **Playwright 1.52.0** - End-to-end testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Stylelint** - CSS linting

---

## Project Structure

```
gmail-declutter-extension/
├── package.json                    # Dependencies and scripts
├── manifest.json                   # Extension configuration
├── vite.config.ts                 # Build configuration
├── tsconfig.json                  # TypeScript configuration
├── jest.config.json               # Test configuration
├── playwright.config.ts           # E2E test configuration
│
├── public/                        # Static assets and extension files
│   ├── manifest.json              # Chrome extension manifest
│   ├── background.js              # Service worker (vanilla JS)
│   ├── content.js                 # Content script (vanilla JS)
│   ├── images/                    # Extension icons (16px, 32px, 48px, 128px)
│   └── assets/                    # Tutorial GIFs and extension button image
│
├── src/                          # Source code (TypeScript/React)
│   ├── index.html                # Development navigation page
│   ├── index.css                 # Global styles
│   │
│   ├── _shared/                  # Shared utilities and types
│   │   ├── providers/            # React context providers
│   │   │   ├── actionsContext.tsx        # Gmail API actions
│   │   │   └── loggedInContext.tsx       # Authentication state
│   │   ├── types/
│   │   │   └── types.ts          # TypeScript type definitions
│   │   └── utils/                # Core business logic
│   │       ├── chromeAuth.ts     # OAuth authentication
│   │       ├── fetchSenders.ts   # Sender data retrieval
│   │       ├── unsubscribeSenders.ts  # Unsubscribe functionality
│   │       ├── trashSenders.ts   # Email deletion
│   │       ├── utils.ts          # Utility functions
│   │       └── actions/          # Action implementations
│   │           ├── actionsInterface.ts   # Action contract
│   │           ├── mockActions.ts        # Mock for development
│   │           └── realActions.ts        # Production implementation
│   │
│   ├── sidebar/                  # Main application (Chrome side panel)
│   │   ├── index.html
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # Main application component
│   │   ├── App.css              # Application styles
│   │   ├── components/          # UI components
│   │   │   ├── header.tsx/.css          # User account header
│   │   │   ├── actionButton.tsx/.css    # Unsubscribe/Delete buttons
│   │   │   ├── reloadButton.tsx/.css    # Refresh senders button
│   │   │   ├── senderLine.tsx/.css      # Individual sender display
│   │   │   ├── sendersContainer.tsx     # List of all senders
│   │   │   ├── modalPopup.tsx/.css      # Confirmation modals
│   │   │   ├── loadingBar.tsx/.css      # Progress indicator
│   │   │   ├── toggleOption.tsx         # Checkbox options
│   │   │   ├── toggleSwitch.tsx/.css    # Toggle switch component
│   │   │   ├── closeButton.tsx/.css     # Modal close button
│   │   │   └── login-page/              # Authentication UI
│   │   │       ├── loginPage.tsx
│   │   │       └── googleAuthButton.tsx/.css
│   │   ├── providers/           # Context providers for sidebar
│   │   │   ├── allGlobalProviders.tsx   # Provider wrapper
│   │   │   ├── modalContext.tsx         # Modal state management
│   │   │   ├── selectedSendersContext.tsx # Selected senders state
│   │   │   └── sendersContext.tsx       # All senders state
│   │   └── utils/
│   │       └── unsubscribeFlow.tsx      # Unsubscribe workflow logic
│   │
│   ├── popup/                    # Extension popup (when not on Gmail)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── Popup.tsx            # Popup component
│   │   └── Popup.css            # Popup styles
│   │
│   └── tutorial/                 # Onboarding tutorial
│       ├── index.html
│       ├── index.css
│       ├── main.tsx
│       ├── Tutorial.tsx         # Tutorial flow component
│       ├── Tutorial.css         # Tutorial styles
│       ├── assets/              # Tutorial images and GIFs
│       └── components/          # Tutorial-specific components
│           ├── steps.tsx        # Tutorial step definitions
│           ├── modal.tsx/.css   # Tutorial modal wrapper
│           ├── successIcon.tsx  # Success checkmark
│           └── googleAuthButton.tsx/.css # Auth button for tutorial
│
└── test/                        # Test files
    ├── ui/                      # End-to-end tests (Playwright)
    │   └── sidebar/             # Sidebar component tests
    └── utils/                   # Unit tests (Jest)
        ├── actions/             # Action tests
        └── [utility tests]      # Individual utility function tests
```

---

## Extension Components

### 1. Manifest Configuration (public/manifest.json)
```json
{
  "manifest_version": 3,
  "name": "InboxWhiz - Bulk Unsubscribe & Clean Gmail",
  "version": "1.0.2",
  "description": "Declutter your Gmail in seconds - mass unsubscribe and remove emails in bulk effortlessly.",
  "permissions": ["sidePanel", "storage", "identity", "tabs"],
  "action": {
    "default_popup": "popup/index.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "js": ["content.js"],
      "matches": ["https://mail.google.com/*"]
    }
  ],
  "oauth2": {
    "client_id": "396720193118-fggljh2amq0jlgq4v861vqn6rb88q9dt.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.settings.basic",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  }
}
```

**Key Components:**
- **Icons**: 16px, 32px, 48px, 128px PNG files in `/images/` directory
- **Permissions**: SidePanel for Gmail integration, Storage for caching, Identity for OAuth
- **OAuth Client ID**: Google Cloud project credential (needs to be replaced for rebranding)
- **Content Script**: Runs only on `mail.google.com` domain

### 2. Background Service Worker (public/background.js)
```javascript
// Key functionality:
// 1. Side panel management based on current tab
// 2. Tutorial display on first install
// 3. Uninstall survey redirection

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (url.origin === GMAIL_ORIGIN) {
    // Enable side panel on Gmail
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidebar/index.html",
      enabled: true,
    });
    await chrome.action.setPopup({ tabId, popup: "" });
  } else {
    // Show popup on other sites
    chrome.action.setPopup({ tabId, popup: "popup/index.html" });
  }
});
```

### 3. Content Script (public/content.js)
```javascript
// Functions:
// 1. Search Gmail for specific email senders
// 2. Display/close tutorial overlay
// 3. Extract current Gmail account email
// 4. Message passing with extension components

function searchEmailSenders(emails) {
  const email = emails.join(" OR ");
  const searchInput = document.querySelector("input[name='q']");
  searchInput.value = `from:(${email})`;
  document.querySelector("button[aria-label='Search mail']").click();
}
```

---

## Feature Analysis

### 1. Sender Analysis & Display
**Location**: `src/_shared/utils/fetchSenders.ts`, `src/sidebar/components/sendersContainer.tsx`

**Process**:
1. Fetches all message IDs from Gmail API (up to 500 per query)
2. Processes messages in batches of 40 to avoid rate limits
3. Extracts sender email and name from message headers
4. Aggregates data by email address, counting messages
5. Stores data in Chrome local storage with account email as key
6. Displays in sidebar sorted by message count

**Data Structure**:
```typescript
interface Sender {
  name: string;    // Display name (shortest found name)
  email: string;   // Email address
  count: number;   // Number of messages
}
```

### 2. Bulk Unsubscribe Functionality
**Location**: `src/_shared/utils/unsubscribeSenders.ts`, `src/sidebar/utils/unsubscribeFlow.tsx`

**Three-tier Unsubscribe Strategy**:

**Tier 1 - Automatic Unsubscribe**:
- Reads `List-Unsubscribe` header from latest message
- Supports `mailto:` and `POST` URL methods
- Sends unsubscribe email via Gmail API or HTTP POST

**Tier 2 - Manual Link Click**:
- Extracts unsubscribe links from email body HTML
- Opens links in new browser tabs
- User manually completes unsubscribe process
- Extension waits for user confirmation to continue

**Tier 3 - Blocking**:
- For senders with no unsubscribe options
- Creates Gmail filter to automatically trash future emails
- Uses Gmail API filters endpoint

**Unsubscribe Flow**:
1. User selects senders and clicks "Unsubscribe"
2. Confirmation modal with options:
   - Delete existing emails (optional)
   - Block senders (optional)
3. Processing phases:
   - Automatic unsubscribes (background)
   - Manual link unsubscribes (modal per sender)
   - Blocking prompts (modal per sender)
4. Success modal with summary

### 3. Bulk Email Deletion
**Location**: `src/_shared/utils/trashSenders.ts`

**Process**:
1. Searches Gmail for all messages from specified senders
2. Moves messages to trash using Gmail API (not permanent deletion)
3. Processes in batches to handle API rate limits
4. Returns count of deleted messages

### 4. Authentication System
**Location**: `src/_shared/utils/chromeAuth.ts`

**OAuth 2.0 Flow**:
1. Chrome Identity API requests OAuth token
2. Verifies token against expected Gmail account
3. Caches token for subsequent API calls
4. Forces re-authentication if account mismatch
5. Clears token cache on sign-out

**Security Features**:
- Account verification prevents wrong account usage
- Token verification against Google's userinfo endpoint
- Automatic token refresh handling
- Rate limit handling with exponential backoff

---

## APIs & Dependencies

### Chrome Extensions APIs
```typescript
// Permissions required in manifest.json
"permissions": [
  "sidePanel",    // Gmail side panel integration
  "storage",      // Local data caching
  "identity",     // OAuth 2.0 authentication
  "tabs"          // Tab management and messaging
]
```

### Google APIs Used
1. **Gmail API v1** (`https://www.googleapis.com/gmail/v1/`)
   - `users/me/messages` - List messages
   - `users/me/messages/{id}` - Get message details
   - `users/me/messages/{id}/trash` - Move to trash
   - `users/me/messages/send` - Send unsubscribe emails
   - `users/me/settings/filters` - Create email filters

2. **OAuth 2.0 & UserInfo APIs**
   - `https://www.googleapis.com/oauth2/v2/userinfo` - Account verification
   - Chrome Identity API handles token management

### NPM Dependencies
**Production Dependencies**:
```json
{
  "@fortawesome/fontawesome-svg-core": "^6.7.2",
  "@fortawesome/free-brands-svg-icons": "^6.7.2", 
  "@fortawesome/free-regular-svg-icons": "^6.7.2",
  "@fortawesome/free-solid-svg-icons": "^6.7.2",
  "@fortawesome/react-fontawesome": "^0.2.2",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-loading-skeleton": "^3.5.0"
}
```

**Development Dependencies**:
```json
{
  "@types/chrome": "^0.0.315",
  "@types/gapi.client.gmail-v1": "^0.0.4",
  "@vitejs/plugin-react": "^4.3.4",
  "typescript": "~5.7.2",
  "vite": "^6.2.0"
}
```

---

## Authentication & Security

### OAuth 2.0 Configuration
**Client ID**: `396720193118-fggljh2amq0jlgq4v861vqn6rb88q9dt.apps.googleusercontent.com`

**Required Scopes**:
- `https://www.googleapis.com/auth/gmail.modify` - Read/write Gmail access
- `https://www.googleapis.com/auth/gmail.settings.basic` - Create filters
- `https://www.googleapis.com/auth/userinfo.email` - Account verification

### Security Measures
1. **Account Verification**: Ensures OAuth token matches expected Gmail account
2. **Client-side Processing**: All data processing happens locally
3. **Minimal Permissions**: Only requests necessary Gmail scopes
4. **Token Management**: Automatic refresh and secure storage via Chrome APIs
5. **Rate Limit Handling**: Implements delays and retry logic for API calls

### Privacy Features
- **No External Storage**: All data stored in Chrome local storage
- **No Tracking**: No analytics or external data collection
- **Local Processing**: Email analysis happens entirely client-side

---

## UI Components & Styling

### Design System
**Colors**:
- Primary Blue: `#233b86` (buttons, toggles, branding)
- Primary Blue Hover: `#1a4c9b`
- Delete Red: `#bb1826`
- Delete Red Hover: `#ca2633`
- Selection Blue: `#c2dbff`
- Text Gray: `#5f6368`
- Border Gray: `#f2f6fc`

**Typography**:
- Font Family: `"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif`
- Sizes: 0.75rem (small text), 0.875rem (body), 14px (buttons)

### Component Structure
**Sidebar Application** (`src/sidebar/App.tsx`):
```
App
├── LoginPage (if not authenticated)
└── Authenticated View
    ├── DeclutterHeader (user info)
    ├── ButtonBar
    │   ├── ActionButton (Unsubscribe)
    │   ├── ActionButton (Delete)
    │   └── ReloadButton
    ├── SendersContainer
    │   └── SenderLine[] (individual senders)
    └── ModalPopup (confirmation/progress dialogs)
```

**Key Components**:

1. **SenderLine** - Individual sender display with:
   - Checkbox for selection
   - Sender name and email
   - Message count
   - Click-to-search functionality

2. **ActionButton** - Unsubscribe/Delete buttons with:
   - FontAwesome icons
   - Disabled state when no senders selected
   - Color coding (blue for unsubscribe, red for delete)

3. **ModalPopup** - Multi-purpose modal supporting:
   - Confirmation dialogs
   - Progress indicators
   - Success/error messages
   - Manual unsubscribe workflows

### Responsive Design
- Sidebar width: 300px minimum
- Mobile-friendly touch targets
- Scrollable sender list
- Fixed header and button bar

---

## Extension Flow & Event Handling

### Installation Flow
1. **Extension Install** → Background script triggers
2. **Open Gmail Tab** → Auto-opens `https://mail.google.com/`
3. **Show Tutorial** → Content script displays tutorial overlay
4. **Tutorial Completion** → User ready to use extension

### Authentication Flow
1. **Side Panel Open** → Check authentication status
2. **Not Authenticated** → Show login page
3. **Google Sign-in** → OAuth 2.0 flow via Chrome Identity API
4. **Account Verification** → Ensure correct Gmail account
5. **Success** → Load main application

### Sender Analysis Flow
1. **Fetch Senders** → Call `fetchAllSenders(accountEmail)`
2. **Get Message IDs** → Gmail API query for all messages
3. **Batch Processing** → Process 40 messages at a time
4. **Extract Senders** → Parse "From" header from each message
5. **Aggregate Data** → Count messages per sender
6. **Store Results** → Chrome local storage with account key
7. **Display UI** → Show sorted sender list

### Unsubscribe Flow
1. **Select Senders** → User checkboxes senders
2. **Click Unsubscribe** → Show confirmation modal
3. **Configure Options** → Delete emails, block senders
4. **Confirm Action** → Start unsubscribe process
5. **Auto Unsubscribe** → Process mailto/POST unsubscribes
6. **Manual Links** → Show modal for each manual unsubscribe
7. **Blocking** → Show modal for each sender to block
8. **Cleanup** → Delete emails if requested
9. **Success** → Show completion modal and refresh

### Message Passing Architecture
**Background ↔ Content Script**:
```javascript
// Background → Content
chrome.tabs.sendMessage(tabId, { action: "SHOW_TUTORIAL" });

// Content → Background (response)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_EMAIL_ACCOUNT") {
    sendResponse({ result: getEmailAccount() });
  }
});
```

**Sidebar ↔ Content Script**:
```javascript
// Sidebar → Content
chrome.tabs.sendMessage(tabId, {
  type: "SEARCH_EMAIL_SENDERS",
  emails: ["sender1@example.com", "sender2@example.com"]
});
```

---

## Branding & Customization Guide

### Files Requiring Brand Changes

#### 1. Extension Metadata
**File**: `public/manifest.json`
- `name`: "InboxWhiz - Bulk Unsubscribe & Clean Gmail"
- `description`: "Declutter your Gmail in seconds..."
- `key`: Extension public key (regenerate for new extension)
- `oauth2.client_id`: Google OAuth client ID (create new)

**File**: `package.json`
- `name`: "gmail-declutter"
- `version`: "1.0.0"

#### 2. Visual Assets
**Icons** (all in `public/images/`):
- `icon-16.png` - 16×16px extension icon
- `icon-32.png` - 32×32px extension icon  
- `icon-48.png` - 48×48px extension icon
- `icon-128.png` - 128×128px extension icon

**Tutorial Assets** (in `public/assets/` and `src/tutorial/assets/`):
- `extension-button.png` - Screenshot of extension button in toolbar
- `top-senders.gif` - Animated demo of sender analysis
- `unsubscribe.gif` - Animated demo of unsubscribe process

**Logos**:
- `extras/logo.svg` - Vector logo file
- `extras/logo.png` - Raster logo file
- `src/sidebar/assets/logo.svg` - Sidebar logo
- `public/assets/logo.svg` - Public logo asset

#### 3. Brand Colors
**Primary Brand Color**: `#233b86` (InboxWhiz blue)

**Files to Update**:
- `src/sidebar/App.css` - Main background colors
- `src/sidebar/components/actionButton.css` - Button colors
- `src/sidebar/components/toggle.css` - Toggle switch colors
- `src/popup/Popup.css` - Popup button colors  
- `src/tutorial/Tutorial.css` - Tutorial button colors
- `src/sidebar/components/loadingBar.css` - Progress bar color

**Color Replacements**:
```css
/* Replace all instances of: */
#233b86 → [NEW_PRIMARY_COLOR]
#1a4c9b → [NEW_PRIMARY_COLOR_HOVER] /* ~15% darker */
```

#### 4. Brand Name References
**InboxWhiz References** (search and replace):

**File**: `src/popup/Popup.tsx`
- Title: "InboxWhiz"
- Company name in links and text

**File**: `public/background.js`
- Uninstall survey URL: `https://tally.so/r/w4yg5X`

**File**: `public/content.js`
- Tutorial iframe ID: "inboxwhiz-tutorial"

**File**: `src/_shared/utils/unsubscribeSenders.ts`
- Email signature: "This message was automatically generated by InboxWhiz."

**HTML Titles** (all index.html files):
- `<title>InboxWhiz</title>`

#### 5. External Links & URLs
**File**: `src/popup/Popup.tsx`
```javascript
const supportLink = "https://www.inboxwhiz.net/support.html";
const donateLink = "https://buymeacoffee.com/inboxwhiz";
const feedbackLink = "https://chromewebstore.google.com/detail/inboxwhiz/bjcegpgebdbhkkhngbahpfjfolcmkpma/reviews";
```

**File**: `public/background.js`
```javascript
chrome.runtime.setUninstallURL("https://tally.so/r/w4yg5X");
```

**File**: `README.md`
```markdown
**🔗 [Available on Chrome Web Store](https://chromewebstore.google.com/detail/inboxwhiz-bulk-unsubscrib/bjcegpgebdbhkkhngbahpfjfolcmkpma)**
**🌐 [Visit InboxWhiz Website](https://www.inboxwhiz.net/)**
```

#### 6. Google Cloud Project Setup
**New OAuth Credentials Required**:
1. Create new Google Cloud Project
2. Enable Gmail API
3. Create OAuth 2.0 Client ID for Chrome Extension
4. Configure authorized redirect URIs
5. Update `manifest.json` with new client_id

**Steps**:
```bash
# 1. Go to Google Cloud Console
https://console.cloud.google.com/

# 2. Create new project or select existing
# 3. Enable APIs: Gmail API, Google+ API
# 4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
# 5. Select "Chrome Extension" application type
# 6. Get new extension key: chrome://extensions/ → Developer Mode → "Pack Extension"
# 7. Use public key from crx file as extension ID in OAuth config
```

### Rebranding Checklist

- [ ] **Extension Metadata**
  - [ ] Update `manifest.json` name and description
  - [ ] Generate new extension key
  - [ ] Create new Google Cloud OAuth client
  - [ ] Update `package.json` name

- [ ] **Visual Identity**
  - [ ] Replace all icon files (16, 32, 48, 128px)
  - [ ] Update logo SVG files
  - [ ] Replace tutorial screenshots/GIFs
  - [ ] Update brand colors in CSS files

- [ ] **Text Content**
  - [ ] Find/replace "InboxWhiz" → "NewBrandName"
  - [ ] Update HTML page titles
  - [ ] Update email signature in unsubscribe emails
  - [ ] Update tutorial text content

- [ ] **External References**  
  - [ ] Update support/website URLs
  - [ ] Update donation links
  - [ ] Update Chrome Web Store review links
  - [ ] Update uninstall survey URL
  - [ ] Update README.md links

- [ ] **Code References**
  - [ ] Update CSS class names with brand references
  - [ ] Update DOM element IDs with brand names
  - [ ] Update localStorage keys if brand-specific

---

## Build & Deployment

### Development Setup
```bash
# Install dependencies
npm install

# Start development server with mock data
npm run dev

# Build for production  
npm run build

# Run tests
npm test          # Unit tests with Jest
npm run test:ui   # E2E tests with Playwright

# Lint and format
npm run lint      # Run all linters
npm run lint:js   # ESLint for JavaScript/TypeScript
npm run lint:css  # Stylelint for CSS
npm run lint:prettier # Prettier formatting
```

### Build Configuration
**Vite Config** (`vite.config.ts`):
```typescript
export default defineConfig({
  root: resolve(__dirname, "src"),
  publicDir: resolve(__dirname, "public"),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "dist"),
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        sidebar: resolve(root, "sidebar", "index.html"), 
        popup: resolve(root, "popup", "index.html"),
        tutorial: resolve(root, "tutorial", "index.html"),
      },
    },
  },
});
```

**Build Output** (`dist/` directory):
```
dist/
├── manifest.json           # Extension manifest
├── background.js           # Service worker
├── content.js             # Content script  
├── images/                # Extension icons
├── assets/                # Static assets
├── sidebar/               # Sidebar app files
├── popup/                 # Popup app files
└── tutorial/              # Tutorial files
```

### Chrome Web Store Packaging
```bash
# 1. Build production version
npm run build

# 2. Create ZIP archive of dist/ folder
cd dist
zip -r ../extension.zip *

# 3. Upload to Chrome Web Store Developer Dashboard
# https://chrome.google.com/webstore/developer/dashboard

# 4. Fill out store listing:
# - Screenshots (extras/cws_screenshots/)
# - Description  
# - Category: Productivity
# - Privacy policy URL
```

### Chrome Web Store Listing Requirements

**Store Listing Assets**:
- **Small tile**: 440×280px PNG (`extras/promo_tile.png`)
- **Screenshots**: 1280×800px or 640×400px PNG files
  - Include 3-5 screenshots showing key features
  - Available in `extras/cws_screenshots/`
- **Detailed description**: Feature list and benefits
- **Privacy policy**: Required for extensions accessing user data

**Review Checklist**:
- [ ] All permissions justified in description
- [ ] Privacy policy covers data usage  
- [ ] Screenshots demonstrate core functionality
- [ ] Extension follows Chrome Web Store policies
- [ ] No misleading claims or functionality
- [ ] Proper error handling for API failures

---

## Testing

### Unit Tests (Jest)
**Location**: `test/utils/`

**Coverage**: 
- Gmail API utilities (`chromeAuth.test.ts`, `fetchSenders.test.ts`)
- Unsubscribe logic (`unsubscribeSenders.test.ts`)
- Email deletion (`trashSenders.test.ts`)
- Action implementations (`actions/`)

**Run Tests**:
```bash
npm test                    # All unit tests
npm test chromeAuth         # Specific test file
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

### End-to-End Tests (Playwright)
**Location**: `test/ui/sidebar/`

**Test Scenarios**:
- **Sender Management**: Loading, selection, search functionality
- **Delete Workflow**: Bulk email deletion with confirmations
- **Unsubscribe Workflow**: All three unsubscribe tiers
- **Authentication**: Login/logout flows
- **Modal Interactions**: All confirmation and progress dialogs

**Key Tests**:
```typescript
// test/ui/sidebar/unsubscribe.spec.ts
test("Auto + Manual + Block Combination Flow", async ({ page }) => {
  // Tests complete unsubscribe workflow with all three tiers
});

test("Manual Unsubscribe Link Wizard", async ({ page }) => {
  // Tests manual link opening and user confirmation flow  
});
```

**Run E2E Tests**:
```bash
npm run test:ui                    # All Playwright tests
npm run test:ui -- --headed       # With browser UI
npm run test:ui -- --debug        # Debug mode
npx playwright show-report        # View test report
```

### Test Environment Setup
**Mock Data**: Tests use mock Gmail API responses defined in `mockActions.ts`
**Chrome Extension Testing**: Playwright loads extension from `dist/` directory
**Authentication Mocking**: Tests bypass OAuth with mock authentication state

---

## Potential Issues & Limitations

### Gmail API Limitations
1. **Rate Limits**: 
   - Gmail API: 1 billion queries/day, 250 queries/100 seconds/user
   - Extension implements delays and retry logic
   - Batch processing (40 messages at a time) helps manage limits

2. **Message Limits**:
   - Gmail API returns max 500 message IDs per query  
   - Extension may not process accounts with >500 messages fully
   - Could be improved with pagination

3. **Scope Requirements**:
   - `gmail.modify` scope is broad and may concern users
   - Required for trash/filter operations
   - Consider explaining necessity in UI

### Chrome Extension Policies
1. **Manifest V3 Migration**: Already implemented
2. **Service Worker Limitations**: Background script has execution time limits
3. **Content Security Policy**: All inline scripts avoided
4. **Permission Justification**: Must justify all requested permissions in store listing

### User Experience Issues
1. **First-time Setup**: Initial sender fetch can take several minutes for large inboxes
2. **OAuth Flow**: Users may be confused by Google account selection
3. **Unsubscribe Success**: No way to verify automatic unsubscribes worked
4. **Filter Creation**: Gmail filter creation may fail silently

### Technical Debt
1. **Error Handling**: Some API calls lack comprehensive error handling
2. **Loading States**: Could improve user feedback during long operations
3. **Accessibility**: Could add better ARIA labels and keyboard navigation
4. **Internationalization**: Currently English-only

### Privacy & Security Considerations
1. **Local Storage**: Data stored in Chrome local storage could be accessed by other extensions
2. **Token Security**: OAuth tokens stored by Chrome Identity API
3. **Account Switching**: Doesn't handle multiple Gmail account scenarios well
4. **Data Retention**: No automatic cleanup of old cached data

### Deployment Risks
1. **API Changes**: Gmail API changes could break functionality
2. **OAuth Changes**: Google OAuth policy changes could require updates
3. **Chrome Changes**: Chrome extension API changes in future versions
4. **Store Review**: Chrome Web Store review process can be unpredictable

---

## Conclusion

This documentation provides a complete technical specification for rebuilding the InboxWhiz Gmail declutter extension. The codebase is well-structured with clear separation of concerns, comprehensive testing, and modern development practices.

Key strengths:
- Clean React + TypeScript architecture
- Robust Gmail API integration with proper error handling
- Comprehensive unsubscribe strategy covering multiple scenarios
- Strong privacy focus with client-side processing
- Extensive test coverage

For successful rebranding, focus on:
1. Visual identity updates (colors, icons, logos)
2. Google Cloud project setup with new OAuth credentials
3. Brand name replacements throughout codebase
4. External link updates (support, website, donations)
5. Chrome Web Store listing optimization

The extension follows Chrome Web Store best practices and should pass review when properly configured with new branding and credentials.
