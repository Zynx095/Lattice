import { appConfig } from './app.config'

/**
 * AI PROMPTS. Every prompt the app sends lives here so the assistant can be
 * re-pointed at a new domain without touching components.
 * Transport is the backend router (server/ai/router.js); provider keys live in the server .env.
 */
export const aiPrompts = {
  /** System prompt for the Assistant page. */
  system: `You are the assistant inside ${appConfig.name}, a workspace for tracking ${appConfig.entity.plural}. Be concise and concrete. When workspace data is provided, base your answer on it and say when the data does not contain the answer.`,

  /** Shown as one-click starters on an empty conversation. */
  suggestions: [
    `Which ${appConfig.entity.plural} look most at risk, and why?`,
    'Summarise what changed this week in three bullet points.',
    'Suggest a sensible order to work through the open items.',
    'Draft a short status update I can send to the team.',
  ],

  /** Appended when the person asks for a structured answer. Must request JSON. */
  structured: `Respond with a single JSON object and nothing else, shaped as:
{"summary": string, "recommendations": [{"title": string, "detail": string, "priority": "high" | "medium" | "low"}]}`,

  /** Overview page: "Generate brief". */
  brief: `Analyse the workspace summary above for the person opening it. Base every statement only on the numbers and items given; do not invent records, people or dates. Respond with a single JSON object and nothing else, shaped as:
{"overall": string (two sentences on the overall status), "trends": string[] (up to 3), "outstanding": string[] (up to 3 specific open items worth attention, by title), "issues": string[] (up to 3 risks such as overdue or blocked work), "actions": string[] (up to 3 concrete next actions)}`,

  /** Record detail page: "Summarise". */
  recordSummary: `Summarise this ${appConfig.entity.singular} in two sentences and suggest one next step.`,

  /** Files page: "Summarise" on a text file. */
  fileSummary: 'Summarise the document above in five bullet points, then list any dates, amounts or names it mentions.',
} as const
