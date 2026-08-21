import Link from "next/link";
import { PromptEditor } from "@/components/PromptEditor";
export default function NewPromptPage(){return <div className="mx-auto max-w-7xl px-8 py-8"><Link href="/prompts" className="text-sm text-zinc-600 hover:underline">← Prompt Library</Link><h1 className="my-5 text-2xl font-semibold">Create prompt</h1><PromptEditor/></div>}
