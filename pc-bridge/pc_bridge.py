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
        if action == "play_pause":
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


def cmd_app(action: str, params: dict) -> dict:
    """Handle app open/close."""
    try:
        name = params.get("name", "").lower().strip()

        if action == "open":
            exe = APP_MAP.get(name)
            if exe:
                subprocess.Popen(exe, shell=True)
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


def cmd_file(action: str, params: dict) -> dict:
    """Handle file operations."""
    try:
        if action == "create":
            name = params.get("name", "untitled.txt")
            location = params.get("location", "")
            if location:
                path = Path(location) / name
            else:
                desktop = Path.home() / "Desktop"
                path = desktop / name
            path.touch()
            return {"success": True, "message": f"File created: {path}"}

        elif action == "delete":
            path_str = params.get("path", "")
            path = Path(path_str).resolve()
            
            # Absolute critical directory protection safety check
            forbidden_patterns = [
                r"^[a-zA-Z]:\\$", r"^[a-zA-Z]:\\Windows", r"^[a-zA-Z]:\\Program Files",
                r"^[a-zA-Z]:\\Users\\[^\\]+\\AppData", r"^[a-zA-Z]:\\SystemVolumeInformation",
                r"^[a-zA-Z]:\\VoiceAI"
            ]
            path_abs = str(path)
            for pattern in forbidden_patterns:
                if re.search(pattern, path_abs, re.IGNORECASE):
                    return {"success": False, "message": f"Security Violation: Deleting '{path_abs}' is restricted to protect your PC!"}
                    
            if path.exists():
                if path.is_dir():
                    shutil.rmtree(path)
                else:
                    path.unlink()
                return {"success": True, "message": f"Deleted: {path_str}"}
            return {"success": False, "message": f"File not found: {path_str}"}

        elif action == "list_dir":
            path_str = params.get("path", str(Path.home()))
            path = Path(path_str)
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
            return {"success": False, "message": f"Path not found: {path_str}"}

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
                        if res.get("text"):
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

                result = route_command(data)
                result["type"] = "response"

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


async def main():
    """Start the WebSocket server."""
    global _main_loop
    _main_loop = asyncio.get_running_loop()
    print(f"""
+--------------------------------------------------------------+
|          PC Bridge -- WebSocket Server                       |
|          Pika AI Assistant                                   |
|                                                              |
|  Server running on: ws://0.0.0.0:{PORT}                     |
|  Local access:      ws://localhost:{PORT}                    |
|  Network access:    ws://<YOUR_IP>:{PORT}                    |
|                                                              |
|  Connected clients: {len(connected_clients):>3}                                    |
|  Platform: {platform.platform():<46} |
|                                                              |
|  Press Ctrl+C to stop                                        |
+--------------------------------------------------------------+
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
