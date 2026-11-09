import React, { useState } from 'react';
import { useServerStore } from '../../stores/useServerStore';
import { Plus, Compass } from 'lucide-react';

export const ServerSidebar: React.FC = () => {
  const { servers, activeServer, setActiveServer, createServer } = useServerStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    await createServer(newServerName.trim());
    setNewServerName('');
    setIsModalOpen(false);
  };

  return (
    <aside className="w-[72px] bg-pulse-bg border-r border-pulse-border flex flex-col items-center py-3 space-y-2 select-none z-20">
      {/* Home / Direct messages icon */}
      <button
        title="Direct Messages"
        className="w-12 h-12 rounded-2xl bg-pulse-card hover:bg-pulse-accent hover:rounded-xl transition-all duration-200 flex items-center justify-center text-pulse-muted hover:text-white"
      >
        <Compass className="w-6 h-6" />
      </button>

      <div className="w-8 h-[2px] bg-pulse-border rounded" />

      {/* Server list */}
      <div className="flex-1 w-full flex flex-col items-center space-y-2 overflow-y-auto no-scrollbar">
        {servers.map((server) => {
          const isActive = activeServer?.id === server.id;
          const initials = server.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Active pill indicator */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
                  isActive ? 'h-10' : 'h-2 group-hover:h-5'
                }`}
              />

              <button
                onClick={() => setActiveServer(server)}
                title={server.name}
                className={`w-12 h-12 flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                  isActive
                    ? 'rounded-xl bg-pulse-accent text-white shadow-lg shadow-pulse-accent/30'
                    : 'rounded-2xl bg-pulse-card text-pulse-text hover:rounded-xl hover:bg-pulse-hover hover:text-white'
                }`}
              >
                {server.iconUrl ? (
                  <img src={server.iconUrl} alt={server.name} className="w-full h-full object-cover rounded-[inherit]" />
                ) : (
                  <span>{initials}</span>
                )}
              </button>
            </div>
          );
        })}

        {/* Add Server Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          title="Create a Server"
          className="w-12 h-12 rounded-2xl bg-pulse-card hover:bg-emerald-600 hover:rounded-xl transition-all duration-200 flex items-center justify-center text-emerald-400 hover:text-white group"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
        </button>
      </div>

      {/* Create Server Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-pulse-card border border-pulse-border rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-xl font-bold mb-2 text-white">Create a Server</h3>
            <p className="text-sm text-pulse-muted mb-4">
              Your server is where you and your team chat and voice connect.
            </p>
            <form onSubmit={handleCreateServer}>
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-pulse-muted mb-2">
                  Server Name
                </label>
                <input
                  type="text"
                  required
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="e.g. Core Engineering"
                  className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-white placeholder-pulse-muted focus:outline-none focus:border-pulse-accent"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-pulse-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-pulse-accent hover:bg-pulse-accentHover text-white font-medium rounded-lg transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
