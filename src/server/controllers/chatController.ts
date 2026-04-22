import { Request, Response } from 'express';
import { getDb } from '../database';
import { llmService } from '../llmService';
import { getCheckinChatPrompt } from '../prompts/checkinChat';
import { ChatMessageService, ProgressService, TimelineService, AbilityService } from '../services';
import { ChatMessageRepository, TreeRepository, AbilityRepository } from '../repositories';
import { logger, errors } from '../utils/logger';

export const chatController = {
  async sendMessage(req: Request, res: Response) {
    try {
      const { treeId } = req.params;
      const { nodeId, message, isSummaryNode, totalTreeProgress, nodeProgressSummary }: any = req.body;

      logger.info(`收到对话请求`, { treeId, nodeId });

      const userId = (req as any).user?.id || 'default';
      const db = getDb();
      const treeRow: any = db.prepare('SELECT * FROM trees WHERE id = ? AND user_id = ?').get(treeId, userId);
      if (!treeRow) {
        throw errors.notFound('技能树');
      }

      const treeData = JSON.parse(treeRow.tree_data);
      const node = treeData.nodes[nodeId];
      if (!node) {
        throw errors.notFound('技能节点');
      }

      const historyRows: any[] = db.prepare(`
        SELECT role, content FROM chat_messages
        WHERE tree_id = ? AND node_id = ?
        ORDER BY created_at ASC LIMIT 10
      `).all(treeId, nodeId);

      const historyStr = historyRows.map(h => `${h.role === 'user' ? '用户' : 'AI'}: ${h.content}`).join('\n');
      const treeSummary = `职业: ${treeData.career}, 总结: ${treeData.summary}`;

      const allNodes = Object.values(treeData.nodes) as Array<{ progress: number; name?: string; category?: string }>;
      const calculatedTotalProgress = allNodes.reduce((sum, n) => sum + (n.progress || 0), 0) / allNodes.length;
      const finalTotalProgress = totalTreeProgress || calculatedTotalProgress;

      const calculatedNodeProgressSummary = allNodes
        .filter(n => n.category !== 'meta')
        .map(n => `- ${n.name || '未知'}: ${n.progress || 0}%`)
        .join('\n');
      const finalNodeProgressSummary = nodeProgressSummary || calculatedNodeProgressSummary;

      const abilityRows: any[] = db.prepare('SELECT skill, confidence FROM user_abilities WHERE tree_id = ? ORDER BY discovered_at DESC').all(treeId);
      const userAbilitiesStr = abilityRows.length > 0
        ? abilityRows.map(a => `- ${a.skill} (置信度: ${a.confidence})`).join('\n')
        : '暂无记录';

      const functionType = (nodeId === 'meta_growth' || isSummaryNode) ? 'global_chat' : 'node_chat';

      const { system, user } = getCheckinChatPrompt({
        nodeId,
        nodeName: node.name,
        nodeDescription: node.description,
        nodeHistory: historyStr,
        currentProgress: node.progress,
        difficulty: node.difficulty,
        steps: node.steps,
        tools: node.tools,
        commonProblems: node.commonProblems,
        pitfalls: node.pitfalls,
        microMilestones: node.microMilestones,
        userMessage: message,
        treeSummary,
        isSummaryNode,
        totalTreeProgress: finalTotalProgress,
        nodeProgressSummary: finalNodeProgressSummary,
        userAbilities: userAbilitiesStr,
      });

      const aiResult = await llmService.chatJSON(system, user, functionType);

      const messageRepo = new ChatMessageRepository(db);
      const treeRepo = new TreeRepository(db);
      const abilityRepo = new AbilityRepository(db);

      const messageService = new ChatMessageService(messageRepo);
      const progressService = new ProgressService(treeRepo);
      const timelineService = new TimelineService(treeRepo);
      const abilityService = new AbilityService(abilityRepo);

      try {
        messageService.saveChatMessages(treeId, nodeId, message, aiResult);
      } catch (error) {
        logger.error('[Chat] 消息存储失败', error);
        throw errors.server('消息保存失败');
      }

      try {
        progressService.updateProgress(treeId, nodeId, aiResult.progress_update);
      } catch (error) {
        logger.warn('[Chat] 进度更新失败，继续处理', error);
      }

      try {
        timelineService.addTimelineEvent(treeId, nodeId, aiResult.timeline_event);
      } catch (error) {
        logger.warn('[Chat] 时间线更新失败，继续处理', error);
      }

      try {
        await abilityService.recordAbilities(treeId, nodeId, aiResult.abilities || []);
      } catch (error) {
        logger.warn('[Chat] 能力记录失败，继续处理', error);
      }

      res.json({
        reply: aiResult.reply,
        progressUpdate: aiResult.progress_update ? {
          nodeId: aiResult.progress_update.node_id || nodeId,
          newProgress: aiResult.progress_update.new_progress,
          reason: aiResult.progress_update.reason,
        } : undefined,
        newInsight: aiResult.new_insight,
        nextHook: aiResult.next_hook,
        timelineEvent: aiResult.timeline_event,
        abilities: aiResult.abilities || [],
      });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('[Chat] 对话失败', error);
      res.status(500).json({ error: 'AI 对话处理失败，请稍后重试' });
    }
  },

  async getHistory(req: Request, res: Response) {
    try {
      const { treeId, nodeId } = req.params;
      const userId = (req as any).user?.id || 'default';
      const db = getDb();

      const treeRow: any = db.prepare('SELECT id FROM trees WHERE id = ? AND user_id = ?').get(treeId, userId);
      if (!treeRow) {
        throw errors.notFound('技能树');
      }

      const rows = db.prepare(`
        SELECT id, role, content, created_at as timestamp, metadata
        FROM chat_messages
        WHERE tree_id = ? AND node_id = ?
        ORDER BY created_at ASC
      `).all(treeId, nodeId);

      res.json({
        messages: rows.map((r: any) => ({
          ...r,
          metadata: r.metadata ? JSON.parse(r.metadata) : null
        }))
      });
    } catch (error) {
      logger.error('[Chat] 获取历史记录失败', error);
      res.status(500).json({ error: '获取对话历史失败，请稍后重试' });
    }
  }
};
