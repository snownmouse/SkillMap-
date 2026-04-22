import Database from 'better-sqlite3';

export class AbilityRepository {
  constructor(private db: Database.Database) {}

  findExistingAbility(treeId: string, skill: string): any {
    return this.db.prepare('SELECT id, confidence FROM user_abilities WHERE tree_id = ? AND skill = ?')
      .get(treeId, skill);
  }

  updateAbility(abilityId: string, confidence: string, nodeId: string) {
    this.db.prepare('UPDATE user_abilities SET confidence = ?, node_id = ?, discovered_at = datetime("now") WHERE id = ?')
      .run(confidence, nodeId, abilityId);
  }

  insertAbility(ability: { id: string; treeId: string; skill: string; confidence: string; nodeId: string }) {
    this.db.prepare(`
      INSERT INTO user_abilities (id, tree_id, skill, confidence, source, node_id)
      VALUES (?, ?, ?, ?, 'chat', ?)
    `).run(ability.id, ability.treeId, ability.skill, ability.confidence, ability.nodeId);
  }
}