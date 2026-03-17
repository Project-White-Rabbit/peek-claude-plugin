---
description: Set Peek logging to debug — log all hook events including 0-memory results and timeouts
allowed-tools: ["Bash"]
---

# Peek Logging Debug

Set logging to debug mode. Logs every hook invocation with timestamps, even when 0 memories are returned. Also logs timeout events and error details.

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/loggingDebug.js"
```

Report the result to the user.
