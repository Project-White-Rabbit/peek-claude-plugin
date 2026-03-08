---
description: Authenticate with Peek to enable memory
allowed-tools: ["Bash"]
---

# Peek Login

Run the login script to authenticate with Peek. This will open your browser to sign in, then save your credentials locally.

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/login.js"
```

After the script completes, confirm the result to the user. If successful, say "You're authenticated with Peek ✓". If it failed, show the error message.
