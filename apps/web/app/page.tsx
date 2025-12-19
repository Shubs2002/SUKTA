"use client";

import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { ChatArea } from "../components/ChatArea";

export interface ChatSession {
  id: string;
  url: string;
  title: string;
  status: "scraping" | "ready" | "failed";
  createdAt: Date;
}

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const addSession = (session: ChatSession) => {
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setSidebarOpen(false);
  };

  const updateSession = (id: string, updates: Partial<ChatSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const createNewChat = () => {
    setActiveSessionId(null);
    setSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#0a0f1a]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative z-30 h-full transition-transform duration-300 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={createNewChat}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <ChatArea
        session={activeSession}
        onSessionCreated={addSession}
        onSessionUpdated={updateSession}
        onMenuClick={() => setSidebarOpen(true)}
      />
    </div>
  );
}
