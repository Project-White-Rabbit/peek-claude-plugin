import fs from "node:fs"
import os from "node:os"
import path from "node:path"

export interface PeekConfig {
  serviceUrl: string
  apiKey: string | null
}

const DEFAULT_SERVICE_URL = "https://www.gopeek.ai"
const CONFIG_DIR = path.join(os.homedir(), ".config", "peek")
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json")
const CREDENTIALS_FILE = path.join(CONFIG_DIR, "credentials.json")

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

function getServiceUrl(): string {
  // Priority: env var → project .peek.json → global config → default
  if (process.env.PEEK_SERVICE_URL) {
    return process.env.PEEK_SERVICE_URL
  }

  const cwd = process.env.PEEK_CWD ?? process.cwd()
  const projectConfig = readJsonFile(path.join(cwd, ".peek.json"))
  if (
    projectConfig?.serviceUrl &&
    typeof projectConfig.serviceUrl === "string"
  ) {
    return projectConfig.serviceUrl
  }

  const globalConfig = readJsonFile(CONFIG_FILE)
  if (globalConfig?.serviceUrl && typeof globalConfig.serviceUrl === "string") {
    return globalConfig.serviceUrl
  }

  return DEFAULT_SERVICE_URL
}

function getApiKey(): string | null {
  if (process.env.PEEK_API_KEY) {
    return process.env.PEEK_API_KEY
  }

  const creds = readJsonFile(CREDENTIALS_FILE)
  if (creds?.apiKey && typeof creds.apiKey === "string") {
    return creds.apiKey
  }
  return null
}

export function getConfig(): PeekConfig {
  return {
    serviceUrl: getServiceUrl(),
    apiKey: getApiKey(),
  }
}

export function saveCredentials(apiKey: string): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(CREDENTIALS_FILE, `${JSON.stringify({ apiKey }, null, 2)}\n`)
}

export function deleteCredentials(): void {
  try {
    fs.unlinkSync(CREDENTIALS_FILE)
  } catch {
    // already gone
  }
}

export function hasCredentials(): boolean {
  return getApiKey() !== null
}

export { CONFIG_DIR, CREDENTIALS_FILE }
