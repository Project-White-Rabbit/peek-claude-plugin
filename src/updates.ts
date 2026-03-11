import { getVersion } from "./version.js"

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

export interface UpdateStatus {
  current: string
  latest: string | null
  updateAvailable: boolean
}

export async function checkForUpdate(): Promise<UpdateStatus> {
  const latest = await getLatestVersion()
  return {
    current: CURRENT_VERSION,
    latest,
    updateAvailable: latest !== null && isNewer(latest, CURRENT_VERSION),
  }
}

export function formatUpdateMessage(
  current: string,
  latest: string,
): string {
  return `update → v${latest}. Run "claude plugin update peek@peek" to update.`
}
