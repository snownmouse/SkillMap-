import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Trash2, Info, Github } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useAppContext();
  const [backendStatus, setBackendStatus] = React.useState<'checking' | 'connected' | 'disconnected'>('checking');

  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/health')
        .then(res => res.ok ? setBackendStatus('connected') : setBackendStatus('disconnected'))
        .catch(() => setBackendStatus('disconnected'));
    }
  }, [isOpen]);

  const handleClearData = () => {
    if (window.confirm('确定要清除所有本地数据吗？这将删除所有生成的技能树和对话记录。')) {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-light-surface border border-light-border rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-6 border-b border-light-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-light-text flex items-center gap-2">
                设置
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-light-bg rounded-full text-light-muted transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 主题设置 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-light-text font-medium">外观模式</div>
                  <div className="text-light-muted text-xs">切换深色或浅色主题 (目前仅支持浅色)</div>
                </div>
                <div className="flex bg-light-bg p-1 rounded-lg border border-light-border">
                  <button className="p-2 bg-light-surface text-skill-core rounded-md shadow-sm">
                    <Moon size={18} />
                  </button>
                  <button className="p-2 text-light-muted opacity-50 cursor-not-allowed">
                    <Sun size={18} />
                  </button>
                </div>
              </div>

              {/* 数据管理 */}
              <div className="space-y-3">
                <div className="text-light-text font-medium">数据管理</div>
                <button 
                  onClick={handleClearData}
                  className="w-full flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={18} />
                    <span>清除所有本地数据</span>
                  </div>
                </button>
              </div>

              {/* 关于 */}
              <div className="space-y-3">
                <div className="text-light-text font-medium">关于 SkillMap</div>
                <div className="p-4 bg-light-bg rounded-xl border border-light-border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-light-muted">版本</span>
                    <span className="text-light-text">v1.0.0-beta</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-light-muted">后端状态</span>
                    <span className={backendStatus === 'connected' ? 'text-green-600' : backendStatus === 'disconnected' ? 'text-red-500' : 'text-yellow-500'}>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${backendStatus === 'connected' ? 'bg-green-500' : backendStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        {backendStatus === 'connected' ? '已连接' : backendStatus === 'disconnected' ? '未连接' : '检测中...'}
                      </div>
                    </span>
                  </div>
                  <a 
                    href="https://github.com" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-skill-core hover:underline pt-2"
                  >
                    <Github size={16} />
                    访问 GitHub 项目
                  </a>
                </div>
              </div>
            </div>

            <div className="p-6 bg-light-bg/50 text-center text-xs text-light-muted">
              SkillMap © 2024 - 对话驱动的技能探索地图
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
