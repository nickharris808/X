"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Report from "@/components/Report"

const scaleAIReportData = {
  companyName: "NeuroCure Therapeutics",
  summary:
    "NeuroCure Therapeutics is developing a novel small molecule drug candidate for the treatment of Alzheimer's disease, targeting a unique mechanism of action that addresses both amyloid plaques and neuroinflammation. With Phase II clinical trials showing promising results and a strong IP portfolio, the company is well-positioned to address the significant unmet medical need in neurodegenerative diseases. Key risks include regulatory hurdles and competition from established pharmaceutical companies.",
  insightScore: {
    score: 82,
    rationale:
      "High score driven by strong clinical data, significant market opportunity, and robust IP protection. Deductions for regulatory risks and competitive landscape in Alzheimer's treatment.",
  },
  valuation: {
    low: 2_500_000_000,
    high: 4_200_000_000,
    currency: "USD",
    narrative:
      "Valuation based on risk-adjusted NPV analysis, considering clinical trial success rates, regulatory approval probabilities, and market penetration scenarios. The range reflects uncertainty in clinical outcomes and competitive landscape.",
  },
  swotAnalysis: {
    strengths: [
      { point: "Novel mechanism of action with dual targeting of amyloid and inflammation pathways.", source_ids: [1] },
      { point: "Strong IP portfolio with composition of matter and method of use patents.", source_ids: [2] },
      { point: "Promising Phase II clinical data showing cognitive improvement and safety profile.", source_ids: [3] },
    ],
    weaknesses: [
      { point: "High development costs and long timeline to market approval.", source_ids: [] },
      { point: "Limited clinical experience with the novel mechanism of action.", source_ids: [4] },
    ],
    opportunities: [
      { point: "Expansion into other neurodegenerative diseases (Parkinson's, ALS).", source_ids: [1] },
      { point: "Partnership opportunities with major pharmaceutical companies.", source_ids: [5] },
      { point: "Potential for accelerated approval pathway given unmet medical need.", source_ids: [3] },
    ],
    threats: [
      { point: "Competition from established players like Biogen and Eli Lilly.", source_ids: [6] },
      { point: "Regulatory uncertainty around Alzheimer's disease drug approvals.", source_ids: [4] },
      { point: "Risk of clinical trial failures in Phase III studies.", source_ids: [7] },
    ],
  },
  marketAnalysis: {
    narrative:
      "The global Alzheimer's disease treatment market is projected to reach $8.9 billion by 2027, growing at a CAGR of 9.2%. This growth is driven by an aging population, increasing prevalence of Alzheimer's disease, and the significant unmet medical need for effective treatments.",
    marketSize: [
      { metric: "TAM", value: 8.9, year: 2027, source_ids: [1] },
      { metric: "SAM", value: 4.2, year: 2027, source_ids: [1] },
      { metric: "SOM", value: 0.8, year: 2027, source_ids: [] },
    ],
  },
  competitorLandscape: [
    {
      competitorName: "Biogen",
      funding: "Publicly Traded",
      keyDifferentiator: "Aduhelm approved, targeting amyloid plaques.",
      source_ids: [6],
    },
    {
      competitorName: "Eli Lilly",
      funding: "Publicly Traded",
      keyDifferentiator: "Donanemab in Phase III, anti-amyloid antibody.",
      source_ids: [6],
    },
    {
      competitorName: "Anavex Life Sciences",
      funding: "$150M",
      keyDifferentiator: "Sigma-1 receptor agonist, Phase III trials.",
      source_ids: [8],
    },
  ],
  teamAnalysis:
    "Founded by Dr. Sarah Chen and Dr. Michael Rodriguez, NeuroCure benefits from a leadership team with deep expertise in neuroscience and drug development. Dr. Chen brings 15+ years of experience in Alzheimer's research from leading academic institutions, while Dr. Rodriguez has successfully led multiple drug development programs through clinical trials. The executive team includes veterans from major pharmaceutical companies, providing strong foundation for regulatory and commercial success.",
  sources: [
    { id: 1, title: "Alzheimer's Disease Treatment Market Report, Grand View Research, 2023", url: "https://www.grandviewresearch.com/industry-analysis/alzheimers-disease-treatment-market" },
    { id: 2, title: "Patent Analysis: NeuroCure Therapeutics IP Portfolio, 2023", url: "https://patents.google.com/assignee/neurocure-therapeutics" },
    { id: 3, title: "Phase II Clinical Trial Results: NC-001 in Alzheimer's Disease, 2023", url: "https://clinicaltrials.gov/ct2/show/NCT12345678" },
    { id: 4, title: "FDA Guidance on Alzheimer's Disease Drug Development, 2023", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents" },
    { id: 5, title: "Pharmaceutical Partnership Trends in Neurodegenerative Diseases, 2023", url: "https://www.evaluate.com/vantage/articles/analysis/partnership-trends-neurodegenerative-diseases" },
    { id: 6, title: "Competitive Landscape: Alzheimer's Disease Therapeutics, IQVIA, 2023", url: "https://www.iqvia.com/insights/the-iqvia-institute/reports/competitive-landscape-alzheimers-disease" },
    { id: 7, title: "Clinical Trial Success Rates in Alzheimer's Disease, Nature Reviews Drug Discovery, 2023", url: "https://www.nature.com/articles/d41573-023-00001-1" },
    { id: 8, title: "Anavex Life Sciences Corporate Presentation, 2023", url: "https://www.anavex.com/investors/presentations" },
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
