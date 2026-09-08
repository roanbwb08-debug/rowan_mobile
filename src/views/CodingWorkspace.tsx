import React, { useState } from 'react';
import { Code2, Eye, Terminal } from 'lucide-react';

export const CodingWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'console'>('code');

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-zinc-50 border border-zinc-200 rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200 bg-white">
        {[
          { id: 'code', label: 'Code', icon: Code2 },
          { id: 'preview', label: 'Preview', icon: Eye },
          { id: 'console', label: 'Console', icon: Terminal },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'code' | 'preview' | 'console')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-r border-zinc-200 ${
              activeTab === tab.id
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-zinc-100 p-4">
        {activeTab === 'code' && (
          <div className="h-full bg-zinc-900 rounded-md text-zinc-300 p-4 font-mono text-sm overflow-auto whitespace-pre-wrap">
            {"// Rowan Coding Workspace ready.\n// Start prompting to generate code..."}
          </div>
        )}
        {activeTab === 'preview' && (
          <div className="h-full bg-white rounded-md border border-zinc-200 flex items-center justify-center text-zinc-400">
            Preview will render here.
          </div>
        )}
        {activeTab === 'console' && (
          <div className="h-full bg-black rounded-md text-green-400 p-4 font-mono text-sm overflow-auto whitespace-pre-wrap">
            {"> Initializing build environment...\n> Ready."}
          </div>
        )}
      </div>
    </div>
  );
};
