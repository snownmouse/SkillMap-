import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { llmService } from '../llmService';
import { getGenerateTreePrompt, validateSkillTree } from '../prompts/generateTree';
import { GenerateTreeRequest, SkillTreeData } from '../../types/backend';
import { logger, errors } from '../utils/logger';

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
      // 只有管理员(admin)可以访问所有技能树，普通用户只能访问自己的技能树
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
      console.log('List trees for user:', user);
      console.log('User ID:', userId);
      const db = getDb();
      // 只有管理员(admin)可以看到所有技能树，普通用户只能看到自己的技能树
      let rows;
      if (user?.username === 'admin') {
        rows = db.prepare('SELECT id, career, created_at FROM trees ORDER BY created_at DESC').all();
      } else {
        rows = db.prepare('SELECT id, career, created_at FROM trees WHERE user_id = ? ORDER BY created_at DESC').all(userId);
      }
      console.log('Found trees:', rows.length);
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

      // 只有管理员(admin)可以更新所有技能树，普通用户只能更新自己的技能树
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
      // 只有管理员(admin)可以删除所有技能树，普通用户只能删除自己的技能树
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
      // 只有管理员(admin)可以访问所有技能树，普通用户只能访问自己的技能树
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
      // 查找当前用户的默认技能树（未登录时创建的）
      const defaultTrees = db.prepare('SELECT id, career, tree_data FROM trees WHERE user_id = ?').all('default');

      if (defaultTrees.length === 0) {
        return res.json({ success: true, transferred: 0, message: '没有需要转移的技能树' });
      }

      // 转移技能树到登录用户账号
      let transferredCount = 0;
      for (const tree of defaultTrees) {
        // 检查用户是否已有同名技能树
        const existingTree = db.prepare('SELECT id FROM trees WHERE user_id = ? AND career = ?').get(user.id, tree.career);
        if (!existingTree) {
          // 转移技能树
          db.prepare('UPDATE trees SET user_id = ? WHERE id = ?').run(user.id, tree.id);
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
  }
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
  } catch (error) {
    logger.error(`任务执行失败`, error, { taskId });
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    db.prepare("UPDATE tasks SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?").run(errorMessage, taskId);
  }
}
