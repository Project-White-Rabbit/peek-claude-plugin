---
description: Log out of Peek and delete stored credentials
allowed-tools: ["Bash"]
---

# Peek Logout

Run the logout script to remove stored Peek credentials.

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/logout.js"
```

After the script completes, confirm: "Logged out of Peek. Memory hooks will be inactive until you run /peek:login again."
