import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { llmService } from '../llmService';
import { getGenerateTreePrompt, validateSkillTree } from '../prompts/generateTree';
import { GenerateTreeRequest, SkillTreeData } from '../../types/backend';
import { logger, errors } from '../utils/Logger';
import { ProgressService, AchievementService, LearningPlanService, TreeVersionService } from '../services';
import { TreeRepository } from '../repositories';

export const treeController = {
  async generate(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'default';
      const inputs: GenerateTreeRequest = req.body;

      if (!inputs.major || !inputs.career) {
        throw errors.validation('专业和目标职业是必填项');
      }

      const taskId = uuidv4();
      const db = getDb();

      db.prepare(`
        INSERT INTO tasks (id, status)
        VALUES (?, 'pending')
      `).run(taskId);

      processTask(taskId, inputs, userId).catch(err => {
        logger.error(`技能树生成任务 ${taskId} 执行失败`, err);
      });

      logger.info(`技能树生成任务已创建`, { taskId, career: inputs.career });
      res.json({ taskId });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('发起生成任务失败', error);
      res.status(500).json({ error: '发起生成任务失败，请稍后重试' });
    }
  },

  async getTaskStatus(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const db = getDb();
      const task: any = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);

      if (!task) {
        throw errors.notFound('任务');
      }

      res.json({
        id: task.id,
        status: task.status,
        treeId: task.tree_id,
        error: task.error,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('获取任务状态失败', error);
      res.status(500).json({ error: '获取任务状态失败，请稍后重试' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const { id } = req.params;
      const db = getDb();
      let row: any;
      if (user?.username === 'admin') {
        row = db.prepare('SELECT * FROM trees WHERE id = ?').get(id);
      } else {
        row = db.prepare('SELECT * FROM trees WHERE id = ? AND user_id = ?').get(id, userId);
      }

      if (!row) {
        throw errors.notFound('技能树');
      }

      const data = JSON.parse(row.tree_data);
      res.json({ id: row.id, ...data });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('获取技能树失败', error);
      res.status(500).json({ error: '获取技能树失败，请稍后重试' });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const db = getDb();
      let rows;
      if (user?.username === 'admin') {
        rows = db.prepare('SELECT id, career, created_at FROM trees ORDER BY created_at DESC').all();
      } else {
        rows = db.prepare('SELECT id, career, created_at FROM trees WHERE user_id = ? ORDER BY created_at DESC').all(userId);
      }
      res.json({ trees: rows });
    } catch (error) {
      logger.error('获取技能树列表失败', error);
      res.status(500).json({ error: '获取列表失败，请稍后重试' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const { id } = req.params;
      const partialData = req.body;
      const db = getDb();

      let row: any;
      if (user?.username === 'admin') {
        row = db.prepare('SELECT tree_data FROM trees WHERE id = ?').get(id);
      } else {
        row = db.prepare('SELECT tree_data FROM trees WHERE id = ? AND user_id = ?').get(id, userId);
      }
      if (!row) {
        throw errors.notFound('技能树');
      }

      const existingData = JSON.parse(row.tree_data);

      const versionService = new TreeVersionService(db);
      versionService.saveVersion(id, existingData, '更新前自动保存');

      const mergedData = { ...existingData, ...partialData };

      let stmt;
      if (user?.username === 'admin') {
        stmt = db.prepare(`
          UPDATE trees SET tree_data = ?, updated_at = datetime('now') WHERE id = ?
        `);
        stmt.run(JSON.stringify(mergedData), id);
      } else {
        stmt = db.prepare(`
          UPDATE trees SET tree_data = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?
        `);
        stmt.run(JSON.stringify(mergedData), id, userId);
      }

      res.json({ success: true });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('更新技能树失败', error);
      res.status(500).json({ error: '更新失败，请稍后重试' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const { id } = req.params;
      const db = getDb();
      let result;
      if (user?.username === 'admin') {
        result = db.prepare('DELETE FROM trees WHERE id = ?').run(id);
      } else {
        result = db.prepare('DELETE FROM trees WHERE id = ? AND user_id = ?').run(id, userId);
      }

      if (result.changes === 0) {
        throw errors.notFound('技能树');
      }

      res.json({ success: true });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('删除技能树失败', error);
      res.status(500).json({ error: '删除失败，请稍后重试' });
    }
  },

  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const treeId = req.params.id;
      const db = getDb();
      let row: any;
      if (user?.username === 'admin') {
        row = db.prepare('SELECT * FROM trees WHERE id = ?').get(treeId);
      } else {
        row = db.prepare('SELECT * FROM trees WHERE id = ? AND user_id = ?').get(treeId, userId);
      }

      if (!row) {
        throw errors.notFound('技能树');
      }

      const treeData = JSON.parse(row.tree_data);
      const nodes = Object.values(treeData.nodes) as any[];

      const totalNodes = nodes.filter((n: any) => n.category !== 'meta').length;
      const completedNodes = nodes.filter((n: any) => n.category !== 'meta' && n.status === 'completed').length;
      const inProgressNodes = nodes.filter((n: any) => n.category !== 'meta' && n.status === 'in_progress').length;
      const availableNodes = nodes.filter((n: any) => n.category !== 'meta' && n.status === 'available').length;
      const lockedNodes = nodes.filter((n: any) => n.category !== 'meta' && n.status === 'locked').length;

      const overallProgress = totalNodes > 0
        ? Math.round(nodes.filter((n: any) => n.category !== 'meta').reduce((sum: number, n: any) => sum + (n.progress || 0), 0) / totalNodes)
        : 0;

      const categoryBreakdown = treeData.categories
        .filter((c: any) => c.id !== 'meta')
        .map((c: any) => {
          const catNodes = nodes.filter((n: any) => n.category === c.id);
          const catTotal = catNodes.length;
          const catCompleted = catNodes.filter((n: any) => n.status === 'completed').length;
          const catProgress = catTotal > 0
            ? Math.round(catNodes.reduce((sum: number, n: any) => sum + (n.progress || 0), 0) / catTotal)
            : 0;
          return {
            id: c.id,
            name: c.name,
            color: c.color,
            totalNodes: catTotal,
            completedNodes: catCompleted,
            progress: catProgress
          };
        });

      const recentTimeline = (treeData.timeline || [])
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      const strengths = nodes
        .filter((n: any) => n.category !== 'meta' && n.progress >= 80)
        .map((n: any) => ({ id: n.id, name: n.name, progress: n.progress }));

      const weaknesses = nodes
        .filter((n: any) => n.category !== 'meta' && n.status === 'in_progress' && n.progress < 30)
        .map((n: any) => ({ id: n.id, name: n.name, progress: n.progress }));

      const abilities = db.prepare('SELECT * FROM user_abilities WHERE tree_id = ? ORDER BY discovered_at DESC').all(treeId);

      res.json({
        treeId: row.id,
        career: treeData.career,
        summary: treeData.summary,
        overallProgress,
        totalNodes,
        completedNodes,
        inProgressNodes,
        availableNodes,
        lockedNodes,
        categoryBreakdown,
        strengths,
        weaknesses,
        abilities,
        recentTimeline,
        generatedAt: treeData.generatedAt,
        lastUpdated: row.updated_at
      });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('获取用户画像失败', error);
      res.status(500).json({ error: '获取用户画像失败，请稍后重试' });
    }
  },

  async transferTrees(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        throw errors.unauthorized('需要登录');
      }

      const db = getDb();
      const defaultTrees = db.prepare('SELECT id, career, tree_data FROM trees WHERE user_id = ?').all('default');

      if (defaultTrees.length === 0) {
        return res.json({ success: true, transferred: 0, message: '没有需要转移的技能树' });
      }

      let transferredCount = 0;
      for (const tree of defaultTrees as any[]) {
        const existingTree = db.prepare('SELECT id FROM trees WHERE user_id = ? AND career = ?').get(user.id, (tree as any).career);
        if (!existingTree) {
          db.prepare('UPDATE trees SET user_id = ? WHERE id = ?').run(user.id, (tree as any).id);
          transferredCount++;
        }
      }

      res.json({ success: true, transferred: transferredCount, message: `成功转移 ${transferredCount} 个技能树到你的账号` });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('转移技能树失败', error);
      res.status(500).json({ error: '转移技能树失败，请稍后重试' });
    }
  },

  async export(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const { id } = req.params;

      const db = getDb();
      let row: any;
      if (user?.username === 'admin') {
        row = db.prepare('SELECT * FROM trees WHERE id = ?').get(id);
      } else {
        row = db.prepare('SELECT * FROM trees WHERE id = ? AND user_id = ?').get(id, userId);
      }

      if (!row) {
        throw errors.notFound('技能树');
      }

      const treeData = JSON.parse(row.tree_data);
      const nodes = Object.values(treeData.nodes) as any[];

      return exportHTML(res, treeData, nodes);
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('导出报告失败', error);
      res.status(500).json({ error: '导出报告失败，请稍后重试' });
    }
  },

  async getStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const treeId = req.params.id;
      const db = getDb();

      let row: any;
      if (user?.username === 'admin') {
        row = db.prepare('SELECT * FROM trees WHERE id = ?').get(treeId);
      } else {
        row = db.prepare('SELECT * FROM trees WHERE id = ? AND user_id = ?').get(treeId, userId);
      }

      if (!row) {
        throw errors.notFound('技能树');
      }

      const treeRepo = new TreeRepository(db);
      const progressService = new ProgressService(treeRepo);
      const stats = progressService.getProgressStats(treeId);

      if (!stats) {
        throw errors.server('获取统计数据失败');
      }

      const achievementService = new AchievementService(db);
      const achievementStats = achievementService.getAchievementStats(treeId, userId);

      const learningPlanService = new LearningPlanService(db);
      const activePlan = learningPlanService.getActivePlan(treeId, userId);
      const planCount = learningPlanService.getPlanCount(treeId, userId);

      const chatCount = (db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages WHERE tree_id = ?
      `).get(treeId) as any)?.count || 0;

      const newAchievements = achievementService.checkAndAwardAchievements(treeId, userId, {
        treeId,
        userId,
        treeData: JSON.parse(row.tree_data),
        progressStats: stats,
        chatCount,
        streakDays: stats.streakDays,
        planCount,
      });

      res.json({
        ...stats,
        achievementStats,
        activePlan,
        planCount,
        chatCount,
        newAchievements,
      });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('获取统计数据失败', error);
      res.status(500).json({ error: '获取统计数据失败，请稍后重试' });
    }
  },

  async getAchievements(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const treeId = req.params.id;
      const db = getDb();

      const achievementService = new AchievementService(db);
      const achievements = achievementService.getAchievements(treeId, userId);
      const stats = achievementService.getAchievementStats(treeId, userId);

      res.json({ achievements, stats });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('获取成就失败', error);
      res.status(500).json({ error: '获取成就失败，请稍后重试' });
    }
  },

  async getLearningPlan(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const treeId = req.params.id;
      const db = getDb();

      const learningPlanService = new LearningPlanService(db);
      const activePlan = learningPlanService.getActivePlan(treeId, userId);
      const plans = learningPlanService.getPlans(treeId, userId);

      res.json({ activePlan, plans });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('获取学习计划失败', error);
      res.status(500).json({ error: '获取学习计划失败，请稍后重试' });
    }
  },

  async createLearningPlan(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const treeId = req.params.id;
      const db = getDb();

      const planData = req.body;
      if (!planData.title) {
        throw errors.validation('学习计划标题不能为空');
      }

      const learningPlanService = new LearningPlanService(db);
      const plan = learningPlanService.createPlan(treeId, userId, planData);

      const achievementService = new AchievementService(db);
      const treeRow: any = db.prepare('SELECT tree_data FROM trees WHERE id = ?').get(treeId);
      const treeRepo = new TreeRepository(db);
      const progressService = new ProgressService(treeRepo);
      const stats = progressService.getProgressStats(treeId);
      const chatCount = (db.prepare(`SELECT COUNT(*) as count FROM chat_messages WHERE tree_id = ?`).get(treeId) as any)?.count || 0;
      const planCount = learningPlanService.getPlanCount(treeId, userId);

      const newAchievements = achievementService.checkAndAwardAchievements(treeId, userId, {
        treeId,
        userId,
        treeData: treeRow ? JSON.parse(treeRow.tree_data) : {},
        progressStats: stats || {},
        chatCount,
        streakDays: stats?.streakDays || 0,
        planCount,
      });

      res.status(201).json({ plan, newAchievements });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('创建学习计划失败', error);
      res.status(500).json({ error: '创建学习计划失败，请稍后重试' });
    }
  },

  async updateLearningPlan(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const { planId } = req.params;
      const db = getDb();

      const planData = req.body;
      const learningPlanService = new LearningPlanService(db);
      const plan = learningPlanService.updatePlan(planId, planData);

      if (!plan) {
        throw errors.notFound('学习计划');
      }

      res.json({ plan });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('更新学习计划失败', error);
      res.status(500).json({ error: '更新学习计划失败，请稍后重试' });
    }
  },

  async importTree(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const treeData = req.body;

      if (!treeData || !treeData.career || !treeData.nodes) {
        throw errors.validation('无效的技能树数据格式');
      }

      const db = getDb();
      const treeId = uuidv4();
      treeData.id = treeId;
      treeData.version = treeData.version || '1.0';
      treeData.generatedAt = treeData.generatedAt || new Date().toISOString();

      db.prepare(`
        INSERT INTO trees (id, user_id, career, tree_data)
        VALUES (?, ?, ?, ?)
      `).run(treeId, userId, treeData.career, JSON.stringify(treeData));

      logger.info('技能树导入成功', { treeId, userId, career: treeData.career });
      res.status(201).json({ id: treeId, career: treeData.career });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('导入技能树失败', error);
      res.status(500).json({ error: '导入技能树失败，请稍后重试' });
    }
  },

  async exportJSON(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const { id } = req.params;
      const db = getDb();

      let row: any;
      if (user?.username === 'admin') {
        row = db.prepare('SELECT * FROM trees WHERE id = ?').get(id);
      } else {
        row = db.prepare('SELECT * FROM trees WHERE id = ? AND user_id = ?').get(id, userId);
      }

      if (!row) {
        throw errors.notFound('技能树');
      }

      const treeData = JSON.parse(row.tree_data);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="skill-tree-${treeData.career}.json"`);
      res.json(treeData);
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('导出JSON失败', error);
      res.status(500).json({ error: '导出JSON失败，请稍后重试' });
    }
  },

  async getVersions(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const treeId = req.params.id;
      const db = getDb();

      let row: any;
      if (user?.username === 'admin') {
        row = db.prepare('SELECT id FROM trees WHERE id = ?').get(treeId);
      } else {
        row = db.prepare('SELECT id FROM trees WHERE id = ? AND user_id = ?').get(treeId, userId);
      }

      if (!row) {
        throw errors.notFound('技能树');
      }

      const versionService = new TreeVersionService(db);
      const versions = versionService.getVersions(treeId);

      res.json({ versions });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('获取版本历史失败', error);
      res.status(500).json({ error: '获取版本历史失败，请稍后重试' });
    }
  },

  async restoreVersion(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.id || 'default';
      const treeId = req.params.id;
      const { versionNumber } = req.body;
      const db = getDb();

      if (!versionNumber) {
        throw errors.validation('版本号不能为空');
      }

      let row: any;
      if (user?.username === 'admin') {
        row = db.prepare('SELECT id FROM trees WHERE id = ?').get(treeId);
      } else {
        row = db.prepare('SELECT id FROM trees WHERE id = ? AND user_id = ?').get(treeId, userId);
      }

      if (!row) {
        throw errors.notFound('技能树');
      }

      const versionService = new TreeVersionService(db);
      const success = versionService.restoreVersion(treeId, versionNumber);

      if (!success) {
        throw errors.notFound('版本');
      }

      res.json({ success: true, message: `已恢复到版本 ${versionNumber}` });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('恢复版本失败', error);
      res.status(500).json({ error: '恢复版本失败，请稍后重试' });
    }
  },

  async cancelTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const db = getDb();

      const task: any = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      if (!task) {
        throw errors.notFound('任务');
      }

      if (task.status === 'completed') {
        throw errors.validation('已完成的任务无法取消');
      }

      if (task.status === 'failed') {
        throw errors.validation('已失败的任务无需取消');
      }

      db.prepare("UPDATE tasks SET status = 'failed', error = '用户取消', updated_at = datetime('now') WHERE id = ?").run(taskId);

      res.json({ success: true, message: '任务已取消' });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('取消任务失败', error);
      res.status(500).json({ error: '取消任务失败，请稍后重试' });
    }
  },
};

async function processTask(taskId: string, inputs: GenerateTreeRequest, userId: string) {
  const db = getDb();
  try {
    db.prepare("UPDATE tasks SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(taskId);

    logger.info(`任务开始处理`, { taskId, career: inputs.career, selectedCareer: inputs.selectedCareer });

    const { system, user } = getGenerateTreePrompt(inputs);
    const treeData: SkillTreeData = await llmService.chatJSON(system, user, 'tree_generate', validateSkillTree);

    logger.info(`任务数据接收成功`, { taskId, career: treeData.career, nodesCount: Object.keys(treeData.nodes).length });

    const treeId = uuidv4();
    treeData.id = treeId;
    treeData.version = treeData.version || "1.0";
    treeData.generatedAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO trees (id, user_id, career, tree_data)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(treeId, userId, treeData.career, JSON.stringify(treeData));
    logger.info(`技能树已保存`, { taskId, treeId, userId });

    db.prepare("UPDATE tasks SET status = 'completed', tree_id = ?, updated_at = datetime('now') WHERE id = ?").run(treeId, taskId);
    logger.info(`任务完成`, { taskId, treeId });

    try {
      const { notifyTaskUpdate } = await import('../websocket');
      notifyTaskUpdate(taskId, { status: 'completed', treeId });
    } catch (e) {
      logger.warn('WebSocket 通知失败', e);
    }
  } catch (error) {
    logger.error(`任务执行失败 taskId=${taskId}`, error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    db.prepare("UPDATE tasks SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?").run(errorMessage, taskId);

    try {
      const { notifyTaskUpdate } = await import('../websocket');
      notifyTaskUpdate(taskId, { status: 'failed', error: errorMessage });
    } catch (e) {
      logger.warn('WebSocket 通知失败', e);
    }
  }
}

async function exportPDF(res: any, treeData: any, nodes: any[]) {
  const pdfContent = `
    Skill Tree Report: ${treeData.career}
    Generated at: ${new Date().toISOString()}
    
    Summary: ${treeData.summary}
    
    Nodes:
    ${nodes.map(node => `${node.name} - ${node.status} (${node.progress}%)`).join('\n')}
  `;
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="skill-tree-report.pdf"');
  res.send(Buffer.from(pdfContent));
}

async function exportHTML(res: any, treeData: any, nodes: any[]) {
  function escapeHTML(str: string): string {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  try {
    const elements = {
      nodes: Object.values(treeData.nodes).map((node: any) => ({
        data: {
          id: node.id || `node-${Math.random().toString(36).substr(2, 9)}`,
          label: node.name || '未命名节点',
          progress: node.progress || 0,
          status: node.status || 'locked',
          category: node.category || 'general'
        }
      })),
      edges: treeData.edges.map((edge: any) => ({
        data: {
          id: edge.id || `${edge.from}-${edge.to}`,
          source: edge.from,
          target: edge.to,
          type: edge.type || 'prerequisite'
        }
      }))
    };
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Skill Tree Report - ${escapeHTML(treeData.career)}</title>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 1400px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1, h2, h3, h4 {
            color: #333;
          }
          h1 {
            border-bottom: 2px solid #4A90D9;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .meta-info {
            background-color: #f0f8ff;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .skill-tree-container {
            display: flex;
            gap: 20px;
            margin: 30px 0;
          }
          .skill-tree {
            flex: 3;
          }
          .node-details {
            flex: 1;
          }
          #cy {
            width: 100%;
            height: 800px;
            background: linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(180deg, #faf9f7 0%, #f5f3f0 40%, #ede8e0 100%);
            background-size: 40px 40px, 40px 40px, 100% 100%;
            border-radius: 5px;
          }
          .node-details-panel {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 5px;
            height: 800px;
            overflow-y: auto;
          }
          .node-details h3 {
            margin-top: 0;
          }
          .node-detail-item {
            margin: 15px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .completed {
            background-color: #d4edda;
            border-left: 5px solid #28a745;
          }
          .in-progress {
            background-color: #fff3cd;
            border-left: 5px solid #ffc107;
          }
          .available {
            background-color: #cce7ff;
            border-left: 5px solid #007bff;
          }
          .locked {
            background-color: #f8d7da;
            border-left: 5px solid #dc3545;
          }
          .node-header {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 5px;
          }
          .node-description {
            margin-bottom: 10px;
            line-height: 1.4;
          }
          .node-meta {
            font-size: 14px;
            color: #666;
          }
          .resources {
            margin-top: 10px;
          }
          .resource-item {
            margin: 5px 0;
            padding: 5px;
            background-color: #f0f0f0;
            border-radius: 3px;
          }
          .steps {
            margin-top: 10px;
          }
          .step-item {
            margin: 5px 0;
            padding: 5px;
            background-color: #f0f0f0;
            border-radius: 3px;
          }
          .tools {
            margin-top: 10px;
          }
          .tool-item {
            display: inline-block;
            margin-right: 10px;
            padding: 3px 8px;
            background-color: #e9ecef;
            border-radius: 15px;
            font-size: 12px;
          }
          .no-selection {
            text-align: center;
            color: #666;
            margin-top: 50px;
          }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.26.0/cytoscape.min.js"></script>
      </head>
      <body>
        <div class="container">
          <h1>技能树报告</h1>
          <div class="meta-info">
            <h2>${escapeHTML(treeData.career)}</h2>
            <p><strong>生成时间:</strong> ${new Date().toISOString()}</p>
            <p><strong>技能树生成时间:</strong> ${escapeHTML(treeData.generatedAt)}</p>
            <p><strong>技能树摘要:</strong> ${escapeHTML(treeData.summary)}</p>
          </div>
          <div class="skill-tree-container">
            <div class="skill-tree">
              <h3>技能树结构</h3>
              <div id="cy"></div>
            </div>
            <div class="node-details">
              <h3>节点详情</h3>
              <div class="node-details-panel">
                <div class="no-selection">点击技能树中的节点查看详情</div>
              </div>
            </div>
          </div>
        </div>
        <script>
          const elements = ${JSON.stringify(elements)};
          const nodeDetails = ${JSON.stringify(treeData.nodes)};
          const statusColors = {
            locked: { bg: '#f5f3f0', border: '#d4c8b8', text: '#333333' },
            available: { bg: '#e8f4e8', border: '#8fbc8f', text: '#1a3d1a' },
            in_progress: { bg: '#fff8e8', border: '#daa520', text: '#5c3d00' },
            completed: { bg: '#e0f0e0', border: '#6bbd6b', text: '#0d3d0d' }
          };
          document.addEventListener('DOMContentLoaded', function() {
            try {
              const cy = cytoscape({
                container: document.getElementById('cy'),
                elements: elements,
                style: [
                  { selector: 'node', style: { width: 140, height: 50, shape: 'round-rectangle', 'background-color': '#ffffff', 'border-width': 2, 'border-color': '#d4c8b8', 'label': 'data(label)', 'color': '#333333', 'text-valign': 'center', 'text-halign': 'center', 'font-size': 12, 'font-weight': 'bold', 'text-wrap': 'ellipsis', 'text-max-width': '120px', 'text-opacity': 0.9 } },
                  { selector: 'node[status="locked"]', style: { 'background-color': '#f5f3f0', 'border-color': '#d4c8b8', 'color': '#333333', 'opacity': 0.6 } },
                  { selector: 'node[status="available"]', style: { 'background-color': '#e8f4e8', 'border-color': '#8fbc8f', 'color': '#1a3d1a' } },
                  { selector: 'node[status="in_progress"]', style: { 'background-color': '#fff8e8', 'border-color': '#daa520', 'color': '#5c3d00' } },
                  { selector: 'node[status="completed"]', style: { 'background-color': '#e0f0e0', 'border-color': '#6bbd6b', 'color': '#0d3d0d' } },
                  { selector: 'edge', style: { 'width': 2, 'line-color': '#c8beb0', 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'target-arrow-color': '#c8beb0', 'opacity': 0.6 } },
                  { selector: 'edge[type="related"]', style: { 'line-style': 'dashed', 'opacity': 0.4 } },
                  { selector: 'edge:selected', style: { 'line-color': '#8fbc8f', 'target-arrow-color': '#8fbc8f', width: 3 } },
                  { selector: 'node:selected', style: { 'border-width': 3, 'border-color': '#6bbd6b' } }
                ],
                layout: { name: 'cose', idealEdgeLength: 100, nodeOverlap: 20, refresh: 20, fit: true, padding: 30, randomize: false, componentSpacing: 100, nodeRepulsion: 400000, edgeElasticity: 100, nestingFactor: 5, gravity: 80, numIter: 1000, initialTemp: 200, coolingFactor: 0.95, minTemp: 1.0 },
                userZoomingEnabled: true, userPanningEnabled: true, boxSelectionEnabled: false, wheelSensitivity: 0.3, minZoom: 0.3, maxZoom: 2
              });
              cy.on('tap', 'node', function(evt) {
                try { const nodeId = evt.target.id(); const nodeData = nodeDetails[nodeId]; if (nodeData) { displayNodeDetails(nodeData); } } catch (error) { console.error('节点点击事件错误:', error); }
              });
              cy.on('mouseover', 'node', function(evt) { try { document.getElementById('cy').style.cursor = 'pointer'; } catch (error) {} });
              cy.on('mouseout', 'node', function(evt) { try { document.getElementById('cy').style.cursor = 'default'; } catch (error) {} });
              function displayNodeDetails(node) {
                try {
                  const detailsPanel = document.querySelector('.node-details-panel');
                  if (!detailsPanel) return;
                  function esc(s) { var d = document.createElement('div'); d.textContent = String(s || ''); return d.innerHTML; }
                  let html = '<div class="node-detail-item ' + esc(node.status || 'locked') + '">';
                  html += '<div class="node-header">' + esc(node.name || '未命名节点') + '</div>';
                  html += '<div class="node-description">' + esc(node.description || '无描述') + '</div>';
                  html += '<div class="node-meta"><strong>状态:</strong> ' + esc(node.status || 'locked') + ' | <strong>进度:</strong> ' + esc(node.progress || 0) + '% | <strong>难度:</strong> ' + esc(node.difficulty || 'unknown') + '</div>';
                  if (node.resources && node.resources.length > 0) { html += '<div class="resources"><strong>学习资源:</strong>'; node.resources.forEach(function(resource) { html += '<div class="resource-item"><strong>' + esc(resource.name || '未命名资源') + '</strong> (' + esc(resource.type || 'unknown') + '): <a href="' + esc(resource.url || '#') + '" target="_blank">' + esc(resource.url || '无链接') + '</a></div>'; }); html += '</div>'; }
                  if (node.steps && node.steps.length > 0) { html += '<div class="steps"><strong>学习步骤:</strong>'; node.steps.forEach(function(step, index) { html += '<div class="step-item">' + esc(index + 1) + '. ' + esc(step || '无步骤') + '</div>'; }); html += '</div>'; }
                  if (node.tools && node.tools.length > 0) { html += '<div class="tools"><strong>使用工具:</strong>'; node.tools.forEach(function(tool) { html += '<span class="tool-item">' + esc(tool || '无工具') + '</span>'; }); html += '</div>'; }
                  html += '</div>';
                  detailsPanel.innerHTML = html;
                } catch (error) { console.error('显示节点详情错误:', error); }
              }
            } catch (error) {
              console.error('初始化技能树错误:', error);
              const detailsPanel = document.querySelector('.node-details-panel');
              if (detailsPanel) { detailsPanel.innerHTML = '<div class="error-message">技能树初始化失败，请刷新页面重试</div>'; }
            }
          });
        </script>
      </body>
      </html>
    `;
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `skill-tree-report-${date}.html`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(htmlContent);
  } catch (error) {
    console.error('导出HTML失败:', error);
    res.status(500).json({ error: '导出HTML失败' });
  }
}

async function exportJSON(res: any, treeData: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="skill-tree-report.json"');
  res.json(treeData);
}

async function exportCSV(res: any, treeData: any, nodes: any[]) {
  const csvContent = [
    ['Name', 'Description', 'Category', 'Status', 'Progress'],
    ...nodes.map(node => [
      node.name,
      node.description,
      node.category,
      node.status,
      node.progress
    ])
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="skill-tree-report.csv"');
  res.send(csvContent);
}