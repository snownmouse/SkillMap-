import { Router, Request, Response } from 'express';
import { llmService } from '../llmService';
import { getDb } from '../database';

export const debugRouter = Router();

debugRouter.get('/llm-logs', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const logs = llmService.getRecentLogs(limit);
    const stats = llmService.getLogStats();
    res.json({ logs, stats });
  } catch (error) {
    res.status(500).json({ error: '获取 LLM 日志失败' });
  }
});

debugRouter.get('/llm-logs/db', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const db = getDb();
    const logs = db.prepare(`
      SELECT * FROM llm_logs ORDER BY created_at DESC LIMIT ?
    `).all(limit);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: '获取 LLM 日志失败' });
  }
});

debugRouter.get('/llm-stats', (req: Request, res: Response) => {
  try {
    const stats = llmService.getLogStats();
    const db = getDb();
    const dbStats = db.prepare(`
      SELECT 
        COUNT(*) as total_calls,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as fail_count,
        AVG(latency_ms) as avg_latency,
        SUM(total_tokens) as total_tokens,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens
      FROM llm_logs
    `).get() as any;

    const byProvider = db.prepare(`
      SELECT provider, COUNT(*) as count, AVG(latency_ms) as avg_latency, SUM(total_tokens) as total_tokens
      FROM llm_logs GROUP BY provider
    `).all();

    const byModel = db.prepare(`
      SELECT model, COUNT(*) as count, AVG(latency_ms) as avg_latency, SUM(total_tokens) as total_tokens
      FROM llm_logs GROUP BY model
    `).all();

    res.json({
      memory: stats,
      database: dbStats,
      byProvider,
      byModel,
    });
  } catch (error) {
    res.status(500).json({ error: '获取 LLM 统计失败' });
  }
});
