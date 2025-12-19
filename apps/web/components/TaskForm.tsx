"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

interface TaskFormProps {
  onTaskCreated: (taskId: string) => void;
}

export function TaskForm({ onTaskCreated }: TaskFormProps) {
  const [url, setUrl] = useState("");
  const [question, setQuestion] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: { url: string; question: string }) => {
      const response = await fetch("http://localhost:4000/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create task");
      return response.json();
    },
    onSuccess: (data) => {
      onTaskCreated(data.taskId);
      setUrl("");
      setQuestion("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ url, question });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Website URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Your Question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What is this website about?"
          required
          rows={3}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {mutation.isPending ? "Submitting..." : "Submit Question"}
      </button>
      {mutation.isError && (
        <p className="text-red-600 text-sm">Error: {mutation.error.message}</p>
      )}
    </form>
  );
}
