import { useState, useCallback, useRef, useEffect } from 'react';
import { difyApi } from '../services/difyApi';
import { SkillTreeData, UserInput } from '../types/skillTree';
import { createError, handleError } from '../utils/errorHandler';
import { useAppContext } from '../context/AppContext';

export const useSkillTree = () => {
  const [trees, setTrees] = useState<Array<{ id: string; career: string; created_at: string }>>([]);
  const [currentTree, setCurrentTree] = useState<SkillTreeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const { state, dispatch } = useAppContext();

  const loadTrees = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { trees: treeList } = await difyApi.listTrees();
      setTrees(treeList);
    } catch (err) {
      setError('加载技能树列表失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTree = useCallback(async (treeId: string) => {
    if (!treeId) {
      handleError(createError('技能树ID不能为空'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const treeData = await difyApi.getSkillTreeById(treeId);
      setCurrentTree(treeData);
      dispatch({ type: 'SET_SKILL_TREE', payload: treeData });
      return treeData;
    } catch (err) {
      setError('加载技能树失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const generateTree = useCallback(async (inputs: UserInput & { selectedCareer?: string }) => {
    setGenerating(true);
    setError(null);

    try {
      const { taskId } = await difyApi.generateSkillTree(inputs);
      return taskId;
    } catch (err) {
      setError('发起生成任务失败');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const pollTaskStatus = useCallback((taskId: string, onComplete: (treeId: string) => void, onError?: (error: string) => void) => {
    if (!taskId) return;

    let pollCount = 0;
    const MAX_POLLS = 120;
    const POLL_INTERVAL = 2000;

    const poll = async () => {
      if (pollCount >= MAX_POLLS) {
        const errorMsg = '生成时间较长，已在后台继续生成，请稍后刷新页面查看';
        setError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
        return;
      }

      try {
        const { status, treeId, error: taskError } = await difyApi.getTaskStatus(taskId);

        setGeneratingProgress(Math.min(100, Math.floor((pollCount / MAX_POLLS) * 100)));

        if (status === 'completed' && treeId) {
          setGeneratingProgress(100);
          onComplete(treeId);
        } else if (status === 'failed') {
          const errorMsg = taskError || '生成失败，请稍后重试';
          setError(errorMsg);
          if (onError) {
            onError(errorMsg);
          }
        } else {
          pollCount++;
          pollingRef.current = setTimeout(poll, POLL_INTERVAL);
        }
      } catch (err) {
        const errorMsg = '查询状态失败，请检查网络后重试';
        setError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
      }
    };

    poll();
  }, []);

  const updateTree = useCallback(async (treeId: string, treeData: Partial<SkillTreeData>) => {
    if (!treeId) {
      handleError(createError('技能树ID不能为空'));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await difyApi.updateSkillTree(treeId, treeData);
      setCurrentTree(prev => {
        const updated = prev ? { ...prev, ...treeData } : null;
        if (updated) {
          dispatch({ type: 'SET_SKILL_TREE', payload: updated });
        }
        return updated;
      });
      return true;
    } catch (err) {
      setError('更新技能树失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cancelPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    loadTrees();

    return () => {
      isMountedRef.current = false;
      cancelPolling();
    };
  }, [state.auth?.token, loadTrees, cancelPolling]);

  // 当登录状态变化时，重新加载技能树列表
  useEffect(() => {
    if (state.auth?.token) {
      loadTrees();
    }
  }, [state.auth?.token, loadTrees]);

  return {
    trees,
    currentTree,
    isLoading,
    error,
    generating,
    generatingProgress,
    loadTrees,
    loadTree,
    generateTree,
    pollTaskStatus,
    updateTree,
    clearError,
    cancelPolling
  };
};
