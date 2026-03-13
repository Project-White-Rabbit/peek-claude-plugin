import { apiCall } from "../api.js"

async function main() {
  const message = process.argv.slice(2).join(" ").trim()

  if (!message) {
    console.error("No feedback message provided.")
    console.error('Usage: /peek:feedback "your feedback here"')
    process.exit(1)
  }

  const result = await apiCall<{ feedback: { id: string } }>(
    "/api/plugin/feedback",
    { message },
    { timeoutMs: 10_000 },
  )

  if (!result.ok) {
    console.error(`Failed to submit feedback: ${result.error}`)
    process.exit(1)
  }

  console.log("Feedback submitted. Thank you!")
}

main().catch((err) => {
  console.error("Feedback submission failed:", err.message)
  process.exit(1)
})
