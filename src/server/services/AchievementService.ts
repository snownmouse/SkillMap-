import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';

interface AchievementDefinition {
  type: string;
  title: string;
  description: string;
  checkCondition: (context: AchievementContext) => boolean;
}

interface AchievementContext {
  treeId: string;
  userId: string;
  treeData: any;
  progressStats: any;
  chatCount: number;
  streakDays: number;
  planCount: number;
}

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: 'first_chat',
    title: '初次对话',
    description: '与 AI 教练进行了第一次对话',
    checkCondition: (ctx) => ctx.chatCount >= 1,
  },
  {
    type: 'node_complete',
    title: '技能解锁',
    description: '完成了第一个技能节点的学习',
    checkCondition: (ctx) => ctx.progressStats.completedNodes >= 1,
  },
  {
    type: 'tree_half',
    title: '半程达人',
    description: '技能树整体进度达到 50%',
    checkCondition: (ctx) => ctx.progressStats.overallProgress >= 50,
  },
  {
    type: 'tree_complete',
    title: '技能大师',
    description: '完成了技能树的所有节点',
    checkCondition: (ctx) => ctx.progressStats.completionRate === 100,
  },
  {
    type: 'streak_3',
    title: '三日坚持',
    description: '连续 3 天进行学习',
    checkCondition: (ctx) => ctx.streakDays >= 3,
  },
  {
    type: 'streak_7',
    title: '一周达人',
    description: '连续 7 天进行学习',
    checkCondition: (ctx) => ctx.streakDays >= 7,
  },
  {
    type: 'streak_30',
    title: '月度之星',
    description: '连续 30 天进行学习',
    checkCondition: (ctx) => ctx.streakDays >= 30,
  },
  {
    type: 'all_milestones',
    title: '里程碑收集者',
    description: '完成了某个节点的所有微里程碑',
    checkCondition: (ctx) => {
      const nodes = Object.values(ctx.treeData.nodes) as any[];
      return nodes.some(n => n.microMilestones && n.microMilestones.length > 0 && n.microMilestones.every((m: any) => m.completed));
    },
  },
  {
    type: 'first_plan',
    title: '规划先行',
    description: '创建了第一个学习计划',
    checkCondition: (ctx) => ctx.planCount >= 1,
  },
];

export class AchievementService {
  constructor(private db: Database.Database) {}

  checkAndAwardAchievements(treeId: string, userId: string, context: AchievementContext): any[] {
    const newAchievements: any[] = [];

    const existingTypes = this.getExistingTypes(treeId, userId);

    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      if (existingTypes.has(definition.type)) continue;

      if (definition.checkCondition(context)) {
        const achievement = this.awardAchievement(treeId, userId, definition.type, definition.title, definition.description);
        if (achievement) {
          newAchievements.push(achievement);
        }
      }
    }

    return newAchievements;
  }

  private awardAchievement(treeId: string, userId: string, type: string, title: string, description: string, nodeId?: string): any {
    const id = uuidv4();
    try {
      this.db.prepare(`
        INSERT INTO achievements (id, tree_id, user_id, type, title, description, node_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, treeId, userId, type, title, description, nodeId || null);

      return { id, treeId, userId, type, title, description, nodeId, earnedAt: new Date().toISOString() };
    } catch (error) {
      return null;
    }
  }

  getAchievements(treeId: string, userId: string): any[] {
    return this.db.prepare(`
      SELECT * FROM achievements
      WHERE tree_id = ? AND user_id = ?
      ORDER BY earned_at DESC
    `).all(treeId, userId);
  }

  getAllAchievementsForUser(userId: string): any[] {
    return this.db.prepare(`
      SELECT * FROM achievements
      WHERE user_id = ?
      ORDER BY earned_at DESC
    `).all(userId);
  }

  private getExistingTypes(treeId: string, userId: string): Set<string> {
    const rows = this.db.prepare(`
      SELECT type FROM achievements
      WHERE tree_id = ? AND user_id = ?
    `).all(treeId, userId) as any[];
    return new Set(rows.map(r => r.type));
  }

  getAchievementStats(treeId: string, userId: string) {
    const earned = this.getAchievements(treeId, userId);
    const total = ACHIEVEMENT_DEFINITIONS.length;
    const earnedTypes = new Set(earned.map((a: any) => a.type));

    const available = ACHIEVEMENT_DEFINITIONS
      .filter(d => !earnedTypes.has(d.type))
      .map(d => ({ type: d.type, title: d.title, description: d.description }));

    return {
      total,
      earned: earned.length,
      available,
      completionRate: total > 0 ? Math.round((earned.length / total) * 100) : 0,
    };
  }
}
