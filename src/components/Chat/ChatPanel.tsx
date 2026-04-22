import React, { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { useAppContext } from '../../context/AppContext';
import ChatMessageItem from './ChatMessage';
import ChatInput from './ChatInput';
import { SkillNode } from '../../types/skillTree';

interface ChatPanelProps {
  nodeId: string;
  onBack?: () => void;
}

function getQuickReplies(node: SkillNode | undefined, isSummaryNode: boolean): string[] {
  if (isSummaryNode) {
    return [
      '帮我回顾一下整体学习进度',
      '下一步我该学什么？',
      '帮我制定本周学习计划',
    ];
  }
  if (!node) return [];
  
  if (node.progress === 0) {
    return [
      `我想开始学习${node.name}，该怎么入手？`,
      '这个技能有哪些关键概念？',
      '有什么推荐的学习资源？',
    ];
  }
  if (node.progress < 50) {
    return [
      '我最近学了些内容，帮我复盘一下',
      '遇到了一些困难，能帮我看看吗？',
      '下一步该怎么学？',
    ];
  }
  if (node.progress < 100) {
    return [
      '帮我检验一下掌握程度',
      '还有哪些需要深入的地方？',
      '怎么达到精通水平？',
    ];
  }
  return [
    '我已经掌握了这个技能，有什么进阶建议？',
    '帮我回顾一下关键知识点',
  ];
}

function getWelcomeText(node: SkillNode | undefined, isSummaryNode: boolean): string {
  if (isSummaryNode) {
    return '你好！我是你的全局职业成长教练。你可以问我关于整体学习规划、进度复盘、或者下一步建议。';
  }
  if (!node) return '你可以询问关于该技能的学习建议、复盘你的学习进度，或者让 AI 帮你解答疑问。';
  
  if (node.progress === 0) {
    return `你还没有开始学习「${node.name}」，我可以帮你规划学习路径、推荐资源，或者解答入门疑问。`;
  }
  if (node.progress < 50) {
    return `你正在学习「${node.name}」(${node.progress}%)，我可以帮你复盘进度、解答疑问，或者推荐下一步行动。`;
  }
  if (node.progress < 100) {
    return `你在「${node.name}」上已经有 ${node.progress}% 的进度了！我可以帮你检验掌握程度、突破瓶颈。`;
  }
  return `恭喜！你已经完成了「${node.name}」🎉 我可以帮你回顾要点，或者推荐进阶方向。`;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ nodeId, onBack }) => {
  const { state } = useAppContext();
  const treeId = state.skillTree?.id;
  const { messages, isLoading, sendMessage, loadHistory } = useChat(treeId || '', nodeId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const node = state.skillTree?.nodes[nodeId];
  const isSummaryNode = node?.category === 'meta' || node?.name?.includes('总结') || node?.name?.includes('整体');
  const quickReplies = getQuickReplies(node, isSummaryNode);
  const welcomeText = getWelcomeText(node, isSummaryNode);

  useEffect(() => {
    if (treeId && nodeId) {
      loadHistory();
    }
  }, [treeId, nodeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleQuickReply = (text: string) => {
    if (treeId) {
      sendMessage(text);
    }
  };

  return (
    <div className="flex flex-col h-full bg-light-bg">
      {onBack && (
        <div className="p-3 border-b border-light-border flex items-center bg-light-surface shadow-sm">
          <button 
            onClick={onBack}
            className="text-light-muted hover:text-light-text mr-2 transition-colors"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm">{isSummaryNode ? '🌍' : '💬'}</span>
            <span className="text-xs font-bold text-light-text">
              {isSummaryNode ? '全局成长教练' : `与 AI 导师对话`}
            </span>
          </div>
        </div>
      )}

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8 space-y-4 animate-fade-in">
            <div className="w-12 h-12 mx-auto rounded-full bg-skill-core/20 flex items-center justify-center shadow-sm">
              <span className="text-xl">{isSummaryNode ? '🌍' : '💡'}</span>
            </div>
            <p className="text-light-muted text-sm leading-relaxed max-w-[280px] mx-auto">
              {welcomeText}
            </p>
            <div className="space-y-2 pt-2">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickReply(reply)}
                  className="block w-full text-left px-4 py-2.5 bg-light-surface hover:bg-light-border border border-light-border rounded-xl text-sm text-light-text transition-colors shadow-sm"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-light-surface p-3 rounded-2xl rounded-bl-none border border-light-border shadow-sm">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-skill-core/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {messages.length > 0 && !isLoading && quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {quickReplies.slice(0, 2).map((reply, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickReply(reply)}
                className="px-3 py-1.5 bg-light-surface hover:bg-light-border border border-light-border rounded-full text-xs text-light-muted hover:text-light-text transition-colors shadow-sm"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-light-border bg-light-surface shadow-sm">
        <ChatInput 
          onSend={(content) => sendMessage(content)} 
          disabled={isLoading}
          placeholder={isSummaryNode ? '问问整体学习规划...' : `关于「${node?.name || '技能'}」的问题...`}
        />
      </div>
    </div>
  );
};

export default ChatPanel;
