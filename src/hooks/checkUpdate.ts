import { checkForUpdate } from "../updates.js"

async function main() {
  const { current, latest, updateAvailable } = await checkForUpdate()
  if (updateAvailable && latest) {
    const message = [
      `\n[Peek] Update available: v${current} → v${latest}.`,
      `       1. Update marketplace: /plugin → Marketplaces → peek → Update`,
      `       2. Update plugin:      /plugin → Installed → peek → Update`,
      `       Or enable auto-update: /plugin → Marketplaces → peek → Enable auto-update`,
    ].join("\n")
    process.stdout.write(JSON.stringify({ systemMessage: message }))
  }
}

main().catch(() => {
  // Silent failure
})
