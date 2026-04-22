import { getConfig } from './config';
import { LLMMessage, LLMResponse, LLMFunctionType, LLMFunctionConfig } from '../types/backend';
import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';

const FUNCTION_CONFIGS: Record<LLMFunctionType, LLMFunctionConfig> = {
  career_plan: {
    model: undefined,
    apiType: 'responses',
    reasoningEffort: 'minimal',
    webSearch: false,
    maxTokens: 2000,
    temperature: 0.3,
  },
  tree_generate: {
    model: undefined,
    apiType: 'chat',
    reasoningEffort: undefined,
    webSearch: false,
    maxTokens: 16000,
    temperature: 0.3,
  },
  node_chat: {
    model: undefined,
    apiType: 'responses',
    reasoningEffort: 'medium',
    webSearch: false,
    maxTokens: 4000,
    temperature: 0.5,
  },
  global_chat: {
    model: undefined,
    apiType: 'responses',
    reasoningEffort: 'medium',
    webSearch: false,
    maxTokens: 4000,
    temperature: 0.5,
  },
};

interface ProviderInfo {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  supportsResponses: boolean;
  supportsReasoningEffort: boolean;
  supportsWebSearch: boolean;
}

interface LLMLogEntry {
  id: string;
  provider: string;
  model: string;
  apiType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const recentLogs: LLMLogEntry[] = [];
const MAX_RECENT_LOGS = 100;

class LLMService {
  getRecentLogs(limit = 50): LLMLogEntry[] {
    return recentLogs.slice(0, limit);
  }

  getLogStats() {
    const total = recentLogs.length;
    const successes = recentLogs.filter(l => l.success).length;
    const totalLatency = recentLogs.reduce((s, l) => s + l.latencyMs, 0);
    const totalTokens = recentLogs.reduce((s, l) => s + l.totalTokens, 0);
    return {
      total,
      successes,
      failures: total - successes,
      avgLatency: total > 0 ? Math.round(totalLatency / total) : 0,
      totalTokens,
    };
  }

  private getProviders(): { primary: ProviderInfo; fallback: ProviderInfo } {
    const config = getConfig();
    const ark = config.llm.ark;
    const sf = config.llm.siliconflow;

    if (config.llm.provider === 'ark' && !ark.apiKey) {
      throw new Error('ARK API key is required when using ark provider. Please set ARK_API_KEY in .env file.');
    }

    return {
      primary: {
        name: 'ark',
        apiKey: ark.apiKey,
        baseUrl: ark.baseUrl,
        model: ark.model,
        supportsResponses: true,
        supportsReasoningEffort: true,
        supportsWebSearch: true,
      },
      fallback: {
        name: 'siliconflow',
        apiKey: sf.apiKey,
        baseUrl: sf.baseUrl || 'https://api.siliconflow.cn',
        model: sf.model || 'deepseek-ai/DeepSeek-V3',
        supportsResponses: false,
        supportsReasoningEffort: false,
        supportsWebSearch: false,
      },
    };
  }

  async chatJSON(
    systemPrompt: string,
    userPrompt: string,
    functionType: LLMFunctionType,
    validator?: (data: any) => boolean
  ): Promise<any> {
    const funcConfig = FUNCTION_CONFIGS[functionType];
    const maxRetries = 2;
    let lastError: Error | null = null;
    let useFallback = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = useFallback
          ? await this.callWithFallbackOnly(systemPrompt, userPrompt, funcConfig)
          : await this.callWithFallback(systemPrompt, userPrompt, funcConfig);
        const parsed = this.extractJSON(response.content);

        if (validator && !validator(parsed)) {
          throw new Error(`结构校验失败 (attempt ${attempt + 1})`);
        }

        if (functionType !== 'tree_generate' && this.containsIrrelevantInformation(parsed)) {
          throw new Error(`包含无关信息 (attempt ${attempt + 1})`);
        }

        return parsed;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[LLM] ${functionType} attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt < maxRetries) {
          useFallback = !useFallback;
          const delay = (attempt + 1) * 1000;
          console.log(`[LLM] Retrying in ${delay}ms (fallback: ${useFallback})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const config = getConfig();
    const isDevelopment = config.nodeEnv === 'development';

    if (isDevelopment) {
      throw lastError || new Error('LLM 调用失败');
    } else {
      throw new Error('服务暂时无法处理请求，请稍后重试');
    }
  }

  private containsIrrelevantInformation(data: any): boolean {
    const dataString = JSON.stringify(data);
    const irrelevantPatterns = [
      /根据.*外部资料/,
      /据.*新闻报道/,
      /参考.*外部信息/,
      /根据.*第三方研究/,
      /据.*第三方统计/,
      /参考.*第三方数据/,
    ];
    return irrelevantPatterns.some(pattern => pattern.test(dataString));
  }

  private async callWithFallbackOnly(
    systemPrompt: string,
    userPrompt: string,
    funcConfig: LLMFunctionConfig
  ): Promise<LLMResponse> {
    const { fallback } = this.getProviders();
    const fallbackConfig = { ...funcConfig };
    if (!fallback.supportsResponses) {
      fallbackConfig.apiType = 'chat';
      fallbackConfig.webSearch = false;
    }
    if (!fallback.supportsReasoningEffort) {
      fallbackConfig.reasoningEffort = undefined;
    }
    return await this.callProvider(fallback, systemPrompt, userPrompt, fallbackConfig);
  }

  private async callWithFallback(
    systemPrompt: string,
    userPrompt: string,
    funcConfig: LLMFunctionConfig
  ): Promise<LLMResponse> {
    const { primary, fallback } = this.getProviders();

    try {
      return await this.callProvider(primary, systemPrompt, userPrompt, funcConfig);
    } catch (primaryError) {
      const errMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
      console.error(`[LLM] Primary provider (${primary.name}) failed:`, errMsg);

      if (this.is4xxError(primaryError)) {
        throw primaryError;
      }

      console.log(`[LLM] Falling back to ${fallback.name}...`);
      const fallbackConfig = { ...funcConfig };
      if (!fallback.supportsResponses) {
        fallbackConfig.apiType = 'chat';
        fallbackConfig.webSearch = false;
      }
      if (!fallback.supportsReasoningEffort) {
        fallbackConfig.reasoningEffort = undefined;
      }

      return await this.callProvider(fallback, systemPrompt, userPrompt, fallbackConfig);
    }
  }

  private is4xxError(error: unknown): boolean {
    if (error instanceof Error) {
      const match = error.message.match(/\((\d{3})\)/);
      if (match) {
        const status = parseInt(match[1]);
        return status >= 400 && status < 500;
      }
    }
    return false;
  }

  private mapReasoningEffortToThinking(effort?: string): { type: string } | undefined {
    if (!effort) return undefined;
    switch (effort) {
      case 'minimal':
        return { type: 'disabled' };
      case 'low':
        return { type: 'enabled' };
      case 'medium':
        return { type: 'enabled' };
      case 'high':
        return { type: 'enabled' };
      default:
        return undefined;
    }
  }

  private async callProvider(
    provider: ProviderInfo,
    systemPrompt: string,
    userPrompt: string,
    funcConfig: LLMFunctionConfig
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = funcConfig.model || provider.model;

    const useResponses = funcConfig.apiType === 'responses' && provider.supportsResponses;
    const useWebSearch = funcConfig.webSearch && provider.supportsWebSearch;
    const useReasoningEffort = funcConfig.reasoningEffort && provider.supportsReasoningEffort;

    try {
      let response: LLMResponse;

      if (useResponses) {
        response = await this.callResponsesAPI(provider, model, systemPrompt, userPrompt, {
          thinking: useReasoningEffort ? this.mapReasoningEffortToThinking(funcConfig.reasoningEffort) : undefined,
          webSearch: useWebSearch,
          maxTokens: funcConfig.maxTokens,
          temperature: funcConfig.temperature,
        });
      } else {
        const messages: LLMMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];
        response = await this.callChatAPI(provider, model, messages, {
          maxTokens: funcConfig.maxTokens,
          temperature: funcConfig.temperature,
        });
      }

      const latency = Date.now() - startTime;
      this.logCall(provider.name, model, useResponses ? 'responses' : 'chat', response, latency, true);

      return response;
    } catch (error) {
      const latency = Date.now() - startTime;
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logCall(provider.name, model, useResponses ? 'responses' : 'chat', null, latency, false, errMsg);
      throw error;
    }
  }

  private async callChatAPI(
    provider: ProviderInfo,
    model: string,
    messages: LLMMessage[],
    options: { maxTokens: number; temperature: number }
  ): Promise<LLMResponse> {
    let url = provider.baseUrl.replace(/\/+$/, '');
    if (!url.endsWith('/chat/completions')) {
      if (url.endsWith('/api/v3')) {
        url = url + '/chat/completions';
      } else if (!url.endsWith('/v1')) {
        url += '/v1/chat/completions';
      } else {
        url += '/chat/completions';
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      };

      console.log(`[LLM] Chat API call: ${provider.name} / ${model}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API 错误 (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: data.model,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('LLM API 调用超时 (300s)');
      }
      throw error;
    }
  }

  private async callResponsesAPI(
    provider: ProviderInfo,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    options: { thinking?: { type: string }; webSearch?: boolean; maxTokens: number; temperature: number }
  ): Promise<LLMResponse> {
    let url = provider.baseUrl.replace(/\/+$/, '');
    if (!url.endsWith('/responses')) {
      if (url.endsWith('/api/v3')) {
        url += '/responses';
      } else if (url.endsWith('/v1')) {
        url = url.replace('/v1', '/responses');
      } else {
        url += '/api/v3/responses';
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000);

    try {
      const body: Record<string, unknown> = {
        model,
        instructions: systemPrompt,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: userPrompt,
              },
            ],
          },
        ],
        max_output_tokens: options.maxTokens,
        temperature: options.temperature,
      };

      if (options.thinking) {
        body.thinking = options.thinking;
      }

      if (options.webSearch) {
        body.tools = [{
          type: 'web_search',
        }];
      }

      console.log(`[LLM] Responses API call: ${provider.name} / ${model} (thinking: ${options.thinking?.type || 'default'}, webSearch: ${!!options.webSearch})`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Responses API 错误 (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.output || !Array.isArray(data.output)) {
        throw new Error('Responses API 响应格式错误: 缺少 output');
      }

      const messageOutput = data.output.find((item: any) => item.type === 'message' && item.role === 'assistant');
      if (!messageOutput?.content?.[0]?.text) {
        throw new Error('Responses API 响应格式错误: 缺少文本内容');
      }

      return {
        content: messageOutput.content[0].text,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: data.model,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Responses API 调用超时 (240s)');
      }
      throw error;
    }
  }

  extractJSON(text: string): any {
    let cleanText = text.trim();

    cleanText = cleanText.replace(/^```(?:json)?\s*|\s*```$/g, '');

    try {
      return JSON.parse(cleanText);
    } catch (e) {
      console.log('[LLM] Direct JSON parse failed:', e.message);
    }

    const braceMatch = cleanText.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      let jsonText = braceMatch[0];

      try {
        jsonText = this.decodeHTMLEntities(jsonText);
        jsonText = this.fixUnclosedStrings(jsonText);
        jsonText = jsonText.replace(/,\s*([\]}])/g, '$1');
        jsonText = jsonText.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1 "$2":');
        jsonText = jsonText.replace(/([^\\])'/g, "$1\\'");
        jsonText = jsonText.replace(/\]\s*\[/g, '], [');
        jsonText = jsonText.replace(/\s+/g, ' ');
        return JSON.parse(jsonText);
      } catch (e) {
        console.log('[LLM] Enhanced JSON parse failed:', e.message);

        try {
          const truncated = this.repairTruncatedJSON(jsonText);
          if (truncated) return truncated;
        } catch (e3) {
          console.log('[LLM] Truncated JSON repair failed:', e3.message);
        }

        try {
          const sanitized = this.sanitizeJSON(jsonText);
          return JSON.parse(sanitized);
        } catch (e2) {
          console.log('[LLM] Sanitized JSON parse failed:', e2.message);

          try {
            const finalAttempt = this.aggressiveCleanJSON(cleanText);
            return JSON.parse(finalAttempt);
          } catch (e3) {
            console.log('[LLM] Final JSON parse attempt failed:', e3.message);
          }
        }
      }
    }

    console.log('[LLM] Raw response:', text.substring(0, 500) + '...');
    throw new Error('无法解析 AI 响应为 JSON');
  }

  private decodeHTMLEntities(text: string): string {
    // 解码 HTML 实体，如 &#12345; 或 &#x1F600;
    return text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
               .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  private sanitizeJSON(text: string): string {
    // 保留中文、日文、韩文、emoji、拉丁字母等有效字符
    // 移除控制字符和大多数非打印字符
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
               .replace(/[\u0080-\u009F]/g, '')
               .replace(/�/g, '');
  }

  private aggressiveCleanJSON(text: string): string {
    // 提取所有有效的 JSON 部分并拼接
    // 移除乱码和非 ASCII 控制字符，但保留 Unicode 字符
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = text.charCodeAt(i);

      // 保留有效的 JSON 字符
      if (
        (code >= 0x20 && code <= 0x10FFFF) || // 可打印 Unicode 字符
        char === '\n' || char === '\r' || char === '\t' || // 空白字符
        char === '"' || char === '{' || char === '}' || // JSON 特殊字符
        char === '[' || char === ']' ||
        char === ':' || char === ',' ||
        char === ' ' || char === '-' || char === '.' || // 数字和空格
        (char >= '0' && char <= '9') ||
        (char >= 'a' && char <= 'z') ||
        (char >= 'A' && char <= 'Z') ||
        char === '_' || char === '\\' || char === '/' || char === '+' ||
        char === '='
      ) {
        result += char;
      }
    }

    // 移除可能导致问题的序列
    result = result.replace(/[\x00-\x1F\x7F]/g, '');
    result = result.replace(/&#[^;]*;/g, ''); // 移除未解码的 HTML 实体
    result = result.replace(/\\+/g, '\\'); // 规范化多个反斜杠
    
    // 修复 UTF-8 编码问题，处理乱码
    try {
      // 尝试将字符串转换为 UTF-8 编码，然后再解码
      result = decodeURIComponent(escape(result));
    } catch (e) {
      // 如果转换失败，保持原始字符串
      console.log('[LLM] UTF-8 编码修复失败:', e.message);
    }

    return result;
  }

  private fixUnclosedStrings(text: string): string {
    let result = '';
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (escapeNext) {
        result += char;
        escapeNext = false;
      } else if (char === '\\') {
        result += char;
        escapeNext = true;
      } else if (char === '"') {
        result += char;
        inString = !inString;
      } else {
        result += char;
      }
    }
    
    if (inString) {
      result += '"';
    }
    
    return result;
  }

  private repairTruncatedJSON(text: string): any | null {
    let fixed = text.trimEnd();
    fixed = fixed.replace(/,\s*$/, '');

    let depth = 0;
    let inStr = false;
    let esc = false;
    for (const ch of fixed) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{' || ch === '[') depth++;
      if (ch === '}' || ch === ']') depth--;
    }

    if (inStr) fixed += '"';

    const closeStack: string[] = [];
    let inS = false;
    let es = false;
    for (const ch of fixed) {
      if (es) { es = false; continue; }
      if (ch === '\\') { es = true; continue; }
      if (ch === '"') { inS = !inS; continue; }
      if (inS) continue;
      if (ch === '{') closeStack.push('}');
      if (ch === '[') closeStack.push(']');
      if (ch === '}' || ch === ']') closeStack.pop();
    }

    fixed += closeStack.reverse().join('');

    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }

  private logCall(
    providerName: string,
    model: string,
    apiType: string,
    response: LLMResponse | null,
    latency: number,
    success: boolean,
    error?: string
  ) {
    const logEntry: LLMLogEntry = {
      id: uuidv4(),
      provider: providerName,
      model,
      apiType,
      promptTokens: response?.usage.promptTokens || 0,
      completionTokens: response?.usage.completionTokens || 0,
      totalTokens: response?.usage.totalTokens || 0,
      latencyMs: latency,
      success,
      errorMessage: error || null,
      createdAt: new Date().toISOString(),
    };

    recentLogs.unshift(logEntry);
    if (recentLogs.length > MAX_RECENT_LOGS) {
      recentLogs.pop();
    }

    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO llm_logs (id, provider, model, api_type, prompt_tokens, completion_tokens, total_tokens, latency_ms, success, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logEntry.id,
        providerName,
        model,
        apiType,
        logEntry.promptTokens,
        logEntry.completionTokens,
        logEntry.totalTokens,
        latency,
        success ? 1 : 0,
        error || null
      );
    } catch (e) {
      console.error('[LLM] 记录日志失败:', e);
    }

    console.log(`[LLM] ${providerName}/${model} (${apiType}) ${success ? 'OK' : 'FAIL'} ${latency}ms${error ? ' ' + error : ''}`);
  }
}

export const llmService = new LLMService();
