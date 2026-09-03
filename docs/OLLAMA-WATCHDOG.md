# Ollama and publisher watchdog

`com.nick.ollama-publisher-watchdog` is the closed-loop runtime guardian for
local blog production.

Every five minutes it:

1. Checks the Ollama listener.
2. Kickstarts `homebrew.mxcl.ollama` if the listener is unavailable.
3. Runs a bounded `gemma3:1b` probe before waking production.
4. Finds the oldest pending queue dated today or later in Pacific time.
5. Starts `com.nick.daily-blog-reel` only when no publisher process is active.
6. Applies a 15 minute wake cooldown and a filesystem lock to prevent duplicate runs.

The publisher launch agent points to the repository script, not the stale copy in
`/Users/nick/bin`. It defaults to the current Pacific date, so historical queues
are processed only when an operator explicitly supplies `BLOG_RUN_DATE` or
`BLOG_QUEUE_START_DATE`.

Install or reload after changing either plist:

```bash
install -m 644 launchagents/com.nick.daily-blog-reel.plist "$HOME/Library/LaunchAgents/com.nick.daily-blog-reel.plist"
install -m 644 launchagents/com.nick.ollama-publisher-watchdog.plist "$HOME/Library/LaunchAgents/com.nick.ollama-publisher-watchdog.plist"
launchctl bootout "gui/$(id -u)/com.nick.daily-blog-reel" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.nick.daily-blog-reel.plist"
launchctl bootout "gui/$(id -u)/com.nick.ollama-publisher-watchdog" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.nick.ollama-publisher-watchdog.plist"
```

Completion still requires article QA, reel release QA, deployment, live URL
verification, sitemap verification, and posting readback. The watchdog only
restores runtime availability and wakes work; it never marks a queue complete.
