import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import fs from "fs/promises"
import path from "path"
import type { Job } from "@/lib/jobs"
import { createJob, getJob } from "@/lib/jobs"
import { runAnalysis } from "@/lib/worker"

// --- Step 1: Gated Entry & Job Creation (Web Server) ---

// Disable Next.js body parsing to handle file stream from FormData
export const config = {
  api: {
    bodyParser: false,
  },
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const jobId = formData.get("jobId") as string | null
    
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required." }, { status: 400 })
    }
    
    console.log('Starting analysis for job:', jobId)
    
    // Start the analysis immediately but don't wait for completion
    console.log(`[${jobId}] About to call runAnalysis...`)
    
    // For now, let's try running it synchronously to see if it works
    try {
      console.log(`[${jobId}] Starting runAnalysis synchronously...`)
      await runAnalysis(jobId)
      console.log(`[${jobId}] runAnalysis completed successfully`)
    } catch (error) {
      console.error(`[${jobId}] runAnalysis failed:`, error)
      return NextResponse.json({ error: "Analysis failed to start." }, { status: 500 })
    }
    
    console.log(`[${jobId}] runAnalysis completed successfully`)
    
    return NextResponse.json({ message: "Analysis completed.", jobId }, { status: 200 })
  } catch (error: any) {
    console.error("Failed to start analysis:", error)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required." }, { status: 400 })
  }

  const job = await getJob(jobId)
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 })
  }

  // Only return safe fields
  return NextResponse.json({
    status: job.status,
    error: job.error || null,
    finalReport: job.finalReport || null,
  })
}
