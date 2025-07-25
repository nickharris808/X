import { ObjectId, MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/insight-engine"
const dbName = process.env.MONGODB_DB || "insight-engine"

let client: MongoClient | null = null

async function getClient() {
  if (!client) {
    client = new MongoClient(uri)
    await client.connect()
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
  deepResearchPrompt?: string
  finalReport?: any
  error?: string
  createdAt: Date
}

export async function createJob(job: Job) {
  const client = await getClient()
  const db = client.db(dbName)
  await db.collection("jobs").insertOne(job)
}

export async function getJob(id: string): Promise<Job | null> {
  const client = await getClient()
  const db = client.db(dbName)
  const result = await db.collection("jobs").findOne({ id })
  return result as Job | null
}

export async function updateJob(id: string, updates: Partial<Job>) {
  const client = await getClient()
  const db = client.db(dbName)
  await db.collection("jobs").updateOne({ id }, { $set: updates })
}

export async function getJobs(): Promise<Job[]> {
  const client = await getClient()
  const db = client.db(dbName)
  const results = await db.collection("jobs").find().toArray()
  // Map to Job type, remove _id
  return results.map(({ _id, ...rest }) => rest as Job)
}