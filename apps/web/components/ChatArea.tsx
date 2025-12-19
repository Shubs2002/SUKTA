"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { ChatSession } from "../app/page";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "pending" | "completed" | "failed";
  questionId?: string;
}

interface ChatAreaProps {
  session: ChatSession | null;
  onSessionCreated: (session: ChatSession) => void;
  onSessionUpdated: (id: string, updates: Partial<ChatSession>) => void;
  onMenuClick?: () => void;
}

// Use window location in production if NEXT_PUBLIC_API_URL not set
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL}/api`;
  }
  // In browser, check if we're on localhost
  if (typeof window !== "undefined") {
    const isLocalhost = window.location.hostname === "localhost";
    if (!isLocalhost) {
      // Production: assume API is at same domain with /api or use Railway pattern
      // You can also hardcode your Railway API URL here as fallback
      return `${window.location.protocol}//${window.location.hostname.replace("web", "api")}/api`;
    }
  }
  return "http://localhost:4000/api";
};

const API_URL = getApiUrl();

export function ChatArea({
  session,
  onSessionCreated,
  onSessionUpdated,
  onMenuClick,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reset messages when session changes or is cleared
  useEffect(() => {
    setPendingQuestionId(null);
    
    if (!session) {
      // New chat - clear messages
      setMessages([]);
    } else if (session.status === "ready") {
      // Switching to an existing ready session
      setMessages([
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Ready to go! 🎯 Ask me anything about ${session.url}`,
        },
      ]);
    } else if (session.status === "scraping") {
      // Session still scraping
      setMessages([
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Analyzing website...",
          status: "pending",
        },
      ]);
    }
  }, [session?.id, session?.status]);

  // Poll session status using setInterval
  useEffect(() => {
    if (!session || session.status !== "scraping") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/session/${session.id}`);
        const data = await res.json();

        if (data.status === "ready" || data.status === "failed") {
          clearInterval(interval);
          onSessionUpdated(session.id, { status: data.status });

          setMessages((prev) =>
            prev.map((m) =>
              m.status === "pending"
                ? {
                    ...m,
                    content:
                      data.status === "ready"
                        ? "All set! 🚀 I've analyzed the website. Ask me anything about it!"
                        : `Failed to analyze: ${data.error || "Unknown error"}`,
                    status: data.status === "ready" ? "completed" : "failed",
                  }
                : m
            )
          );
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [session?.id, session?.status, onSessionUpdated]);

  // Poll question status using setInterval
  useEffect(() => {
    if (!pendingQuestionId || !session) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_URL}/session/${session.id}/question/${pendingQuestionId}`
        );
        const data = await res.json();

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.questionId === pendingQuestionId
                ? { ...msg, content: data.answer || "No answer", status: data.status }
                : msg
            )
          );
          setPendingQuestionId(null);
        }
      } catch (err) {
        console.error("Question polling error:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [pendingQuestionId, session?.id]);

  // Create session
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
    onSuccess: (data, url) => {
      const title = url.replace(/^https?:\/\//, "").split("/")[0];
      onSessionCreated({
        id: data.sessionId,
        url,
        title,
        status: "scraping",
        createdAt: new Date(),
      });
      setMessages([
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Analyzing website...",
          status: "pending",
        },
      ]);
    },
  });

  // Ask question
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
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Thinking...",
          status: "pending",
          questionId: data.questionId,
        },
      ]);
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

    if (!session) {
      const urlPattern = /^https?:\/\/.+/i;
      if (urlPattern.test(input.trim())) {
        setMessages([userMsg]);
        createSession.mutate(input.trim());
      } else {
        setMessages((prev) => [
          ...prev,
          userMsg,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Please enter a valid URL (e.g., https://example.com)",
          },
        ]);
      }
    } else if (session.status === "ready") {
      setMessages((prev) => [...prev, userMsg]);
      askQuestion.mutate(input);
    }

    setInput("");
  };

  const isLoading =
    createSession.isPending ||
    askQuestion.isPending ||
    session?.status === "scraping" ||
    !!pendingQuestionId;

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f1a]">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={onMenuClick}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors md:hidden"
            title="Open menu"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {session && (
            <>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.status === "ready" ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
              <span className="text-slate-300 text-sm truncate">{session.url}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {session && (
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded hidden sm:block">
              {session.status === "ready" ? "Ready" : "Analyzing..."}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className={`max-w-3xl mx-auto w-full py-4 sm:py-8 px-3 sm:px-4 ${messages.length === 0 && !session ? "flex-1 flex items-center justify-center" : ""}`}>
          {messages.length === 0 && !session && (
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 sm:mb-3">Welcome to Sukta</h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto mb-6 sm:mb-8 px-4">
                Enter any website URL and I'll analyze it for you. Then ask me anything about its content.
              </p>
              <div className="flex flex-wrap justify-center gap-2 px-4">
                {["https://example.com", "https://github.com"].map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setInput(url)}
                    className="px-3 sm:px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs sm:text-sm hover:bg-slate-700 transition-colors"
                  >
                    {url}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${message.role === "user" ? "bg-slate-700 rounded-2xl rounded-tr-md px-4 py-3" : ""}`}>
                  {message.role === "assistant" && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">S</span>
                      </div>
                      <div className="flex-1 pt-1">
                        {message.status === "pending" ? (
                          <div className="flex items-center gap-2 text-slate-300">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                            </div>
                            <span>{message.content}</span>
                          </div>
                        ) : (
                          <div className="text-slate-200 leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:text-white prose-headings:text-white">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {message.role === "user" && <div className="text-white">{message.content}</div>}
                </div>
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-3 sm:p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                !session
                  ? "Enter a website URL..."
                  : session.status === "scraping"
                    ? "Please wait..."
                    : "Ask me something..."
              }
              disabled={isLoading}
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl pl-3 sm:pl-4 pr-14 sm:pr-24 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-slate-500 disabled:opacity-50"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                title="Send message"
                className="p-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
