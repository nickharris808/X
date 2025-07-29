"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Upload, File, X, Menu, BarChart, Swords, Users } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import Report from "@/components/Report"
import ReCAPTCHA from "react-google-recaptcha"
import PdfOcrProcessor from "@/components/PdfOcrProcessor"

export default function InsightEngine() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState("")
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)
  const [finalReport, setFinalReport] = useState<any>(null)
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [ocrText, setOcrText] = useState<string | null>(null)
  const [ocrProgress, setOcrProgress] = useState<{ current: number; total: number; stage: string } | null>(null)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile)
      setShowModal(true)
      setIsOcrProcessing(true)
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      handleFileChange(droppedFile)
      e.dataTransfer.clearData()
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setShowModal(false)
    setIsOcrProcessing(false)
    setOcrText(null)
  }

  const handleOcrTextExtracted = (text: string) => {
    setOcrText(text)
    const currentText = text
    if (isProcessing && jobStatus === "parsing") {
      setTimeout(() => {
        handleOcrProcessingComplete(currentText)
      }, 50)
    }
  }
  const checkOcrComplete = async (text: string) => {
    
    try {
      // Retrieve data from sessionStorage
      const storedEmail = sessionStorage.getItem('analysisEmail')
      const storedCaptchaToken = sessionStorage.getItem('analysisCaptchaToken')
      const storedFile = sessionStorage.getItem('analysisFile')
     
      if (!storedEmail || !storedFile || !file) {
        throw new Error("Session data or file is missing")
      }
      
      // In development mode, captchaToken might not be required
      const isDev = process.env.NODE_ENV === 'development'
      if (!isDev && !storedCaptchaToken) {
        throw new Error("CAPTCHA token is missing")
      }
      
      const formData = new FormData()
      formData.append("file", file)
      formData.append("email", storedEmail)
      if (storedCaptchaToken) {
        formData.append("captchaToken", storedCaptchaToken)
      }
      formData.append("marketingOptIn", "false")
      formData.append("text", text)
      const res = await fetch("/api/start-analysis", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || `Failed to start analysis (${res.status})`)
      }
      setJobId(data.jobId)
      pollJobStatus(data.jobId)
    } catch (err: any) {
      setIsProcessing(false)
      setJobError(err.message || "Failed to start analysis")
    }
  }
  const handleOcrProcessingComplete = async (text?: string) => {
    const currentText = text || ocrText
    setOcrText(currentText)
    setIsOcrProcessing(false)
    setOcrProgress(null)
    setJobStatus("prompting")
    if(currentText && currentText.length > 0){
      checkOcrComplete(currentText)
    }
  }

  const handleOcrProgress = (progress: { current: number; total: number; stage: string }) => {
    setOcrProgress(progress)
  }

  const handleStartAnalysis = async () => {
    // For development, allow skipping captcha
    const isDev = process.env.NODE_ENV === 'development';
    if (email && (captchaToken || isDev) && file) {
      // Store data in sessionStorage before closing modal
      sessionStorage.setItem('analysisEmail', email)
      sessionStorage.setItem('analysisCaptchaToken', captchaToken || '')
      sessionStorage.setItem('analysisFile', JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size
      }))
      
      setShowModal(false)
      setIsProcessing(true)
      setJobError(null)
      setFinalReport(null)
      setJobStatus("parsing") // Start with parsing status
    }
  }



  const pollJobStatus = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    const poll = async () => {
      try {
        const res = await fetch(`/api/start-analysis?jobId=${jobId}`)
        const data = await res.json()
        setJobStatus(data.status)
        setJobError(data.error)
        if (data.status === "complete" && data.finalReport) {
          setFinalReport(data.finalReport)
          setIsProcessing(false)
          clearInterval(pollingRef.current as NodeJS.Timeout)
          // Clean up sessionStorage
          sessionStorage.removeItem('analysisEmail')
          sessionStorage.removeItem('analysisCaptchaToken')
          sessionStorage.removeItem('analysisFile')
        } else if (data.status === "error") {
          setIsProcessing(false)
          clearInterval(pollingRef.current as NodeJS.Timeout)
          // Clean up sessionStorage
          sessionStorage.removeItem('analysisEmail')
          sessionStorage.removeItem('analysisCaptchaToken')
          sessionStorage.removeItem('analysisFile')
        }
      } catch (err: any) {
        setJobError("Failed to fetch job status")
        setIsProcessing(false)
        clearInterval(pollingRef.current as NodeJS.Timeout)
        // Clean up sessionStorage
        sessionStorage.removeItem('analysisEmail')
        sessionStorage.removeItem('analysisCaptchaToken')
        sessionStorage.removeItem('analysisFile')
      }
    }
    poll()
    pollingRef.current = setInterval(poll, 5000)
  }

  const handleScrollToUpload = () => {
    document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" })
  }

  if (finalReport) {
    return <Report report={finalReport} />
  }

  if (isProcessing) {
    return (
      <ProcessingPage
        userEmail={email}
        jobStatus={jobStatus}
        jobError={jobError}
        ocrProgress={ocrProgress}
        fileType={file?.type}
      />
    )
  }

  const navLinks = [
    { name: "Portfolio", href: "https://www.xcellerantventures.com/portfolio-companies/" },
    { name: "Team", href: "https://www.xcellerantventures.com/team/" },
    { name: "About", href: "https://www.xcellerantventures.com/about/" },
    { name: "Invest", href: "https://www.xcellerantventures.com/invest-in-xcellerant/" },
    { name: "News", href: "https://www.xcellerantventures.com/news/" },
    { name: "Contact", href: "https://www.xcellerantventures.com/contact-xcellerant/" },
  ]

  const analysisPillars = [
    {
      icon: <BarChart className="h-10 w-10 text-brand-green" />,
      title: "Market & TAM Analysis",
      description:
        "Instantly sizes your market opportunity, referencing real-world data to validate your TAM, SAM, and SOM.",
    },
    {
      icon: <Swords className="h-10 w-10 text-brand-green" />,
      title: "Competitive Landscape",
      description:
        "Identifies direct and indirect competitors, analyzing their funding, market position, and key differentiators.",
    },
    {
      icon: <Users className="h-10 w-10 text-brand-green" />,
      title: "Team & Execution Risk",
      description:
        "Assesses founder experience and background against your industry, highlighting strengths and potential risks.",
    },
  ]

  return (
    <div className="bg-white min-h-screen text-[#1D1D1D] font-sans">
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm z-20 border-b">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/logo.png" alt="Xcellerant Ventures Logo" width={190} height={52} />
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-brand-green transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-white p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <span className="text-lg font-bold">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <nav className="flex flex-col space-y-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-lg font-medium text-gray-700 hover:text-brand-green transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20 md:py-28 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Instant Pitch Deck Analysis.
              <br />
              <span className="text-brand-green">A Glimpse of Our AI Evaluation.</span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg text-gray-600">
              This is a preview of our full due diligence process. Upload your deck to see how our Insight Engine
              analyzes key metrics against our investment thesis.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-brand-green hover:bg-brand-green-light text-white"
                onClick={handleScrollToUpload}
              >
                Upload Deck & Analyze
              </Button>
              <Link href="/report-example" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-gray-300 hover:border-brand-green hover:bg-green-50 transition-colors bg-transparent"
                >
                  View Example Report
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Analysis Pillars Section */}
        <section className="bg-white py-20 md:py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Instant Diligence, Deconstructed</h2>
              <p className="mt-4 text-lg text-gray-600">
                Our AI doesn't just read your deck—it analyzes it across the key vectors that determine success.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-10 text-center">
              {analysisPillars.map((pillar) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true, amount: 0.5 }}
                  className="flex flex-col items-center"
                >
                  {pillar.icon}
                  <h3 className="mt-5 text-2xl font-bold">{pillar.title}</h3>
                  <p className="mt-2 text-gray-600">{pillar.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <section id="upload-section" className="bg-gray-50 py-20 md:py-24">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="max-w-2xl mx-auto text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold">Activate Your AI Analyst</h2>
              <p className="mt-4 text-lg text-gray-600">
                PitchBook gives you a library. Consultants give you a bill. We give you an AI Analyst. Ingest any pitch
                deck. Get the institutional-grade diligence you need to win the deal. Instantly.
              </p>
              <div className="mt-10">
                {!file ? (
                  <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`relative p-10 border-2 border-dashed rounded-xl transition-all duration-300 bg-white ${
                      isDragging ? "border-brand-green bg-green-50" : "border-gray-300"
                    }`}
                  >
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                      accept=".pdf,.docx"
                    />
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <Upload
                        className={`h-12 w-12 transition-colors ${isDragging ? "text-brand-green" : "text-gray-400"}`}
                      />
                      <div className="text-gray-600">
                        <span className="font-semibold text-brand-green cursor-pointer">Click to Upload</span>
                        <span> or Drag and Drop</span>
                      </div>
                      <p className="text-sm text-gray-500">PDF, DOCX</p>
                    </div>
                  </div>
                ) : isOcrProcessing ? (
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Processing PDF with OCR</h3>
                    <PdfOcrProcessor
                      file={file}
                      onTextExtracted={handleOcrTextExtracted}
                      onProcessingComplete={handleOcrProcessingComplete}
                      onProgress={handleOcrProgress}
                    />
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between text-left">
                    <div className="flex items-center space-x-3">
                      <File className="h-6 w-6 text-brand-green" />
                      <span className="font-medium">{file?.name}</span>
                    </div>
                    <button onClick={handleRemoveFile} className="p-1 rounded-full hover:bg-gray-100">
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="py-20 md:py-24">
          <div className="container mx-auto px-6 max-w-5xl">
            <h2 className="text-center text-3xl md:text-4xl font-bold mb-12">The Old Playbook is Obsolete</h2>
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 text-left">
              <div className="border-l-4 border-red-300 pl-6">
                <h3 className="text-2xl font-semibold mb-4">The Old Way</h3>
                <p className="text-gray-700 leading-relaxed">
                  <span className="font-bold">Static Data & High Walls</span>
                  <br />
                  Pay $20k+ for access to static databases that require hours of manual filtering. The data is a
                  commodity; the insight is your burden.
                </p>
              </div>
              <div className="border-l-4 border-brand-green pl-6">
                <h3 className="text-2xl font-semibold mb-4">The New Way</h3>
                <p className="text-gray-700 leading-relaxed">
                  <span className="font-bold">Dynamic Intelligence on Command</span>
                  <br />
                  Get instant, synthesized analysis on any deal. Our AI does the work, connecting the dots to deliver
                  actionable insights, not just data points.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-50 border-t">
        <div className="container mx-auto px-6 py-8 text-center">
          <p className="text-xs text-gray-500 max-w-4xl mx-auto">
            The information herein is not complete and is subject to change. We may not sell securities of the Jetstream
            Venture Fund until the Fund’s registration statement filed with the Securities and Exchange Commission is
            effective. This post is not an offer to sell these securities and is not soliciting an offer to buy these
            securities in any state where the offer or sale is not permitted. This post is not an offering, which can
            only be made by a prospectus once the Fund’s registration statement has become effective. Investors should
            consider the Fund’s investment objectives, risks, charges and expenses carefully before investing. The
            Fund’s prospectus contains this and additional information about the Fund and can be obtained by calling{" "}
            <a href="tel:1-888-577-7987" className="font-semibold text-brand-green hover:underline">
              1-888-577-7987
            </a>{" "}
            or by emailing{" "}
            <a href="mailto:support@sweaterventures.com" className="font-semibold text-brand-green hover:underline">
              support@sweaterventures.com
            </a>
            . The Fund’s prospectus should be read carefully before investing.
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-center">Start Your Analysis</h2>
              <div className="space-y-6 mt-6">
                <Input
                  type="email"
                  placeholder="name@firm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-brand-green focus:border-brand-green"
                />
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    I agree to receive occasional updates from Xcellerant Ventures.
                  </label>
                </div>
                {/* CAPTCHA - Optional for demo */}
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-md">
                  <ReCAPTCHA
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                    onChange={(token: string | null) => setCaptchaToken(token)}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  CAPTCHA is required for security. Please complete it to continue.
                </p>
                <Button
                  onClick={handleStartAnalysis}
                  disabled={!email || (!captchaToken && process.env.NODE_ENV !== 'development') || !file}
                  className="w-full bg-brand-green hover:bg-brand-green-light text-white font-bold py-3 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Start Analysis
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProcessingPage({ 
  userEmail, 
  jobStatus, 
  jobError, 
  ocrProgress,
  fileType
}: { 
  userEmail: string, 
  jobStatus: string | null, 
  jobError: string | null,
  ocrProgress?: { current: number; total: number; stage: string } | null,
  fileType?: string
}) {
  const statusSteps = [
    { name: "Parsing Document", key: "parsing" },
    { name: "Generating Research Plan", key: "prompting" },
    { name: "Conducting Deep Research", key: "researching" },
    { name: "Synthesizing Final Report", key: "synthesizing" },
    { name: "Complete", key: "complete" },
  ]
  
  // Determine current step - if jobStatus is null, we're in parsing phase
  const currentStep = jobStatus ? statusSteps.findIndex(s => s.key === jobStatus) : 0

  return (
    <div className="bg-[#F4F4F4] min-h-screen flex flex-col items-center justify-center text-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <LoaderIcon className="h-16 w-16 text-gray-400 mx-auto animate-pulse" />
        <h2 className="mt-8 text-3xl font-bold text-[#1D1D1D]">Analyzing Your Document...</h2>
        <div className="mt-8 space-y-4 text-left">
          {statusSteps.slice(0, -1).map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="flex items-center space-x-4"
            >
              <div>{
                currentStep > index ? <CheckIcon className="h-6 w-6 text-brand-green" /> :
                currentStep === index ? <LoaderIcon className="h-6 w-6 text-gray-500 animate-spin" /> :
                <div className="h-6 w-6 rounded-full bg-gray-300" />
              }</div>
              <div className="flex-1">
                <p className={`text-lg ${currentStep === index ? "font-bold" : ""} ${currentStep < index ? "text-gray-500" : "text-[#1D1D1D]"}`}>
                  {item.name}
                </p>
                {currentStep === index && item.key === "parsing" && (
                  <div className="mt-2">
                    {ocrProgress && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(ocrProgress.current / ocrProgress.total) * 100}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{ocrProgress.stage}</p>
                      </>
                    )} 
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        {jobError && <p className="mt-6 text-red-600 font-bold">{jobError}</p>}
        <p className="mt-12 text-gray-600">
          Your report is being generated. This typically takes <span className="font-bold text-[#1D1D1D]">5-10 minutes</span>. Please keep this tab open to see the results.<br />
          We will also send a link to <span className="font-bold text-[#1D1D1D]">{userEmail}</span> as soon as it's ready.
        </p>
        <Link href="/report-example">
          <Button className="mt-8 bg-brand-green hover:bg-brand-green-light text-white">View Example Report</Button>
        </Link>
      </motion.div>
    </div>
  )
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m7.8 16.2-2.9 2.9" />
      <path d="M6 12H2" />
      <path d="m7.8 7.8-2.9-2.9" />
    </svg>
  )
}
