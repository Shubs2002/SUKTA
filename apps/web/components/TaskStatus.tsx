"use client";

import { useQuery } from "@tanstack/react-query";

interface Task {
  id: string;
  url: string;
  question: string;
  status: "queued" | "processing" | "completed" | "failed";
  answer: string | null;
  createdAt: string;
}

interface TaskStatusProps {
  taskId: string;
}

export function TaskStatus({ taskId }: TaskStatusProps) {
  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:4000/api/task/${taskId}`);
      if (!response.ok) throw new Error("Failed to fetch task");
      return response.json();
    },
    refetchInterval: (query) => {
      const task = query.state.data;
      return task?.status === "queued" || task?.status === "processing"
        ? 2000
        : false;
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading task...</div>;
  }

  if (!task) {
    return <div className="text-center py-8 text-red-600">Task not found</div>;
  }

  const statusColors = {
    queued: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Task Status</h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              statusColors[task.status]
            }`}
          >
            {task.status.toUpperCase()}
          </span>
        </div>
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">URL:</span>{" "}
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {task.url}
            </a>
          </p>
          <p>
            <span className="font-medium">Question:</span> {task.question}
          </p>
        </div>
      </div>

      {task.status === "completed" && task.answer && (
        <div className="border rounded-lg p-4 bg-green-50">
          <h3 className="font-semibold mb-2">AI Answer</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{task.answer}</p>
        </div>
      )}

      {task.status === "failed" && task.answer && (
        <div className="border rounded-lg p-4 bg-red-50">
          <h3 className="font-semibold mb-2">Error</h3>
          <p className="text-red-700">{task.answer}</p>
        </div>
      )}

      {(task.status === "queued" || task.status === "processing") && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">
            {task.status === "queued"
              ? "Waiting in queue..."
              : "Processing your request..."}
          </p>
        </div>
      )}
    </div>
  );
}
