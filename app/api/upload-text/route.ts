import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const text = formData.get("text") as string | null
    const email = formData.get("email") as string | null
    const captchaToken = formData.get("captchaToken") as string | null
    const marketingOptIn = formData.get("marketingOptIn") === "true"
    const chunkIndex = parseInt(formData.get("chunkIndex") as string || "0")
    const totalChunks = parseInt(formData.get("totalChunks") as string || "1")
    const sessionId = formData.get("sessionId") as string || randomUUID()
    
    if (!text || !email || !captchaToken) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    // Create temporary directory
    const os = await import('os')
    const tempDir = os.tmpdir()
    const uploadsDir = path.join(tempDir, "insight-engine-uploads")
    await fs.mkdir(uploadsDir, { recursive: true })

    // Save text chunk to temporary storage
    const textFilePath = path.join(uploadsDir, `text-${sessionId}-${chunkIndex}.txt`)
    await fs.writeFile(textFilePath, text, 'utf-8')

    console.log(`Text chunk ${chunkIndex + 1}/${totalChunks} saved for session ${sessionId}`)

    // If this is the last chunk, combine all chunks
    if (chunkIndex === totalChunks - 1) {
      const combinedFilePath = path.join(uploadsDir, `combined-${sessionId}.txt`)
      let combinedText = ""
      
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(uploadsDir, `text-${sessionId}-${i}.txt`)
        const chunkText = await fs.readFile(chunkPath, 'utf-8')
        combinedText += chunkText
        
        // Clean up individual chunk files
        await fs.unlink(chunkPath)
      }
      
      await fs.writeFile(combinedFilePath, combinedText, 'utf-8')
      console.log(`All chunks combined for session ${sessionId}`)
      
      return NextResponse.json({ 
        success: true, 
        sessionId,
        isComplete: true,
        combinedFilePath
      })
    }

    return NextResponse.json({ 
      success: true, 
      sessionId,
      chunkIndex,
      totalChunks,
      isComplete: false
    })

  } catch (error: any) {
    console.error("Failed to upload text chunk:", error)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
} 