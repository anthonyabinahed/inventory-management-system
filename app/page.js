"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Package, ScanLine } from "lucide-react";
import { Overview } from "@/components/Overview";
import { Inventory } from "@/components/Inventory";
import { Scanner } from "@/components/Scanner";

const TAB_STORAGE_KEY = "inventory-active-tab";

const tabs = [
  {
    id: "overview",
    title: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "inventory",
    title: "Inventory",
    icon: Package,
  },
  {
    id: "scanner",
    title: "Scanner",
    icon: ScanLine,
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  useEffect(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    if (saved && tabs.some(t => t.id === saved)) {
      setActiveTab(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Tab Navigation */}
        <div
          className="grid rounded-xl bg-base-200 p-1 mb-4 sm:mb-6"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`flex cursor-pointer select-none items-center justify-center gap-1.5 sm:gap-2 rounded-lg py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "animate-opacity bg-base-100 shadow"
                    : "text-base-content/75 hover:text-base-content"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="size-4 sm:size-5" />
                <span className="hidden xs:inline sm:inline">{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="animate-opacity" key={activeTab}>
          {activeTab === "overview" && <Overview />}
          {activeTab === "inventory" && <Inventory />}
          {activeTab === "scanner" && <Scanner />}
        </div>
      </div>
    </div>
  );
}
