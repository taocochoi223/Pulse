import { describe, it, expect, beforeEach } from 'vitest';
import { useServerStore } from './useServerStore';

describe('useServerStore', () => {
  beforeEach(() => {
    useServerStore.setState({
      servers: [],
      activeServer: null,
      activeChannel: null,
      members: [],
      isLoading: false,
    });
  });

  it('should initialize with empty servers and null activeServer', () => {
    const state = useServerStore.getState();
    expect(state.servers).toEqual([]);
    expect(state.activeServer).toBeNull();
    expect(state.activeChannel).toBeNull();
  });

  it('should set active channel properly', async () => {
    const mockChannel = {
      id: 'channel-1',
      serverId: 'server-1',
      name: 'general',
      type: 1 as const,
      position: 0,
      createdAt: new Date().toISOString(),
    };

    await useServerStore.getState().setActiveChannel(mockChannel);
    expect(useServerStore.getState().activeChannel).toEqual(mockChannel);
  });
});
