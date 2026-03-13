---
description: Submit feedback about Peek
allowed-tools: ["Bash"]
---

# Peek Feedback

Ask the user what feedback they'd like to share about Peek. Once they provide their feedback, run the script below with their message as the argument.

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/feedback.js" "$ARGUMENTS"
```

If `$ARGUMENTS` is empty, ask the user for their feedback first, then run the script with their response.

After the script completes, confirm the result to the user. If successful, thank them for their feedback.
