import fs from "node:fs"
import os from "node:os"
import path from "node:path"

export interface PeekConfig {
  serviceUrl: string
  apiKey: string | null
  showNotification: boolean
  verbose: boolean
  debug: boolean
}

const DEFAULT_SERVICE_URL = "https://www.gopeek.ai"
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), ".config", "peek")
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, "config.json")
const GLOBAL_CREDENTIALS_FILE = path.join(GLOBAL_CONFIG_DIR, "credentials.json")

function getCwd(): string {
  return process.env.PEEK_CWD ?? process.cwd()
}

function getProjectDir(): string {
  return path.join(getCwd(), ".peek")
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

function getConfigData(): Record<string, unknown> {
  return (
    readJsonFile(path.join(getProjectDir(), "config.json")) ??
    readJsonFile(GLOBAL_CONFIG_FILE) ??
    {}
  )
}

function getCredentialsData(): Record<string, unknown> {
  return (
    readJsonFile(path.join(getProjectDir(), "credentials.json")) ??
    readJsonFile(GLOBAL_CREDENTIALS_FILE) ??
    {}
  )
}

function getServiceUrl(): string {
  if (process.env.PEEK_SERVICE_URL) {
    return process.env.PEEK_SERVICE_URL
  }
  const config = getConfigData()
  return typeof config.serviceUrl === "string"
    ? config.serviceUrl
    : DEFAULT_SERVICE_URL
}

function getApiKey(): string | null {
  if (process.env.PEEK_API_KEY) {
    return process.env.PEEK_API_KEY
  }
  const creds = getCredentialsData()
  return typeof creds.apiKey === "string" ? creds.apiKey : null
}

function getShowNotification(): boolean {
  const config = getConfigData()
  if (config.showNotification === false) {
    return false
  }
  return true
}

function getVerbose(): boolean {
  if (process.env.PEEK_VERBOSE === "false" || process.env.PEEK_VERBOSE === "0") {
    return false
  }
  if (process.env.PEEK_VERBOSE === "true" || process.env.PEEK_VERBOSE === "1") {
    return true
  }
  const config = getConfigData()
  if (config.verbose === false) {
    return false
  }
  return true
}

function getDebug(): boolean {
  if (process.env.PEEK_DEBUG === "true" || process.env.PEEK_DEBUG === "1") {
    return true
  }
  const config = getConfigData()
  return config.debug === true
}

export function getConfig(): PeekConfig {
  return {
    serviceUrl: getServiceUrl(),
    apiKey: getApiKey(),
    showNotification: getShowNotification(),
    verbose: getVerbose(),
    debug: getDebug(),
  }
}

export function setShowNotification(value: boolean): void {
  fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true })
  const existing = readJsonFile(GLOBAL_CONFIG_FILE) ?? {}
  existing.showNotification = value
  fs.writeFileSync(GLOBAL_CONFIG_FILE, `${JSON.stringify(existing, null, 2)}\n`)
}

export function setVerbose(value: boolean): void {
  fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true })
  const existing = readJsonFile(GLOBAL_CONFIG_FILE) ?? {}
  existing.verbose = value
  fs.writeFileSync(GLOBAL_CONFIG_FILE, `${JSON.stringify(existing, null, 2)}\n`)
}

export type LoggingLevel = "verbose" | "default" | "none" | "debug"

export function setLoggingLevel(level: LoggingLevel): void {
  fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true })
  const existing = readJsonFile(GLOBAL_CONFIG_FILE) ?? {}
  existing.showNotification = level !== "none"
  existing.verbose = level === "verbose" || level === "debug"
  existing.debug = level === "debug"
  fs.writeFileSync(GLOBAL_CONFIG_FILE, `${JSON.stringify(existing, null, 2)}\n`)
}

export function getLoggingLevel(): LoggingLevel {
  const config = getConfigData()
  if (config.debug === true) {
    return "debug"
  }
  if (config.showNotification === false) {
    return "none"
  }
  if (config.verbose === false) {
    return "default"
  }
  return "verbose"
}

export function saveCredentials(apiKey: string): void {
  fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true })
  fs.writeFileSync(
    GLOBAL_CREDENTIALS_FILE,
    `${JSON.stringify({ apiKey }, null, 2)}\n`,
  )
}

export function deleteCredentials(): void {
  try {
    fs.unlinkSync(GLOBAL_CREDENTIALS_FILE)
  } catch {
    // already gone
  }
}

export function hasCredentials(): boolean {
  return getApiKey() !== null
}

export { GLOBAL_CONFIG_DIR as CONFIG_DIR, GLOBAL_CREDENTIALS_FILE as CREDENTIALS_FILE }
