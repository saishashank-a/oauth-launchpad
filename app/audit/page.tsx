import DocPage from "@/components/DocPage";
import { readDocs } from "@/lib/markdown";

export const metadata = { title: "Fact-check audit" };

export default function Audit() {
  return <DocPage title="Fact-check audit" html={readDocs(["FACT-CHECK.md"])} />;
}
