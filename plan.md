# Project Overview
You are tasked with building a web-based chat application for smart inventory management. The application will allow users to chat, upload images of items, automatically detect and count the items using an AI vision model, and add them to a store stock database after a manual approval process via a popup.

**Important Model Requirements specified by the user:**
- **Chat Model:** `minimax-m2.7:cloud` (provided via Ollama or the specified cloud provider)
- **Vision/Image Model:** `gemma3:27b-cloud` (for reading and analyzing the uploaded images)

## Core Application Flow
1. **Chat Interface:** User interacts with a standard chat interface.
2. **Image Upload:** User can upload an image (e.g., a photo of stock items) directly into the chat.
3. **AI Vision Processing:** The image is sent to the `gemma3:27b-cloud` model with a prompt to identify the item(s) and count their exact quantities.
4. **Approval Popup:** Instead of adding to stock immediately, the application shows a "Popup Detail" modal containing:
   - The detected item name/category.
   - The detected count of the items.
   - An "Approve" button to confirm adding to the stock.
   - A "Cancel" or "Edit" button if the AI estimation is slightly off.
5. **Stock Insertion:** Once approved, the items are added to the store's stock database/state.
6. **Chat Feedback:** The chat interface acknowledges the successful addition to the inventory.

## Technical Stack Recommendations
- **Frontend:** React (Next.js or Vite) with TailwindCSS for styling and UI components (e.g., `lucide-react` for icons).
- **Backend/API:** Node.js (Express) or Next.js API Routes to handle model API requests safely.
- **Database:** SQLite or a simple JSON file structure for local prototyping of the "store stock".

---

## Execution Steps for Claude Code

Please execute the following steps sequentially to build the application:

### Step 1: Project Initialization
1. Initialize a new project directory (e.g., using Next.js or Vite + React).
2. Install required dependencies: `tailwindcss`, UI libraries (like `framer-motion` or `lucide-react`), and backend fetch utilities.
3. Configure the base layout, global CSS, and necessary environment variables for connecting to the `minimax-m2.7:cloud` and `gemma3:27b-cloud` models.

### Step 2: Build the Core UI Components
1. **Layout:** Create a split view UI—one side for the Chat Interface and the other for displaying the Current Store Stock.
2. **Chat Component:** Implement a scrollable message list, a text input field, and an image upload button.
3. **Stock Popup Modal:** Create a centered overlay component that takes `itemName` and `count` as props, displaying them clearly with "Approve" and "Cancel" buttons.
4. **Stock Dashboard:** Create a simple table or list to display the current inventory state.

### Step 3: Implement AI Model Integrations
1. **Chat Endpoint:** Create an API handler that communicates with the `minimax-m2.7:cloud` model. It should maintain conversational context.
2. **Vision/Image Endpoint:** Create an API handler that takes a base64 encoded image or multipart form data, and sends it to the `gemma3:27b-cloud` model. 
   - *Crucial:* The prompt to the vision model must explicitly ask it to return the detected item name and the count, preferably in a structured format like JSON (e.g., `{"item": "bottle", "count": 5}`).

### Step 4: State Management and Logic Wiring
1. Wire the Chat input to send messages and render AI responses.
2. Wire the Image Upload to send the file to the Vision API.
3. **The Interception Logic:** Once the Vision API returns the item and count:
   - Pause the chat flow.
   - Trigger/Open the **Approval Popup Modal** with the returned data.
4. **Approval Logic:** 
   - If the user clicks "Approve", dispatch an update to the Store Stock state/database.
   - Add a system message to the chat confirming: "Added [Count] [Item] to the stock."
   - Close the modal.

### Step 5: Polish and Testing
1. Add loading states (spinners or typing indicators) while waiting for the AI models to respond.
2. Handle errors gracefully (e.g., if the vision model cannot detect any items or returns invalid format).
3. Ensure the UI looks clean, modern, and matches standard chat application aesthetics.

*Note for Claude Code: Please run the terminal commands to initialize the project, write all necessary files, and set up the local development server to test the implementation.*
