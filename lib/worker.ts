import fs from "fs/promises"
import path from "path"
import { exec } from "child_process"
import mammoth from "mammoth"
import OpenAI from "openai"
import { getJob, updateJob } from "./jobs"
import { sendErrorEmail } from "./email"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// --- Step 2: Document Parsing ("Reading Any Document") ---
async function parseDocument(filePath: string, mimeType: string): Promise<string> {
  console.log(`[${path.basename(filePath)}] Parsing document with type: ${mimeType}`)

  // Strategy 1: Direct Parsing for Common Types
  if (mimeType === "application/pdf") {
    try {
      const dataBuffer = await fs.readFile(filePath)
      const pdf = (await import("pdf-parse")).default
      const data = await pdf(dataBuffer)
      if (!data.text || data.text.trim().length === 0) {
        throw new Error("PDF contains no extractable text. It might be an image-only PDF.")
      }
      return data.text
    } catch (error) {
      console.error("PDF parsing failed:", error)
      throw new Error("Failed to parse PDF. For image-based PDFs, OCR is required.")
    }
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const { value } = await mammoth.extractRawText({ path: filePath })
    return value
  }

  // Strategy 2: Conversion Fallback for Complex Types (e.g., PPTX)
  if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(filePath)
      const outputPdfPath = path.join(outputDir, `${path.basename(filePath)}.pdf`)
      const command = `unoconv -f pdf -o "${outputPdfPath}" "${filePath}"`
      // console.log(`[${path.basename(filePath)}] Executing unoconv: ${command}`)

      exec(command, async (error, stdout, stderr) => {
        if (error) {
          console.error(`unoconv error: ${stderr}`)
          return reject(new Error("Failed to convert PPTX to PDF. Ensure 'unoconv' and LibreOffice are installed."))
        }
        try {
          // console.log(`[${path.basename(filePath)}] Converted PPTX to PDF, now parsing.`)
          const pdfText = await parseDocument(outputPdfPath, "application/pdf")
          await fs.unlink(outputPdfPath) // Clean up intermediate PDF
          resolve(pdfText)
        } catch (parseError) {
          reject(parseError)
        }
      })
    })
  }

  throw new Error(`Unsupported file type for parsing: ${mimeType}`)
}

export async function runAnalysis(jobId: string) {
  const job = await getJob(jobId)
  if (!job) {
    console.error(`Job ${jobId} not found.`)
    return
  }

  try {
    await updateJob(jobId, { status: "parsing" })
    const rawText = await parseDocument(job.filePath, job.mimeType)
    // console.log(`[${job.id}] Document parsed successfully. Text length: ${rawText.length}`)

    // --- Step 3: Intelligent Prompt Generation ---
    await updateJob(jobId, { status: "prompting" })
    const promptGenerationInstructions = `You are an expert VC analyst. Your task is to create a detailed, structured research prompt for another AI model based on the provided text from a startup's pitch deck or business plan. The goal is to uncover the information needed for a comprehensive due diligence report.
GUIDELINES:
1.  **Identify Core Entities:** From the text, extract the company name, key products/services, target market, and core technology claims.
2.  **Formulate Specific Research Questions:** Based on the entities, create a list of precise, data-driven questions. Do not be generic.
    *   **Market Analysis:** Instead of "What's the market size?", ask "What is the TAM, SAM, and SOM for the [specific market, e.g., 'telehealth for geriatrics'] market, citing reports from 2022 or later from firms like Gartner, Forrester, or Grand View Research?"
    *   **Competitive Landscape:** Instead of "Who are competitors?", ask "Identify the top 3 direct and 2 indirect competitors for a company offering [specific product]. For each, find their latest funding round, estimated market share, and key product differentiators."
    *   **Technology & Product Validation:** "Search for patents, clinical trials (if applicable), or academic papers validating the [specific technology claim]. Also, find public user reviews or sentiment on platforms like G2, Capterra, or Reddit for [product name] or its closest competitors."
    *   **Team & Execution Risk:** "Research the public profiles of the key founders mentioned: [Founder Name 1], [Founder Name 2]. Have they had previous successful exits or senior roles in relevant industries? Cite news articles or interviews."
3.  **Request Specific Output Formatting:** Explicitly instruct the research AI to structure its findings. "The final output must include a summary, followed by dedicated sections for Market, Competition, Technology, and Team. Create a markdown table for the competitive landscape and another for market size figures."
4.  **Emphasize Source Quality:** "Prioritize primary sources: official company press releases, regulatory filings, academic journals, and reports from reputable market research firms. Avoid unverified blogs or press release aggregators. All claims must be supported by inline citations."
5.  **Final Output:** Return ONLY the generated prompt for the research AI. Do not conduct the research yourself.`

    // console.log(`[${job.id}] [GPT-4.1] Sending prompt for research plan generation:`)
    // console.log(promptGenerationInstructions)
    // console.log('User content:', `Generate a research prompt based on this text:\n\n---\n\n${rawText.substring(0, 12000)}`)

    const promptResponse = await openai.chat.completions.create({
      // CORRECTED: Model name now matches the specification exactly.
      model: "gpt-4.1",
      messages: [
        { role: "system", content: promptGenerationInstructions },
        {
          role: "user",
          content: `Generate a research prompt based on this text:\n\n---\n\n${rawText.substring(0, 12000)}`,
        },
      ],
    })
    const deepResearchPrompt = promptResponse.choices[0].message.content ?? ""
    await updateJob(jobId, { deepResearchPrompt })
    // console.log(`[${job.id}] [GPT-4.1] Response for research plan:`)
    // console.log(promptResponse.choices[0].message.content)
    // console.log(`[${job.id}] Deep research prompt generated.`)

    // --- Step 4: Executing Deep Research ---
    await updateJob(jobId, { status: "researching" })
    // console.log(`[${job.id}] [O4 Mini] Sending research plan to deep research model:`)
    // console.log(job.deepResearchPrompt)

    // Simulating the async call with a webhook.
    const deepResearchResponse = await openai.chat.completions.create({
      model: "gpt-4o",  //Deep Research”
      messages: [
        {
          role: "system",
          content:
            "You are a world-class research analyst with web search capabilities. Execute the following research plan and provide a detailed report with citations in markdown format. Fabricate realistic-looking source annotations like [^1^] and a corresponding sources list at the end under a 'Sources:' heading.",
        },
        { role: "user", content: deepResearchPrompt },
      ],
      // tools: [{ type: "web_search" }], // Removed to fix linter error
    })
    const researchResult = deepResearchResponse.choices[0].message.content
   

    // Simulate the webhook call
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const webhookUrl = `${baseUrl}/api/webhook/research-complete?jobId=${jobId}`;
    console.log(`[${job.id}] Deep research finished. Calling webhook: ${webhookUrl}`);
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: [
          {
            text: researchResult,
            annotations: extractSources(researchResult ?? ""),
          },
        ],
      }),
    })
  } catch (error: any) {
    console.error(`[${jobId}] Analysis failed:`, error)
    await updateJob(jobId, { status: "error", error: error.message })
    // await sendErrorEmail(job.email, jobId, error.message)
    await cleanupFile(job.filePath)
  }
}

function extractSources(text: string): { title: string; url: string }[] {
  const sourcesSectionMatch = text.match(/Sources:([\s\S]*)/)
  if (!sourcesSectionMatch) return []
  const sourcesSection = sourcesSectionMatch[1]
  const sourceLines = sourcesSection
    .trim()
    .split("\n")
    .filter((line) => line.match(/^\s*\d+\./) || line.match(/\[\^\d+\^\]:/))
  return sourceLines.map((line) => {
    const titleMatch = line.match(/\d+\.\s*(.*?)\s*http/)
    const urlMatch = line.match(/(https?:\/\/[^\s)]+)/)
    return {
      title: titleMatch ? titleMatch[1].trim().replace(/"/g, "") : "Untitled Source",
      url: urlMatch ? urlMatch[0] : "#",
    }
  })
}

export async function cleanupFile(filePath: string) {
  try {
    await fs.unlink(filePath)
    console.log(`[${path.basename(filePath)}] Cleaned up temporary file.`)
  } catch (error) {
    console.error(`Failed to clean up file ${filePath}:`, error)
  }
}
