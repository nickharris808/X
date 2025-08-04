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
    
    // Start the analysis in the background (do not await it)
    // Add error handling to catch any issues
    runAnalysis(jobId).catch(error => {
      console.error(`[${jobId}] runAnalysis failed:`, error)
    })
    
    console.log(`[${jobId}] runAnalysis called successfully`)
    
    return NextResponse.json({ message: "Analysis started.", jobId }, { status: 202 })
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
