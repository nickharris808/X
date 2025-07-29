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
    const text = formData.get("text") as string | null
    
    console.log('Received form data:', {
      hasFile: !!file,
      email: email,
      hasCaptchaToken: !!captchaToken,
      hasText: !!text,
      textLength: text?.length
    })
    
    if(!text){
      return NextResponse.json({ error: "Text is required." }, { status: 400 })
    }
    if (!file) {
      return NextResponse.json({ error: "File is required." }, { status: 400 })
    }
    if (!email || !captchaToken) {
      return NextResponse.json({ error: "Email and CAPTCHA token are required." }, { status: 400 })
    }

    // --- Google reCAPTCHA Verification ---
    const isDev = process.env.NODE_ENV === 'development'
    
    if (!isDev) {
      const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY
      if (!recaptchaSecret) {
        return NextResponse.json({ error: "reCAPTCHA secret key not configured." }, { status: 500 })
      }
      
      console.log('Verifying CAPTCHA with token:', captchaToken?.substring(0, 20) + '...')
      
      const recaptchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${recaptchaSecret}&response=${captchaToken}`,
      })
      const recaptchaData = await recaptchaRes.json()
      console.log('CAPTCHA verification result:', recaptchaData)
      
      if (!recaptchaData.success) {
        return NextResponse.json({ error: "CAPTCHA verification failed." }, { status: 403 })
      }
    } else {
      console.log('Development mode: Skipping CAPTCHA verification')
    }

    // Use OS temp directory for file storage (works in both local and production)
    const os = await import('os')
    const tempDir = os.tmpdir()
    const uploadsDir = path.join(tempDir, "insight-engine-uploads")
    await fs.mkdir(uploadsDir, { recursive: true })

    const jobId = randomUUID()
    const fileName = `ocr-extracted-${jobId}.txt`
    const filePath = path.join(uploadsDir, fileName)
console.log("filePath================",filePath)
    // Write the extracted text to a temporary file
    await fs.writeFile(filePath, text || 'dummy text', 'utf-8')

    // Create job record
    const job: Job = {
      id: jobId,
      status: "pending",
      filePath,
      mimeType: "text/plain",
      email,
      marketingOptIn,
      createdAt: new Date(),
    }
    // const fileBuffer = Buffer.from(await file.arrayBuffer())
    // const jobId = randomUUID()
    // const filePath = path.join(uploadsDir, `${jobId}-${file.name}`)
    // await fs.writeFile(filePath, fileBuffer)

    // const job: Job = {
    //   id: jobId,
    //   status: "pending",
    //   filePath,
    //   mimeType: file.type,
    //   email,
    //   marketingOptIn,
    //   createdAt: new Date(),
    // }
    try {
      await createJob(job)
      console.log('Job created successfully:', jobId)
      
      // Start the analysis in the background (do not await it)
      runAnalysis(jobId)

      // Immediately respond to the client
      return NextResponse.json({ message: "Analysis started.", jobId }, { status: 202 })
    } catch (dbError) {
      console.error('Failed to create job in database:', dbError)
      // Clean up the file if job creation failed
      try {
        await fs.unlink(filePath)
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError)
      }
      return NextResponse.json({ error: "Failed to create job. Please try again." }, { status: 500 })
    }
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
