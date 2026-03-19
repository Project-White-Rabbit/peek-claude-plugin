---
description: Archive (soft delete) a memory by its number
allowed-tools: ["Bash"]
---

# Delete Memory

Archive a Peek memory by its number. Each memory has a unique number shown in the memories UI (e.g., #42).

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/memoryDelete.js" "$ARGUMENTS"
```

If `$ARGUMENTS` is empty, ask the user which memory number they'd like to delete, then run the script with that number.

After the script completes, confirm the result to the user. If the memory was not found, let them know.
