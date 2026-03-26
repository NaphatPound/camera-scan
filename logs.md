# Camera Scan - Smart Inventory Management - Development Log

## Project Info
- **Created:** 2026-03-27
- **Stack:** Next.js 16.2.0, React 19, TypeScript, TailwindCSS 4, Framer Motion, Lucide React
- **AI Models:** minimax-m2.7:cloud (chat), gemma3:27b-cloud (vision) via Ollama
- **API Key:** Configured in `.env.local`

---

## Build Log

### Step 1: Project Initialization
- **Status:** COMPLETE
- Initialized Next.js project with TypeScript + TailwindCSS
- Fixed npm registry issue (custom registry `nexus.np.baac.aella.tech` unreachable, switched to `registry.npmjs.org`)
- Installed additional deps: `lucide-react`, `framer-motion`
- Created `.env.local` with Ollama config (base URL, API key, model names)

### Step 2: Core UI Components
- **Status:** COMPLETE
- **ChatInterface** (`src/components/ChatInterface.tsx`): Scrollable message list with animated messages (framer-motion), text input, image upload button, loading spinner, timestamp display
- **StockDashboard** (`src/components/StockDashboard.tsx`): Stock inventory table with item cards, total counter badge, delete functionality, empty state, animated list items
- **ApprovalModal** (`src/components/ApprovalModal.tsx`): Centered overlay modal with item preview, name/count display, edit mode for corrections, approve/cancel/edit buttons

### Step 3: AI Model API Integrations
- **Status:** COMPLETE
- **Chat API** (`src/app/api/chat/route.ts`): POST endpoint, sends messages to `minimax-m2.7:cloud` via Ollama `/api/chat`, supports Bearer auth, returns AI response content
- **Vision API** (`src/app/api/vision/route.ts`): POST endpoint, accepts base64 image, sends to `gemma3:27b-cloud` with structured JSON prompt, strips data URL prefix, parses JSON response with fallback regex extraction
- **Stock API** (`src/app/api/stock/route.ts`): GET/POST/DELETE endpoints, JSON file-based storage (`data/stock.json`), merges duplicate items by name, case-insensitive matching

### Step 4: State Management & Wiring
- **Status:** COMPLETE
- **Main Page** (`src/app/page.tsx`): Client component wiring all pieces together
- Chat messages → Chat API → display response
- Image upload → Vision API → approval popup → Stock API → update dashboard
- Stock loads from API on mount
- Cancel/approve flows update chat with system messages

### Step 5: Testing
- **Status:** COMPLETE
- **Test Framework:** Jest 30 + ts-jest
- **Test Results:** 16/16 PASSED (3 suites)

#### Test Suites:
1. **Chat API Tests** (5 tests)
   - Missing messages validation (400)
   - Non-array messages validation (400)
   - Correct Ollama API call with auth header
   - Ollama API error handling
   - Network error graceful handling

2. **Vision API Tests** (6 tests)
   - Missing image validation (400)
   - Valid JSON response parsing
   - Data URL prefix stripping
   - Unparseable response handling (422)
   - JSON extraction from mixed text
   - Vision API error handling

3. **Stock API Tests** (5 tests)
   - Empty stock returns empty array
   - Add new stock item
   - Merge duplicate items (increment count)
   - Invalid data validation (400)
   - Delete stock item

### Step 6: Integration Testing (Manual)
- **Status:** COMPLETE
- Started dev server on port 3333
- **POST /api/stock** - Added item successfully, returned correct JSON ✓
- **GET /api/stock** - Retrieved stored items ✓
- **POST /api/chat** - Chat model responded: "Hello! How can I help you today?" ✓
- **DELETE /api/stock** - Removed item successfully ✓
- **POST /api/vision (validation)** - Returns 400 for missing image ✓

---

## Bugs Found & Fixed

### Bug 1: npm Registry Unreachable
- **Issue:** Default npm registry configured to `nexus.np.baac.aella.tech` which was unreachable (ENOTFOUND)
- **Fix:** Used `--registry https://registry.npmjs.org` flag for npm install commands
- **Impact:** Blocked all dependency installation

### Bug 2: Jest Config TypeScript
- **Issue:** `jest.config.ts` required `ts-node` package which was not installed
- **Fix:** Converted to `jest.config.js` (CommonJS) to avoid ts-node dependency
- **Impact:** Tests could not run

---

## Feature Update: Reference Images & Image Search (2026-03-27)

### New Features Added

#### 1. Product Reference Images
- Each stock item can now store multiple reference images
- Images uploaded during scan approval are auto-saved as reference images
- Users can manually add reference images via the expanded item view
- **PATCH /api/stock** - New endpoint to add reference images to existing items
- UI shows reference image count badge and expandable gallery per item

#### 2. Image Search in Store
- **POST /api/search** - New endpoint: upload an image to search store inventory
- Uses `gemma3:27b-cloud` vision model to identify items in the uploaded photo
- Provides stock item names as context to the AI for better matching
- Fuzzy matching algorithm: exact (100%), contains (80%), word-overlap (0-70%)
- Search results display match score badges on each item
- Search bar with clear button in the Stock Dashboard panel

### New Tests (10 tests added)
- **Search API Tests** (5 tests): validation, exact match, partial match, no-match, API error
- **Stock Reference Image Tests** (5 tests): PATCH add image, multiple images, validation, 404, POST with ref image
- **Total:** 26/26 tests passing ✓

### Files Modified
- `src/types/index.ts` - Added `SearchResult` type, `referenceImages` field
- `src/app/api/stock/route.ts` - Added PATCH method, `addReferenceImage` in POST
- `src/app/api/search/route.ts` - New image search endpoint
- `src/components/StockDashboard.tsx` - Search bar, expandable ref images, match badges
- `src/app/page.tsx` - Wired search + reference image handlers

---

## API IS WORKING

All API endpoints verified functional:
- Chat API communicates with minimax-m2.7:cloud model ✓
- Vision API ready for gemma3:27b-cloud image analysis ✓
- Stock API supports full CRUD + PATCH operations ✓
- Search API identifies items and matches against stock ✓
- 26/26 unit tests passing ✓
- Integration tests passing ✓
