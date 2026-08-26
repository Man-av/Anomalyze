import { AnalyzerApp } from "@/components/analyzer/AnalyzerApp";
import { AnalyzerProvider } from "@/components/analyzer/AnalyzerContext";

export default function Home() {
  return (
    <AnalyzerProvider>
      <AnalyzerApp />
    </AnalyzerProvider>
  );
}
