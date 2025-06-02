"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

export function OrgBrainModal() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setResponse(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/org-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch Org Brain response");
      }

      const data = await res.json();
      setResponse(data.analysis);
    } catch (err) {
      console.error("Org Brain query error:", err);
      setError("Failed to get a response from the Org Brain.");
      setResponse("Could not retrieve information.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
          <Sparkles className="w-4 h-4 mr-1" /> Org Brain
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Org Brain</DialogTitle>
          <DialogDescription className="text-gray-400">
            Ask questions about public channels and pinned documents.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            placeholder="e.g., What's the latest on Project Atlas?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuery();
              }
            }}
            className="col-span-3 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
          <Button onClick={handleQuery} disabled={isLoading || !query.trim()}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}
          </Button>
        </div>
        {response && (
          <div className="mt-4 p-4 bg-gray-700 rounded-md text-gray-200 whitespace-pre-wrap">
            {response}
          </div>
        )}
        {error && (
           <div className="mt-4 p-2 text-red-400 text-sm">
             {error}
           </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 