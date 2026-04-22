import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../database';
import { logger, errors } from '../utils/logger';
import { config } from '../config';
import { validate } from '../../utils/validation';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function getSessionExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().replace('T', ' ').split('.')[0];
}

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { username, password, displayName } = req.body;

      if (!username || !password) {
        throw errors.validation('用户名和密码不能为空');
      }
      
      const usernameError = validate.minLength(username, 2, '用户名长度需在2-20之间');
      if (usernameError) {
        throw errors.validation(usernameError);
      }
      
      const usernameMaxError = validate.maxLength(username, 20, '用户名长度需在2-20之间');
      if (usernameMaxError) {
        throw errors.validation(usernameMaxError);
      }

      const passwordError = validate.password(password, config.security.passwordMinLength);
      if (passwordError) {
        throw errors.validation(passwordError);
      }

      if (config.security.passwordComplexity) {
        const complexityError = validate.passwordComplexity(password);
        if (complexityError) {
          throw errors.validation(complexityError);
        }
      }

      const db = getDb();
      const existing: any = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        throw errors.validation('用户名已存在');
      }

      const userId = uuidv4();
      const passwordHash = hashPassword(password);
      db.prepare(`
        INSERT INTO users (id, username, password_hash, display_name)
        VALUES (?, ?, ?, ?)
      `).run(userId, username, passwordHash, displayName || username);

      const token = generateToken();
      const sessionId = uuidv4();
      const expiresAt = getSessionExpiry();
      db.prepare(`
        INSERT INTO sessions (id, user_id, token, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(sessionId, userId, token, expiresAt);

      logger.info('用户注册成功', { userId, username });

      res.status(201).json({
        token,
        expiresAt,
        user: { id: userId, username, displayName: displayName || username }
      });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('注册失败', error);
      res.status(500).json({ error: '注册失败，请稍后重试' });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        throw errors.validation('用户名和密码不能为空');
      }

      const db = getDb();
      const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (!user || user.password_hash !== hashPassword(password)) {
        throw errors.unauthorized('用户名或密码错误');
      }

      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

      const token = generateToken();
      const sessionId = uuidv4();
      const expiresAt = getSessionExpiry();
      db.prepare(`
        INSERT INTO sessions (id, user_id, token, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(sessionId, user.id, token, expiresAt);

      logger.info('用户登录成功', { userId: user.id, username });

      res.json({
        token,
        expiresAt,
        user: { id: user.id, username: user.username, displayName: user.display_name || user.username }
      });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('登录失败', error);
      res.status(500).json({ error: '登录失败，请稍后重试' });
    }
  },

  async me(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw errors.unauthorized('未登录');
      }

      const token = authHeader.slice(7);
      const db = getDb();
      const session: any = db.prepare(`
        SELECT s.*, u.username, u.display_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
      `).get(token);

      if (!session) {
        throw errors.unauthorized('登录已过期，请重新登录');
      }

      res.json({
        user: {
          id: session.user_id,
          username: session.username,
          displayName: session.display_name || session.username
        }
      });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('验证失败', error);
      res.status(500).json({ error: '验证失败，请稍后重试' });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const db = getDb();
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        logger.info('用户登出成功');
      }
      res.json({ success: true });
    } catch (error) {
      logger.error('登出失败', error);
      res.status(500).json({ error: '退出失败，请稍后重试' });
    }
  },

  async convertTempUser(req: Request, res: Response) {
    try {
      const { username, password, displayName } = req.body;
      const tempUserId = (req as any).user?.id;

      if (!username || !password) {
        throw errors.validation('用户名和密码不能为空');
      }
      
      const usernameError = validate.minLength(username, 2, '用户名长度需在2-20之间');
      if (usernameError) {
        throw errors.validation(usernameError);
      }
      
      const usernameMaxError = validate.maxLength(username, 20, '用户名长度需在2-20之间');
      if (usernameMaxError) {
        throw errors.validation(usernameMaxError);
      }

      const passwordError = validate.password(password, config.security.passwordMinLength);
      if (passwordError) {
        throw errors.validation(passwordError);
      }

      if (config.security.passwordComplexity) {
        const complexityError = validate.passwordComplexity(password);
        if (complexityError) {
          throw errors.validation(complexityError);
        }
      }

      const db = getDb();
      const existing: any = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        throw errors.validation('用户名已存在');
      }

      const userId = tempUserId?.startsWith('temp_') ? tempUserId : uuidv4();
      const passwordHash = hashPassword(password);

      try {
        db.prepare(`
          INSERT INTO users (id, username, password_hash, display_name)
          VALUES (?, ?, ?, ?)
        `).run(userId, username, passwordHash, displayName || username);
      } catch (e) {
        db.prepare(`
          UPDATE users SET username = ?, password_hash = ?, display_name = ?
          WHERE id = ?
        `).run(username, passwordHash, displayName || username, userId);
      }

      const token = generateToken();
      const sessionId = uuidv4();
      const expiresAt = getSessionExpiry();
      db.prepare(`
        INSERT INTO sessions (id, user_id, token, expires_at)
        VALUES (?, ?, ?, ?)
      `).run(sessionId, userId, token, expiresAt);

      logger.info('临时用户转换成功', { userId, username });

      res.status(201).json({
        token,
        expiresAt,
        user: { id: userId, username, displayName: displayName || username },
        message: '账户创建成功'
      });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('转换临时用户失败', error);
      res.status(500).json({ error: '创建账户失败，请稍后重试' });
    }
  },

  async updatePassword(req: Request, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = (req as any).user?.id;

      if (!oldPassword || !newPassword) {
        throw errors.validation('旧密码和新密码不能为空');
      }

      const passwordError = validate.password(newPassword, config.security.passwordMinLength);
      if (passwordError) {
        throw errors.validation(passwordError);
      }

      if (config.security.passwordComplexity) {
        const complexityError = validate.passwordComplexity(newPassword);
        if (complexityError) {
          throw errors.validation(complexityError);
        }
      }

      const db = getDb();

      const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) {
        throw errors.notFound('用户');
      }

      if (user.password_hash !== hashPassword(oldPassword)) {
        throw errors.unauthorized('旧密码错误');
      }

      const newPasswordHash = hashPassword(newPassword);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, userId);

      logger.info('密码修改成功', { userId });

      res.json({ success: true, message: '密码修改成功' });
    } catch (error) {
      if ((error as any).code) {
        const appError = error as any;
        return res.status(appError.statusCode).json({ error: appError.userMessage });
      }
      logger.error('修改密码失败', error);
      res.status(500).json({ error: '修改密码失败，请稍后重试' });
    }
  }
};

export function optionalAuth(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  const db = getDb();
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    (req as any).user = { id: 'default', username: '默认用户', displayName: '默认用户', isTempUser: true };
    return next();
  }

  const token = authHeader.slice(7);
  let session: any = db.prepare(`
    SELECT s.*, u.username, u.display_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token);

  if (!session) {
    // Token无效或过期，返回401让前端清理本地状态
    res.status(401).json({ error: 'SESSION_EXPIRED', message: '登录已过期，请重新登录' });
    return;
  }

  (req as any).user = {
    id: session.user_id,
    username: session.username,
    displayName: session.display_name || session.username,
    isTempUser: false
  };
  next();
}

export function requireAuth(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录，请先登录' });
    return;
  }

  const token = authHeader.slice(7);
  const db = getDb();
  const session: any = db.prepare(`
    SELECT s.*, u.username, u.display_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token);

  if (!session) {
    res.status(401).json({ error: '登录已过期，请重新登录' });
    return;
  }

  (req as any).user = {
    id: session.user_id,
    username: session.username,
    displayName: session.display_name || session.username
  };
  next();
}
