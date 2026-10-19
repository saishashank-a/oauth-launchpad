import DocPage from "@/components/DocPage";
import { listDocsDir, readDocs } from "@/lib/markdown";

export const metadata = { title: "Setup notes" };

export default function Notes() {
  return <DocPage title="Setup notes" html={readDocs(listDocsDir("setup-notes"))} />;
}
