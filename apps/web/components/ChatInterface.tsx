"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "pending" | "completed" | "failed";
  questionId?: string;
}

interface Session {
  id: string;
  url: string;
  status: "scraping" | "ready" | "failed";
  error?: string;
}

interface Question {
  id: string;
  question: string;
  answer: string | null;
  status: "pending" | "processing" | "completed" | "failed";
}

const API_URL = "http://localhost:4000/api";

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll session status while scraping
  useQuery({
    queryKey: ["session", session?.id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/session/${session!.id}`);
      return res.json() as Promise<Session>;
    },
    enabled: !!session && session.status === "scraping",
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "ready" || data?.status === "failed") {
        setSession(data);
        if (data.status === "ready") {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: "Website loaded! What would you like to know about it?",
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: `Failed to load website: ${data.error || "Unknown error"}. Please try another URL.`,
            },
          ]);
          setSession(null);
        }
        return false;
      }
      return 2000;
    },
  });

  // Poll question status
  useQuery({
    queryKey: ["question", pendingQuestionId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/session/${session!.id}/question/${pendingQuestionId}`
      );
      return res.json() as Promise<Question>;
    },
    enabled: !!pendingQuestionId && !!session,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "completed" || data?.status === "failed") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.questionId === pendingQuestionId
              ? { ...msg, content: data.answer || "No answer", status: data.status }
              : msg
          )
        );
        setPendingQuestionId(null);
        return false;
      }
      return 1500;
    },
  });

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch(`${API_URL}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      return res.json();
    },
    onSuccess: (data) => {
      setSession({ id: data.sessionId, url: input, status: "scraping" });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Analyzing website... This may take a moment.",
          status: "pending",
        },
      ]);
    },
  });

  // Ask question mutation
  const askQuestion = useMutation({
    mutationFn: async (question: string) => {
      const res = await fetch(`${API_URL}/session/${session!.id}/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error("Failed to ask question");
      return res.json();
    },
    onSuccess: (data) => {
      const assistantMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Thinking...",
        status: "pending",
        questionId: data.questionId,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setPendingQuestionId(data.questionId);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);

    if (!session) {
      // First message - create session with URL
      const urlPattern = /^https?:\/\/.+/i;
      if (urlPattern.test(input.trim())) {
        createSession.mutate(input.trim());
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Please enter a valid URL starting with http:// or https://",
          },
        ]);
      }
    } else if (session.status === "ready") {
      // Ask question
      askQuestion.mutate(input);
    }

    setInput("");
  };

  const resetChat = () => {
    setMessages([]);
    setSession(null);
    setPendingQuestionId(null);
  };

  const isLoading =
    createSession.isPending ||
    askQuestion.isPending ||
    session?.status === "scraping" ||
    !!pendingQuestionId;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌐</div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Welcome to Sukta
            </h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Enter a website URL to get started. I'll analyze it and then you
              can ask any questions about its content.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-100"
              }`}
            >
              {message.status === "pending" ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>{message.content}</span>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 p-4">
        {session && (
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-sm text-slate-400">
              {session.status === "scraping" ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full" />
                  Analyzing: <span className="text-blue-400">{session.url}</span>
                </span>
              ) : (
                <>
                  Analyzing: <span className="text-blue-400">{session.url}</span>
                </>
              )}
            </span>
            <button
              onClick={resetChat}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              New URL
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              !session
                ? "Enter a website URL (e.g., https://example.com)"
                : session.status === "scraping"
                  ? "Please wait while I analyze the website..."
                  : "Ask a question about this website..."
            }
            disabled={isLoading}
            className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
