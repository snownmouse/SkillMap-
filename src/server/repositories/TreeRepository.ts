import Database from 'better-sqlite3';

export class TreeRepository {
  constructor(private db: Database.Database) {}

  updateTreeData(treeId: string, treeData: any) {
    this.db.prepare('UPDATE trees SET tree_data = ?, updated_at = datetime("now") WHERE id = ?')
      .run(JSON.stringify(treeData), treeId);
  }

  getTreeData(treeId: string): any {
    const row = this.db.prepare('SELECT tree_data FROM trees WHERE id = ?').get(treeId) as any;
    return row ? JSON.parse(row.tree_data) : null;
  }
}