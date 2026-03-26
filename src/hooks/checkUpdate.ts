import { checkForUpdate } from "../updates.js"

async function main() {
  const { current, latest, updateAvailable, autoUpdateEnabled } =
    await checkForUpdate()

  if (!updateAvailable || !latest) {
    return
  }

  const lines = [`\n[Peek] Update available: v${current} → v${latest}.`]
  if (autoUpdateEnabled) {
    lines.push(`       Auto-update is enabled — restart to apply.`)
  } else {
    lines.push(
      `       Run /peek:update to update, or enable auto-update: /plugin → Marketplaces → peek → Enable auto-update`,
    )
  }
  process.stdout.write(JSON.stringify({ systemMessage: lines.join("\n") }))
}

main().catch(() => {
  // Silent failure
})
