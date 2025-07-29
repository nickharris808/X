import { type NextRequest, NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const email = formData.get("email") as string | null
    const captchaToken = formData.get("captchaToken") as string | null
    const marketingOptIn = formData.get("marketingOptIn") === "true"
    
    if (!file || !email || !captchaToken) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
    }

    // Create temporary directory
    const os = await import('os')
    const tempDir = os.tmpdir()
    const uploadsDir = path.join(tempDir, "insight-engine-uploads")
    await fs.mkdir(uploadsDir, { recursive: true })

    // Save file to temporary storage
    const fileId = randomUUID()
    const filePath = path.join(uploadsDir, `${fileId}-${file.name}`)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, fileBuffer)

    console.log(`File saved to temporary storage: ${filePath}`)

    return NextResponse.json({ 
      success: true, 
      fileId,
      fileName: file.name,
      fileSize: file.size
    })

  } catch (error: any) {
    console.error("Failed to upload file:", error)
    return NextResponse.json({ error: "Internal server error." }, { status: 500 })
  }
} 