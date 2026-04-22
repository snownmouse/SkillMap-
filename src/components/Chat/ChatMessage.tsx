import React from 'react';
import { ChatMessage } from '../../types/chat';

interface ChatMessageProps {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-4 py-2 bg-light-surface/50 border border-light-border/50 rounded-full shadow-sm">
          <span className="text-xs text-light-muted">{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div 
          className={`p-3 text-sm leading-relaxed shadow-sm ${
            isUser 
              ? 'bg-skill-core text-white rounded-2xl rounded-tr-none' 
              : 'bg-light-surface text-light-text border border-light-border rounded-2xl rounded-tl-none'
          }`}
        >
          {message.content}
        </div>
        
        {message.metadata?.newInsight && (
          <div className="mt-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2 max-w-full shadow-sm">
            <span className="text-xs mt-0.5">💡</span>
            <span className="text-xs text-yellow-600/90 leading-relaxed">{message.metadata.newInsight}</span>
          </div>
        )}

        {message.metadata?.progressUpdate && (
          <div className="mt-2 px-3 py-1.5 bg-status-inProgress/20 border border-status-inProgress/40 rounded-full flex items-center gap-2 shadow-sm">
            <span className="text-[10px] font-bold text-status-inProgress uppercase tracking-tight">进度更新</span>
            <span className="text-xs text-light-text font-mono">
              → {message.metadata.progressUpdate.newProgress}% ↑
            </span>
          </div>
        )}

        {message.metadata?.nextHook && !isUser && (
          <div className="mt-1.5 px-3 py-1 bg-skill-core/10 border border-skill-core/20 rounded-lg shadow-sm">
            <span className="text-[11px] text-skill-core/80">💡 {message.metadata.nextHook}</span>
          </div>
        )}

        <span className="text-[10px] text-light-muted mt-1 px-1">{time}</span>
      </div>
    </div>
  );
};

export default ChatMessageItem;
