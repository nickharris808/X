import { type NextRequest, NextResponse } from "next/server"
import { createJob, getJob, updateJob } from "@/lib/jobs"

export async function GET(req: NextRequest) {
  try {
    const testJobId = "test-" + Date.now()
    
    // Test creating a job
    const testJob = {
      id: testJobId,
      status: "pending" as const,
      filePath: "test.txt",
      mimeType: "text/plain",
      email: "test@example.com",
      marketingOptIn: false,
      textContent: "Test content",
      createdAt: new Date(),
    }
    
    console.log('Testing database operations...')
    
    // Create job
    await createJob(testJob)
    console.log('✅ Job created successfully')
    
    // Get job
    const retrievedJob = await getJob(testJobId)
    console.log('✅ Job retrieved successfully:', retrievedJob ? 'Found' : 'Not found')
    
    // Update job
    await updateJob(testJobId, { status: "parsing" })
    console.log('✅ Job updated successfully')
    
    // Get updated job
    const updatedJob = await getJob(testJobId)
    console.log('✅ Updated job retrieved:', updatedJob?.status)
    
    return NextResponse.json({ 
      success: true, 
      message: "Database operations working correctly",
      testJobId,
      retrievedJob: !!retrievedJob,
      updatedStatus: updatedJob?.status
    })
    
  } catch (error: any) {
    console.error("Database test failed:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
} 