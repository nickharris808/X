'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Report from '@/components/Report'

interface Job {
  id: string
  status: string
  email: string
  textContent?: string
  finalReport?: any
  createdAt: Date
}

export default function ReportPage() {
  const params = useParams()
  const jobId = params.jobId as string
  
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/jobs/${jobId}`)
        
        if (!response.ok) {
          throw new Error('Job not found')
        }
        
        const jobData = await response.json()
        setJob(jobData)
      } catch (err: any) {
        setError(err.message || 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    if (jobId) {
      fetchJob()
    }
  }, [jobId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <a 
            href="/" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back Home
          </a>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-600 mb-4">The requested report could not be found.</p>
          <a 
            href="/" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back Home
          </a>
        </div>
      </div>
    )
  }

  if (job.status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analysis Failed</h1>
          <p className="text-gray-600 mb-4">The analysis for this document encountered an error.</p>
          <a 
            href="/" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </a>
        </div>
      </div>
    )
  }

  if (job.status !== 'completed' && job.status !== 'complete') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analysis in Progress</h1>
          <p className="text-gray-600 mb-4">Your report is still being generated. Please check back later.</p>
          <p className="text-sm text-gray-500">Status: {job.status}</p>
        </div>
      </div>
    )
  }

  if (!job.finalReport) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-600 text-xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Ready</h1>
          <p className="text-gray-600 mb-4">The report is not yet available. Please try again later.</p>
          <a 
            href="/" 
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <a 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Home
          </a>
          <h1 className="text-3xl font-bold text-gray-900">Your Analysis Report</h1>
          <p className="text-gray-600 mt-2">
            Generated on {new Date(job.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        <Report report={job.finalReport} />
      </div>
    </div>
  )
} 