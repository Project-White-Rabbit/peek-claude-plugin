import { apiCall } from "../api.js"

interface ArchiveResponse {
  success: boolean
  archived: {
    id: string
    memoryNumber: number
    content: string
  }
}

async function main() {
  const arg = process.argv.slice(2).join(" ").trim()
  const memoryNumber = Number.parseInt(arg, 10)

  if (!arg || Number.isNaN(memoryNumber) || memoryNumber < 1) {
    console.error("Invalid memory number.")
    console.error("Usage: /peek:memory-delete <number>")
    console.error("Example: /peek:memory-delete 42")
    process.exit(1)
  }

  const result = await apiCall<ArchiveResponse>(
    "/api/plugin/memories/archive",
    { memoryNumber },
    { timeoutMs: 10_000 },
  )

  if (!result.ok) {
    console.error(`Failed to delete memory: ${result.error}`)
    process.exit(1)
  }

  const { archived } = result.data
  console.log(`Deleted memory #${archived.memoryNumber}: "${archived.content}"`)
}

main().catch((err) => {
  console.error("Memory delete failed:", err.message)
  process.exit(1)
})
