/**
 * Dịch vụ Cầu Nối Pulse <-> Discord (Discord Webhook Bridge)
 * Giúp người dùng sử dụng Pulse siêu nhẹ (<40MB RAM) nhưng hiển thị trực tiếp Kênh liên kết Discord
 * ngay trên thanh bên của Pulse, đồng thời đồng bộ tin nhắn & trạng thái Phòng Họp sang Discord!
 */

const STORAGE_PREFIX = 'pulse_discord_webhook_';
const META_PREFIX = 'pulse_discord_meta_';

export interface DiscordWebhookMeta {
  url: string;
  name: string;
  discordChannelId?: string;
  discordGuildId?: string;
  pulseChannelId?: string;
  connectedAt: string;
}

export const discordBridge = {
  getWebhookUrl(serverId: string): string {
    if (typeof localStorage === 'undefined' || !serverId) return '';
    return localStorage.getItem(`${STORAGE_PREFIX}${serverId}`) || '';
  },

  getWebhookMeta(serverId: string): DiscordWebhookMeta | null {
    if (typeof localStorage === 'undefined' || !serverId) return null;
    const raw = localStorage.getItem(`${META_PREFIX}${serverId}`);
    if (raw) {
      try {
        return JSON.parse(raw) as DiscordWebhookMeta;
      } catch {
        // Ignore parse error
      }
    }
    const url = this.getWebhookUrl(serverId);
    if (!url) return null;
    return {
      url,
      name: 'discord-chung',
      connectedAt: new Date().toISOString(),
    };
  },

  setWebhookMeta(serverId: string, meta: DiscordWebhookMeta | null): void {
    if (typeof localStorage === 'undefined' || !serverId) return;
    if (!meta || !meta.url.trim()) {
      localStorage.removeItem(`${STORAGE_PREFIX}${serverId}`);
      localStorage.removeItem(`${META_PREFIX}${serverId}`);
    } else {
      localStorage.setItem(`${STORAGE_PREFIX}${serverId}`, meta.url.trim());
      localStorage.setItem(`${META_PREFIX}${serverId}`, JSON.stringify(meta));
    }
  },

  setWebhookUrl(serverId: string, url: string): void {
    if (typeof localStorage === 'undefined' || !serverId) return;
    const trimmed = url.trim();
    if (!trimmed) {
      localStorage.removeItem(`${STORAGE_PREFIX}${serverId}`);
      localStorage.removeItem(`${META_PREFIX}${serverId}`);
    } else {
      localStorage.setItem(`${STORAGE_PREFIX}${serverId}`, trimmed);
    }
  },

  hasWebhook(serverId?: string): boolean {
    if (!serverId) return false;
    return !!this.getWebhookUrl(serverId);
  },

  /**
   * Lấy thông tin thực tế của Kênh Discord từ Webhook URL (GET https://discord.com/api/webhooks/{id}/{token})
   */
  async inspectWebhook(webhookUrl: string): Promise<{
    ok: boolean;
    name: string;
    channelId?: string;
    guildId?: string;
  }> {
    const trimmed = webhookUrl.trim();
    if (!trimmed) return { ok: false, name: 'discord-bridge' };

    try {
      const res = await fetch(trimmed, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        const rawName = (data.name || 'discord-chung')
          .toLowerCase()
          .replace(/[^a-z0-9-_àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, '')
          .trim()
          .replace(/\s+/g, '-');
        return {
          ok: true,
          name: rawName ? `discord-${rawName}` : 'discord-chung',
          channelId: data.channel_id,
          guildId: data.guild_id,
        };
      }
    } catch {
      // Fallback if CORS blocks GET
    }
    return { ok: true, name: 'discord-chung' };
  },

  /**
   * Đồng bộ tin nhắn chat từ Pulse sang kênh Discord của nhóm
   */
  async relayChatMessage(params: {
    serverId: string;
    channelName: string;
    displayName: string;
    avatarUrl?: string | null;
    content: string;
    attachmentUrls?: string[];
  }): Promise<void> {
    const webhookUrl = this.getWebhookUrl(params.serverId);
    if (!webhookUrl) return;

    try {
      const body: Record<string, unknown> = {
        username: `${params.displayName} (qua Pulse • #${params.channelName})`,
        content: params.content || '',
      };

      if (params.avatarUrl && params.avatarUrl.startsWith('http')) {
        body.avatar_url = params.avatarUrl;
      }

      if (params.attachmentUrls && params.attachmentUrls.length > 0) {
        body.embeds = params.attachmentUrls.map((url) => ({
          color: 0x6366f1,
          description: `📎 [Tệp đính kèm từ Pulse](${url})`,
          image: { url },
        }));
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.warn('[DiscordBridge] Không thể chuyển tiếp tin nhắn sang Discord:', err);
    }
  },

  /**
   * Thông báo sang Discord khi người dùng trên Pulse vào hoặc rời Phòng Họp
   */
  async notifyVoicePresence(params: {
    serverId: string;
    serverName: string;
    channelName: string;
    displayName: string;
    avatarUrl?: string | null;
    action: 'join' | 'leave';
    inviteLink?: string;
  }): Promise<void> {
    const webhookUrl = this.getWebhookUrl(params.serverId);
    if (!webhookUrl) return;

    try {
      const isJoin = params.action === 'join';
      const body: Record<string, unknown> = {
        username: `${params.displayName} (Pulse Voice)`,
        embeds: [
          {
            color: isJoin ? 0x10b981 : 0xf43f5e,
            author: {
              name: isJoin
                ? `🔊 ${params.displayName} vừa vào phòng họp "${params.channelName}"`
                : `🔇 ${params.displayName} đã rời phòng họp "${params.channelName}"`,
              icon_url:
                params.avatarUrl && params.avatarUrl.startsWith('http')
                  ? params.avatarUrl
                  : undefined,
            },
            description: isJoin
              ? `Đang họp trực tiếp tại máy chủ **${params.serverName}** trên ứng dụng **Pulse**.\n${
                  params.inviteLink
                    ? `👉 **[Bấm vào đây để vào phòng họp cùng ${params.displayName}](${params.inviteLink})**`
                    : ''
                }`
              : `Đã kết thúc phiên họp tại phòng **${params.channelName}**.`,
            timestamp: new Date().toISOString(),
            footer: {
              text: 'Cầu nối trực tiếp Pulse ↔ Discord',
            },
          },
        ],
      };

      if (params.avatarUrl && params.avatarUrl.startsWith('http')) {
        body.avatar_url = params.avatarUrl;
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.warn('[DiscordBridge] Không thể gửi trạng thái phòng họp sang Discord:', err);
    }
  },

  /**
   * Gửi tin nhắn kiểm tra kết nối từ Pulse sang Discord
   */
  async sendTestPing(params: {
    webhookUrl: string;
    serverName: string;
    displayName: string;
    avatarUrl?: string | null;
    inviteLink: string;
  }): Promise<boolean> {
    try {
      const body: Record<string, unknown> = {
        username: `${params.displayName} (Pulse Bridge)`,
        embeds: [
          {
            color: 0x6366f1,
            title: `⚡ Đã kết nối Cầu Nối Pulse ↔ Discord thành công!`,
            description: `Từ bây giờ, khi **${params.displayName}** nhắn tin hoặc vào phòng họp trên **Pulse** (Máy chủ: **${params.serverName}**), thông báo sẽ tự động hiển thị trực tiếp tại kênh Discord này!\n\n🔗 **[Bấm vào đây để tham gia cùng trên Pulse](${params.inviteLink})**`,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      if (params.avatarUrl && params.avatarUrl.startsWith('http')) {
        body.avatar_url = params.avatarUrl;
      }

      const res = await fetch(params.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
