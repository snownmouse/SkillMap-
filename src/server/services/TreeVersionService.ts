import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';

export class TreeVersionService {
  constructor(private db: Database.Database) {}

  saveVersion(treeId: string, treeData: any, changeDescription?: string): any {
    const latestVersion = this.getLatestVersionNumber(treeId);
    const versionNumber = latestVersion + 1;
    const id = uuidv4();

    this.db.prepare(`
      INSERT INTO tree_versions (id, tree_id, version_number, tree_data, change_description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, treeId, versionNumber, JSON.stringify(treeData), changeDescription || null);

    return {
      id,
      treeId,
      versionNumber,
      changeDescription,
      createdAt: new Date().toISOString(),
    };
  }

  getVersions(treeId: string, limit = 20): any[] {
    return this.db.prepare(`
      SELECT id, tree_id, version_number, change_description, created_at
      FROM tree_versions
      WHERE tree_id = ?
      ORDER BY version_number DESC
      LIMIT ?
    `).all(treeId, limit) as any[];
  }

  getVersion(treeId: string, versionNumber: number): any {
    const row = this.db.prepare(`
      SELECT * FROM tree_versions
      WHERE tree_id = ? AND version_number = ?
    `).get(treeId, versionNumber) as any;

    if (!row) return null;
    return {
      id: row.id,
      treeId: row.tree_id,
      versionNumber: row.version_number,
      treeData: JSON.parse(row.tree_data),
      changeDescription: row.change_description,
      createdAt: row.created_at,
    };
  }

  restoreVersion(treeId: string, versionNumber: number): boolean {
    const version = this.getVersion(treeId, versionNumber);
    if (!version) return false;

    this.db.prepare(`
      UPDATE trees SET tree_data = ?, updated_at = datetime('now') WHERE id = ?
    `).run(JSON.stringify(version.treeData), treeId);

    return true;
  }

  private getLatestVersionNumber(treeId: string): number {
    const row = this.db.prepare(`
      SELECT MAX(version_number) as max_version FROM tree_versions WHERE tree_id = ?
    `).get(treeId) as any;
    return row?.max_version || 0;
  }

  getVersionCount(treeId: string): number {
    const row = this.db.prepare(`
      SELECT COUNT(*) as count FROM tree_versions WHERE tree_id = ?
    `).get(treeId) as any;
    return row?.count || 0;
  }
}
