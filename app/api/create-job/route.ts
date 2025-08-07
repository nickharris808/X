import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createJob, getJobs } from "@/lib/jobs"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const text = formData.get("text") as string | null
    const email = formData.get("email") as string | null
    const captchaToken = formData.get("captchaToken") as string | null
    const marketingOptIn = formData.get("marketingOptIn") === "true"
    const fileName = formData.get("fileName") as string | null
    const fileType = formData.get("fileType") as string | null
    
    if (!text || !email || !captchaToken) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    // Verify CAPTCHA
    const isDev = process.env.NODE_ENV === 'development'
    
    if (!isDev) {
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
    } else {
      console.log('Development mode: Skipping CAPTCHA verification')
    }

    // Check for recent duplicate jobs (same email, last 1 minute)
    const recentJobs = await getJobs()
    console.log('Recent jobs: inside create-job/route.ts',recentJobs)
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000)
    const duplicateJob = recentJobs.find(job => 
      job.email === email && 
      job.createdAt > oneMinuteAgo &&
      job.textContent === text
    )
    
    if (duplicateJob) {
      console.log(`Duplicate job found: ${duplicateJob.id}, status: ${duplicateJob.status}`)
      return NextResponse.json({ 
        success: true, 
        jobId: duplicateJob.id,
        message: "Duplicate job detected, using existing job",
        isDuplicate: true
      })
    }
    
    // Additional check: prevent multiple jobs with same text content in last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000)
    const veryRecentDuplicate = recentJobs.find(job => 
      job.textContent === text &&
      job.createdAt > thirtySecondsAgo
    )
    
    if (veryRecentDuplicate) {
      console.log(`Very recent duplicate job found: ${veryRecentDuplicate.id}, status: ${veryRecentDuplicate.status}`)
      return NextResponse.json({ 
        success: true, 
        jobId: veryRecentDuplicate.id,
        message: "Very recent duplicate job detected, using existing job",
        isDuplicate: true
      })
    }

    // Create job with text content
    const jobId = randomUUID()
    const job = {
      id: jobId,
      status: "pending" as const,
      filePath: `text-${jobId}`, // Virtual path for reference
      mimeType: "text/plain", // Always text/plain since we're storing OCR text
      email,
      marketingOptIn,
      textContent: text,
      createdAt: new Date(),
    }
    
    await createJob(job)
    console.log(`Job created with text content: ${jobId}, text length: ${text.length}`)

    return NextResponse.json({ 
      success: true, 
      jobId,
      message: "Job created successfully"
    })

  } catch (error: any) {
    console.error("Failed to create job:", error)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
} 