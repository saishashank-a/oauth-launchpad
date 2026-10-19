import DocPage from "@/components/DocPage";
import { readDocs } from "@/lib/markdown";

export const metadata = { title: "Agent work log" };

export default function AgentLog() {
  return <DocPage title="Agent work log" html={readDocs(["AGENT-LOG.md"])} />;
}
