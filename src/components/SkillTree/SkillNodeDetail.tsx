import React from 'react';
import { SkillNode } from '../../types/skillTree';
import { useAppContext } from '../../context/AppContext';
import ChatPanel from '../Chat/ChatPanel';

interface SkillNodeDetailProps {
  node: SkillNode;
  onClose: () => void;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  remember: '记忆 (Remember)',
  understand: '理解 (Understand)',
  apply: '应用 (Apply)',
  analyze: '分析 (Analyze)',
  evaluate: '评价 (Evaluate)',
  create: '创造 (Create)'
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  locked: { label: '未解锁', color: 'text-light-muted', bgColor: 'bg-light-muted/10', borderColor: 'border-light-muted/30' },
  available: { label: '可学习', color: 'text-skill-core', bgColor: 'bg-skill-core/10', borderColor: 'border-skill-core/30' },
  in_progress: { label: '学习中', color: 'text-status-inProgress', bgColor: 'bg-status-inProgress/10', borderColor: 'border-status-inProgress/30' },
  completed: { label: '已完成', color: 'text-status-completed', bgColor: 'bg-status-completed/10', borderColor: 'border-status-completed/30' },
};

const SkillNodeDetail: React.FC<SkillNodeDetailProps> = ({ node, onClose }) => {
  const [showChat, setShowChat] = React.useState(false);
  const { state } = useAppContext();
  const isSummaryNode = node.category === 'meta' || node.name.includes('总结') || node.name.includes('整体');
  const isLocked = node.status === 'locked' && !isSummaryNode;
  const statusConfig = STATUS_CONFIG[node.status] || STATUS_CONFIG.available;

  const allNodes = state.skillTree ? Object.values(state.skillTree.nodes) as SkillNode[] : [];
  const nonMetaNodes = allNodes.filter(n => n.category !== 'meta');
  const totalProgress = nonMetaNodes.length > 0
    ? nonMetaNodes.reduce((sum, n) => sum + (n.progress || 0), 0) / nonMetaNodes.length
    : 0;

  if (showChat) {
    return (
      <div className="fixed inset-y-0 right-0 w-[450px] bg-light-bg border-l border-light-border shadow-2xl z-50 animate-slide-in-right flex flex-col">
        <ChatPanel nodeId={node.id} onBack={() => setShowChat(false)} />
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-[#faf9f7] border-l border-[#e0d8cc] shadow-[-4px_0_20px_rgba(0,0,0,0.08)] z-50 animate-slide-in-right flex flex-col mt-16">
      <div className="p-5 border-b border-[#e0d8cc] flex justify-between items-center bg-[#faf9f7]">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[#5c5c5c]">{node.name}</h2>
          {isSummaryNode && (
            <span className="px-2 py-1 bg-[#8fbc8f]/20 text-[#5a8a5a] text-[10px] font-bold rounded-full border border-[#8fbc8f]/30">
              全局
            </span>
          )}
          {node.category === 'core' && (
            <span className="px-2 py-1 bg-[#8fbc8f]/20 text-[#5a8a5a] text-[10px] font-bold rounded-full border border-[#8fbc8f]/30">
              核心
            </span>
          )}
          <span className={`px-2 py-1 text-[10px] font-bold rounded-full border ${
            node.status === 'completed' ? 'bg-[#e0f0e0] text-[#4a8a4a] border-[#6bbd6b]/30' :
            node.status === 'in_progress' ? 'bg-[#fff8e8] text-[#b8860b] border-[#daa520]/30' :
            node.status === 'available' ? 'bg-[#e8f4e8] text-[#5a8a5a] border-[#8fbc8f]/30' :
            'bg-[#f5f3f0] text-[#a0a0a0] border-[#d4c8b8]/30'
          }`}>
            {statusConfig.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-[#a0a0a0] hover:text-[#5c5c5c] hover:bg-[#f0ebe5] rounded-lg transition-all"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#faf9f7]">
        {isSummaryNode && (
          <div className="p-4 bg-[#e8f4e8]/50 border border-[#8fbc8f]/30 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🌍</span>
              <span className="text-sm font-bold text-[#5a8a5a]">全局进度概览</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-3 bg-[#f5f3f0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#8fbc8f] transition-all duration-500"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
              <span className="text-sm font-mono text-[#5a8a5a] font-bold">{totalProgress.toFixed(0)}%</span>
            </div>
            <div className="space-y-1.5">
              {nonMetaNodes
                .map(n => (
                  <div key={n.id} className="flex items-center justify-between text-xs">
                    <span className="text-[#a0a0a0]">{n.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#f5f3f0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#8fbc8f]/60 transition-all"
                          style={{ width: `${n.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-[#5c5c5c] font-mono w-8 text-right">{n.progress || 0}%</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1 p-3 bg-[#f5f3f0] rounded-xl border border-[#e0d8cc] shadow-sm">
            <div className="text-[10px] text-[#a0a0a0] uppercase mb-1">认知层级</div>
            <div className="text-sm font-bold text-[#5a8a5a]">{DIFFICULTY_LABELS[node.difficulty] || node.difficulty}</div>
          </div>
          <div className="flex-1 p-3 bg-[#f5f3f0] rounded-xl border border-[#e0d8cc] shadow-sm">
            <div className="text-[10px] text-[#a0a0a0] uppercase mb-1">预计耗时</div>
            <div className="text-sm font-bold text-[#5c5c5c]">{node.estimatedHours} 小时</div>
          </div>
        </div>

        {!isSummaryNode && (
          <div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-[#a0a0a0]">当前进度</span>
              <span className="text-[#b8860b] font-mono">{node.progress}%</span>
            </div>
            <div className="h-2 bg-[#f5f3f0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#daa520] transition-all duration-500"
                style={{ width: `${node.progress}%` }}
              />
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs uppercase tracking-wider text-[#a0a0a0] mb-2">技能描述</h3>
          <p className="text-[#5c5c5c] leading-relaxed text-sm">{node.description}</p>
        </div>

        {node.steps && node.steps.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#a0a0a0] mb-3">学习步骤</h3>
            <div className="space-y-2">
              {node.steps.map((step, idx) => (
                <div key={idx} className="flex gap-3 text-sm text-[#5c5c5c]">
                  <span className="text-[#8fbc8f] font-bold">{idx + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {node.tools && node.tools.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#a0a0a0] mb-3">所需工具</h3>
            <div className="flex flex-wrap gap-2">
              {node.tools.map((tool, idx) => (
                <span key={idx} className="px-3 py-1 bg-[#f5f3f0] border border-[#e0d8cc] rounded-lg text-xs text-[#5c5c5c] shadow-sm">
                  🛠️ {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {node.commonProblems && node.commonProblems.length > 0 && (
          <div className="p-4 bg-[#fff0f0] border border-[#e8b8b8] rounded-xl shadow-sm">
            <h3 className="text-xs font-bold text-[#c88080] mb-3 flex items-center">
              <span className="mr-1">⚠️</span> 常见误区/坑
            </h3>
            <ul className="space-y-2">
              {node.commonProblems.map((problem, idx) => (
                <li key={idx} className="text-sm text-[#5c5c5c] flex gap-2">
                  <span className="text-[#c88080]">•</span>
                  <span>{problem}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {node.subSkills.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#a0a0a0] mb-3">子技能</h3>
            <div className="space-y-2">
              {node.subSkills.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-2 bg-[#f5f3f0] rounded-lg shadow-sm">
                  <span className="text-sm text-[#5c5c5c]">
                    {sub.status === 'completed' ? '✅' : '⏳'} {sub.name}
                  </span>
                  <span className="text-xs text-[#a0a0a0]">{sub.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {node.aiPendingMessage && (
          <div className="p-4 bg-[#e8f4e8]/50 border border-[#8fbc8f]/30 rounded-xl shadow-sm">
            <h3 className="text-xs font-bold text-[#5a8a5a] mb-2 flex items-center">
              <span className="mr-1">💡</span> AI 建议
            </h3>
            <p className="text-sm text-[#5c5c5c] italic">{node.aiPendingMessage}</p>
          </div>
        )}

        {node.resources.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#a0a0a0] mb-3">学习资源</h3>
            <div className="space-y-2">
              {node.resources.map((res, idx) => (
                <a
                  key={idx}
                  href={res.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-3 bg-[#f5f3f0] hover:bg-[#f0ebe5] rounded-lg transition-colors group shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#5c5c5c] group-hover:text-[#5a8a5a]">
                      {res.type === 'book' ? '📚' : '🔗'} {res.name}
                    </span>
                    <span className="text-[10px] text-[#a0a0a0] uppercase">{res.type}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs uppercase tracking-wider text-[#a0a0a0] mb-2">完成目标</h3>
          <div className="p-3 bg-[#e0f0e0]/50 border border-[#6bbd6b]/30 rounded-lg shadow-sm">
            <p className="text-sm text-[#5c5c5c]">🎯 {node.milestone}</p>
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-[#e0d8cc] bg-[#faf9f7]">
        {isLocked ? (
          <div className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-[#f5f3f0] text-[#a0a0a0] border border-[#e0d8cc]">
            <span>🔒</span>
            <span>完成前置技能后解锁</span>
          </div>
        ) : (
          <button
            onClick={() => setShowChat(true)}
            className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md bg-[#8fbc8f] hover:bg-[#7aaa7a] text-white"
          >
            <span>{isSummaryNode ? '🌍' : '💬'}</span>
            <span>{isSummaryNode ? '与全局教练对话' : '开始对话'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SkillNodeDetail;
