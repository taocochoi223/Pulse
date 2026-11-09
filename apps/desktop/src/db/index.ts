import Dexie, { type Table } from 'dexie';
import type { Message, Server, Channel } from '../types';

export class PulseDatabase extends Dexie {
  messages!: Table<Message, string>;
  servers!: Table<Server, string>;
  channels!: Table<Channel, string>;

  constructor() {
    super('PulseDatabase');
    this.version(1).stores({
      messages: 'id, channelId, createdAt',
      servers: 'id, name',
      channels: 'id, serverId, position',
    });
  }
}

export const db = new PulseDatabase();

