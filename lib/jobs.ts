import { ObjectId, MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/insight-engine"
const dbName = process.env.MONGODB_DB || "insight-engine"

let client: MongoClient | null = null
let useInMemoryDB = false
const inMemoryJobs = new Map<string, Job>()

async function getClient() {
  if (!client) {
    try {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 30000, // 30 second timeout for Atlas
        connectTimeoutMS: 30000, // 30 second timeout
        socketTimeoutMS: 45000, // 45 second timeout
        maxPoolSize: 10,
        retryWrites: true,
        w: 'majority'
      })
      await client.connect()
      console.log('MongoDB Atlas connected successfully')
      useInMemoryDB = false
    } catch (error) {
      console.error('Failed to connect to MongoDB Atlas:', error)
      console.log('Falling back to in-memory database for development')
      useInMemoryDB = true
      client = null
    }
  }
  return client
}

export interface Job {
  id: string
  status: "pending" | "parsing" | "prompting" | "researching" | "synthesizing" | "complete" | "error"
  filePath: string
  mimeType: string
  email: string
  marketingOptIn: boolean
  textContent?: string
  deepResearchPrompt?: string
  finalReport?: any
  error?: string
  createdAt: Date
}

export async function createJob(job: Job) {
  if (useInMemoryDB) {
    inMemoryJobs.set(job.id, job)
    console.log('Job created in memory:', job.id)
    return
  }
  
  const client = await getClient()
  if (!client) return
  
  const db = client.db(dbName)
  await db.collection("jobs").insertOne(job)
}

export async function getJob(id: string): Promise<Job | null> {
  console.log('Getting=============', id)
  if (useInMemoryDB) {
    return inMemoryJobs.get(id) || null
  }
  
  const client = await getClient()
  if (!client) return null
  
  const db = client.db(dbName)
  const result = await db.collection("jobs").findOne({ id })
  return result as Job | null
}

export async function updateJob(id: string, updates: Partial<Job>) {
  if (useInMemoryDB) {
    const existingJob = inMemoryJobs.get(id)
    if (existingJob) {
      inMemoryJobs.set(id, { ...existingJob, ...updates })
      console.log('Job updated in memory:', id, updates)
    }
    return
  }
  
  const client = await getClient()
  if (!client) return
  
  const db = client.db(dbName)
  await db.collection("jobs").updateOne({ id }, { $set: updates })
}

export async function getJobs(): Promise<Job[]> {
  console.log('Getting jobs in jobs.ts=============',useInMemoryDB)
  if (useInMemoryDB) {
    return Array.from(inMemoryJobs.values())
  }
  
  const client = await getClient()
  if (!client) return []
  
  const db = client.db(dbName)
  const results = await db.collection("jobs").find().toArray()
  // Map to Job type, remove _id
  return results.map(({ _id, ...rest }) => rest as Job)
}