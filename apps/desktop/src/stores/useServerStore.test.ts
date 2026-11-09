import { describe, it, expect, beforeEach } from 'vitest';
import { useServerStore, extractInviteCode } from './useServerStore';

describe('useServerStore & extractInviteCode', () => {
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

  it('should extract invite code from plain string, query URL, and path URL', () => {
    expect(extractInviteCode('a1b2c3d4')).toBe('a1b2c3d4');
    expect(extractInviteCode('http://localhost:1420/?invite=a1b2c3d4')).toBe('a1b2c3d4');
    expect(extractInviteCode('https://pulse.app/invite/xyz98765')).toBe('xyz98765');
  });

  it('should update member presence status in store', () => {
    useServerStore.setState({
      members: [
        {
          id: 'm1',
          userId: 'u1',
          username: 'taocochoi223',
          displayName: 'Trí',
          status: 0,
          isOwner: true,
          joinedAt: new Date().toISOString(),
        },
      ],
    });

    useServerStore.getState().updateMemberPresence('u1', 1);
    expect(useServerStore.getState().members[0].status).toBe(1);
  });
});
