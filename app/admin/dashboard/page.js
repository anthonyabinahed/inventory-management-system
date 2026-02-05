"use client";

import { useState } from "react";
import { Users, BarChart3 } from "lucide-react";
import UsersManagement from "@/components/UsersManagement";
import { Analytics } from "@/components/Analytics";

const tabs = [
  {
    id: "users",
    title: "Users",
    icon: Users,
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
  },
];


export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

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
          {activeTab === "users" && <UsersManagement />}
          {activeTab === "analytics" && <Analytics />}
        </div>
      </div>
    </div>
  );
}
