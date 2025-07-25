"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Download, Share2, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { Bar, XAxis, YAxis, CartesianGrid, BarChart as RechartsBarChart } from "recharts"

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    compactDisplay: "short",
  }).format(value)
}

function InsightScoreCircle({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference
  const scoreColor = score > 75 ? "text-green-500" : score > 50 ? "text-yellow-500" : "text-red-500"

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <svg className="absolute w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-gray-200"
          strokeWidth="10"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <motion.circle
          className={scoreColor}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          transform="rotate(-90 50 50)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span className={`text-4xl font-bold ${scoreColor}`}>{score}</span>
    </div>
  )
}

export default function Report({ report }: { report: any }) {
  const [highlightedSource, setHighlightedSource] = useState<number | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [copyStatus, setCopyStatus] = useState("")
  const pdfHeight = 297 // A4 height in mm

  const handleShare = async () => {
    if (navigator.share && report) {
      try {
        await navigator.share({
          title: `Investment Analysis: ${report.companyName}`,
          text: `Check out this investment analysis for ${report.companyName}.`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Web Share API failed, falling back to clipboard:", error)
        navigator.clipboard.writeText(window.location.href)
        setCopyStatus("Link Copied!")
        setTimeout(() => setCopyStatus(""), 2000)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopyStatus("Link Copied!")
      setTimeout(() => setCopyStatus(""), 2000)
    }
  }

  const handleDownloadPDF = () => {
    if (!reportRef.current || !report) return
    setIsDownloading(true)
    const input = reportRef.current
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      const ratio = canvasWidth / canvasHeight
      const width = pdfWidth
      const height = width / ratio
      let position = 0
      let heightLeft = height
      pdf.addImage(imgData, "PNG", 0, position, width, height)
      heightLeft -= pdfHeight
      while (heightLeft > 0) {
        position = heightLeft - height
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, width, height)
        heightLeft -= pdfHeight
      }
      pdf.save(`Investment-Analysis-${report.companyName.replace(/ /g, "-")}.pdf`)
      setIsDownloading(false)
    })
  }

  const handleSourceClick = (id: number) => {
    const element = document.getElementById(`source-${id}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      setHighlightedSource(id)
      setTimeout(() => setHighlightedSource(null), 2000)
    }
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-brand-green" />
      </div>
    )
  }

  return (
    <div className="bg-gray-50 text-[#1D1D1D] font-sans">
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm z-20 border-b">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/logo.png" alt="Xcellerant Ventures Logo" width={32} height={32} />
            <span className="text-xl font-bold">Xcellerant Ventures</span>
          </Link>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="relative flex items-center">
              <Button
                variant="outline"
                className="border-brand-green text-brand-green hover:bg-green-50 hover:text-brand-green bg-transparent"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <AnimatePresence>
                {copyStatus && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded-md"
                  >
                    {copyStatus}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <Button
              className="bg-brand-green hover:bg-brand-green-light text-white"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">{isDownloading ? "Downloading..." : "Download PDF"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main ref={reportRef} className="container mx-auto px-6 py-12">
        <div className="bg-gray-100 p-4 rounded-lg mb-8 text-xs text-gray-600">
          <strong>Disclaimer:</strong> This is an AI-generated report. The information herein is for illustrative purposes only and should not be considered investment advice.
        </div>

        <h1 className="text-4xl font-bold text-brand-green">Investment Analysis: {report.companyName}</h1>
        <p className="mt-2 text-lg text-gray-600">Generated on {new Date().toLocaleDateString()}</p>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{report.summary}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Valuation Estimate</CardTitle>
                <CardDescription>{report.valuation.narrative}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center text-center">
                <div className="text-4xl font-bold text-brand-green">
                  {formatCurrency(report.valuation.low, report.valuation.currency)} -{" "}
                  {formatCurrency(report.valuation.high, report.valuation.currency)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="flex flex-col items-center justify-center">
            <CardHeader className="text-center">
              <CardTitle>Insight Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center flex-grow">
              <InsightScoreCircle score={report.insightScore.score} />
              <p className="mt-4 text-center text-gray-600 max-w-xs">{report.insightScore.rationale}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Market Analysis</CardTitle>
              <CardDescription>{report.marketAnalysis.narrative}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  value: { label: "Value (in Billions)", color: "hsl(var(--chart-1))" },
                }}
                className="h-[250px] w-full"
              >
                <RechartsBarChart
                  data={report.marketAnalysis.marketSize}
                  margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="metric" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(value) => `$${value}B`} tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                </RechartsBarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="text-3xl font-bold text-brand-dark mb-4">SWOT Analysis</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-800">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-green-700 space-y-2">
                  {report.swotAnalysis.strengths.map((item: any) => (
                    <li key={item.point}>
                      {item.point}
                      {item.source_ids.map((id: number) => (
                        <sup
                          key={id}
                          onClick={() => handleSourceClick(id)}
                          className="text-brand-green font-bold cursor-pointer hover:underline ml-1"
                        >
                          [{id}]
                        </sup>
                      ))}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-red-800">Weaknesses</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-red-700 space-y-2">
                  {report.swotAnalysis.weaknesses.map((item: any) => (
                    <li key={item.point}>{item.point}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-800">Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-blue-700 space-y-2">
                  {report.swotAnalysis.opportunities.map((item: any) => (
                    <li key={item.point}>
                      {item.point}
                      {item.source_ids.map((id: number) => (
                        <sup
                          key={id}
                          onClick={() => handleSourceClick(id)}
                          className="text-brand-green font-bold cursor-pointer hover:underline ml-1"
                        >
                          [{id}]
                        </sup>
                      ))}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-yellow-800">Threats</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside text-yellow-700 space-y-2">
                  {report.swotAnalysis.threats.map((item: any) => (
                    <li key={item.point}>
                      {item.point}
                      {item.source_ids.map((id: number) => (
                        <sup
                          key={id}
                          onClick={() => handleSourceClick(id)}
                          className="text-brand-green font-bold cursor-pointer hover:underline ml-1"
                        >
                          [{id}]
                        </sup>
                      ))}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Landscape</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="p-2 font-bold border-b">Competitor</th>
                    <th className="p-2 font-bold border-b">Funding</th>
                    <th className="p-2 font-bold border-b">Differentiator</th>
                  </tr>
                </thead>
                <tbody>
                  {report.competitorLandscape.map((c: any) => (
                    <tr key={c.competitorName} className="hover:bg-gray-50">
                      <td className="p-2 border-b">{c.competitorName}</td>
                      <td className="p-2 border-b">{c.funding}</td>
                      <td className="p-2 border-b">{c.keyDifferentiator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Team Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{report.teamAnalysis}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-3 text-gray-600">
                {report.sources.map((source: any) => (
                  <motion.li
                    key={source.id}
                    id={`source-${source.id}`}
                    animate={{
                      backgroundColor: highlightedSource === source.id ? "rgba(255, 255, 0, 0.3)" : "transparent",
                    }}
                    transition={{ duration: 0.5 }}
                    className="p-2 rounded-md"
                  >
                    {source.title}{" "}
                    <Link
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-green hover:underline"
                    >
                      view source
                    </Link>
                  </motion.li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 