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
    const file = formData.get("file") as File | null
    const email = formData.get("email") as string | null
    const marketingOptIn = formData.get("marketingOptIn") === "true"
    const captchaToken = formData.get("captchaToken") as string | null
  
    if (!file) {
      return NextResponse.json({ error: "File is required." }, { status: 400 })
    }
    if (!email || !captchaToken) {
      return NextResponse.json({ error: "Email and CAPTCHA token are required." }, { status: 400 })
    }

    // --- Google reCAPTCHA Verification ---
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY
    if (!recaptchaSecret) {
      return NextResponse.json({ error: "reCAPTCHA secret key not configured." }, { status: 500 })
    }
    const recaptchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${recaptchaSecret}&response=${captchaToken}`,
    })
    const recaptchaData = await recaptchaRes.json()
    if (!recaptchaData.success) {
      return NextResponse.json({ error: "CAPTCHA verification failed." }, { status: 403 })
    }

    const uploadsDir = path.join(process.cwd(), "uploads")
    await fs.mkdir(uploadsDir, { recursive: true })

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const jobId = randomUUID()
    const filePath = path.join(uploadsDir, `${jobId}-${file.name}`)
    await fs.writeFile(filePath, fileBuffer)

    const job: Job = {
      id: jobId,
      status: "pending",
      filePath,
      mimeType: file.type,
      email,
      marketingOptIn,
      createdAt: new Date(),
    }
    await createJob(job)

    // Start the analysis in the background (do not await it)
    runAnalysis(jobId)

    // Immediately respond to the client
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
