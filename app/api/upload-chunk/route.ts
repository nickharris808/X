import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { getJob, updateJob } from "@/lib/jobs"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const jobId = formData.get("jobId") as string
    const text = formData.get("text") as string
    const chunkIndex = parseInt(formData.get("chunkIndex") as string)
    const totalChunks = parseInt(formData.get("totalChunks") as string)
    
    if (!jobId || !text || chunkIndex === undefined || totalChunks === undefined) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }
    
    // Get the job to find the file path
    const job = await getJob(jobId)
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 })
    }
    
    // Append the chunk to the existing file
    await fs.appendFile(job.filePath, text, 'utf-8')
    
    console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded for job ${jobId}`)
    
    // If this is the last chunk, update job status to start processing
    if (chunkIndex === totalChunks - 1) {
      await updateJob(jobId, { status: "parsing" })
      console.log(`All chunks received for job ${jobId}, starting analysis`)
    }
    
    return NextResponse.json({ 
      success: true, 
      chunkIndex,
      totalChunks,
      isComplete: chunkIndex === totalChunks - 1
    })
    
  } catch (error: any) {
    console.error("Failed to upload chunk:", error)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
} 