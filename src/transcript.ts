import fs from "node:fs"

interface HookInput {
  session_id: string
  transcript_path: string
  cwd: string
  hook_event_name: string
  prompt?: string
}

interface ContentBlock {
  type: string
  text?: string
  name?: string
}

interface TranscriptEntry {
  type?: string
  timestamp?: string
  message?: {
    role?: string
    content?: string | ContentBlock[]
  }
}

export function parseHookInput(): HookInput | null {
  try {
    const stdin = fs.readFileSync(0, "utf-8")
    if (stdin.trim()) {
      return JSON.parse(stdin)
    }
  } catch {
    // ignore
  }
  return null
}

export function getRecentContext(
  transcriptPath: string,
  maxEntries = 10,
): string[] {
  try {
    const content = fs.readFileSync(transcriptPath, "utf-8")
    const lines = content.trim().split("\n")

    const messages: string[] = []
    const start = Math.max(0, lines.length - maxEntries * 2)

    for (let i = start; i < lines.length; i++) {
      try {
        const entry: TranscriptEntry = JSON.parse(lines[i])
        if (!entry.message?.role || !entry.message?.content) {
          continue
        }

        const role = entry.message.role
        let text: string

        if (typeof entry.message.content === "string") {
          text = entry.message.content
        } else if (Array.isArray(entry.message.content)) {
          text = entry.message.content
            .filter((block) => block.type === "text" && block.text)
            .map((block) => block.text)
            .join("\n")
        } else {
          continue
        }

        if (text.trim()) {
          messages.push(`${role}: ${text.slice(0, 500)}`)
        }
      } catch {}
    }

    return messages.slice(-maxEntries)
  } catch {
    return []
  }
}

export function getRecentToolNames(transcriptPath: string): string[] {
  try {
    const content = fs.readFileSync(transcriptPath, "utf-8")
    const lines = content.trim().split("\n")

    const toolNames: string[] = []

    // Walk backwards to find the most recent assistant turn's tool_use blocks.
    // Stop when we hit a user message after finding assistant content.
    let foundAssistant = false
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry: TranscriptEntry = JSON.parse(lines[i])
        if (!entry.message?.role || !entry.message?.content) {
          continue
        }

        if (entry.message.role === "user" && foundAssistant) {
          break
        }

        if (entry.message.role === "assistant" && Array.isArray(entry.message.content)) {
          foundAssistant = true
          for (const block of entry.message.content) {
            if (block.type === "tool_use" && block.name) {
              toolNames.push(block.name)
            }
          }
        }
      } catch {}
    }

    return toolNames
  } catch {
    return []
  }
}

export function getLatestUserMessage(transcriptPath: string): string | null {
  try {
    const content = fs.readFileSync(transcriptPath, "utf-8")
    const lines = content.trim().split("\n")

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry: TranscriptEntry = JSON.parse(lines[i])
        if (entry.message?.role !== "user") {
          continue
        }

        if (typeof entry.message.content === "string") {
          return entry.message.content
        }

        if (Array.isArray(entry.message.content)) {
          const text = entry.message.content
            .filter((block) => block.type === "text" && block.text)
            .map((block) => block.text)
            .join("\n")
          if (text.trim()) {
            return text
          }
        }
      } catch {}
    }
  } catch {
    // ignore
  }
  return null
}
