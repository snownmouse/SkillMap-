import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return ({
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: isProduction 
      ? process.env.CORS_ORIGIN || 'https://your-production-domain.com' 
      : '*',
    dbPath: process.env.DB_PATH || path.join(process.cwd(), 'data', 'skillmap.db'),

    llm: {
      provider: process.env.LLM_PROVIDER || 'ark',
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4000'),

      ark: {
        apiKey: process.env.ARK_API_KEY || '',
        baseUrl: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
        model: process.env.ARK_MODEL || 'doubao-seed-2-0-lite-260215',
      },
      siliconflow: {
        apiKey: process.env.SILICONFLOW_API_KEY || '',
        baseUrl: process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
        model: process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3',
      },
    },

    security: {
      passwordMinLength: 6,
      passwordComplexity: isProduction,
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 100, // 每个IP在windowMs内最多100个请求
      },
    },
  });
};

export const config = getConfig();
