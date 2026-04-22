import React from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const HomePage: React.FC = () => {
  const { state } = useAppContext();
  const auth = state.auth;

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#faf8f5',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: '60px',
      fontWeight: 900,
      color: '#3d3d3d',
      letterSpacing: '-0.02em',
    },
    subtitle: {
      fontSize: '20px',
      color: '#7a7a7a',
      marginTop: '16px',
    },
    card: {
      padding: '24px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e8e4df',
      textAlign: 'left' as const,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    button: {
      display: 'block',
      width: '100%',
      padding: '16px 32px',
      backgroundColor: '#7bb38a',
      color: 'white',
      borderRadius: '16px',
      fontWeight: 900,
      fontSize: '20px',
      textDecoration: 'none',
      transition: 'background-color 0.2s',
    },
    secondaryButton: {
      padding: '10px 24px',
      border: '1px solid #e8e4df',
      color: '#7a7a7a',
      borderRadius: '12px',
      fontWeight: 700,
      fontSize: '14px',
      textDecoration: 'none',
      backgroundColor: 'transparent',
      transition: 'all 0.2s',
    },
  };

  return (
    <div style={styles.container}>
      <div style={{ maxWidth: '768px', width: '100%', spaceY: '48px' }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'inline-block', padding: '12px', backgroundColor: 'rgba(123,179,138,0.1)', borderRadius: '16px', border: '1px solid rgba(123,179,138,0.2)', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px' }}>🗺️</span>
          </div>
          <h1 style={styles.title}>
            Skill<span style={{ color: '#7bb38a' }}>Map</span>
          </h1>
          <p style={styles.subtitle}>
            对话驱动的技能探索地图。AI 为你定制成长路径，陪你攻克每一个知识点。
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          <div style={{ ...styles.card }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>✨</div>
            <h3 style={{ fontWeight: 700, color: '#3d3d3d', marginBottom: '8px' }}>AI 定制</h3>
            <p style={{ fontSize: '14px', color: '#7a7a7a' }}>根据你的背景和目标，生成个性化的技能树。</p>
          </div>
          <div style={{ ...styles.card }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>💬</div>
            <h3 style={{ fontWeight: 700, color: '#3d3d3d', marginBottom: '8px' }}>对话复盘</h3>
            <p style={{ fontSize: '14px', color: '#7a7a7a' }}>与 AI 导师交流学习心得，自动更新掌握进度。</p>
          </div>
          <div style={{ ...styles.card }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>📈</div>
            <h3 style={{ fontWeight: 700, color: '#3d3d3d', marginBottom: '8px' }}>进度追踪</h3>
            <p style={{ fontSize: '14px', color: '#7a7a7a' }}>可视化展示你的成长历程，见证每一个里程碑。</p>
          </div>
        </div>

        <div style={{ paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          {auth.token ? (
            <Link to="/tree" style={styles.button}>
              进入我的技能树
            </Link>
          ) : (
            <>
              <Link to="/generate" style={styles.button}>
                开启我的成长之路
              </Link>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link to="/login" style={styles.secondaryButton}>
                  登录账号
                </Link>
                <Link to="/tree" style={styles.secondaryButton}>
                  看看示例数据
                </Link>
              </div>
            </>
          )}
          <p style={{ fontSize: '14px', color: '#7a7a7a', marginTop: '16px' }}>
            {auth.token ? '已登录 · 数据自动保存到云端' : '无需注册即可使用 · 登录可同步数据到云端'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;