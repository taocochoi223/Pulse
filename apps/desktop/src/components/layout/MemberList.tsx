import React from 'react';
import { useServerStore } from '../../stores/useServerStore';

export const MemberList: React.FC = () => {
  const { activeServer } = useServerStore();

  if (!activeServer) return null;

  return (
    <aside className="w-56 bg-pulse-panel border-l border-pulse-border p-3 flex flex-col select-none overflow-y-auto">
      <div className="text-xs font-semibold text-pulse-muted uppercase tracking-wider px-2 mb-2">
        Members — {activeServer.memberCount || 1}
      </div>

      <div className="space-y-1">
        {/* Active owner / user item */}
        <div className="flex items-center space-x-2.5 px-2 py-1.5 rounded-lg hover:bg-pulse-hover/50 cursor-pointer transition">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-pulse-accent flex items-center justify-center font-bold text-xs text-white">
              O
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-pulse-panel" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-medium text-white truncate">Owner</div>
            <div className="text-[10px] text-emerald-400">Online</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

