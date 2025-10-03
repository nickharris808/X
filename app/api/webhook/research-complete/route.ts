import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { getJob, updateJob } from "@/lib/jobs"
import { cleanupFile, cleanupUploadsDirectory } from "@/lib/worker"
import { sendCompletionEmail, sendErrorEmail } from "@/lib/email"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// --- Step 5: Synthesis & Citation Integration (Webhook Handler) ---
export async function processResearchComplete(req: NextRequest) {
  return await POST(req);
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required." }, { status: 400 })
  }

  const job = await getJob(jobId)

  // Log the jobId being used
  console.log("[DEBUG] jobId received in webhook:", jobId)
  if (!job) {
    console.error(`[ERROR] Job not found for jobId: ${jobId}`)
    return NextResponse.json({ error: "Job not found." }, { status: 404 })
  }

  try {
    // Update status to synthesizing when webhook is received
    await updateJob(jobId, { status: "synthesizing" })
    console.log(`[${jobId}] Webhook received - status updated to synthesizing`)
    
    const body = await req.json()

    const researchContent = body.content[0]
    const reportTextWithMarkers = researchContent.text
    const sourceAnnotations = researchContent.annotations

    console.log(`[${jobId}] Source annotations structure:`, JSON.stringify(sourceAnnotations, null, 2))

    const sourcesList = sourceAnnotations.map((anno: any, index: number) => {
      console.log(`[${jobId}] Processing annotation ${index + 1}:`, anno)
      return {
        id: index + 1,
        title: anno.title || anno.name || anno.text || `Source ${index + 1}`,
        url: anno.url || anno.link || anno.href || "#",
      }
    }).filter((source: any) => source.title !== "Untitled Source" && source.title.length > 0)

    console.log(`[${jobId}] Final sources list:`, sourcesList)

    const finalReportInstructions = `You are a meticulous data structuring expert. Your task is to parse a research report and a list of sources to populate a structured JSON object. You must be precise and provide realistic estimates when specific data is not available.
GUIDELINES:
1.  **Strict JSON Schema Adherence:** Your output MUST be a single, valid JSON object matching the provided schema. Do not include any explanatory text outside the JSON.
2.  **Mandatory Citation Mapping:** The 'researchReportText' contains citation markers like [^1^], [^2^], etc. The 'sourcesList' maps these numbers to web sources. When you extract any piece of data (a number, a fact, a competitor name), you MUST find its corresponding citation number from the text and include that number in the 'source_ids' array for that data point. If a statement is a general synthesis without a direct citation, the 'source_ids' array can be empty.
3.  **Data Integrity & Realistic Estimates:** NEVER use null values. If specific information is not available, provide realistic estimates based on industry standards and context:
   - For valuation: Use industry benchmarks (early-stage pharma AI: $50M-$200M, established: $200M-$1B)
   - For market size: Use reasonable estimates (TAM: $10B-$50B, SAM: 10-20% of TAM, SOM: 1-5% of TAM)
   - For competitor funding: Use realistic ranges ($50M-$500M for established players)
   - For years: Use current year (2024) or recent years (2022-2024)
4.  **Synthesize Concisely:** For narrative fields like 'summary' or 'teamAnalysis', synthesize the key points into brief, clear text. For SWOT points, use bullet points.
5.  **Insight Score & Valuation:** Generate a numerical 'insightScore' from 0-100 based on the overall strength of the company profile (market, team, tech, competition). Provide a brief 'rationale'. Also, provide a realistic 'valuation' range (low/high) and a 'narrative' explaining your assumptions.
6.  **Source Array Population:** The 'sources' array in the final JSON must be an exact, complete copy of the 'sourcesList' I provide.

**JSON SCHEMA TO POPULATE:**
{
  "companyName": "string",
  "summary": "A 2-3 sentence executive summary of the findings.",
  "insightScore": {
    "score": "Number (0-100)",
    "rationale": "A brief explanation for the score, highlighting key positive and negative factors."
  },
  "valuation": {
    "low": "Number (e.g., 50000000 for $50M)",
    "high": "Number (e.g., 200000000 for $200M)",
    "currency": "string (e.g., 'USD')",
    "narrative": "A paragraph explaining the methodology and assumptions behind the valuation range."
  },
  "swotAnalysis": {
    "strengths": [{ "point": "string", "source_ids": [Number] }],
    "weaknesses": [{ "point": "string", "source_ids": [Number] }],
    "opportunities": [{ "point": "string", "source_ids": [Number] }],
    "threats": [{ "point": "string", "source_ids": [Number] }]
  },
  "marketAnalysis": {
    "narrative": "A paragraph summarizing the market size, growth, and trends.",
    "marketSize": [
      { "metric": "TAM", "value": "Number (e.g., 25 for $25B)", "year": "Number (e.g., 2024)", "source_ids": [Number] },
      { "metric": "SAM", "value": "Number (e.g., 5 for $5B)", "year": "Number (e.g., 2024)", "source_ids": [Number] },
      { "metric": "SOM", "value": "Number (e.g., 1 for $1B)", "year": "Number (e.g., 2024)", "source_ids": [Number] }
    ]
  },
  "competitorLandscape": [
    { "competitorName": "string (e.g., 'Atomwise')", "funding": "string (e.g., '$123M Series B')", "keyDifferentiator": "string (e.g., 'AI-driven drug discovery')", "source_ids": [Number] }
  ],
  "teamAnalysis": "A brief summary of the founding team's background and experience.",
  "sources": [
    { "id": Number, "title": "string", "url": "string" }
  ]
}`

    const combinedInput = `**researchReportText:**\n---\n${reportTextWithMarkers}\n---\n**sourcesList:**\n---\n${JSON.stringify(sourcesList, null, 2)}\n---`

    const finalReportResponse = await openai.chat.completions.create({
      // Use a valid model name
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: finalReportInstructions },
        { role: "user", content: combinedInput },
      ],
      response_format: { type: "json_object" }, // Enforces JSON output
    })

    const finalReportJson = JSON.parse(finalReportResponse.choices[0].message.content ?? "{}")

    await updateJob(jobId, { status: "complete", finalReport: finalReportJson })
    console.log(`[${jobId}] Final report synthesized and saved.`)

    await sendCompletionEmail(job.email, jobId)
    await cleanupFile(job.filePath)
    
    // Also clean up any old files in the uploads directory
    await cleanupUploadsDirectory()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error(`[${jobId}] Final synthesis failed:`, error)
    await updateJob(jobId, { status: "error", error: "Failed to structure final report." })
    await sendErrorEmail(job.email, jobId, "Failed to structure final report.")
    await cleanupFile(job?.filePath)
    return NextResponse.json({ error: "Failed to process report." }, { status: 500 })
  }
} 