"""
PC Bridge — WebSocket Server for Pika AI Assistant
============================================================
Run this on your PC to control it from the web UI.
All PC commands (shutdown, volume, apps, media, etc.) are handled here.

Usage:
    pip install -r requirements.txt
    python pc_bridge.py

Then in the web UI, go to Settings > PC Bridge and connect to ws://YOUR_IP:8765
"""

import asyncio
import base64
import ctypes
import json
import logging
import os
import platform
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import webbrowser
from datetime import datetime
from pathlib import Path
from threading import Timer
from typing import Optional

def _get_expanded_home():
    raw = os.path.expanduser("~")
    expanded = os.path.expandvars(raw)
    
    # If the path contains literal "[username]", replace it with the USERNAME environment variable
    if "[username]" in expanded.lower():
        username = os.environ.get("USERNAME")
        if username:
            expanded = re.sub(r'\[username\]', username, expanded, flags=re.IGNORECASE)
            
    # If it is still invalid or contains "[username]", try USERPROFILE or APPDATA fallbacks
    if "[username]" in expanded.lower() or not Path(expanded).exists():
        userprofile = os.environ.get("USERPROFILE")
        if userprofile and not "[username]" in userprofile.lower():
            expanded = os.path.expandvars(userprofile)
        else:
            appdata = os.environ.get("APPDATA")
            if appdata:
                p_appdata = Path(appdata)
                if p_appdata.name == "Roaming" and p_appdata.parent.name == "AppData":
                    expanded = str(p_appdata.parent.parent)
                    
    # Clean any unexpanded literal environment variable strings in the resolved path
    expanded = expanded.replace("%USERPROFILE%", "").replace("%USERNAME%", "")
    expanded = expanded.replace("\\\\", "\\").replace("//", "/")
    return Path(expanded).resolve()

Path.home = staticmethod(_get_expanded_home)

try:
    import websockets
    from websockets.asyncio.server import serve
except ImportError:
    print("ERROR: 'websockets' not installed. Run: pip install websockets")
    sys.exit(1)

try:
    import psutil
except ImportError:
    psutil = None
    print("WARNING: 'psutil' not installed. System info will be limited.")

try:
    import pyautogui
except ImportError:
    pyautogui = None
    print("WARNING: 'pyautogui' not installed. Media/window/volume controls will be limited.")

try:
    import pyperclip
except ImportError:
    pyperclip = None
    print("WARNING: 'pyperclip' not installed. Clipboard features will be limited.")

try:
    import pygetwindow as gw
except ImportError:
    gw = None

try:
    from vosk import Model, KaldiRecognizer
except ImportError:
    Model = None
    KaldiRecognizer = None
    print("WARNING: 'vosk' not installed. Offline Speech-to-Text will be disabled.")

# ─── Constants ───────────────────────────────────────────────────────────────

HOST = "0.0.0.0"
PORT = 8765
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(message)s"

logging.basicConfig(level=logging.INFO, format=LOG_FORMAT, handlers=[
    logging.StreamHandler(sys.stdout),
    logging.FileHandler(Path(__file__).parent / "pc_bridge.log"),
])
logger = logging.getLogger("PC-Bridge")

URL_MAP = {
    "youtube": "https://www.youtube.com",
    "github": "https://www.github.com",
    "google": "https://www.google.com",
    "gmail": "https://mail.google.com",
    "stack overflow": "https://stackoverflow.com",
    "reddit": "https://www.reddit.com",
    "twitter": "https://www.twitter.com",
    "linkedin": "https://www.linkedin.com",
    "wikipedia": "https://www.wikipedia.org",
    "chatgpt": "https://chat.openai.com",
    "claude": "https://claude.ai",
    "netflix": "https://www.netflix.com",
    "amazon": "https://www.amazon.in",
    "flipkart": "https://www.flipkart.com",
}

APP_MAP = {
    "notepad": "notepad.exe",
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "chrome": "chrome.exe",
    "google chrome": "chrome.exe",
    "firefox": "firefox.exe",
    "edge": "msedge.exe",
    "microsoft edge": "msedge.exe",
    "word": "winword.exe",
    "excel": "excel.exe",
    "powerpoint": "powerpnt.exe",
    "paint": "mspaint.exe",
    "explorer": "explorer.exe",
    "file explorer": "explorer.exe",
    "task manager": "taskmgr.exe",
    "cmd": "cmd.exe",
    "command prompt": "cmd.exe",
    "powershell": "powershell.exe",
    "vs code": "code.exe",
    "vscode": "code.exe",
    "spotify": "spotify.exe",
    "vlc": "vlc.exe",
    "discord": "discord.exe",
    "telegram": "telegram.exe",
    "whatsapp": "WhatsApp.exe",
    "zoom": "zoom.exe",
    "teams": "teams.exe",
    "snipping tool": "SnippingTool.exe",
    "control panel": "control.exe",
}

# ─── Active Reminders ────────────────────────────────────────────────────────

_active_reminders = []
_reminder_lock = threading.Lock()
_main_loop = None


def _trigger_reminder(reminder_id: int, text: str):
    """Called by Timer when a reminder fires."""
    global _active_reminders
    with _reminder_lock:
        _active_reminders = [r for r in _active_reminders if r["id"] != reminder_id]
    msg = json.dumps({"type": "event", "event": "reminder", "data": {
        "id": reminder_id,
        "text": text,
    }})
    if _main_loop and _main_loop.is_running():
        asyncio.run_coroutine_threadsafe(
            _broadcast_to_all(msg),
            _main_loop
        )
    logger.info(f"Reminder fired: {text}")


# ─── Command Handlers ────────────────────────────────────────────────────────

def cmd_system(action: str, params: dict) -> dict:
    """Handle system commands: shutdown, restart, sleep, lock, logoff."""
    try:
        if action == "shutdown":
            if platform.system() == "Windows":
                subprocess.run(["shutdown", "/s", "/t", "5"], shell=True)
            else:
                subprocess.run(["shutdown", "-h", "now"], shell=True)
            return {"success": True, "message": "Shutting down in 5 seconds."}

        elif action == "restart":
            if platform.system() == "Windows":
                subprocess.run(["shutdown", "/r", "/t", "5"], shell=True)
            else:
                subprocess.run(["reboot"], shell=True)
            return {"success": True, "message": "Restarting in 5 seconds."}

        elif action == "sleep":
            if platform.system() == "Windows":
                subprocess.run(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"], shell=True)
            else:
                subprocess.run(["systemctl", "suspend"], shell=True)
            return {"success": True, "message": "Going to sleep."}

        elif action == "lock":
            if platform.system() == "Windows":
                subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"], shell=True)
            else:
                subprocess.run(["xdg-screensaver", "lock"], shell=True)
            return {"success": True, "message": "Screen locked."}

        elif action == "logoff":
            if platform.system() == "Windows":
                subprocess.run(["shutdown", "/l"], shell=True)
            else:
                subprocess.run(["logout"], shell=True)
            return {"success": True, "message": "Logging off."}

        elif action == "open_camera":
            if platform.system() == "Windows":
                subprocess.run("start microsoft.windows.camera:", shell=True)
                return {"success": True, "message": "Camera opened successfully."}
            else:
                return {"success": False, "message": "Camera opening only supported on Windows."}

        else:
            return {"success": False, "message": f"Unknown system action: {action}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_volume(action: str, params: dict) -> dict:
    """Handle volume commands."""
    if not pyautogui:
        return {"success": False, "message": "pyautogui not installed."}

    try:
        if action == "up":
            amount = params.get("amount", 10)
            presses = max(1, amount // 2)
            for _ in range(presses):
                pyautogui.press("volumeup")
            return {"success": True, "message": f"Volume increased by {amount}%."}

        elif action == "down":
            amount = params.get("amount", 10)
            presses = max(1, amount // 2)
            for _ in range(presses):
                pyautogui.press("volumedown")
            return {"success": True, "message": f"Volume decreased by {amount}%."}

        elif action == "mute":
            pyautogui.press("volumemute")
            return {"success": True, "message": "Volume muted/unmuted."}

        elif action == "set":
            level = int(params.get("level", 50))
            level = max(0, min(100, level))
            # Simple approach: mute then press volume up
            pyautogui.press("volumemute")  # ensure unmuted first
            time.sleep(0.1)
            pyautogui.press("volumemute")  # mute to 0
            presses = level // 2
            for _ in range(presses):
                pyautogui.press("volumeup")
            return {"success": True, "message": f"Volume set to approximately {level}%."}

        else:
            return {"success": False, "message": f"Unknown volume action: {action}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_media(action: str, params: dict) -> dict:
    """Handle media controls."""
    if not pyautogui:
        return {"success": False, "message": "pyautogui not installed."}

    try:
        if action in ("play_pause", "play", "pause", "stop"):
            pyautogui.press("playpause")
            return {"success": True, "message": "Play/Pause toggled."}
        elif action == "next":
            pyautogui.press("nexttrack")
            return {"success": True, "message": "Next track."}
        elif action == "prev":
            pyautogui.press("prevtrack")
            return {"success": True, "message": "Previous track."}
        else:
            return {"success": False, "message": f"Unknown media action: {action}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def find_windows_executable(name: str) -> str:
    """Find absolute path of a Windows executable by checking common directories if not directly in PATH."""
    if platform.system() != "Windows":
        return name
    if shutil.which(name):
        return name
        
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    app_data = os.environ.get("APPDATA", "")
    program_files = os.environ.get("ProgramFiles", "C:\\Program Files")
    program_files_x86 = os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)")
    
    paths_to_check = []
    if name == "code.exe":
        paths_to_check.append(Path(local_app_data) / "Programs" / "Microsoft VS Code" / "Code.exe")
        paths_to_check.append(Path(local_app_data) / "Programs" / "Microsoft VS Code" / "bin" / "code.cmd")
    elif name == "spotify.exe":
        paths_to_check.append(Path(app_data) / "Spotify" / "Spotify.exe")
        paths_to_check.append(Path(local_app_data) / "Microsoft" / "WindowsApps" / "Spotify.exe")
    elif name == "discord.exe":
        discord_dir = Path(local_app_data) / "Discord"
        if discord_dir.exists():
            for p in discord_dir.glob("app-*/Discord.exe"):
                return str(p)
    elif name == "telegram.exe":
        paths_to_check.append(Path(app_data) / "Telegram Desktop" / "Telegram.exe")
    elif name == "chrome.exe":
        paths_to_check.append(Path(program_files) / "Google" / "Chrome" / "Application" / "chrome.exe")
        paths_to_check.append(Path(program_files_x86) / "Google" / "Chrome" / "Application" / "chrome.exe")
    
    for p in paths_to_check:
        if p.exists():
            return str(p)
            
    return name


def cmd_app(action: str, params: dict) -> dict:
    """Handle app open/close."""
    try:
        name = params.get("name", "").lower().strip()

        if action == "open":
            exe = APP_MAP.get(name)
            if exe:
                resolved_exe = find_windows_executable(exe)
                subprocess.Popen(resolved_exe, shell=True)
                return {"success": True, "message": f"Opening {name}."}

            # Try URL map
            for key, url in URL_MAP.items():
                if key in name:
                    webbrowser.open(url)
                    return {"success": True, "message": f"Opening {key}."}

            # Try as URL
            if ".com" in name or ".org" in name or ".net" in name or name.startswith("http"):
                webbrowser.open(name if name.startswith("http") else f"https://www.{name}")
                return {"success": True, "message": f"Opening {name}."}

            # Web search fallback
            search_url = f"https://www.google.com/search?q={name}"
            webbrowser.open(search_url)
            return {"success": True, "message": f"Searching Google for: {name}"}

        elif action == "close":
            exe = APP_MAP.get(name, f"{name}.exe")
            try:
                subprocess.run(["taskkill", "/IM", exe, "/F"], capture_output=True, shell=True)
                return {"success": True, "message": f"Closed {name}."}
            except Exception:
                return {"success": False, "message": f"Could not close {name}."}

        else:
            return {"success": False, "message": f"Unknown app action: {action}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_url(params: dict) -> dict:
    """Open URL in browser."""
    url = params.get("url", "")
    if not url:
        return {"success": False, "message": "No URL provided."}
    try:
        if not url.startswith("http"):
            url = f"https://{url}"
        webbrowser.open(url)
        return {"success": True, "message": f"Opened {url}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_window(action: str, params: dict) -> dict:
    """Handle window management."""
    if not pyautogui:
        return {"success": False, "message": "pyautogui not installed."}

    try:
        if action == "minimize":
            if gw:
                win = gw.getActiveWindow()
                if win:
                    win.minimize()
            pyautogui.hotkey("win", "down")
            return {"success": True, "message": "Window minimized."}

        elif action == "maximize":
            if gw:
                win = gw.getActiveWindow()
                if win:
                    win.maximize()
            pyautogui.hotkey("win", "up")
            return {"success": True, "message": "Window maximized."}

        elif action == "close":
            pyautogui.hotkey("alt", "f4")
            return {"success": True, "message": "Window closed."}

        elif action == "switch":
            pyautogui.hotkey("alt", "tab")
            return {"success": True, "message": "Switched window."}

        elif action == "show_desktop":
            pyautogui.hotkey("win", "d")
            return {"success": True, "message": "Desktop shown."}

        elif action == "focus":
            name = params.get("title", "").lower()
            if not name:
                return {"success": False, "message": "No window title provided to focus."}
            if gw:
                all_wins = gw.getAllWindows()
                for w in all_wins:
                    if name in w.title.lower():
                        w.activate()
                        return {"success": True, "message": f"Focussed window: {w.title}"}
                return {"success": False, "message": f"No active window found containing '{name}'"}
            return {"success": False, "message": "pygetwindow not available"}

        else:
            return {"success": False, "message": f"Unknown window action: {action}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_system_info(info_type: str) -> dict:
    """Get system information."""
    if not psutil:
        return {"success": False, "message": "psutil not installed."}

    try:
        if info_type == "battery":
            batt = psutil.sensors_battery()
            if batt:
                return {
                    "success": True,
                    "data": {
                        "percent": batt.percent,
                        "charging": batt.power_plugged,
                        "time_left": batt.secsleft if batt.secsleft and batt.secsleft < 86400 else None,
                    }
                }
            return {"success": True, "data": {"percent": None, "charging": None, "message": "No battery"}}

        elif info_type == "cpu_ram":
            cpu = psutil.cpu_percent(interval=0.5)
            ram = psutil.virtual_memory()
            return {
                "success": True,
                "data": {
                    "cpu_percent": cpu,
                    "cpu_count": psutil.cpu_count(),
                    "ram_percent": ram.percent,
                    "ram_used_gb": round(ram.used / (1024 ** 3), 2),
                    "ram_total_gb": round(ram.total / (1024 ** 3), 2),
                }
            }

        elif info_type == "disk":
            disk = psutil.disk_usage("/")
            return {
                "success": True,
                "data": {
                    "total_gb": round(disk.total / (1024 ** 3), 2),
                    "used_gb": round(disk.used / (1024 ** 3), 2),
                    "free_gb": round(disk.free / (1024 ** 3), 2),
                    "percent": disk.percent,
                }
            }

        elif info_type == "ip":
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                ip = s.getsockname()[0]
                s.close()
                return {"success": True, "data": {"ip": ip}}
            except Exception:
                return {"success": True, "data": {"ip": "Unknown"}}

        elif info_type == "datetime":
            now = datetime.now()
            return {
                "success": True,
                "data": {
                    "date": now.strftime("%A, %d %B %Y"),
                    "time": now.strftime("%I:%M %p"),
                    "full": now.strftime("%Y-%m-%d %H:%M:%S"),
                }
            }

        elif info_type == "full_report":
            batt = psutil.sensors_battery()
            ram = psutil.virtual_memory()
            disk = psutil.disk_usage("/")
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                ip = s.getsockname()[0]
                s.close()
            except Exception:
                ip = "Unknown"

            return {
                "success": True,
                "data": {
                    "cpu_percent": psutil.cpu_percent(interval=0.5),
                    "cpu_count": psutil.cpu_count(),
                    "ram_percent": ram.percent,
                    "ram_used_gb": round(ram.used / (1024 ** 3), 2),
                    "ram_total_gb": round(ram.total / (1024 ** 3), 2),
                    "disk_free_gb": round(disk.free / (1024 ** 3), 2),
                    "disk_total_gb": round(disk.total / (1024 ** 3), 2),
                    "disk_percent": disk.percent,
                    "battery_percent": round(batt.percent, 1) if batt else None,
                    "battery_charging": batt.power_plugged if batt else None,
                    "ip_address": ip,
                    "hostname": socket.gethostname(),
                    "platform": platform.platform(),
                    "os": f"{platform.system()} {platform.release()}",
                    "python_version": platform.python_version(),
                    "datetime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "uptime_hours": round(time.time() - psutil.boot_time(), 2) / 3600 if psutil else None,
                }
            }

        elif info_type == "processes":
            procs = []
            for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
                try:
                    info = p.info
                    procs.append({
                        "pid": info["pid"],
                        "name": info["name"],
                        "cpu": info["cpu_percent"] or 0,
                        "memory": round(info["memory_percent"] or 0, 2),
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            procs.sort(key=lambda x: x["memory"], reverse=True)
            return {"success": True, "data": {"processes": procs[:20]}}

        else:
            return {"success": False, "message": f"Unknown info type: {info_type}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_clipboard(action: str, params: dict) -> dict:
    """Handle clipboard operations."""
    if not pyperclip:
        return {"success": False, "message": "pyperclip not installed."}

    try:
        if action == "get":
            content = pyperclip.paste()
            return {"success": True, "data": {"content": content}}

        elif action == "set":
            text = params.get("text", "")
            pyperclip.copy(text)
            return {"success": True, "message": "Clipboard updated."}

        elif action == "paste":
            if pyautogui:
                pyautogui.hotkey("ctrl", "v")
            return {"success": True, "message": "Pasted."}

        else:
            return {"success": False, "message": f"Unknown clipboard action: {action}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def resolve_safe_path(location: str, name: str = "") -> Path:
    """Resolve location/name to an absolute Path, defaulting to user's Home directory for relative paths."""
    home = Path.home()
    
    # Map natural language names or relative references to standard home folders
    loc_lower = location.lower().strip() if location else ""
    if loc_lower in ("desktop", "desktop par", "desktop folder", "desktop\\", "desktop/"):
        base_path = home / "Desktop"
    elif loc_lower in ("documents", "documents mein", "document", "documents\\", "documents/"):
        base_path = home / "Documents"
    elif loc_lower in ("downloads", "downloads mein", "download", "downloads\\", "downloads/"):
        base_path = home / "Downloads"
    elif loc_lower in ("pictures", "pictures mein", "picture", "pictures\\", "pictures/"):
        base_path = home / "Pictures"
    elif loc_lower in ("music", "music mein", "music\\", "music/"):
        base_path = home / "Music"
    elif loc_lower in ("videos", "videos mein", "video", "videos\\", "videos/"):
        base_path = home / "Videos"
    elif not location:
        base_path = home / "Desktop"
    else:
        # If it's a relative path (e.g. "Desktop" or "subfolder"), resolve it against Home directory
        p = Path(location)
        if not p.is_absolute():
            base_path = home / p
        else:
            base_path = p
            
    if name:
        return (base_path / name).resolve()
    return base_path.resolve()


def cmd_file(action: str, params: dict) -> dict:
    """Handle file operations."""
    try:
        if action == "create":
            name = params.get("name", "untitled.txt")
            location = params.get("location", "")
            content = params.get("content", "")
            
            path = resolve_safe_path(location, name)
            
            # Create directory if it doesn't exist
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            return {"success": True, "message": f"File created and content written to: {path}"}

        elif action == "create_folder":
            name = params.get("name", "New Folder")
            location = params.get("location", "")
            path = resolve_safe_path(location, name)
            path.mkdir(parents=True, exist_ok=True)
            return {"success": True, "message": f"Folder created successfully at: {path}"}

        elif action == "edit":
            path_str = params.get("path", "")
            content = params.get("content", "")
            mode = params.get("mode", "write")
            if not path_str:
                return {"success": False, "message": "No file path specified to edit."}
            
            # Resolve path safely (check if relative, resolve against Home)
            p = Path(path_str)
            if not p.is_absolute():
                path = (Path.home() / p).resolve()
            else:
                path = p.resolve()
            
            # Create parent dirs if not existing
            path.parent.mkdir(parents=True, exist_ok=True)
            write_mode = "w" if mode == "write" else "a"
            with open(path, write_mode, encoding="utf-8") as f:
                f.write(content)
            return {"success": True, "message": f"File updated: {path}"}

        elif action == "delete":
            path_str = params.get("path", "")
            if not path_str:
                return {"success": False, "message": "No path specified for deletion."}
            
            p = Path(path_str)
            if not p.is_absolute():
                path = (Path.home() / p).resolve()
            else:
                path = p.resolve()
            
            # Absolute critical directory protection safety check
            forbidden_patterns = [
                r"^[a-zA-Z]:\\$", r"^[a-zA-Z]:\\Windows", r"^[a-zA-Z]:\\Program Files",
                r"^[a-zA-Z]:\\Users\\[^\\]+\\AppData", r"^[a-zA-Z]:\\SystemVolumeInformation",
                r"^[a-zA-Z]:\\VoiceAI"
            ]
            path_abs = str(path)
            for pattern in forbidden_patterns:
                if re.search(pattern, path_abs, re.IGNORECASE):
                    return {"success": False, "message": f"Security Violation: Deleting '{path_abs}' is restricted!"}
                    
            if path.exists():
                if path.is_dir():
                    shutil.rmtree(path)
                else:
                    path.unlink()
                return {"success": True, "message": f"Deleted: {path}"}
            return {"success": False, "message": f"File not found: {path}"}

        elif action == "list_dir":
            path_str = params.get("path", "")
            
            # Resolve path safely (check if relative, resolve against Home)
            p = Path(path_str) if path_str else Path.home()
            if not p.is_absolute():
                path = (Path.home() / p).resolve()
            else:
                path = p.resolve()
                
            if path.exists() and path.is_dir():
                items = []
                for item in path.iterdir():
                    try:
                        items.append({
                            "name": item.name,
                            "type": "dir" if item.is_dir() else "file",
                            "size": item.stat().st_size if item.is_file() else None,
                        })
                    except Exception:
                        continue
                return {"success": True, "data": {"path": str(path), "items": items[:50]}}
            return {"success": False, "message": f"Path not found: {path}"}

        elif action == "rename":
            old_path_str = params.get("old_path", "")
            new_path_str = params.get("new_path", "")
            if not old_path_str or not new_path_str:
                return {"success": False, "message": "Missing old_path or new_path."}
            
            # Resolve old path
            old_p = Path(old_path_str)
            if not old_p.is_absolute():
                old_path = (Path.home() / old_p).resolve()
            else:
                old_path = old_p.resolve()
                
            # Resolve new path
            new_p = Path(new_path_str)
            if not new_p.is_absolute():
                new_path = (Path.home() / new_p).resolve()
            else:
                new_path = new_p.resolve()
                
            if not old_path.exists():
                return {"success": False, "message": f"Source file/folder not found: {old_path}"}
                
            old_path.rename(new_path)
            return {"success": True, "message": f"Renamed successfully to: {new_path}"}

        elif action == "move":
            src_str = params.get("src", "")
            dest_str = params.get("dest", "")
            if not src_str or not dest_str:
                return {"success": False, "message": "Missing src or dest path."}
                
            src = Path(src_str) if Path(src_str).is_absolute() else Path.home() / src_str
            dest = Path(dest_str) if Path(dest_str).is_absolute() else Path.home() / dest_str
            
            if not src.exists():
                return {"success": False, "message": f"Source file not found: {src}"}
                
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dest))
            return {"success": True, "message": f"Moved successfully to: {dest}"}

        elif action == "copy":
            src_str = params.get("src", "")
            dest_str = params.get("dest", "")
            if not src_str or not dest_str:
                return {"success": False, "message": "Missing src or dest path."}
                
            src = Path(src_str) if Path(src_str).is_absolute() else Path.home() / src_str
            dest = Path(dest_str) if Path(dest_str).is_absolute() else Path.home() / dest_str
            
            if not src.exists():
                return {"success": False, "message": f"Source file not found: {src}"}
                
            dest.parent.mkdir(parents=True, exist_ok=True)
            if src.is_dir():
                shutil.copytree(str(src), str(dest), dirs_exist_ok=True)
            else:
                shutil.copy2(str(src), str(dest))
            return {"success": True, "message": f"Copied successfully to: {dest}"}

        elif action == "open_explorer":
            path_str = params.get("path", "")
            p = Path(path_str) if path_str else Path.home()
            if not p.is_absolute():
                path = (Path.home() / p).resolve()
            else:
                path = p.resolve()
                
            if platform.system() == "Windows":
                os.startfile(str(path))
            else:
                subprocess.run(["xdg-open", str(path)])
            return {"success": True, "message": f"Opened Explorer at: {path}"}

        elif action in ("find", "search"):
            query = params.get("query", "")
            location = params.get("location", "")
            if not query:
                return {"success": False, "message": "No search query provided to find."}
            
            start_dir = resolve_safe_path(location)
            if not start_dir.exists() or not start_dir.is_dir():
                return {"success": False, "message": f"Starting directory not found: {start_dir}"}
                
            matches = []
            for root, dirs, files in os.walk(str(start_dir)):
                # Skip AppData/Temp to prevent long times
                if any(x in root for x in ["AppData", "Local\\Temp", "node_modules", ".git"]):
                    continue
                for name in dirs + files:
                    if query.lower() in name.lower():
                        matches.append({
                            "name": name,
                            "type": "dir" if name in dirs else "file",
                            "path": str(Path(root) / name)
                        })
                        if len(matches) >= 30:
                            break
                if len(matches) >= 30:
                    break
                    
            if matches:
                return {"success": True, "data": {"matches": matches}, "message": f"Found {len(matches)} matching items."}
            return {"success": True, "data": {"matches": []}, "message": "No matching files or folders found."}

        else:
            return {"success": False, "message": f"Unknown file action: {action}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_screenshot(params: dict) -> dict:
    """Take a screenshot."""
    if not pyautogui:
        return {"success": False, "message": "pyautogui not installed."}

    try:
        filename = params.get("filename", f"screenshot_{int(time.time())}.png")
        desktop = Path.home() / "Desktop"
        filepath = desktop / filename

        screenshot = pyautogui.screenshot()
        screenshot.save(str(filepath))

        # Return base64 thumbnail
        import io
        thumbnail = screenshot.resize((400, 225))
        buf = io.BytesIO()
        thumbnail.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()

        return {
            "success": True,
            "data": {
                "path": str(filepath),
                "thumbnail": f"data:image/png;base64,{b64}",
            },
            "message": f"Screenshot saved: {filename}",
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_reminder(action: str, params: dict) -> dict:
    """Handle reminders."""
    global _active_reminders

    if action == "add":
        text = params.get("text", "Timer done!")
        seconds = float(params.get("seconds", 60))
        reminder_id = int(time.time() * 1000)

        reminder = {
            "id": reminder_id,
            "text": text,
            "seconds": seconds,
            "trigger_at": time.time() + seconds,
        }

        with _reminder_lock:
            _active_reminders.append(reminder)

        def _fire():
            global _active_reminders
            _trigger_reminder(reminder_id, text)

        t = Timer(seconds, _fire)
        t.daemon = True
        t.start()

        return {
            "success": True,
            "data": reminder,
            "message": f"Reminder set for {seconds / 60:.1f} min: '{text}'",
        }

    elif action == "list":
        with _reminder_lock:
            return {
                "success": True,
                "data": {"reminders": _active_reminders},
            }

    elif action == "cancel":
        rid = params.get("id")
        with _reminder_lock:
            _active_reminders = [r for r in _active_reminders if r["id"] != rid]
        return {"success": True, "message": f"Reminder {rid} cancelled."}

    else:
        return {"success": False, "message": f"Unknown reminder action: {action}"}


def cmd_notification(params: dict) -> dict:
    """Show a desktop notification."""
    title = params.get("title", "Voice AI")
    body = params.get("body", "")

    try:
        if platform.system() == "Windows":
            # Use PowerShell toast notification
            ps_cmd = f'''
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$template = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>{title}</text>
      <text>{body}</text>
    </binding>
  </visual>
</toast>
"@
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Voice AI").Show($toast)
'''
            result = subprocess.run(
                ["powershell", "-Command", ps_cmd],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode != 0:
                # Fallback: use ctypes MessageBox
                ctypes.windll.user32.MessageBoxW(0, body, title, 0x40)
        elif platform.system() == "Darwin":
            subprocess.run(["osascript", "-e", f'display notification "{body}" with title "{title}"'])
        else:
            subprocess.run(["notify-send", title, body])
        return {"success": True, "message": "Notification shown."}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_type_text(params: dict) -> dict:
    """Type text using keyboard."""
    if not pyautogui:
        return {"success": False, "message": "pyautogui not installed."}

    try:
        text = params.get("text", "")
        pyautogui.typewrite(text, interval=0.03)
        return {"success": True, "message": f"Typed {len(text)} characters."}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_hotkey(params: dict) -> dict:
    """Press a keyboard hotkey combination."""
    if not pyautogui:
        return {"success": False, "message": "pyautogui not installed."}

    try:
        keys = params.get("keys", "").split("+")
        keys = [k.strip() for k in keys if k.strip()]
        if keys:
            pyautogui.hotkey(*keys)
            return {"success": True, "message": f"Hotkey pressed: {'+'.join(keys)}"}
        return {"success": False, "message": "No keys specified."}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_search(params: dict) -> dict:
    """Web search."""
    query = params.get("query", "")
    if not query:
        return {"success": False, "message": "No query provided."}

    engine = params.get("engine", "google")
    urls = {
        "google": f"https://www.google.com/search?q={query}",
        "bing": f"https://www.bing.com/search?q={query}",
        "youtube": f"https://www.youtube.com/results?search_query={query}",
        "github": f"https://github.com/search?q={query}",
        "stackoverflow": f"https://stackoverflow.com/search?q={query}",
        "wikipedia": f"https://en.wikipedia.org/wiki/Special:Search?search={query}",
    }
    url = urls.get(engine, urls["google"])
    webbrowser.open(url)
    return {"success": True, "message": f"Searching {engine} for: {query}"}


def cmd_brightness(action: str, params: dict) -> dict:
    """Screen brightness control (Windows only)."""
    try:
        if platform.system() != "Windows":
            return {"success": False, "message": "Brightness control only available on Windows."}

        if action == "set":
            level = int(params.get("level", 50))
            level = max(0, min(100, level))
            # Use wmi to set brightness
            import wmi
            c = wmi.WMI(namespace="wmi")
            methods = c.WmiMonitorBrightnessMethods()[0]
            methods.WmiSetBrightness(level, 0)
            return {"success": True, "message": f"Brightness set to {level}%."}
        elif action == "get":
            import wmi
            c = wmi.WMI(namespace="wmi")
            brightness = c.WmiMonitorBrightness()[0]
            return {"success": True, "data": {"level": brightness.CurrentBrightness}}
        else:
            return {"success": False, "message": f"Unknown brightness action: {action}"}
    except ImportError:
        # Fallback: use monitor brightness keys
        if pyautogui:
            if action == "up":
                pyautogui.press("brightnessup")
                return {"success": True, "message": "Brightness increased."}
            elif action == "down":
                pyautogui.press("brightnessdown")
                return {"success": True, "message": "Brightness decreased."}
        return {"success": False, "message": "wmi/pyautogui not available for brightness control."}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_wifi(action: str, params: dict) -> dict:
    """WiFi control (Windows only)."""
    try:
        if platform.system() != "Windows":
            return {"success": False, "message": "WiFi control only available on Windows."}

        if action == "list":
            result = subprocess.run(
                ["netsh", "wlan", "show", "networks", "mode=bssid"],
                capture_output=True, text=True, timeout=10
            )
            return {"success": True, "data": {"output": result.stdout}}
        elif action == "on":
            subprocess.run("netsh interface set interface name=\"Wi-Fi\" admin=enabled", shell=True)
            return {"success": True, "message": "WiFi turned on."}
        elif action == "off":
            subprocess.run("netsh interface set interface name=\"Wi-Fi\" admin=disabled", shell=True)
            return {"success": True, "message": "WiFi turned off."}
        elif action == "disconnect":
            subprocess.run(["netsh", "wlan", "disconnect"], capture_output=True, shell=True)
            return {"success": True, "message": "WiFi disconnected."}
        elif action == "connect":
            ssid = params.get("ssid", "")
            password = params.get("password", "")
            if ssid:
                subprocess.run(
                    ["netsh", "wlan", "connect", f"name={ssid}", f"key={password}"],
                    capture_output=True, shell=True
                )
                return {"success": True, "message": f"Connecting to {ssid}..."}
            return {"success": False, "message": "No SSID provided."}
        else:
            return {"success": False, "message": f"Unknown wifi action: {action}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_keyboard_shortcut(action: str, params: dict) -> dict:
    """Common keyboard shortcuts."""
    if not pyautogui:
        return {"success": False, "message": "pyautogui not installed."}

    shortcuts = {
        "select_all": ["ctrl", "a"],
        "copy": ["ctrl", "c"],
        "cut": ["ctrl", "x"],
        "paste": ["ctrl", "v"],
        "undo": ["ctrl", "z"],
        "redo": ["ctrl", "y"],
        "save": ["ctrl", "s"],
        "find": ["ctrl", "f"],
        "new_tab": ["ctrl", "t"],
        "close_tab": ["ctrl", "w"],
        "refresh": ["ctrl", "r"],
        "print": ["ctrl", "p"],
        "lock_screen": ["win", "l"],
        "task_view": ["win", "tab"],
        "file_explorer": ["win", "e"],
        "search_windows": ["win", "s"],
        "settings_app": ["win", "i"],
    }

    keys = shortcuts.get(action)
    if keys:
        pyautogui.hotkey(*keys)
        return {"success": True, "message": f"Shortcut: {'+'.join(keys)}"}
    return {"success": False, "message": f"Unknown shortcut: {action}"}


def cmd_bluetooth(action: str, params: dict) -> dict:
    """Bluetooth control."""
    try:
        if platform.system() == "Windows":
            if action == "toggle":
                subprocess.run(
                    ["powershell", "-Command",
                     "Add-Type -AssemblyName System.Runtime.WindowsRuntime; "
                     "[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null; "
                     "$r = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult() | "
                     "Where-Object {$_.Kind -eq 'Bluetooth'}; $r.SetStateAsync((1 - $r.State)).GetAwaiter().GetResult()"],
                    capture_output=True, text=True, timeout=10
                )
                return {"success": True, "message": "Bluetooth toggled."}
        return {"success": False, "message": "Bluetooth control not available on this platform."}
    except Exception as e:
        return {"success": False, "message": str(e)}


def cmd_ocr(action: str, params: dict) -> dict:
    """Perform OCR on screen or file."""
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return {"success": False, "message": "pytesseract or PIL not installed. Run: pip install pytesseract Pillow"}
    
    ensure_tesseract()
    
    try:
        if action == "screen":
            if not pyautogui:
                return {"success": False, "message": "pyautogui not installed for screenshot."}
            screenshot = pyautogui.screenshot()
            text = pytesseract.image_to_string(screenshot)
            return {"success": True, "data": {"text": text}, "message": "OCR completed successfully on screen."}
        elif action == "file":
            path = params.get("path")
            if not path or not os.path.exists(path):
                return {"success": False, "message": f"File not found: {path}"}
            img = Image.open(path)
            text = pytesseract.image_to_string(img)
            return {"success": True, "data": {"text": text}, "message": "OCR completed successfully on file."}
        return {"success": False, "message": f"Unknown OCR action: {action}"}
    except Exception as e:
        err_msg = str(e)
        if "tesseract is not installed" in err_msg.lower() or "not found" in err_msg.lower():
            err_msg = "Tesseract OCR is not installed or configured. Please install it from: https://github.com/UB-Mannheim/tesseract/wiki and choose default C:\\Program Files\\Tesseract-OCR directory."
        return {"success": False, "message": f"OCR failed: {err_msg}"}


def cmd_pdf(action: str, params: dict) -> dict:
    """PDF operations."""
    try:
        import PyPDF2
    except ImportError:
        return {"success": False, "message": "PyPDF2 not installed. Run: pip install PyPDF2"}
        
    try:
        if action == "merge":
            files = params.get("files", [])
            output = params.get("output", "merged.pdf")
            if len(files) < 2:
                return {"success": False, "message": "Need at least 2 files to merge."}
            merger = PyPDF2.PdfMerger()
            for f in files:
                if os.path.exists(f):
                    merger.append(f)
                else:
                    return {"success": False, "message": f"File not found: {f}"}
            merger.write(output)
            merger.close()
            return {"success": True, "message": f"PDFs merged successfully into {output}."}
        elif action == "extract_text":
            path = params.get("path")
            if not path or not os.path.exists(path):
                return {"success": False, "message": f"File not found: {path}"}
            reader = PyPDF2.PdfReader(path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            return {"success": True, "data": {"text": text}, "message": "PDF text extracted successfully."}
        return {"success": False, "message": f"Unknown PDF action: {action}"}
    except Exception as e:
        return {"success": False, "message": f"PDF operation failed: {str(e)}"}


def cmd_image(action: str, params: dict) -> dict:
    """Image transformations."""
    try:
        from PIL import Image
    except ImportError:
        return {"success": False, "message": "Pillow not installed. Run: pip install Pillow"}
        
    try:
        path = params.get("path")
        if not path or not os.path.exists(path):
            return {"success": False, "message": f"File not found: {path}"}
            
        img = Image.open(path)
        if action == "resize":
            w = int(params.get("width", 800))
            h = int(params.get("height", 600))
            resized = img.resize((w, h))
            out_path = params.get("output", path)
            resized.save(out_path)
            return {"success": True, "message": f"Image resized to {w}x{h} and saved to {out_path}."}
        elif action == "convert":
            fmt = params.get("format", "JPEG").upper()
            out_path = params.get("output", f"{os.path.splitext(path)[0]}.{fmt.lower()}")
            img.convert("RGB").save(out_path, format=fmt)
            return {"success": True, "message": f"Image converted to {fmt} and saved to {out_path}."}
        return {"success": False, "message": f"Unknown image action: {action}"}
    except Exception as e:
        return {"success": False, "message": f"Image operation failed: {str(e)}"}


def cmd_qrcode(action: str, params: dict) -> dict:
    """QR Code generator."""
    try:
        import qrcode
    except ImportError:
        return {"success": False, "message": "qrcode not installed. Run: pip install qrcode"}
        
    try:
        if action == "generate":
            data = params.get("data", "")
            output = params.get("output", "qrcode.png")
            if not data:
                return {"success": False, "message": "No data provided to generate QR."}
            img = qrcode.make(data)
            img.save(output)
            return {"success": True, "data": {"path": os.path.abspath(output)}, "message": f"QR Code generated and saved to {output}."}
        return {"success": False, "message": f"Unknown QR Code action: {action}"}
    except Exception as e:
        return {"success": False, "message": f"QR Code generation failed: {str(e)}"}


def cmd_calculator(action: str, params: dict) -> dict:
    """Safe expression evaluation."""
    if action == "eval":
        expr = params.get("expression", "")
        if not expr:
            return {"success": False, "message": "No math expression provided."}
        clean_expr = re.sub(r'[^0-9\+\-\*\/\(\)\.\s]', '', expr)
        try:
            result = eval(clean_expr, {"__builtins__": None}, {})
            return {"success": True, "data": {"result": result}, "message": f"Result: {result}"}
        except Exception as e:
            return {"success": False, "message": f"Evaluation error: {str(e)}"}
    return {"success": False, "message": f"Unknown action: {action}"}


def cmd_translator(action: str, params: dict) -> dict:
    """Text translation via free MyMemory API."""
    if action == "translate":
        text = params.get("text", "")
        target_lang = params.get("target_lang", "hi")
        source_lang = params.get("source_lang", "en")
        if not text:
            return {"success": False, "message": "No text provided to translate."}
        
        try:
            import urllib.parse
            import urllib.request
            
            encoded_text = urllib.parse.quote(text)
            url = f"https://api.mymemory.translated.net/get?q={encoded_text}&langpair={source_lang}|{target_lang}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode())
            
            translation = res_data.get("responseData", {}).get("translatedText", "")
            return {"success": True, "data": {"translation": translation}, "message": "Text translated successfully."}
        except Exception as e:
            err_msg = str(e)
            if "getaddrinfo failed" in err_msg or "timed out" in err_msg:
                err_msg = "इंटरनेट कनेक्शन उपलब्ध नहीं है (Internet connection offline). कृपया नेटवर्क चेक करें।"
            return {"success": False, "message": f"Translation failed: {err_msg}"}
    return {"success": False, "message": f"Unknown action: {action}"}


def cmd_password(action: str, params: dict) -> dict:
    """Generate secure random password."""
    if action == "generate":
        import secrets
        import string
        
        length = int(params.get("length", 16))
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        
        if pyperclip:
            pyperclip.copy(password)
            msg = "Password generated and copied to clipboard."
        else:
            msg = "Password generated successfully."
            
        return {"success": True, "data": {"password": password}, "message": msg}
    return {"success": False, "message": f"Unknown action: {action}"}


def cmd_weather(action: str, params: dict) -> dict:
    """Get weather report via wttr.in."""
    if action == "get":
        location = params.get("location", "Delhi")
        try:
            import urllib.request
            import urllib.parse
            url = f"https://wttr.in/{urllib.parse.quote(location)}?format=j1"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                
            current = data.get("current_condition", [{}])[0]
            temp = current.get("temp_C", "?")
            desc = current.get("weatherDesc", [{}])[0].get("value", "?")
            humidity = current.get("humidity", "?")
            
            weather_msg = f"Weather in {location}: {temp}°C, {desc}. Humidity: {humidity}%"
            return {"success": True, "data": {"temp": temp, "desc": desc, "humidity": humidity}, "message": weather_msg}
        except Exception as e:
            return {"success": False, "message": f"Failed to get weather: {str(e)}"}
    return {"success": False, "message": f"Unknown action: {action}"}


def cmd_news(action: str, params: dict) -> dict:
    """Get latest headlines from RSS."""
    if action == "get":
        try:
            import urllib.request
            import xml.etree.ElementTree as ET
            
            url = "https://feeds.bbci.co.uk/news/rss.xml"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                xml_data = response.read()
            
            root = ET.fromstring(xml_data)
            items = []
            for item in root.findall(".//item")[:10]:
                title = item.find("title").text
                link = item.find("link").text
                items.append({"title": title, "link": link})
                
            return {"success": True, "data": {"headlines": items}, "message": "News headlines fetched successfully."}
        except Exception as e:
            return {"success": False, "message": f"Failed to fetch news: {str(e)}"}
    return {"success": False, "message": f"Unknown action: {action}"}


def cmd_music(action: str, params: dict) -> dict:
    """Pygame-based local music player control."""
    try:
        import pygame
    except ImportError:
        return {"success": False, "message": "pygame not installed. Run: pip install pygame"}
        
    try:
        if not pygame.mixer.get_init():
            pygame.mixer.init()
            
        if action == "play":
            path = params.get("path")
            if not path or not os.path.exists(path):
                return {"success": False, "message": f"Music file not found: {path}"}
            pygame.mixer.music.load(path)
            pygame.mixer.music.play()
            return {"success": True, "message": f"Now playing: {os.path.basename(path)}"}
        elif action == "pause":
            pygame.mixer.music.pause()
            return {"success": True, "message": "Music paused."}
        elif action == "resume":
            pygame.mixer.music.unpause()
            return {"success": True, "message": "Music resumed."}
        elif action == "stop":
            pygame.mixer.music.stop()
            return {"success": True, "message": "Music stopped."}
        return {"success": False, "message": f"Unknown action: {action}"}
    except Exception as e:
        return {"success": False, "message": f"Music player error: {str(e)}"}


def cmd_disk(action: str, params: dict) -> dict:
    """Perform disk cleanup and analyze folder size."""
    try:
        if action == "cleanup_temp":
            temp_dir = tempfile.gettempdir()
            deleted = 0
            for item in os.listdir(temp_dir):
                p = os.path.join(temp_dir, item)
                try:
                    if os.path.isfile(p) or os.path.islink(p):
                        os.unlink(p)
                        deleted += 1
                    elif os.path.isdir(p):
                        shutil.rmtree(p)
                        deleted += 1
                except:
                    pass
            return {"success": True, "message": f"Temporary cleanup complete. Cleaned {deleted} items."}
        elif action == "usage":
            total, used, free = shutil.disk_usage("/")
            return {
                "success": True,
                "data": {
                    "total": total,
                    "used": used,
                    "free": free,
                    "percent_used": round((used / total) * 100, 1)
                },
                "message": f"Disk space: {used / (1024**3):.1f}GB used of {total / (1024**3):.1f}GB total."
            }
        return {"success": False, "message": f"Unknown disk action: {action}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


_text_snippets = {}
def cmd_text_expand(action: str, params: dict) -> dict:
    global _text_snippets
    if action == "add":
        trigger = params.get("trigger", "")
        content = params.get("content", "")
        if not trigger or not content:
            return {"success": False, "message": "Snippet trigger and content are required."}
        _text_snippets[trigger] = content
        return {"success": True, "message": f"Snippet '{trigger}' added successfully."}
    elif action == "list":
        return {"success": True, "data": {"snippets": _text_snippets}, "message": "Snippets fetched."}
    elif action == "delete":
        trigger = params.get("trigger", "")
        if trigger in _text_snippets:
            del _text_snippets[trigger]
            return {"success": True, "message": f"Snippet '{trigger}' deleted."}
        return {"success": False, "message": "Snippet not found."}
    return {"success": False, "message": f"Unknown action: {action}"}


_scheduled_tasks = []
def cmd_scheduler(action: str, params: dict) -> dict:
    global _scheduled_tasks
    if action == "add":
        task_name = params.get("name", "Task")
        cron = params.get("cron", "")
        command = params.get("command", {})
        
        task = {"name": task_name, "cron": cron, "command": command, "id": len(_scheduled_tasks) + 1}
        _scheduled_tasks.append(task)
        return {"success": True, "message": f"Task '{task_name}' scheduled: {cron}"}
    elif action == "list":
        return {"success": True, "data": {"tasks": _scheduled_tasks}, "message": "Scheduled tasks list."}
    return {"success": False, "message": f"Unknown action: {action}"}


_registered_hotkeys = {}
def cmd_hotkeys(action: str, params: dict) -> dict:
    global _registered_hotkeys
    if action == "register":
        key_combo = params.get("key_combo", "")
        cmd_data = params.get("command", {})
        if not key_combo:
            return {"success": False, "message": "Key combo required."}
        try:
            import keyboard
            def _callback():
                logger.info(f"Hotkey triggered: {key_combo}")
            keyboard.add_hotkey(key_combo, _callback)
            _registered_hotkeys[key_combo] = cmd_data
            return {"success": True, "message": f"Hotkey {key_combo} registered."}
        except Exception as e:
            return {"success": False, "message": f"Hotkey failure: {str(e)}"}
    elif action == "list":
        return {"success": True, "data": {"hotkeys": list(_registered_hotkeys.keys())}, "message": "Hotkeys listed."}
    return {"success": False, "message": f"Unknown action: {action}"}


_macro_recording = False
_macro_events = []
def cmd_macros(action: str, params: dict) -> dict:
    global _macro_recording, _macro_events
    if action == "start":
        _macro_recording = True
        _macro_events = []
        return {"success": True, "message": "Macro recording started."}
    elif action == "stop":
        _macro_recording = False
        return {"success": True, "data": {"events": _macro_events}, "message": f"Macro recorded with {len(_macro_events)} events."}
    elif action == "play":
        events = params.get("events", [])
        if not events:
            return {"success": False, "message": "No macro events to play."}
        for ev in events:
            time.sleep(ev.get("delay", 0.05))
            if pyautogui:
                pyautogui.click(ev.get("x", 0), ev.get("y", 0))
        return {"success": True, "message": "Macro played back successfully."}
    return {"success": False, "message": f"Unknown action: {action}"}


# ─── Command Router ──────────────────────────────────────────────────────────

def route_command(data: dict) -> dict:
    """Route incoming command to the right handler."""
    category = data.get("category", "")
    action = data.get("action", "")
    params = data.get("params", {})

    try:
        if category == "system":
            return cmd_system(action, params)
        elif category == "volume":
            return cmd_volume(action, params)
        elif category == "media":
            return cmd_media(action, params)
        elif category == "app":
            return cmd_app(action, params)
        elif category == "url":
            return cmd_url(params)
        elif category == "window":
            return cmd_window(action, params)
        elif category == "info":
            return cmd_system_info(action)
        elif category == "clipboard":
            return cmd_clipboard(action, params)
        elif category == "file":
            return cmd_file(action, params)
        elif category == "screenshot":
            return cmd_screenshot(params)
        elif category == "reminder":
            return cmd_reminder(action, params)
        elif category == "notification":
            return cmd_notification(params)
        elif category == "keyboard":
            return cmd_type_text(params)
        elif category == "hotkey":
            return cmd_hotkey(params)
        elif category == "search":
            return cmd_search(params)
        elif category == "brightness":
            return cmd_brightness(action, params)
        elif category == "wifi":
            return cmd_wifi(action, params)
        elif category == "shortcut":
            return cmd_keyboard_shortcut(action, params)
        elif category == "bluetooth":
            return cmd_bluetooth(action, params)
        elif category == "ocr":
            return cmd_ocr(action, params)
        elif category == "pdf":
            return cmd_pdf(action, params)
        elif category == "image":
            return cmd_image(action, params)
        elif category == "qrcode":
            return cmd_qrcode(action, params)
        elif category == "calculator":
            return cmd_calculator(action, params)
        elif category == "translator":
            return cmd_translator(action, params)
        elif category == "password":
            return cmd_password(action, params)
        elif category == "weather":
            return cmd_weather(action, params)
        elif category == "news":
            return cmd_news(action, params)
        elif category == "music":
            return cmd_music(action, params)
        elif category == "disk":
            return cmd_disk(action, params)
        elif category == "text_expand":
            return cmd_text_expand(action, params)
        elif category == "scheduler":
            return cmd_scheduler(action, params)
        elif category == "hotkeys":
            return cmd_hotkeys(action, params)
        elif category == "macros":
            return cmd_macros(action, params)
        elif category == "ping":
            return {
                "type": "pong",
                "success": True,
                "message": "PC Bridge is alive!",
                "platform": platform.platform(),
                "hostname": socket.gethostname(),
                "python": platform.python_version(),
            }
        else:
            return {"success": False, "message": f"Unknown category: {category}"}
    except Exception as e:
        logger.error(f"Command error: {e}")
        return {"success": False, "message": f"Internal error: {str(e)}"}


# ─── WebSocket Server ────────────────────────────────────────────────────────

connected_clients = set()


async def _broadcast_to_all(message: str):
    """Broadcast message to all connected clients."""
    if connected_clients:
        await asyncio.gather(*[c.send(message) for c in connected_clients], return_exceptions=True)


async def handler(websocket):
    """Handle a single WebSocket connection."""
    client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    connected_clients.add(websocket)
    logger.info(f"Client connected: {client_id} (total: {len(connected_clients)})")

    # Initialize Vosk recognizer for this client if model exists
    recognizer = None
    if Model is not None:
        model_path = Path(__file__).parent / "model" / "hi"
        if model_path.exists():
            try:
                # Need to run in executor to avoid blocking if model takes time to load
                # Actually, loading Model once globally is better.
                global _vosk_model
                if '_vosk_model' not in globals() or _vosk_model is None:
                    logger.info("Loading Vosk Hindi model. This might take a few seconds...")
                    _vosk_model = Model(str(model_path))
                    logger.info("Vosk model loaded successfully.")
                
                # Default sample rate 16000
                recognizer = KaldiRecognizer(_vosk_model, 16000)
            except Exception as e:
                logger.error(f"Failed to init Vosk recognizer: {e}")

    # Send welcome
    await websocket.send(json.dumps({
        "type": "event",
        "event": "connected",
        "data": {
            "platform": platform.platform(),
            "hostname": socket.gethostname(),
            "os": f"{platform.system()} {platform.release()}",
            "python_version": platform.python_version(),
            "features": {
                "psutil": psutil is not None,
                "pyautogui": pyautogui is not None,
                "pyperclip": pyperclip is not None,
                "pygetwindow": gw is not None,
            },
        }
    }))

    try:
        async for message in websocket:
            if isinstance(message, bytes):
                # Process audio chunk with Vosk
                if recognizer is not None:
                    if recognizer.AcceptWaveform(message):
                        res = json.loads(recognizer.Result())
                        recognized_text = res.get("text", "").strip().lower()
                        if recognized_text:
                            # ─── Speech Shortcut Command Bypass triggers ───
                            handled_locally = False
                            local_reply = ""
                            
                            if any(k in recognized_text for k in ["screenshot", "screen shot", "photo", "tasveer"]):
                                result = cmd_screenshot({})
                                handled_locally = True
                                local_reply = f"Screenshot taken safely: {result.get('message', '')}"
                            elif any(k in recognized_text for k in ["lock", "computer lock", "pc lock"]):
                                result = cmd_system("lock", {})
                                handled_locally = True
                                local_reply = "PC screen locked successfully."
                            elif any(k in recognized_text for k in ["volume up", "badhao", "volume badhao"]):
                                result = cmd_volume("up", {"amount": 10})
                                handled_locally = True
                                local_reply = "Volume increased."
                            elif any(k in recognized_text for k in ["volume down", "kam karo", "volume kam"]):
                                result = cmd_volume("down", {"amount": 10})
                                handled_locally = True
                                local_reply = "Volume decreased."
                            elif any(k in recognized_text for k in ["mute", "silent"]):
                                result = cmd_volume("mute", {})
                                handled_locally = True
                                local_reply = "Volume muted/unmuted."
                            elif any(k in recognized_text for k in ["show desktop", "desktop dikhao"]):
                                result = cmd_window("show_desktop", {})
                                handled_locally = True
                                local_reply = "Desktop shown."
                            
                            if handled_locally:
                                await websocket.send(json.dumps({
                                    "type": "event",
                                    "event": "shortcut_executed",
                                    "message": local_reply
                                }))
                            
                            # Forward normal speech result payload
                            await websocket.send(json.dumps({
                                "type": "speech_result",
                                "isFinal": True,
                                "text": res["text"]
                             }))
                    else:
                        res = json.loads(recognizer.PartialResult())
                        if res.get("partial"):
                            await websocket.send(json.dumps({
                                "type": "speech_result",
                                "isFinal": False,
                                "text": res["partial"]
                            }))
                continue

            try:
                data = json.loads(message)
                logger.info(f"Command from {client_id}: {data.get('category', '?')}/{data.get('action', '?')}")

                category = data.get("category")
                action = data.get("action")
                params = data.get("params", {})

                if category == "tts" and action == "speak":
                    text = params.get("text", "")
                    voice = params.get("voice", "hi-IN-SwaraNeural")
                    
                    try:
                        import edge_tts
                        import base64
                        import tempfile
                        
                        # Strip asterisks (descriptions of actions like *smiles*) for cleaner speech
                        clean_text = re.sub(r'\*[^*]+\*', '', text).strip()
                        if not clean_text:
                            clean_text = text
                            
                        requested_engine = params.get("engine", "edge_tts")
                        audio_format = "mp3"
                        use_offline = (requested_engine == "pyttsx3")
                        
                        if not use_offline:
                            # Perform a rapid DNS lookup to check if we can reach the Edge-TTS host
                            # This skips the 4-second timeout delay when the user is disconnected!
                            has_network = False
                            try:
                                await asyncio.wait_for(
                                    asyncio.to_thread(socket.gethostbyname, "speech.platform.bing.com"),
                                    timeout=0.6
                                )
                                has_network = True
                            except Exception:
                                has_network = False

                            if not has_network:
                                logger.info("Edge-TTS host unreachable. Forcing pyttsx3 offline fallback immediately.")
                                use_offline = True

                        if not use_offline:
                            try:
                                # Try Edge TTS
                                communicate = edge_tts.Communicate(clean_text, voice)
                                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                                    tmp_name = tmp.name
                                await communicate.save(tmp_name)
                            except Exception as inner_err:
                                logger.warning(f"Voice '{voice}' failed, trying 'hi-IN-SwaraNeural' fallback: {inner_err}")
                                try:
                                    communicate = edge_tts.Communicate(clean_text, "hi-IN-SwaraNeural")
                                    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                                        tmp_name = tmp.name
                                    await communicate.save(tmp_name)
                                except Exception as offline_err:
                                    logger.warning(f"Edge-TTS failed completely: {offline_err}")
                                    raise offline_err
                                    
                        if use_offline:
                            def run_offline_speech():
                                import pythoncom
                                import pyttsx3
                                pythoncom.CoInitialize()
                                engine = pyttsx3.init()
                                
                                # Set speed rate slightly faster (215) to speak naturally and prevent dragging
                                engine.setProperty('rate', 215)
                                
                                # Set offline Hindi voice if available
                                voices = engine.getProperty('voices')
                                for v in voices:
                                    if "hindi" in v.name.lower() or "india" in v.name.lower():
                                        engine.setProperty('voice', v.id)
                                        break
                                
                                # Use mkstemp and close the fd immediately to prevent Windows file locking
                                fd, tmp_file = tempfile.mkstemp(suffix=".wav")
                                os.close(fd)
                                
                                engine.save_to_file(clean_text, tmp_file)
                                engine.runAndWait()
                                del engine
                                return tmp_file

                            try:
                                tmp_name = await asyncio.to_thread(run_offline_speech)
                                audio_format = "wav"
                            except Exception as pyttsx_err:
                                logger.error(f"Offline pyttsx3 fallback failed: {pyttsx_err}")
                                raise pyttsx_err
                        
                        with open(tmp_name, "rb") as f:
                            audio_data = base64.b64encode(f.read()).decode("utf-8")
                            
                        try:
                            os.unlink(tmp_name)
                        except:
                            pass
                            
                        result = {
                            "success": True,
                            "audio": audio_data,
                            "format": audio_format
                        }
                    except Exception as tts_err:
                        logger.error(f"TTS generation error: {tts_err}")
                        result = {"success": False, "message": f"TTS failed: {str(tts_err)}"}
                else:
                    result = route_command(data)

                result["type"] = "response"
                result["id"] = data.get("id")
                await websocket.send(json.dumps(result))

            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON received.",
                }))
            except Exception as e:
                logger.error(f"Handler error: {e}")
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": str(e),
                }))

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        logger.info(f"Client disconnected: {client_id} (total: {len(connected_clients)})")


def ensure_vosk_model():
    """Ensure Vosk Hindi model is downloaded and extracted."""
    model_dir = Path(__file__).parent / "model"
    model_path = model_dir / "hi"
    if model_path.exists():
        return True

    logger.info("Vosk Hindi model not found. Starting automatic download...")
    try:
        model_dir.mkdir(parents=True, exist_ok=True)
        zip_path = model_dir / "vosk-model-small-hi-0.22.zip"
        url = "https://alphacephei.com/vosk/models/vosk-model-small-hi-0.22.zip"

        import urllib.request
        import zipfile
        
        logger.info(f"Downloading Vosk Hindi model from {url}...")
        
        # Download tracker hook
        last_pct = [0]
        def reporthook(blocknum, blocksize, totalsize):
            readsofar = blocknum * blocksize
            if totalsize > 0:
                percent = int(readsofar * 100 / totalsize)
                # print progress every 10% to avoid stdout bloat
                if percent >= last_pct[0] + 10:
                    last_pct[0] = percent
                    logger.info(f"Downloading model: {percent}% done")
            else:
                if readsofar % (1024 * 1024) == 0:
                    logger.info(f"Downloaded model chunk: {readsofar / (1024 * 1024):.1f}MB")

        urllib.request.urlretrieve(url, zip_path, reporthook)
        logger.info("Download complete. Extracting Vosk model...")
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(model_dir)
            
        extracted_folder = model_dir / "vosk-model-small-hi-0.22"
        if extracted_folder.exists():
            extracted_folder.rename(model_path)
            
        if zip_path.exists():
            zip_path.unlink()
            
        logger.info("Vosk Hindi model downloaded and extracted successfully!")
        return True
    except Exception as e:
        logger.error(f"Failed to automatically download Vosk model: {e}")
        return False


def ensure_tesseract():
    """Ensure Tesseract OCR is available locally or via system PATH."""
    try:
        import pytesseract
    except ImportError:
        return False
        
    try:
        # Check if already in system PATH
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        pass
        
    # Check common default installation locations
    local_tess_dir = Path(__file__).parent / "tesseract"
    local_tess_exe = local_tess_dir / "tesseract.exe"
    
    paths_to_check = [
        local_tess_exe,
        Path("C:/Program Files/Tesseract-OCR/tesseract.exe"),
        Path("C:/Program Files (x86)/Tesseract-OCR/tesseract.exe"),
        Path(os.environ.get("LOCALAPPDATA", "")) / "Tesseract-OCR" / "tesseract.exe"
    ]
    
    for p in paths_to_check:
        if p.exists():
            pytesseract.pytesseract.tesseract_cmd = str(p)
            # Set TESSDATA_PREFIX to avoid model loading issues
            tessdata_path = p.parent / "tessdata"
            if tessdata_path.exists():
                os.environ["TESSDATA_PREFIX"] = str(tessdata_path)
            else:
                os.environ["TESSDATA_PREFIX"] = str(p.parent)
            logger.info(f"Tesseract OCR configured successfully using: {p}")
            return True
            
    logger.warning("Tesseract OCR not found in PATH or default folders. To use OCR, please download Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki")
    return False


def ensure_all_dependencies():
    ensure_vosk_model()
    ensure_tesseract()


async def main():
    """Start the WebSocket server."""
    threading.Thread(target=ensure_all_dependencies, daemon=True).start()

    global _main_loop
    _main_loop = asyncio.get_running_loop()
    # Define terminal colors
    CYAN = "\033[96m"
    PURPLE = "\033[95m"
    GREEN = "\033[92m"
    RESET = "\033[0m"
    WHITE = "\033[97m"
    GRAY = "\033[90m"

    print(f"""
    {PURPLE}██████╗ ██╗██╗  ██╗ █████╗      █████╗ ██╗{RESET}
    {PURPLE}██╔══██╗██║██║ ██╔╝██╔══██╗    ██╔══██╗██║{RESET}
    {CYAN}██████╔╝██║█████╔╝ ███████║    ███████║██║{RESET}
    {CYAN}██╔═══╝ ██║██╔═██╗ ██╔══██║    ██╔══██║██║{RESET}
    {CYAN}██║     ██║██║  ██╗██║  ██║    ██║  ██║██║{RESET}
    {CYAN}╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝{RESET}
    
    {GRAY}===================================================={RESET}
    {WHITE}          PC BRIDGE - WEBSOCKET BACKEND{RESET}
    {GRAY}===================================================={RESET}
    {GREEN}  ✓ Server Status:   Running{RESET}
    {GREEN}  ✓ Local Endpoint:  ws://localhost:{PORT}{RESET}
    {GREEN}  ✓ Server Address:  ws://0.0.0.0:{PORT}{RESET}
    {WHITE}  • Connected:       {len(connected_clients)}{RESET}
    {WHITE}  • Platform:        {platform.system()} {platform.release()}{RESET}
    {GRAY}----------------------------------------------------{RESET}
    {GRAY}  Press Ctrl+C to stop the backend server.{RESET}
    """)

    # Get local IP
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        print(f"  Your LAN IP:       ws://{local_ip}:{PORT}")
        print(f"  Use this in the web UI Settings > PC Bridge\n")
    except Exception:
        pass

    async with serve(handler, HOST, PORT):
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nPC Bridge stopped.")
