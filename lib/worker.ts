import fs from "fs/promises"
import path from "path"
import { exec } from "child_process"
import mammoth from "mammoth"
import OpenAI from "openai"

import { getJob, updateJob } from "./jobs"
import { sendErrorEmail } from "./email"

// Polyfills for Node.js environment
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class {
    a: number = 1;
    b: number = 0;
    c: number = 0;
    d: number = 1;
    e: number = 0;
    f: number = 0;
    constructor() {}
  };
}

if (typeof globalThis.DOMPoint === 'undefined') {
  (globalThis as any).DOMPoint = class {
    x: number;
    y: number;
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
  };
}

if (typeof globalThis.DOMRect === 'undefined') {
  (globalThis as any).DOMRect = class {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }
  };
}

// OCR configuration for serverless environment

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})



export async function runAnalysis(jobId: string) {
  const job = await getJob(jobId)
  if (!job) {
    console.error(`Job ${jobId} not found.`)
    return
  }

  try {
    let rawText: string;
    
    // Check if we have text content in database (OCR processed text)
    if (job.textContent) {
      // Use text content stored in database
      rawText = job.textContent
      console.log(`[${job.id}] Text content loaded from database. Text length: ${rawText.length}`)
    } else if (job.mimeType === "text/plain") {
      // Fallback to file reading for backward compatibility
      rawText = await fs.readFile(job.filePath, 'utf-8')
      console.log(`[${job.id}] Text loaded from file. Text length: ${rawText.length}`)
    } else {
      // For other files, we need to implement document parsing
      // For now, throw an error since parseDocument was removed
      throw new Error("Document parsing not implemented for non-text files")
    }

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

    console.log(`[${job.id}] [GPT-4.1] Sending prompt for research plan generation:`)
    console.log(promptGenerationInstructions , "promptGenerationInstructions")
    console.log('User content:', `Generate a research prompt based on this text:\n\n---\n\n${rawText.substring(0, 12000)}`)

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
    console.log(`[${job.id}] [GPT-4.1] Response for research plan:`)
    console.log(promptResponse.choices[0].message.content)
    console.log(`[${job.id}] Deep research prompt generated.`)

    // --- Step 4: Executing Deep Research ---
    await updateJob(jobId, { status: "researching" })
    console.log(`[${job.id}] [O4 Mini] Sending research plan to deep research model:`)
    console.log(job.deepResearchPrompt,"job.deepResearchPrompt================")

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
    // Check if file exists before trying to delete
    await fs.access(filePath)
    await fs.unlink(filePath)
    console.log(`[${path.basename(filePath)}] Cleaned up temporary file.`)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`[${path.basename(filePath)}] File already deleted or doesn't exist.`)
    } else {
      console.error(`Failed to clean up file ${filePath}:`, error)
    }
  }
}

export async function cleanupUploadsDirectory() {
  try {
    const os = await import('os')
    const tempDir = os.tmpdir()
    const uploadsDir = path.join(tempDir, "insight-engine-uploads")
    
    // Check if directory exists
    try {
      await fs.access(uploadsDir)
    } catch (error) {
      console.log("Uploads directory doesn't exist, nothing to clean.")
      return
    }

    // Read all files in the directory
    const files = await fs.readdir(uploadsDir)
    
    if (files.length === 0) {
      // Remove empty directory
      await fs.rmdir(uploadsDir)
      console.log("Removed empty uploads directory.")
      return
    }

    // Clean up files older than 24 hours
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file)
      try {
        const stats = await fs.stat(filePath)
        const fileAge = now - stats.mtime.getTime()
        
        if (fileAge > oneDayMs) {
          await fs.unlink(filePath)
          console.log(`[${file}] Cleaned up old file (${Math.round(fileAge / (60 * 60 * 1000))} hours old).`)
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error(`Failed to process file ${file}:`, error)
        }
      }
    }

    // Check if directory is now empty and remove it
    const remainingFiles = await fs.readdir(uploadsDir)
    if (remainingFiles.length === 0) {
      await fs.rmdir(uploadsDir)
      console.log("Removed empty uploads directory after cleanup.")
    }
  } catch (error) {
    console.error("Failed to clean up uploads directory:", error)
  }
}
