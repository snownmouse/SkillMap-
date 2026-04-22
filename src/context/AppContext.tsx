import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { SkillTreeData, SkillNode, TimelineEvent } from '../types/skillTree';
import { ChatSession, ChatMessage } from '../types/chat';
import { storage } from '../services/storage';
import { difyApi } from '../services/difyApi';

interface AuthState {
  token: string | null;
  user: { id: string; username: string; displayName: string } | null;
}

interface AppState {
  auth: AuthState;
  skillTree: SkillTreeData | null;
  chatSessions: Record<string, ChatSession>;
  activeNodeId: string | null;
  isGenerating: boolean;
  isChatLoading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_AUTH'; payload: AuthState }
  | { type: 'LOGOUT' }
  | { type: 'SET_SKILL_TREE'; payload: SkillTreeData }
  | { type: 'UPDATE_NODE_PROGRESS'; payload: { nodeId: string; progress: number } }
  | { type: 'ADD_CONVERSATION'; payload: { nodeId: string; message: ChatMessage } }
  | { type: 'LOAD_CHAT_HISTORY'; payload: { nodeId: string; messages: ChatMessage[] } }
  | { type: 'SET_ACTIVE_NODE'; payload: string | null }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_CHAT_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_FROM_STORAGE'; payload: Partial<AppState> }
  | { type: 'ADD_TIMELINE_EVENT'; payload: TimelineEvent }
  | { type: 'UPDATE_NODE_PENDING_MESSAGE'; payload: { nodeId: string; message: string | null } };

const initialState: AppState = {
  auth: { token: null, user: null },
  skillTree: null,
  chatSessions: {},
  activeNodeId: null,
  isGenerating: false,
  isChatLoading: false,
  error: null,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, auth: action.payload };
    case 'LOGOUT':
      return { ...state, auth: { token: null, user: null }, skillTree: null, chatSessions: {}, activeNodeId: null };
    case 'SET_SKILL_TREE':
      return { ...state, skillTree: action.payload, error: null };
    case 'UPDATE_NODE_PROGRESS':
      if (!state.skillTree) return state;
      const nodes = { ...state.skillTree.nodes };
      if (nodes[action.payload.nodeId]) {
        nodes[action.payload.nodeId] = {
          ...nodes[action.payload.nodeId],
          progress: action.payload.progress,
          status: action.payload.progress >= 100 ? 'completed' : 
                  action.payload.progress > 0 ? 'in_progress' : 'available'
        };
      }
      return { ...state, skillTree: { ...state.skillTree, nodes } };
    case 'ADD_CONVERSATION':
      const sessions = { ...state.chatSessions };
      const nodeId = action.payload.nodeId;
      if (!sessions[nodeId]) {
        sessions[nodeId] = {
          nodeId,
          nodeName: state.skillTree?.nodes[nodeId]?.name || '未知节点',
          messages: [],
          startedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };
      }
      sessions[nodeId].messages.push(action.payload.message);
      sessions[nodeId].lastActiveAt = new Date().toISOString();
      return { ...state, chatSessions: sessions };
    case 'LOAD_CHAT_HISTORY': {
      const histSessions = { ...state.chatSessions };
      const histNodeId = action.payload.nodeId;
      // 总是更新消息列表，避免重复和 key 冲突
      histSessions[histNodeId] = {
        nodeId: histNodeId,
        nodeName: state.skillTree?.nodes[histNodeId]?.name || '未知节点',
        messages: action.payload.messages,
        startedAt: action.payload.messages[0]?.timestamp || new Date().toISOString(),
        lastActiveAt: action.payload.messages[action.payload.messages.length - 1]?.timestamp || new Date().toISOString(),
      };
      return { ...state, chatSessions: histSessions };
    }
    case 'SET_ACTIVE_NODE':
      return { ...state, activeNodeId: action.payload };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_CHAT_LOADING':
      return { ...state, isChatLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'LOAD_FROM_STORAGE':
      return { ...state, ...action.payload };
    case 'ADD_TIMELINE_EVENT':
      if (!state.skillTree) return state;
      return {
        ...state,
        skillTree: {
          ...state.skillTree,
          timeline: [action.payload, ...(state.skillTree.timeline || [])]
        }
      };
    case 'UPDATE_NODE_PENDING_MESSAGE':
      if (!state.skillTree) return state;
      const nodesWithPending = { ...state.skillTree.nodes };
      if (nodesWithPending[action.payload.nodeId]) {
        nodesWithPending[action.payload.nodeId] = {
          ...nodesWithPending[action.payload.nodeId],
          aiPendingMessage: action.payload.message
        };
      }
      return { ...state, skillTree: { ...state.skillTree, nodes: nodesWithPending } };
    default:
      return state;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const savedState = storage.load();
    if (savedState) {
      dispatch({ type: 'LOAD_FROM_STORAGE', payload: savedState });
    }
  }, []);

  useEffect(() => {
    if (state.auth.token || state.skillTree) {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        storage.save(state);
        saveTimer = null;
      }, 500);
    }
  }, [state]);

  // 登录状态变化时转移技能树
  useEffect(() => {
    const handleLogin = async () => {
      if (state.auth.token) {
        try {
          const result = await difyApi.transferTrees();
          console.log('技能树转移结果:', result);
          // 转移成功后重新加载技能树列表
          // 这里可以添加一个通知或者状态更新
        } catch (error) {
          console.error('转移技能树失败:', error);
        }
      }
    };

    handleLogin();
  }, [state.auth.token]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
