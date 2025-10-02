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
  console.log(`[${jobId}] ====== RUN ANALYSIS FUNCTION CALLED ======`)
  console.log(`[${jobId}] runAnalysis function called`)
  
  let job;
  try {
    try {
      job = await getJob(jobId)
      if (!job) {
        console.error(`Job ${jobId} not found.`)
        return
      }
      await updateJob(jobId, { status: "parsing" })

    } catch (dbError) {
      console.error(`[${jobId}] Database operation failed:`, dbError)
      throw dbError
    }
    
    let rawText: string;
    
    // Check if we have text content in database (OCR processed text)
    if (job.textContent) {
      // Use text content stored in database
      rawText = job.textContent
      console.log(`[${jobId}] Text content loaded from database. Text length: ${rawText.length}`)
    } else if (job.mimeType === "text/plain") {
      // Fallback to file reading for backward compatibility
      rawText = await fs.readFile(job.filePath, 'utf-8')
      console.log(`[${jobId}] Text loaded from file. Text length: ${rawText.length}`)
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


    const promptResponse = await openai.chat.completions.create({
      // Use a valid model name
      model: "gpt-4o-mini",
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
    console.log(`[${jobId}] Deep research prompt generated.`)

    // --- Step 4: Executing Deep Research ---
    await updateJob(jobId, { status: "researching" })
    console.log(`[${jobId}] [O4 Mini] Sending research plan to deep research model:`)

    // Simulating the async call with a webhook.
    const deepResearchResponse = await openai.chat.completions.create({
      model: "gpt-4o",  //Deep Research"
      messages: [
        {
          role: "system",
          content:
            "You are a world-class research analyst with web search capabilities. Execute the following research plan and provide a detailed report with citations in markdown format.\n\nCRITICAL FORMATTING REQUIREMENTS:\n1. Use inline citations like [^1^], [^2^] throughout your report\n2. ALWAYS end your report with a 'Sources:' section\n3. Each source must be numbered and include BOTH title and COMPLETE URL\n4. Use this EXACT format for sources:\n\nSources:\n1. [Grand View Research - AI in Drug Discovery Market Report] https://www.grandviewresearch.com/industry-analysis/ai-in-drug-discovery-market\n2. [McKinsey - Future of Healthcare AI] https://www.mckinsey.com/industries/healthcare/our-insights/artificial-intelligence-in-healthcare\n3. [Statista - Pharmaceutical Industry Statistics] https://www.statista.com/markets/413/topic/487/pharmaceuticals/\n4. [Forbes - AI in Pharma] https://www.forbes.com/sites/forbestechcouncil/2024/01/15/ai-in-pharmaceuticals/\n5. [Bloomberg - Pharma AI Investments] https://www.bloomberg.com/news/articles/2024-02-15/pharma-ai-investments\n\nIMPORTANT:\n- Use REAL, COMPLETE URLs (not truncated)\n- Use descriptive titles in square brackets\n- Do NOT fabricate sources - use real industry reports and websites\n- If you cannot find specific sources, use general industry websites like:\n  - grandviewresearch.com\n  - mckinsey.com\n  - statista.com\n  - forbes.com\n  - bloomberg.com\n  - crunchbase.com\n  - techcrunch.com\n- Minimum 8 sources required\n- Each source must have both title and complete URL\n- Focus on pharmaceutical AI, drug discovery, and healthcare technology",
        },
        { role: "user", content: deepResearchPrompt },
      ],
      // tools: [{ type: "web_search" }], // Removed to fix linter error
    })
    const researchResult = deepResearchResponse.choices[0].message.content
   

    // Call the webhook function directly instead of making HTTP request
    console.log(`[${jobId}] Deep research finished. Processing final report directly...`);
    
    // Import the webhook handler function directly
    const { processResearchComplete } = await import("../app/api/webhook/research-complete/route");
    
    // Create a mock request object for the webhook handler
    const mockRequest = {
      url: `http://localhost:3000/api/webhook/research-complete?jobId=${jobId}`,
      json: async () => ({
        content: [
          {
            text: researchResult,
            annotations: extractSources(researchResult ?? ""),
          },
        ],
      }),
    } as any;
    
    // Call the webhook handler directly
    await processResearchComplete(mockRequest);
  } catch (error: any) {
    console.error(`[${jobId}] Analysis failed:`, error)
    await updateJob(jobId, { status: "error", error: error.message })
    await sendErrorEmail(job?.email ?? "", jobId, error.message)
    // Note: We can't access job.filePath here since job might be null
    // The cleanup will be handled by the webhook or other cleanup functions
  }
}

function extractSources(text: string): { title: string; url: string }[] {
  console.log("=== EXTRACTING SOURCES ===")
  console.log("Full text length:", text.length)
  
  // Try multiple patterns to find sources section
  const patterns = [
    /Sources?:([\s\S]*?)(?:\n\n|\n##|\n#|\n\*\*|\Z)/i,
    /References?:([\s\S]*?)(?:\n\n|\n##|\n#|\n\*\*|\Z)/i,
    /Citations?:([\s\S]*?)(?:\n\n|\n##|\n#|\n\*\*|\Z)/i,
    /Sources:([\s\S]*)/i
  ]
  
  let sourcesSection = ""
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      sourcesSection = match[1]
      console.log("Found sources section with pattern:", pattern)
      break
    }
  }
  
  if (!sourcesSection) {
    console.log("No sources section found")
    return []
  }
  
  console.log("Sources section:", sourcesSection.substring(0, 500) + "...")
  
  const sourceLines = sourcesSection
    .trim()
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim()
      return trimmed && (
        trimmed.match(/^\s*\d+\./) || 
        trimmed.match(/\[\^\d+\^\]:/) ||
        trimmed.match(/^[-*]\s/) ||
        trimmed.includes("http")
      )
    })
  
  console.log("Filtered source lines:", sourceLines)
  
  return sourceLines.map((line, index) => {
    let title = "Untitled Source"
    let url = "#"
    
    console.log(`Processing line ${index + 1}: "${line}"`)
    
    // Pattern 1: "1. [Title] https://url.com" or "1. Title https://url.com"
    const pattern1 = line.match(/\d+\.\s*\[([^\]]+)\]\s+(https?:\/\/[^\s)]+)/)
    if (pattern1) {
      title = pattern1[1].trim()
      url = pattern1[2]
      console.log(`Pattern 1 match: title="${title}", url="${url}"`)
    } else {
      // Pattern 2: "1. Title https://url.com"
      const pattern2 = line.match(/\d+\.\s*(.*?)\s+(https?:\/\/[^\s)]+)/)
      if (pattern2) {
        title = pattern2[1].trim().replace(/^["']|["']$/g, "")
        url = pattern2[2]
        console.log(`Pattern 2 match: title="${title}", url="${url}"`)
      } else {
        // Pattern 3: "1. Title" (no URL)
      const titleMatch = line.match(/\d+\.\s*(.*?)(?:\s*$)/)
      if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim().replace(/^["']|["']$/g, "")
      }
      
      // Look for URL anywhere in the line
      const urlMatch = line.match(/(https?:\/\/[^\s)]+)/)
      if (urlMatch) {
        url = urlMatch[0]
        }
        console.log(`Pattern 3 match: title="${title}", url="${url}"`)
      }
    }
    
    // Clean up title
    if (title === "" || title === "Untitled Source") {
      title = `Source ${index + 1}`
    }
    
    // If no URL found, create a placeholder URL based on title
    if (url === "#" && title !== "Untitled Source") {
      // Create a search URL for the title
      const searchQuery = encodeURIComponent(title.replace(/[\[\]]/g, ""))
      url = `https://www.google.com/search?q=${searchQuery}`
    }
    
    console.log(`Final result: title="${title}", url="${url}"`)
    return { title, url }
  }).filter(source => source.title !== "Untitled Source" && source.title.length > 0)
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