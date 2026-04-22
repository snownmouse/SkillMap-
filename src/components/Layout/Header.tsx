import React, { useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, User, LogOut, Activity, Menu, X } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { useAppContext } from '../../context/AppContext';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { state, dispatch } = useAppContext();
  const auth = state.auth;

  // 检测屏幕尺寸
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleDevTools = useCallback(() => {
    const fn = (window as any).__toggleDevTools;
    if (fn) fn();
  }, []);

  const navItems = [
    { name: '技能树', path: '/tree', icon: '🗺️' },
    { name: '时间线', path: '/tree/timeline', icon: '📈' },
  ];

  const handleLogout = useCallback(async () => {
    const token = auth.token;
    setShowUserMenu(false);
    if (token) {
      // 发送 logout 请求（忽略结果，不阻塞导航）
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    // 先执行 logout，再导航
    dispatch({ type: 'LOGOUT' });
    // 使用 replace 模式避免历史记录中留下登录状态的页面
    navigate('/', { replace: true });
  }, [auth.token, auth.user, dispatch, navigate]);

  const closeAllMenus = useCallback(() => {
    setIsMobileMenuOpen(false);
    setShowUserMenu(false);
    setIsSettingsOpen(false);
  }, []);

  return (
    <header className="h-16 bg-light-surface border-b border-light-border px-4 sm:px-6 flex items-center justify-between z-40 shadow-sm">
      <div className="flex items-center space-x-4 sm:space-x-8">
        <Link to="/" className="flex items-center space-x-2" onClick={closeAllMenus}>
          <span className="text-2xl">🗺️</span>
          <span className="text-xl font-black text-light-text tracking-tighter">SkillMap</span>
        </Link>

        {/* 桌面导航 */}
        {!isMobile && (
          <nav className="flex space-x-1">
            {navItems.map(item => (
              <Link 
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center space-x-2 ${
                  location.pathname === item.path 
                    ? 'bg-skill-core/10 text-skill-core' 
                    : 'text-light-muted hover:text-light-text hover:bg-light-bg'
                }`}
                onClick={closeAllMenus}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* 桌面右侧操作 */}
      {!isMobile && (
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleDevTools}
            className="p-2 text-light-muted hover:text-skill-core transition-colors"
            title="API 调用监控"
          >
            <Activity size={20} />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-light-muted hover:text-light-text transition-colors"
          >
            <Settings size={20} />
          </button>

          {auth.token ? (
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-skill-core/10 border border-skill-core/20 hover:bg-skill-core/20 transition-all shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-skill-core/30 flex items-center justify-center text-xs font-bold text-skill-core">
                  {auth.user?.displayName?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-bold text-skill-core">{auth.user?.displayName || '用户'}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-light-surface border border-light-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
                  <div className="p-3 border-b border-light-border">
                    <div className="text-sm font-bold text-light-text">{auth.user?.displayName}</div>
                    <div className="text-xs text-light-muted">@{auth.user?.username}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2.5 text-left text-sm text-light-muted hover:text-red-400 hover:bg-light-bg transition-all flex items-center space-x-2"
                  >
                    <LogOut size={14} />
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-skill-core/10 border border-skill-core/20 text-skill-core rounded-xl font-bold text-sm hover:bg-skill-core/20 transition-all shadow-sm"
              onClick={closeAllMenus}
            >
              登录
            </Link>
          )}
        </div>
      )}

      {/* 移动端菜单按钮 */}
      {isMobile && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-light-muted hover:text-light-text transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* 移动端菜单 */}
      {isMobile && isMobileMenuOpen && (
        <div className="fixed inset-0 bg-light-bg/95 backdrop-blur-sm z-50 flex flex-col animate-fade-in">
          {/* 菜单头部 */}
          <div className="flex items-center justify-between p-4 border-b border-light-border">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🗺️</span>
              <span className="text-xl font-black text-light-text">SkillMap</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-light-muted hover:text-light-text transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* 导航菜单 */}
          <nav className="flex flex-col p-4 space-y-2">
            {navItems.map(item => (
              <Link 
                key={item.path}
                to={item.path}
                className={`px-4 py-3 rounded-lg text-base font-bold transition-all flex items-center space-x-3 ${
                  location.pathname === item.path 
                    ? 'bg-skill-core/10 text-skill-core' 
                    : 'text-light-muted hover:text-light-text hover:bg-light-bg'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* 操作按钮 */}
          <div className="mt-auto p-4 border-t border-light-border space-y-3">
            <button 
              onClick={() => {
                toggleDevTools();
                setIsMobileMenuOpen(false);
              }}
              className="w-full px-4 py-3 rounded-lg text-base font-bold text-light-muted hover:text-skill-core hover:bg-light-bg transition-all flex items-center space-x-3"
            >
              <Activity size={20} />
              <span>API 监控</span>
            </button>
            <button 
              onClick={() => {
                setIsSettingsOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full px-4 py-3 rounded-lg text-base font-bold text-light-muted hover:text-light-text hover:bg-light-bg transition-all flex items-center space-x-3"
            >
              <Settings size={20} />
              <span>设置</span>
            </button>

            {auth.token ? (
              <div className="space-y-2">
                <div className="px-4 py-3 rounded-lg bg-skill-core/10 border border-skill-core/20 flex items-center space-x-3 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-skill-core/30 flex items-center justify-center text-sm font-bold text-skill-core">
                    {auth.user?.displayName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="text-base font-bold text-skill-core">{auth.user?.displayName || '用户'}</div>
                    <div className="text-xs text-light-muted">@{auth.user?.username}</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 rounded-lg text-base font-bold text-light-muted hover:text-red-400 hover:bg-light-bg transition-all flex items-center space-x-3"
                >
                  <LogOut size={20} />
                  <span>退出登录</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="w-full px-4 py-3 bg-skill-core/10 border border-skill-core/20 text-skill-core rounded-lg font-bold text-base hover:bg-skill-core/20 transition-all shadow-sm flex items-center justify-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                登录
              </Link>
            )}
          </div>
        </div>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </header>
  );
};

export default Header;
