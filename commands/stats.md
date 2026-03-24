---
description: "Show Peek weekly stats, or toggle stats display (on/off)"
argument-hint: "[on|off] (no arg = show stats)"
allowed-tools: ["Bash"]
---

# Peek Stats

Show weekly session analytics, or enable/disable the stats display at session start.

**Determine the subcommand from the user's message:**

- If user wants to **enable** stats display → `on`
- If user wants to **disable** stats display → `off`
- Otherwise (show stats, no argument) → no subcommand

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/stats.js" $SUBCOMMAND
```

Report the result to the user.
