#!/usr/bin/env python3
"""
Fused Reserve — Daily Silver Spot Monitor
SOP Section 2: Spot Monitoring automation

Setup:
  pip install requests
  export METALPRICEAPI_KEY="your_key_here"
  (or paste your key directly into API_KEY below)

Run manually:  python3 scripts/spot-monitor.py
Run daily via cron/launchd — see scripts/setup.md
"""

import requests
import csv
import os
import sys
from datetime import datetime, date, timedelta

# ── Config ───────────────────────────────────────────────────────────────────
API_KEY = os.environ.get("METALPRICEAPI_KEY", "YOUR_KEY_HERE")
API_URL = (
    "https://api.metalpriceapi.com/v1/latest"
    f"?api_key={API_KEY}&base=USD&currencies=XAG,XAU"
)
LOG_FILE = os.path.join(os.path.dirname(__file__), "../data/spot-log.csv")
BUY_WINDOW_PCT = 0.02   # alert when spot is ≥2% below 30-day average
PREMIUM_EST    = 0.05   # ~5% sourcing premium for at-a-glance estimates

# ── Fetch ─────────────────────────────────────────────────────────────────────
def fetch_spot():
    r = requests.get(API_URL, timeout=10)
    r.raise_for_status()
    data = r.json()
    if not data.get("success"):
        raise ValueError(f"API returned error: {data}")
    silver = data["rates"]["USDXAG"]   # USD per troy oz
    gold   = data["rates"]["USDXAU"]   # USD per troy oz
    return silver, gold

# ── Log ───────────────────────────────────────────────────────────────────────
FIELDS = ["date", "silver_usd_oz", "gold_usd_oz"]

def load_log():
    if not os.path.exists(LOG_FILE):
        return []
    with open(LOG_FILE, newline="") as f:
        return list(csv.DictReader(f))

def append_log(today, silver, gold):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    new_file = not os.path.exists(LOG_FILE)
    with open(LOG_FILE, "a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        if new_file:
            w.writeheader()
        w.writerow({
            "date": today.isoformat(),
            "silver_usd_oz": f"{silver:.4f}",
            "gold_usd_oz":   f"{gold:.4f}",
        })

def thirty_day_avg(log):
    cutoff = date.today() - timedelta(days=30)
    prices = [
        float(row["silver_usd_oz"])
        for row in log
        if datetime.fromisoformat(row["date"]).date() >= cutoff
    ]
    return sum(prices) / len(prices) if len(prices) >= 5 else None

# ── Alerts ────────────────────────────────────────────────────────────────────
def macos_notify(title, body):
    safe = body.replace('"', '\\"').replace("'", "\\'")[:220]
    os.system(f'osascript -e \'display notification "{safe}" with title "{title}"\'')

def openclaw_notify(message):
    """
    TODO: configure after OpenClaw gateway is running.
    Send a message to your phone via the OpenClaw gateway.
    Example (update channel/session as needed):
        import requests
        requests.post("http://127.0.0.1:18789/api/send", json={
            "channel": "whatsapp",   # or "telegram", "imessage", etc.
            "session": "main",
            "text": message
        })
    """
    pass

def fire_buy_window_alert(silver, avg, pct):
    msg = (
        f"BUY WINDOW — Silver at ${silver:.2f}/oz\n"
        f"{pct*100:.1f}% below 30-day avg (${avg:.2f}/oz)\n"
        f"Source inventory now via priority channels (SOP Section 3)."
    )
    print(f"\n{'='*58}")
    print(msg)
    print(f"{'='*58}\n")
    macos_notify("Fused Reserve — Buy Window", msg)
    openclaw_notify(msg)

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    today = date.today()
    log   = load_log()

    # Avoid double-logging the same day
    if log and log[-1]["date"] == today.isoformat():
        print(f"Already logged today ({today}). Using cached values.")
        silver = float(log[-1]["silver_usd_oz"])
        gold   = float(log[-1]["gold_usd_oz"])
    else:
        if API_KEY == "YOUR_KEY_HERE":
            print("ERROR: Set your MetalpriceAPI key in METALPRICEAPI_KEY env var or in this script.")
            print("Sign up free (no CC) at https://metalpriceapi.com")
            sys.exit(1)
        print(f"Fetching spot prices for {today}...")
        silver, gold = fetch_spot()
        append_log(today, silver, gold)
        log = load_log()

    # ── Display ──────────────────────────────────────────────────────────────
    print(f"\n{'─'*40}")
    print(f"  Silver  ${silver:>8.2f} / troy oz")
    print(f"  Gold    ${gold:>8.2f} / troy oz")
    print(f"  Date    {today}")
    print(f"{'─'*40}")

    # ── 30-day average & buy window check ────────────────────────────────────
    avg = thirty_day_avg(log)
    if avg:
        pct_diff = (avg - silver) / avg
        direction = "below" if pct_diff >= 0 else "above"
        print(f"  30-day avg  ${avg:.2f}/oz  ({abs(pct_diff)*100:.1f}% {direction} avg)")
        if pct_diff >= BUY_WINDOW_PCT:
            fire_buy_window_alert(silver, avg, pct_diff)
        else:
            print(f"  No buy window — need {(BUY_WINDOW_PCT - pct_diff)*100:.1f}% more drop to trigger.")
    else:
        print(f"  30-day avg  — (need 5+ days of history)")

    # ── At-a-glance subscriber estimates ─────────────────────────────────────
    eff_cost = silver * (1 + PREMIUM_EST)
    print(f"\n  At today's spot + {PREMIUM_EST*100:.0f}% premium:")
    for budget in [100, 250, 500]:
        oz  = budget / eff_cost
        fv  = oz / 0.715   # face value of junk silver
        print(f"    ${budget:>3}/mo  →  {oz:.2f} oz  (~${fv:.2f} junk face value)")
    print()

if __name__ == "__main__":
    main()
