# Voice AI — Desktop Assistant

A powerful **Hindi + English** voice-controlled desktop assistant with an advanced **web UI**, a **Python WebSocket backend** for PC control, and **multi-provider LLM chat** — all running locally on your machine.

> [!TIP]
> **Setup Guide**: A complete, step-by-step Setup & Usage Guide in Hindi/English is available offline. Double-click/open the [index.html](file:///e:/tmp/0606/AI/AI/index.html) file in your browser to read it.

```
Python Backend (WebSocket)  <───WebSocket────>  Web Frontend (Next.js)
pc_bridge.py (Port 8765)                          localhost:3000
│                                                 │
├─ Shutdown / Restart / Sleep / Lock              ├─ AI Chat (4 Providers)
├─ Volume Up / Down / Mute / Set                 ├─ PC Control Panel
├─ Media Play/Pause/Next/Prev                    ├─ Reminders Manager
├─ Open Apps (25+ apps)                           ├─ Clipboard Manager
├─ Open Websites (15+ sites)                      ├─ System Monitor
├─ Window Management                             ├─ Settings (API Keys, Voice)
├─ Screenshot (with thumbnail)                   └─ Dark / Light Theme
├─ File Create / Delete / List
├─ Clipboard Get / Set / Paste
├─ Web Search (6 engines)
├─ Keyboard Shortcuts
├─ Desktop Notifications
├─ Brightness Control
├─ WiFi Control
├─ Battery / CPU / RAM / Disk Info
└─ System Report (full)
```

---

## Features

### AI Chat — 4 LLM Providers, 25+ Models

| Provider | Models Available |
|----------|----------------|
| **Groq** | Llama 3.3 70B, Llama 4 Scout 17B, Llama 3.3 8B, Gemma 2 9B, DeepSeek R1 70B, Mistral Saba 24B, Qwen QWQ 32B |
| **Gemini** | Gemini 2.0 Flash, 2.0 Flash Lite, 1.5 Flash, 1.5 Flash 8B, 1.5 Pro, 2.5 Flash Preview |
| **Mistral** | Mistral Small, Nemo, Mixtral 8x7B, Mistral Large, Codestral, Mistral Medium |
| **Cerebras** | Llama 4 Scout 17B, Llama 3.3 70B, Llama 3.1 70B/8B, DeepSeek R1 70B, Qwen 3 32B |

- Hindi + English bilingual responses
- Markdown formatting + code syntax highlighting
- Conversation history with configurable limit
- Auto-fallback across providers if one fails
- System prompt optimized for voice assistant context

### PC Control — Full System Commands via WebSocket

All PC commands execute on your local machine through a Python WebSocket bridge. You control everything from the browser.

**System Commands:** Shutdown, Restart, Sleep, Lock Screen, Log Off

**Volume & Media:** Volume Up/Down/Mute/Set (slider), Play/Pause, Next Track, Previous Track

**Window Management:** Maximize, Minimize, Close Window, Switch Window (Alt+Tab), Show Desktop

**Quick Apps (25+):** Chrome, Firefox, Edge, Notepad, Calculator, VS Code, Spotify, VLC, Discord, Telegram, WhatsApp, Zoom, Teams, Word, Excel, PowerPoint, Paint, Explorer, Task Manager, CMD, PowerShell, Snipping Tool, Control Panel

**Quick Websites (15+):** YouTube, Google, Gmail, GitHub, Stack Overflow, Reddit, Twitter/X, LinkedIn, Wikipedia, ChatGPT, Claude, Netflix, Amazon, Flipkart

**Keyboard Shortcuts:** Select All, Copy, Cut, Paste, Undo, Redo, Save, Find, New Tab, Close Tab, Refresh, Print, Lock Screen, Task View, File Explorer, Search, Settings

**Custom Hotkey:** Press any keyboard combination (e.g., `ctrl+shift+i`, `alt+f4`, `win+d`) from the web UI

**Screen & Display:** Screenshot (saves to Desktop + thumbnail preview in browser), Brightness Up/Down

**File Operations:** Create files on Desktop (with contents), Create folders, Edit/write files, Delete files/folders, List directory contents, Rename files, Copy, Move, Open File Explorer, and Keyword file search.

**Camera & WiFi:** Turn WiFi On/Off, List networks, Connect/Disconnect, Open default system Camera app

**Clipboard:** Read clipboard content, Write text to clipboard, Paste (Ctrl+V)

**Web Search:** Search across Google, Bing, YouTube, GitHub, Stack Overflow, Wikipedia — opens results in your default browser

**Desktop Notifications:** Send custom toast notifications on your PC

**WiFi:** List networks, Disconnect, Connect to specific SSID

**Brightness:** Set brightness level (Windows WMI), Up/Down (fallback keys)

### Reminders

- Add reminders with custom text and duration (in minutes)
- Live countdown timer for each reminder
- Desktop notification + in-app message when reminder fires
- Delete individual reminders
- Persistent across sessions (stored in database)

### Clipboard Manager

- Add text items to clipboard history
- Copy any item back to system clipboard
- Remove individual items or clear all
- Persistent storage

### System Monitor

- Real-time CPU usage gauge
- Real-time RAM usage gauge
- Battery level with charging indicator
- Disk space usage bar
- System details: OS, IP Address, Hostname, Uptime
- Live clock with full date
- Email report button

### Web UI

- **Aurora gradient** animated background with particle starfield
- **Glassmorphism** cards with blur effects
- **Dark / Light mode** toggle (header)
- **Framer Motion** animations on every interaction
- **Collapsible sidebar** navigation (6 panels)
- **Responsive layout** — works on desktop and tablets
- **Toast notifications** for all actions
- **Markdown rendering** with syntax-highlighted code blocks
- **Voice input** button (Web Speech API)

---

## Tech Stack

### Frontend (Web UI)

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type-safe code |
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion** | Animations & transitions |
| **shadcn/ui** | 50+ pre-built UI components |
| **Zustand** | State management |
| **react-markdown** | Markdown rendering |
| **react-syntax-highlighter** | Code block highlighting |
| **Sonner** | Toast notifications |
| **next-themes** | Dark/Light mode |
| **Lucide React** | Icon library |

### Backend (Python WebSocket Server)

| Technology | Purpose |
|-----------|---------|
| **Python 3.10+** | Runtime |
| **websockets** | WebSocket server (asyncio) |
| **psutil** | CPU, RAM, Disk, Battery, Process info |
| **pyautogui** | Keyboard, mouse, media, volume, screenshots |
| **pyperclip** | Clipboard read/write |
| **pygetwindow** | Window management |
| **Pillow** | Screenshot processing |
| **subprocess** | System commands (shutdown, netsh, etc.) |

### API Backend (Next.js API Routes)

| Route | Purpose |
|-------|---------|
| `POST /api/chat` | LLM chat (Groq, Gemini, Mistral, Cerebras) |
| `GET/POST /api/config` | Settings persistence |
| `GET/POST/DELETE /api/reminders` | Reminder CRUD |
| `GET/POST/DELETE /api/clipboard` | Clipboard history |
| `GET /api/system` | System info for monitor |

---

## Project Structure

```
voice-ai-assistant/
├── pc-bridge/                          # Python WebSocket Backend
│   ├── pc_bridge.py                    # Main WebSocket server (~1000 lines)
│   └── requirements.txt               # Python dependencies
│
├── src/                                # Web Frontend (Next.js)
│   ├── app/
│   │   ├── page.tsx                    # Main page (6-panel layout)
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Aurora + glassmorphism styles
│   │   └── api/
│   │       ├── chat/route.ts          # LLM chat API
│   │       ├── config/route.ts         # Settings API
│   │       ├── reminders/route.ts     # Reminders API
│   │       ├── clipboard/route.ts      # Clipboard API
│   │       └── system/route.ts        # System info API
│   │
│   ├── components/
│   │   ├── assistant/
│   │   │   ├── sidebar.tsx             # Navigation sidebar (6 items)
│   │   │   ├── chat-area.tsx           # Chat messages display
│   │   │   ├── chat-input.tsx         # Text input + voice button
│   │   │   ├── chat-bubble.tsx         # Individual message bubble
│   │   │   ├── quick-actions.tsx       # Quick action chips
│   │   │   ├── pc-control-panel.tsx    # PC Control (13 sections)
│   │   │   ├── reminders-panel.tsx     # Reminders manager
│   │   │   ├── clipboard-panel.tsx     # Clipboard manager
│   │   │   ├── system-monitor.tsx      # System monitor gauges
│   │   │   ├── settings-panel.tsx      # Settings (API keys, voice, bridge)
│   │   │   └── status-indicator.tsx    # Status dot + provider badge
│   │   └── ui/                         # 50+ shadcn/ui components
│   │
│   ├── hooks/
│   │   ├── use-pc-bridge.ts           # WebSocket connection hook
│   │   ├── use-mobile.ts               # Mobile detection
│   │   └── use-toast.ts                # Toast hook
│   │
│   ├── store/
│   │   └── assistant-store.ts          # Zustand global state
│   │
│   └── lib/
│       ├── model-catalog.ts            # 25+ LLM models across 4 providers
│       ├── utils.ts                    # Utility functions (cn)
│       └── db.ts                       # Database config
│
├── public/
│   └── logo.svg                        # App logo
│
├── package.json                         # Node.js dependencies
├── next.config.ts                       # Next.js configuration
├── tailwind.config.ts                   # Tailwind CSS configuration
├── tsconfig.json                        # TypeScript configuration
└── data/
    └── config.json                      # Persistent config storage
```

---

## Getting Started

### Prerequisites

- **Python 3.10 or higher** installed
- **Node.js 18 or higher** installed (or Bun runtime)
- A working internet connection (for LLM API calls)
- At least one LLM API key (Groq is free — recommended)

### Step 1: Start the Python Backend (PC Bridge)

This is the WebSocket server that handles all PC commands.

```bash
# Navigate to the pc-bridge directory
cd pc-bridge

# Install Python dependencies
pip install -r requirements.txt

# Start the WebSocket server
python pc_bridge.py
```

You will see:

```
╔══════════════════════════════════════════════════════════════╗
║          PC Bridge — WebSocket Server                       ║
║          Voice AI Desktop Assistant                         ║
║                                                              ║
║  Server running on: ws://0.0.0.0:8765                      ║
║  Local access:       ws://localhost:8765                    ║
║  Network access:     ws://<YOUR_IP>:8765                    ║
║                                                              ║
║  Press Ctrl+C to stop                                       ║
╚══════════════════════════════════════════════════════════════╝

  Your LAN IP:       ws://192.168.1.100:8765
  Use this in the web UI Settings > PC Bridge
```

**Keep this terminal running.** The PC Bridge must be active for PC control commands to work.

> **Optional dependencies:** If `psutil`, `pyautogui`, `pyperclip`, or `pygetwindow` are not installed, the server still starts but those features will be limited. Install them all for full functionality:
> ```bash
> pip install psutil pyautogui pyperclip pygetwindow Pillow
> ```

### Step 2: Start the Web Frontend (Next.js)

Open a **second terminal** and run:

```bash
# Navigate to the project root
cd voice-ai-assistant

# Install Node.js dependencies (first time only)
npm install

# Start the development server
npm run dev
```

The web UI will open at: **http://localhost:3000**

### Step 3: Connect the Web UI to PC Bridge

1. Open **http://localhost:3000** in your browser
2. Go to the **PC Control** panel in the sidebar
3. In the WebSocket URL field, enter: `ws://localhost:8765`
4. Click **Connect**
5. The status should change to green — you're now connected!

> **For LAN access from another device:** Use `ws://192.168.1.100:8765` (replace with your actual LAN IP shown in the PC Bridge terminal). You can access the web UI from any device on the same network.

### Step 4: Configure API Keys

1. Go to **Settings** in the sidebar
2. Enter your API key(s) for the LLM provider(s) you want to use:
   - **Groq** (free): Get key at https://console.groq.com/keys
   - **Gemini** (free tier): Get key at https://aistudio.google.com/apikey
   - **Mistral**: Get key at https://console.mistral.ai/
   - **Cerebras**: Get key at https://cloud.cerebras.ai/
3. Select your preferred provider and model
4. Click **Save Settings**

---

## Usage Guide

### Chatting with AI

- Go to the **Chat** panel (first icon in sidebar)
- Type your message in the input box at the bottom and press **Enter**
- Or click the **microphone button** for voice input (uses browser's Web Speech API)
- The AI responds in Hindi or English depending on what language you use
- Supports markdown formatting, code blocks, and long conversations

### PC Control

- Go to the **PC Control** panel (terminal icon in sidebar)
- Make sure the WebSocket connection is green (connected)
- Use the buttons in each section to control your PC:
  - **System**: Shutdown, Restart, Sleep, Lock, Log Off
  - **Volume & Media**: Slider for volume, play/pause, next/prev
  - **Window**: Maximize, Minimize, Close, Switch, Show Desktop
  - **Quick Apps**: One-click to open Chrome, VS Code, Spotify, etc.
  - **Quick Websites**: One-click to open YouTube, Google, Gmail, etc.
  - **Web Search**: Type a query and search Google/YouTube/GitHub
  - **Keyboard**: Common shortcuts + custom hotkey input
  - **Screen**: Take screenshot, adjust brightness
  - **File**: Create files on Desktop
  - **Notifications**: Send custom desktop notifications
  - **Clipboard**: Read/write clipboard content
  - **System Info**: CPU, RAM, Battery, Disk, IP, Full Report

### Reminders

- Go to the **Reminders** panel (bell icon in sidebar)
- Enter reminder text and duration in minutes
- Click **Add** — the countdown starts immediately
- When the timer fires, you get a browser notification + in-app message
- Click the trash icon to delete a reminder

### Clipboard Manager

- Go to the **Clipboard** panel (clipboard icon in sidebar)
- Add text items manually
- Click the copy icon on any item to copy it back to your system clipboard
- Clear all items with the "Clear All" button

### System Monitor

- Go to the **System** panel (monitor icon in sidebar)
- View real-time CPU, RAM, and Battery gauges
- See storage and memory progress bars
- View system details (OS, IP, hostname, uptime)
- Live clock with full date display

### Settings

- Go to the **Settings** panel (gear icon in sidebar)
- **Provider & Model**: Choose from 4 providers and 25+ models
- **API Keys**: Enter/show keys for each provider
- **Voice Settings**: TTS voice ID, wake word, conversation limit, auto-fallback toggle
- **PC Bridge**: WebSocket server URL for PC control

### Dark / Light Mode

- Click the **sun/moon icon** in the top-right header bar to toggle between dark and light themes

---

## WebSocket API Reference

The Python PC Bridge accepts JSON commands over WebSocket. Each command has a `category`, `action`, and optional `params`.

### Command Format

```json
{
  "category": "system",
  "action": "shutdown",
  "params": {}
}
```

### Response Format

```json
{
  "type": "response",
  "success": true,
  "message": "Shutting down in 5 seconds."
}
```

### Available Categories

| Category | Actions | Description |
|----------|---------|-------------|
| `system` | `shutdown`, `restart`, `sleep`, `lock`, `logoff` | Power & session controls |
| `volume` | `up`, `down`, `mute`, `set` | Volume control (set needs `level` param) |
| `media` | `play_pause`, `next`, `prev` | Media playback controls |
| `app` | `open`, `close` | Open/close apps (needs `name` param) |
| `url` | (no action, use `url` param) | Open URL in browser |
| `window` | `minimize`, `maximize`, `close`, `switch`, `show_desktop` | Window management |
| `info` | `battery`, `cpu_ram`, `disk`, `ip`, `datetime`, `full_report`, `processes` | System information |
| `clipboard` | `get`, `set`, `paste` | Clipboard operations |
| `file` | `create`, `delete`, `list_dir` | File operations |
| `screenshot` | (no action) | Take screenshot |
| `reminder` | `add`, `list`, `cancel` | Reminder management |
| `notification` | (no action, use `title` + `body` params) | Desktop notification |
| `keyboard` | (no action, use `text` param) | Type text via keyboard |
| `hotkey` | (no action, use `keys` param like "ctrl+c") | Press keyboard combination |
| `search` | (use `query` + `engine` params) | Web search |
| `brightness` | `set`, `up`, `down` | Screen brightness |
| `wifi` | `list`, `disconnect`, `connect` | WiFi control |
| `shortcut` | `select_all`, `copy`, `cut`, `paste`, `undo`, `redo`, `save`, `find`, `new_tab`, `close_tab`, `refresh`, `print`, `lock_screen`, `task_view`, `file_explorer`, `search_windows`, `settings_app` | Keyboard shortcuts |
| `bluetooth` | `toggle` | Bluetooth toggle |
| `ping` | — | Health check (returns platform info) |

### Example Commands

```json
// Shutdown PC
{"category": "system", "action": "shutdown"}

// Set volume to 75%
{"category": "volume", "action": "set", "params": {"level": 75}}

// Open VS Code
{"category": "app", "action": "open", "params": {"name": "vs code"}}

// Get CPU and RAM info
{"category": "info", "action": "cpu_ram"}

// Take screenshot
{"category": "screenshot"}

// Search YouTube
{"category": "search", "params": {"query": "lofi music", "engine": "youtube"}}

// Set a 30-minute reminder
{"category": "reminder", "action": "add", "params": {"text": "Take a break!", "seconds": 1800}}

// Press custom hotkey
{"category": "hotkey", "params": {"keys": "ctrl+shift+i"}}

// Health check
{"category": "ping"}
```

---

## Environment Variables

The web frontend uses these optional environment variables (create a `.env.local` file in the project root):

```env
# Optional: Override default LLM settings
NEXT_PUBLIC_DEFAULT_PROVIDER=groq
NEXT_PUBLIC_DEFAULT_MODEL=llama-3.3-70b-versatile

# Optional: PC Bridge default URL
NEXT_PUBLIC_PC_BRIDGE_URL=ws://localhost:8765
```

---

## Troubleshooting

### PC Bridge won't start

- **"websockets not installed"**: Run `pip install websockets`
- **Port 8765 already in use**: Another program is using the port. Kill it or change the `PORT` variable in `pc_bridge.py`
- **Firewall blocking**: Allow Python through Windows Firewall for private networks

### Web UI won't connect to PC Bridge

- Make sure `python pc_bridge.py` is running in a terminal
- Verify the URL is correct: `ws://localhost:8765`
- If using a non-default port, update both the Python script and the web UI
- For LAN access, use the LAN IP shown in the PC Bridge terminal (not `localhost`)

### LLM chat not working

- Verify your API key is correct in Settings
- Check your internet connection
- Try switching to a different provider/model
- Check the browser console (F12) for error messages
- Groq API keys are free and work immediately — start with Groq

### Voice input not working

- Voice input uses the browser's built-in Web Speech API
- Works best in Chrome/Edge
- Click "Allow" when prompted for microphone permission
- Hindi speech recognition works in Chrome on most platforms

### Screenshot not appearing

- `pyautogui` must be installed: `pip install pyautogui Pillow`
- On macOS, you may need to grant Screen Recording permission to Terminal/Python in System Preferences
- On Linux, `xdotool` may be needed for additional functionality

---

## Supported Platforms

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| System commands (shutdown/restart/etc.) | Yes | Yes | Yes |
| Volume control | Yes (keyboard simulation) | Yes (keyboard simulation) | Yes (keyboard simulation) |
| Media controls | Yes | Yes | Yes |
| App launching | Yes (exe-based) | Partial (needs app names) | Partial (needs app names) |
| Window management | Yes | Yes (pygetwindow) | Partial |
| Screenshots | Yes | Yes | Yes |
| Clipboard | Yes | Yes | Yes |
| Brightness control | Yes (WMI) | Limited | Limited |
| WiFi control | Yes (netsh) | No | No |
| Desktop notifications | Yes (PowerShell toast) | Yes (osascript) | Yes (notify-send) |

---

## Security Notes

- The WebSocket server binds to `0.0.0.0` by default, meaning it's accessible from your entire LAN
- There is **no authentication** — anyone on the same network can send commands
- For production/sensitive use, change `HOST = "127.0.0.1"` in `pc_bridge.py` to restrict to localhost only
- API keys are stored in the browser's local state and the server-side config — never commit them to version control
- The PC Bridge has full control of your machine — only run it on trusted networks

---

## License

This project is for personal and educational use. Use responsibly.
