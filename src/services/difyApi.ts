import { UserInput, SkillTreeData } from '../types/skillTree';
import { CareerPlanResponse, ProfileResponse } from '../types/backend';
import { handleError, createError } from '../utils/errorHandler';
import { withCache, cache } from '../utils/cache';

function getDeviceId(): string {
  const storageKey = 'skillmap_device_id';
  try {
    let deviceId = localStorage.getItem(storageKey);
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(storageKey, deviceId);
    }
    return deviceId;
  } catch (error) {
    // 如果本地存储被禁用，生成一个临时的deviceId
    return 'temp_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'x-device-id': getDeviceId()
  };
  try {
    const stored = localStorage.getItem('skillmap_state');
    if (stored) {
      try {
        const state = JSON.parse(stored);
        if (state.auth?.token) {
          headers['Authorization'] = `Bearer ${state.auth.token}`;
        }
      } catch (error) {
        console.warn('解析本地存储失败:', error);
      }
    }
  } catch (error) {
    // 如果本地存储被禁用，只返回deviceId
    console.warn('本地存储被禁用:', error);
  }
  return headers;
}

async function fetchApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // 如果是401错误，清除本地存储的auth状态
    if (response.status === 401) {
      try {
        const errorData = await response.json();
        if (errorData.error === 'SESSION_EXPIRED') {
          // 清除本地存储中的auth状态
          const stored = localStorage.getItem('skillmap_state');
          if (stored) {
            const state = JSON.parse(stored);
            if (state.auth) {
              state.auth = { token: null, user: null };
              localStorage.setItem('skillmap_state', JSON.stringify(state));
            }
          }
          // 提示用户重新登录
          window.location.reload();
        }
      } catch (e) {
        // 忽略解析错误
      }
      throw createError('登录已过期，请重新登录');
    }

    if (!response.ok) {
      let errorMsg = '请求失败';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch {
        errorMsg = `请求失败 (${response.status})`;
      }
      throw createError(errorMsg);
    }

    const text = await response.text();

    if (!text) {
      throw createError('服务器返回空响应');
    }

    try {
      const data = JSON.parse(text);
      return data;
    } catch (e) {
      throw createError('解析响应失败');
    }
  } catch (error) {
    handleError(error);
    throw error;
  }
}

export const difyApi = {
  async generateCareerPlan(inputs: UserInput): Promise<CareerPlanResponse> {
    // 职业规划结果不缓存，因为每次输入可能不同
    return fetchApi<CareerPlanResponse>('/api/careers/plan', {
      method: 'POST',
      body: JSON.stringify(inputs),
    });
  },

  async generateSkillTree(inputs: UserInput): Promise<{ taskId: string }> {
    // 生成任务不缓存
    return fetchApi<{ taskId: string }>('/api/trees/generate', {
      method: 'POST',
      body: JSON.stringify(inputs),
    });
  },

  async getTaskStatus(taskId: string): Promise<{ status: string; treeId?: string; error?: string }> {
    // 任务状态不缓存，需要实时更新
    return fetchApi<{ status: string; treeId?: string; error?: string }>(`/api/tasks/${taskId}`);
  },

  async getSkillTreeById(treeId: string): Promise<SkillTreeData> {
    // 技能树数据缓存10分钟
    return withCache(`tree_${treeId}`, () => 
      fetchApi<SkillTreeData>(`/api/trees/${treeId}`),
      600000 // 10分钟
    );
  },

  async updateSkillTree(treeId: string, treeData: Partial<SkillTreeData>): Promise<{ success: boolean }> {
    // 更新操作不缓存
    const result = await fetchApi<{ success: boolean }>(`/api/trees/${treeId}`, {
      method: 'PUT',
      body: JSON.stringify(treeData),
    });
    // 更新成功后清除缓存
    if (result.success) {
      cache.delete(`tree_${treeId}`);
      cache.delete(`profile_${treeId}`);
    }
    return result;
  },

  async getProfile(treeId: string): Promise<ProfileResponse> {
    // 个人资料缓存5分钟
    return withCache(`profile_${treeId}`, () => 
      fetchApi<ProfileResponse>(`/api/trees/${treeId}/profile`),
      300000 // 5分钟
    );
  },

  async listTrees(): Promise<{ trees: { id: string; career: string; created_at: string }[] }> {
    // 技能树列表不缓存，确保每次都能获取最新数据
    return fetchApi<{ trees: { id: string; career: string; created_at: string }[] }>('/api/trees');
  },

  async sendChatMessage(params: {
    nodeId: string;
    nodeName: string;
    nodeHistory: string;
    currentProgress: number;
    userMessage: string;
    treeSummary: string;
    conversationId: string;
    treeId?: string;
    isSummaryNode?: boolean;
    totalTreeProgress?: number;
    nodeProgressSummary?: string;
  }) {
    if (!params.treeId) {
      const error = createError('缺少 treeId');
      handleError(error);
      throw error;
    }

    const result = await fetchApi(`/api/trees/${params.treeId}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        nodeId: params.nodeId,
        message: params.userMessage,
        isSummaryNode: params.isSummaryNode,
        totalTreeProgress: params.totalTreeProgress,
        nodeProgressSummary: params.nodeProgressSummary
      }),
    });
    cache.delete(`tree_${params.treeId}`);
    cache.delete(`chat_${params.treeId}_${params.nodeId}`);
    return result;
  },

  async getChatHistory(treeId: string, nodeId: string): Promise<{ messages: any[] }> {
    // 聊天历史缓存10分钟
    return withCache(`chat_${treeId}_${nodeId}`, () => 
      fetchApi<{ messages: any[] }>(`/api/trees/${treeId}/chat/${nodeId}`),
      600000 // 10分钟
    );
  },

  async transferTrees(): Promise<{ success: boolean; transferred: number; message: string }> {
    // 转移技能树不缓存
    return fetchApi<{ success: boolean; transferred: number; message: string }>('/api/trees/transfer', {
      method: 'POST'
    });
  },

  async exportSkillTree(treeId: string): Promise<Blob> {
    try {
      const response = await fetch(`/api/trees/${treeId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        let errorMsg = '导出失败';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `导出失败 (${response.status})`;
        }
        throw createError(errorMsg);
      }

      return response.blob();
    } catch (error) {
      console.error('导出请求失败:', error);
      throw error;
    }
  },

  async getChatSummary(treeId: string, nodeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/chat/${nodeId}/summary`);
  },

  async getLearningSuggestions(treeId: string, nodeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/chat/${nodeId}/suggestions`);
  },

  async searchChatMessages(treeId: string, query: string, limit = 20): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/chat/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  async getConversationList(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/chat/conversations`);
  },

  async getProgressStats(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/stats`);
  },

  async cancelTask(taskId: string): Promise<any> {
    return fetchApi(`/api/tasks/${taskId}/cancel`, {
      method: 'POST',
    });
  },

  async importSkillTree(treeData: any): Promise<any> {
    return fetchApi('/api/trees/import', {
      method: 'POST',
      body: JSON.stringify(treeData),
    });
  },

  async getAchievements(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/achievements`);
  },

  async getLearningPlan(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/learning-plan`);
  },

  async createLearningPlan(treeId: string, plan: any): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/learning-plan`, {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  },

  async updateLearningPlan(treeId: string, planId: string, updates: any): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/learning-plan/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async exportJSON(treeId: string): Promise<Blob> {
    const response = await fetch(`/api/trees/${treeId}/export-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
    });
    if (!response.ok) {
      throw createError('导出JSON失败');
    }
    return response.blob();
  },

  async getVersions(treeId: string): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/versions`);
  },

  async restoreVersion(treeId: string, versionNumber: number): Promise<any> {
    return fetchApi(`/api/trees/${treeId}/versions/restore`, {
      method: 'POST',
      body: JSON.stringify({ versionNumber }),
    });
  },
};
