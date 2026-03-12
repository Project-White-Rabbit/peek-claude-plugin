import { checkForUpdate } from "../updates.js"

async function main() {
  const { current, latest, updateAvailable } = await checkForUpdate()

  if (!updateAvailable || !latest) {
    return
  }

  const message = [
    `\n[Peek] Update available: v${current} → v${latest}.`,
    `       Run /peek:update to update, or enable auto-update: /plugin → Marketplaces → peek → Enable auto-update`,
  ].join("\n")
  process.stdout.write(JSON.stringify({ systemMessage: message }))
}

main().catch(() => {
  // Silent failure
})
