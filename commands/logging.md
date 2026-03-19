---
description: "Set the Peek plugin logging level (none, default, verbose)"
allowed-tools: ["Bash"]
---

# Peek Logging

Set the Peek plugin logging level.

| Level | Behavior |
|-------|----------|
| `none` | No status line or memory details shown |
| `default` | Status line shown, individual memories hidden |
| `verbose` | Status line + individual memories shown |

**Determine the level from the user's message:**

- If user specifies a level (`none`, `default`, `verbose`) → use it
- If no level provided → show current level first, then ask

### If a level argument is provided

1. Validate the argument is one of: `none`, `default`, `verbose`. If not, tell the user the valid options.

2. Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/logging.js" <level>
```

3. Confirm the change to the user.

### If no level argument is provided

1. Show the current level by running:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/logging.js"
```

2. Ask the user which level they'd like to set, showing the available options.

3. Once they choose, run the command with their chosen level.
