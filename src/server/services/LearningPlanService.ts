import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';

export class LearningPlanService {
  constructor(private db: Database.Database) {}

  createPlan(treeId: string, userId: string, plan: {
    title: string;
    description?: string;
    focusNodeIds?: string[];
    weeklyHours?: number;
    dailyTasks?: Record<string, string[]>;
    startDate?: string;
    endDate?: string;
  }) {
    const id = uuidv4();
    const startDate = plan.startDate || new Date().toISOString().split('T')[0];

    this.db.prepare(`
      INSERT INTO learning_plans (id, tree_id, user_id, title, description, focus_node_ids, weekly_hours, daily_tasks, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      treeId,
      userId,
      plan.title,
      plan.description || null,
      JSON.stringify(plan.focusNodeIds || []),
      plan.weeklyHours || 10,
      JSON.stringify(plan.dailyTasks || {}),
      startDate,
      plan.endDate || null
    );

    return this.getPlan(id);
  }

  getPlan(planId: string): any {
    const row = this.db.prepare('SELECT * FROM learning_plans WHERE id = ?').get(planId) as any;
    if (!row) return null;
    return this.formatPlan(row);
  }

  getActivePlan(treeId: string, userId: string): any {
    const row = this.db.prepare(`
      SELECT * FROM learning_plans
      WHERE tree_id = ? AND user_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(treeId, userId) as any;

    if (!row) return null;
    return this.formatPlan(row);
  }

  getPlans(treeId: string, userId: string): any[] {
    const rows = this.db.prepare(`
      SELECT * FROM learning_plans
      WHERE tree_id = ? AND user_id = ?
      ORDER BY created_at DESC
    `).all(treeId, userId) as any[];

    return rows.map(r => this.formatPlan(r));
  }

  updatePlan(planId: string, updates: {
    title?: string;
    description?: string;
    focusNodeIds?: string[];
    weeklyHours?: number;
    dailyTasks?: Record<string, string[]>;
    endDate?: string;
    status?: string;
  }): any {
    const existing = this.db.prepare('SELECT * FROM learning_plans WHERE id = ?').get(planId) as any;
    if (!existing) return null;

    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { setClauses.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { setClauses.push('description = ?'); values.push(updates.description); }
    if (updates.focusNodeIds !== undefined) { setClauses.push('focus_node_ids = ?'); values.push(JSON.stringify(updates.focusNodeIds)); }
    if (updates.weeklyHours !== undefined) { setClauses.push('weekly_hours = ?'); values.push(updates.weeklyHours); }
    if (updates.dailyTasks !== undefined) { setClauses.push('daily_tasks = ?'); values.push(JSON.stringify(updates.dailyTasks)); }
    if (updates.endDate !== undefined) { setClauses.push('end_date = ?'); values.push(updates.endDate); }
    if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status); }

    if (setClauses.length > 0) {
      setClauses.push("updated_at = datetime('now')");
      values.push(planId);
      this.db.prepare(`UPDATE learning_plans SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getPlan(planId);
  }

  completePlan(planId: string): any {
    return this.updatePlan(planId, { status: 'completed', endDate: new Date().toISOString().split('T')[0] });
  }

  abandonPlan(planId: string): any {
    return this.updatePlan(planId, { status: 'abandoned' });
  }

  getPlanCount(treeId: string, userId: string): number {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM learning_plans
      WHERE tree_id = ? AND user_id = ?
    `).get(treeId, userId) as any;
    return result?.count || 0;
  }

  private formatPlan(row: any): any {
    return {
      id: row.id,
      treeId: row.tree_id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      focusNodeIds: JSON.parse(row.focus_node_ids || '[]'),
      weeklyHours: row.weekly_hours,
      dailyTasks: JSON.parse(row.daily_tasks || '{}'),
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
