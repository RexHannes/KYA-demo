import { DecisionEvidenceReport } from "@/components/DecisionEvidenceReport";
import { buildEvidenceReport } from "@/lib/demo-report";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const report = await buildEvidenceReport();
  return <DecisionEvidenceReport report={report} />;
}
