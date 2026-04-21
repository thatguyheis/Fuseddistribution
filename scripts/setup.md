# Spot Monitor — Setup & Automation

## 1. Get Your Free API Key

1. Go to [https://metalpriceapi.com](https://metalpriceapi.com)
2. Click **Get Free API Key** — no credit card required
3. Copy your key from the dashboard

## 2. Install Dependencies

```bash
pip3 install requests
```

## 3. Set Your API Key

Option A — environment variable (recommended):
```bash
export METALPRICEAPI_KEY="your_key_here"
```

Option B — paste directly into `spot-monitor.py` line:
```python
API_KEY = "your_key_here"
```

## 4. Test It

```bash
python3 "/Users/nick/Documents/New project/scripts/spot-monitor.py"
```

First run creates `data/spot-log.csv` automatically.

## 5. Run Daily Automatically (macOS launchd)

Create the file `~/Library/LaunchAgents/com.fused.spotmonitor.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.fused.spotmonitor</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>/Users/nick/Documents/New project/scripts/spot-monitor.py</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>METALPRICEAPI_KEY</key>
    <string>your_key_here</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/Users/nick/Documents/New project/data/spot-monitor.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/nick/Documents/New project/data/spot-monitor-err.log</string>
</dict>
</plist>
```

Then load it:
```bash
launchctl load ~/Library/LaunchAgents/com.fused.spotmonitor.plist
```

To unload / stop:
```bash
launchctl unload ~/Library/LaunchAgents/com.fused.spotmonitor.plist
```

## 6. Website API Key

The same MetalpriceAPI key is used in `reserve/index.html` for the live spot widget.
Search the file for `YOUR_METALPRICEAPI_KEY` and replace it with your key.

## 7. OpenClaw Alerts (when ready)

Once OpenClaw gateway is running at `http://127.0.0.1:18789/`, uncomment and configure
the `openclaw_notify()` function in `spot-monitor.py` with your channel and session name.
This will push a buy window alert directly to your phone.
