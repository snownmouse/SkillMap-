import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { CONFIG } from '../config';
import { storage } from '../services/storage';

interface LoginPageProps {
  onLogin?: (token: string, user: { id: string; username: string; displayName: string }) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { dispatch } = useAppContext();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister
        ? { username, password, displayName: displayName || username }
        : { username, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorMsg = '操作失败';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {}
        setError(errorMsg);
        return;
      }

      const data = await response.json();

      if (onLogin) {
        onLogin(data.token, data.user);
      } else {
        const authState = {
          token: data.token,
          user: data.user
        };
        dispatch({ type: 'SET_AUTH', payload: authState });
        // 立即保存到localStorage
        const savedState = storage.load() || {};
        savedState.auth = authState;
        storage.save(savedState);
      }
      navigate('/tree');
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/tree');
  };

  return (
    <div className="min-h-screen bg-light-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-block p-3 bg-skill-core/10 rounded-2xl border border-skill-core/20 mb-4 shadow-sm">
            <span className="text-4xl">🗺️</span>
          </div>
          <h1 className="text-4xl font-black text-light-text tracking-tight">
            Skill<span className="text-skill-core">Map</span>
          </h1>
          <p className="mt-2 text-light-muted">
            {isRegister ? '创建账号，保存你的成长数据' : '登录账号，继续你的成长之旅'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-light-text mb-2">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-light-surface border border-light-border rounded-xl text-light-text placeholder-light-muted/50 focus:outline-none focus:border-skill-core/50 focus:ring-1 focus:ring-skill-core/30 transition-all shadow-sm"
              placeholder="输入用户名"
              required
              minLength={2}
              maxLength={20}
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-bold text-light-text mb-2">显示名称</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-light-surface border border-light-border rounded-xl text-light-text placeholder-light-muted/50 focus:outline-none focus:border-skill-core/50 focus:ring-1 focus:ring-skill-core/30 transition-all shadow-sm"
                placeholder="你希望怎么被称呼（可选）"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-light-text mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-light-surface border border-light-border rounded-xl text-light-text placeholder-light-muted/50 focus:outline-none focus:border-skill-core/50 focus:ring-1 focus:ring-skill-core/30 transition-all shadow-sm"
              placeholder={isRegister ? `至少${CONFIG.SECURITY.PASSWORD_MIN_LENGTH}位密码` : '输入密码'}
              required
              minLength={CONFIG.SECURITY.PASSWORD_MIN_LENGTH}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-skill-core text-white rounded-xl font-bold text-lg hover:bg-skill-core/80 transition-all shadow-lg shadow-skill-core/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '请稍候...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleSkip}
            className="w-full py-2.5 border border-light-border text-light-muted rounded-xl font-bold text-sm hover:bg-light-surface hover:text-light-text transition-all shadow-sm"
          >
            跳过登录，直接使用默认数据
          </button>

          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="w-full text-light-muted hover:text-skill-core transition-colors text-sm"
          >
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
