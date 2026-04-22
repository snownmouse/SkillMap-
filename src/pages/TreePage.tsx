import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSkillTree } from '../hooks/useSkillTree';
import { useAppContext } from '../context/AppContext';
import SkillTreeCanvas from '../components/SkillTree/SkillTreeCanvas';
import SkillNodeDetail from '../components/SkillTree/SkillNodeDetail';
import AppLayout from '../components/Layout/AppLayout';
import { SkillNode } from '../types/skillTree';

const TreePage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { loadTree, loadTrees, trees, currentTree, isLoading: isSkillTreeLoading, error } = useSkillTree();
  const navigate = useNavigate();
  const { treeId: urlTreeId } = useParams<{ treeId?: string }>();
  const [activeNode, setActiveNode] = useState<SkillNode | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (urlTreeId) {
      loadTree(urlTreeId);
    } else if (trees.length > 0 && !currentTree && !urlTreeId) {
      loadTree(trees[0].id);
    }
  }, [trees, currentTree, loadTree, urlTreeId]);

  const handleSelectTree = useCallback(async (treeId: string) => {
    await loadTree(treeId);
  }, [loadTree]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (currentTree && currentTree.nodes) {
      const node = currentTree.nodes[nodeId];
      if (node && node.name) {
        setActiveNode(node);
      } else {
        console.warn('Node not found or has no name:', nodeId);
      }
    }
  }, [currentTree]);

  const handleCloseDetail = useCallback(() => {
    setActiveNode(null);
  }, []);



  if (isSkillTreeLoading && !currentTree) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-bg">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-core/20 border-t-core rounded-full animate-spin" />
            <p className="mt-4 text-muted">加载技能树数据...</p>
            {error && <p className="mt-2 text-error">{error}</p>}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-bg">
          <div className="text-center max-w-[400px] p-6">
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-2xl font-black text-text mb-3">加载失败</h2>
            <p className="text-error mb-6">{error}</p>
            <button
              onClick={() => loadTrees()}
              className="w-full py-3 px-8 bg-core text-white rounded-xl font-bold text-lg border-none cursor-pointer shadow-lg shadow-core/30 hover:shadow-core/40 transition-all"
            >
              重试
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!currentTree) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-bg">
          <div className="text-center max-w-[400px] p-6">
            <div className="text-6xl mb-6">🗺️</div>
            <h2 className="text-2xl font-black text-text mb-3">尚未生成技能树</h2>
            <p className="text-muted mb-6">创建你的第一个技能图谱，开始成长之旅</p>

            {trees.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-muted mb-2">或选择已有的技能树：</p>
                {trees.map(tree => (
                  <button
                    key={tree.id}
                    onClick={() => handleSelectTree(tree.id)}
                    className="w-full p-3 bg-surface border border-border rounded-xl text-left mb-2 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <div className="font-bold text-text">{tree.career}</div>
                    <div className="text-xs text-muted mt-1">{tree.created_at}</div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/generate')}
              className="w-full py-3 px-8 bg-core text-white rounded-xl font-bold text-lg border-none cursor-pointer shadow-lg shadow-core/30 hover:shadow-core/40 transition-all"
            >
              生成新技能树
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-bg">
        <SkillTreeCanvas data={currentTree} onNodeClick={handleNodeClick} />

        {activeNode && (
          <SkillNodeDetail node={activeNode} onClose={handleCloseDetail} />
        )}

        <div className="absolute bottom-4 left-4 p-3 bg-white/90 backdrop-blur-md border border-[#e0d8cc] rounded-xl text-xs shadow-sm">
          <div className="text-xs text-[#a0a0a0] uppercase tracking-[0.05em] mb-1">当前职业</div>
          <div className="text-base font-bold text-[#5c5c5c] max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap">
            {currentTree.career}
          </div>
          {(() => {
            const allNodes: any[] = currentTree.nodes ? Object.values(currentTree.nodes) : [];
            const nonMetaNodes = allNodes.filter(n => n.category !== 'meta');
            const totalProgress = nonMetaNodes.length > 0
              ? Math.round(nonMetaNodes.reduce((s: number, n: any) => s + (n.progress || 0), 0 as number) / nonMetaNodes.length)
              : 0;
            const unlockedCount = nonMetaNodes.filter(n => n.status !== 'locked').length;
            return (
              <div className="mt-2 flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#a0a0a0] uppercase">总进度</span>
                  <span className="font-mono font-bold text-[#8fbc8f]">{totalProgress}%</span>
                </div>
                {!isMobile && <div className="w-px h-4 bg-[#e0d8cc]" />}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#a0a0a0] uppercase">已解锁</span>
                  <span className="font-mono font-bold text-[#6bbd6b]">{unlockedCount}/{nonMetaNodes.length}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {trees.length > 1 && (
          <div className="absolute bottom-4 right-4">
            <select
              className="bg-white/90 backdrop-blur-md border border-[#e0d8cc] rounded-xl px-3 py-2 text-xs text-[#5c5c5c] cursor-pointer shadow-sm"
              onChange={(e) => handleSelectTree(e.target.value)}
              value={currentTree.id || ''}
            >
              {trees.map(tree => (
                <option key={tree.id} value={tree.id}>{tree.career}</option>
              ))}
            </select>
          </div>
        )}

        {isMobile && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#8fbc8f]/10 border border-[#8fbc8f]/30 rounded-lg px-4 py-2 text-xs text-[#5a8a5a] shadow-sm">
            点击节点查看详情
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TreePage;
