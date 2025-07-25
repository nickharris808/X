import Report from "@/components/Report";
import { notFound } from "next/navigation";

interface ReportPageProps {
  params: { jobId: string };
}

// This must be an async function to await params if needed
export default async function ReportPage({ params }: ReportPageProps) {
  const { jobId } = params;

  // TODO: Fetch report data by jobId here
  // Example placeholder data:
  // const report = await fetchReportByJobId(jobId);
  const report = null; // Replace with real fetching logic

  if (!report) {
    // Optionally show a loading state or 404
    // return <div>Loading...</div>
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <Report report={report} />
    </div>
  );
} 