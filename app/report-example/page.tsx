"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Report from "@/components/Report"

const scaleAIReportData = {
  companyName: "Scale AI",
  summary:
    "Scale AI has established itself as a market leader in the data labeling and annotation space, critical for training AI and machine learning models. With strong enterprise adoption and a significant moat built on its human-in-the-loop platform, it is well-positioned to capitalize on the exponential growth of the AI industry. Key risks involve increasing competition and the potential for commoditization of data labeling services.",
  insightScore: {
    score: 88,
    rationale:
      "High score driven by market leadership, strong funding, and alignment with the massive growth in AI. Deductions for operational intensity and emerging competition.",
  },
  valuation: {
    low: 7_000_000_000,
    high: 9_500_000_000,
    currency: "USD",
    narrative:
      "Valuation based on a 20-25x forward revenue multiple, benchmarked against recent high-growth AI infrastructure deals. The range reflects uncertainty in market conditions and competitive pressures.",
  },
  swotAnalysis: {
    strengths: [
      { point: "Market leader with strong brand recognition and a blue-chip client list.", source_ids: [1] },
      { point: "Advanced platform with a combination of software and a managed human workforce.", source_ids: [] },
      { point: "Significant venture funding, providing a long runway for growth and R&D.", source_ids: [3] },
    ],
    weaknesses: [
      { point: "High operational costs associated with its human workforce.", source_ids: [] },
      { point: "Potential for model improvements to reduce the need for large-scale human labeling.", source_ids: [2] },
    ],
    opportunities: [
      { point: "Expansion into new data modalities (e.g., video, audio, geospatial).", source_ids: [] },
      { point: "Growing demand for high-quality data for Generative AI and LLMs.", source_ids: [1] },
      { point: "Offering higher-level services like model validation and testing.", source_ids: [] },
    ],
    threats: [
      { point: "Intense competition from both established players (Appen) and startups (Labelbox).", source_ids: [3] },
      { point: "Commoditization of data labeling services driving down prices.", source_ids: [] },
      { point: "Development of fully automated, unsupervised learning techniques.", source_ids: [2] },
    ],
  },
  marketAnalysis: {
    narrative:
      "The global data annotation tools market is projected to reach $1.6 billion by 2025, growing at a CAGR of 27.1%. This growth is driven by the increasing adoption of AI/ML technologies across various industries, including automotive (for autonomous driving), healthcare, and retail.",
    marketSize: [
      { metric: "TAM", value: 1.6, year: 2025, source_ids: [1] },
      { metric: "SAM", value: 0.9, year: 2025, source_ids: [1] },
      { metric: "SOM", value: 0.35, year: 2025, source_ids: [] },
    ],
  },
  competitorLandscape: [
    {
      competitorName: "Appen",
      funding: "Publicly Traded",
      keyDifferentiator: "Large, global crowd-based workforce.",
      source_ids: [3],
    },
    {
      competitorName: "Labelbox",
      funding: "$189M",
      keyDifferentiator: "Focus on collaborative, software-centric data labeling.",
      source_ids: [3],
    },
    {
      competitorName: "Sama",
      funding: "$87M",
      keyDifferentiator: "Ethical AI supply chain and focus on social impact.",
      source_ids: [],
    },
  ],
  teamAnalysis:
    "Founded by Alexandr Wang and Lucy Guo, Scale AI benefits from a visionary leadership team with strong technical backgrounds. Wang, a prodigy in the AI space, has driven the company's technical strategy, while Guo's product vision was instrumental in its early growth. The executive team includes veterans from major tech companies, providing a solid foundation for enterprise scaling.",
  sources: [
    { id: 1, title: "Data Annotation Tools Market Report, MarketsandMarkets, 2023", url: "#" },
    { id: 2, title: "The State of AI Report, 2023", url: "#" },
    { id: 3, title: "Forbes AI 50 2023: The Most Promising Artificial Intelligence Companies", url: "#" },
  ],
}

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    compactDisplay: "short",
  }).format(value)
}

const InsightScoreCircle = ({ score }: { score: number }) => {
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

export default function ReportPage() {
  return <Report report={scaleAIReportData} />
}
