import Database from 'better-sqlite3';

export class ChatMessageRepository {
  constructor(private db: Database.Database) {}

  saveMessages(messages: Array<{ id: string; treeId: string; nodeId: string; role: string; content: string; metadata: string | null }>) {
    const insert = this.db.prepare(`
      INSERT INTO chat_messages (id, tree_id, node_id, role, content, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    this.db.transaction(() => {
      for (const msg of messages) {
        insert.run(msg.id, msg.treeId, msg.nodeId, msg.role, msg.content, msg.metadata);
      }
    })();
  }
}