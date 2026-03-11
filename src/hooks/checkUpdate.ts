import { getVersion } from "../version.js"

// Async SessionStart hook: checks if a newer version is available on GitHub.
// If so, outputs a message to stdout so the user sees it.

const CURRENT_VERSION = getVersion()

const REPO = "Project-White-Rabbit/peek-claude-plugin"

async function getLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${REPO}/main/package.json`,
      { signal: AbortSignal.timeout(3000) },
    )
    if (!response.ok) {
      return null
    }
    const pkg = (await response.json()) as { version: string }
    return pkg.version
  } catch {
    return null
  }
}

function isNewer(latest: string, current: string): boolean {
  const [lMajor, lMinor, lPatch] = latest.split(".").map(Number)
  const [cMajor, cMinor, cPatch] = current.split(".").map(Number)

  if (lMajor !== cMajor) {
    return lMajor > cMajor
  }
  if (lMinor !== cMinor) {
    return lMinor > cMinor
  }
  return lPatch > cPatch
}

async function main() {
  const latest = await getLatestVersion()
  if (!latest) {
    return
  }

  if (isNewer(latest, CURRENT_VERSION)) {
    process.stdout.write(
      `[Peek] Update available: v${CURRENT_VERSION} → v${latest}. Run: claude plugin update peek\n`,
    )
  }
}

main().catch(() => {
  // Silent failure
})
