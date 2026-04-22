import { useState, useCallback, useRef, useEffect } from 'react';
import { difyApi } from '../services/difyApi';
import { useAppContext } from '../context/AppContext';
import { createError, handleError } from '../utils/errorHandler';
import { SkillNode } from '../types/skillTree';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface ChatResponse {
  reply: string;
  progressUpdate?: any;
  newInsight?: string;
  nextHook?: string;
  abilities?: Array<{ skill: string; confidence: string }>;
}

export const useChat = (treeId: string, nodeId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const { state, dispatch } = useAppContext();

  const getNodeContext = useCallback(() => {
    const treeData = state.skillTree;
    if (!treeData) return null;

    const node = treeData.nodes[nodeId] as SkillNode | undefined;
    const allNodes = Object.values(treeData.nodes) as SkillNode[];
    const nonMetaNodes = allNodes.filter(n => n.category !== 'meta');

    const isSummaryNode = node?.category === 'meta' || node?.name?.includes('总结') || node?.name?.includes('整体');

    const totalTreeProgress = nonMetaNodes.length > 0
      ? nonMetaNodes.reduce((sum, n) => sum + (n.progress || 0), 0) / nonMetaNodes.length
      : 0;

    const nodeProgressSummary = nonMetaNodes
      .map(n => `- ${n.name || '未知'}: ${n.progress || 0}%`)
      .join('\n');

    return {
      node,
      isSummaryNode,
      totalTreeProgress,
      nodeProgressSummary,
    };
  }, [state.skillTree, nodeId]);

  const loadHistory = useCallback(async () => {
    if (!treeId || !nodeId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { messages: history } = await difyApi.getChatHistory(treeId, nodeId);
      if (isMountedRef.current) {
        setMessages(history.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })));
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('加载对话历史失败');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [treeId, nodeId]);

  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendMessage = useCallback(async (userMessage: string): Promise<ChatResponse | null> => {
    if (!treeId || !nodeId || !userMessage.trim()) {
      handleError(createError('消息内容不能为空'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    const ctx = getNodeContext();
    const treeData = state.skillTree;

    const newUserMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    const tempAssistantMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      role: 'assistant',
      content: 'AI 正在思考...',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage, tempAssistantMessage]);

    try {
      const result: any = await difyApi.sendChatMessage({
        nodeId,
        nodeName: ctx?.node?.name || '',
        nodeHistory: messagesRef.current.map(msg => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`).join('\n'),
        currentProgress: ctx?.node?.progress || 0,
        userMessage,
        treeSummary: treeData ? `职业: ${treeData.career}, 总结: ${treeData.summary}` : '',
        conversationId: `conv_${Date.now()}`,
        treeId,
        isSummaryNode: ctx?.isSummaryNode,
        totalTreeProgress: ctx?.totalTreeProgress,
        nodeProgressSummary: ctx?.nodeProgressSummary,
      });

      if (isMountedRef.current) {
        setMessages(prev => {
          const updated = [...prev];
          const tempIndex = updated.findIndex(msg => msg.id === tempAssistantMessage.id);
          if (tempIndex !== -1) {
            updated[tempIndex] = {
              id: `msg_${Date.now()}_assistant`,
              role: 'assistant',
              content: result.reply || '',
              timestamp: new Date().toISOString(),
              metadata: {
                progressUpdate: result.progressUpdate,
                newInsight: result.newInsight,
                nextHook: result.nextHook,
                abilities: result.abilities
              }
            };
          }
          return updated;
        });

        if (result.progressUpdate && treeId) {
          difyApi.getSkillTreeById(treeId).then(freshTree => {
            if (isMountedRef.current && freshTree) {
              dispatch({ type: 'SET_SKILL_TREE', payload: freshTree });
            }
          }).catch(() => {});
        }

        return {
          reply: result.reply || '',
          progressUpdate: result.progressUpdate,
          newInsight: result.newInsight,
          nextHook: result.nextHook,
          abilities: result.abilities
        };
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('发送消息失败');
        setMessages(prev => prev.filter(msg => msg.id !== tempAssistantMessage.id));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }

    return null;
  }, [treeId, nodeId, getNodeContext, state.skillTree]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  useEffect(() => {
    loadHistory();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadHistory]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadHistory,
    clearMessages
  };
};
