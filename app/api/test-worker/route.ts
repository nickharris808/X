import { type NextRequest, NextResponse } from "next/server"
import { runAnalysis } from "@/lib/worker"

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json()
    
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required." }, { status: 400 })
    }
    
    console.log(`[TEST] Testing worker with jobId: ${jobId}`)
    
    // Test the worker function
    await runAnalysis(jobId)
    
    return NextResponse.json({ message: "Worker test completed.", jobId }, { status: 200 })
  } catch (error: any) {
    console.error("Worker test failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 