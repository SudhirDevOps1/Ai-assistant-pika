<div align="center">
  <img src="public/logo.svg" width="150" height="150" alt="Pika AI Logo">
  <h1>Pika AI Assistant</h1>
  <p><strong>A sleek, modern, voice-controlled Desktop Assistant built with Next.js and Python.</strong></p>
  <p>Control your PC, get offline Hindi/English voice recognition, and chat with top LLMs like Groq, Mistral, and Gemini.</p>
</div>

---

## 🌟 Features

- **Offline Hindi/English Voice Recognition**: Integrated with Vosk for fast, private, and offline speech-to-text.
- **PC Control via Bridge**: A Python WebSocket server (`pc_bridge.py`) lets you control your PC (Volume, Open Apps, Shutdown, Reminders) directly from the Web UI.
- **Multiple AI Providers**: Chat with Groq, Google Gemini, Mistral, and Cerebras APIs.
- **Glassmorphism UI**: Beautiful, premium dark-mode interface built with Tailwind CSS and Framer Motion.
- **One-Click Startup**: Just double-click `start.bat` to launch both the frontend and the Python backend simultaneously.

---

## 🚀 Quick Start Guide

### 1. Requirements
- **Node.js**: v18 or higher (Download from [nodejs.org](https://nodejs.org/))
- **Python**: v3.10 or higher (Download from [python.org](https://www.python.org/))
- API Key from [Groq](https://console.groq.com) (or Gemini/Mistral/Cerebras)

### 2. Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/SudhirDevOps1/Ai-assistant-pika.git
   cd Ai-assistant-pika
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Install Python dependencies for the PC Bridge:
   ```bash
   cd pc-bridge
   pip install -r requirements.txt
   cd ..
   ```

### 3. Running the Assistant
You don't need to start things manually! 

Just double click the **`start.bat`** file in the root folder.
This will:
1. Start the Next.js Web UI on `http://localhost:3000`.
2. Start the Python PC Bridge on `ws://localhost:8765`.

### 4. Configuration
1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Go to **Settings** ⚙️ in the sidebar.
3. Paste your Groq/Gemini API Key.
4. Ensure the **PC Bridge URL** is set to `ws://localhost:8765` and hit **Save Settings**.
5. Start talking or typing!

---

## 💻 PC Bridge Capabilities
When the Python Bridge is running, your AI Assistant can:
- **System**: Shutdown, Restart, Sleep, Lock PC.
- **Volume**: Up, Down, Mute, Set Level.
- **Apps**: Launch Chrome, VS Code, Notepad, Calculator, etc.
- **Media**: Play/Pause, Next/Previous Track.
- **Utils**: Clipboard History, Screenshots, Set Reminders.

---

## 🛠️ Built With
- **Frontend**: Next.js 15, React 19, Tailwind CSS, Framer Motion
- **Backend Bridge**: Python, WebSockets, PyAutoGUI, Psutil
- **Voice**: Vosk Offline STT, Web Speech API
- **AI Models**: LLaMA 3, Mixtral, Gemini Pro (via API integrations)

---

> Created by [SudhirDevOps1](https://github.com/SudhirDevOps1). Feel free to fork and customize!
