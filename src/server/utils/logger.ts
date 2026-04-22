export enum ErrorCode {
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  LLM_ERROR = 'LLM_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  userMessage: string;
  details?: any;
}

export function createError(
  code: ErrorCode,
  message: string,
  statusCode: number,
  userMessage?: string,
  details?: any
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusCode;
  error.userMessage = userMessage || message;
  error.details = details;
  return error;
}

export const errors = {
  validation: (message: string, details?: any) =>
    createError(ErrorCode.VALIDATION_ERROR, message, 400, '输入数据验证失败，请检查输入', details),

  notFound: (resource: string) =>
    createError(ErrorCode.NOT_FOUND, `${resource}不存在`, 404, `找不到请求的${resource}`),

  unauthorized: (message = '未授权访问') =>
    createError(ErrorCode.UNAUTHORIZED, message, 401, '请先登录后再操作'),

  forbidden: (message = '禁止访问') =>
    createError(ErrorCode.FORBIDDEN, message, 403, '您没有权限执行此操作'),

  server: (message = '服务器内部错误', details?: any) =>
    createError(ErrorCode.SERVER_ERROR, message, 500, '服务器开小差了，请稍后重试', details),

  network: (message = '网络错误') =>
    createError(ErrorCode.NETWORK_ERROR, message, 503, '网络连接异常，请检查网络后重试'),

  llm: (message = 'AI 服务错误', details?: any) =>
    createError(ErrorCode.LLM_ERROR, message, 502, 'AI 服务暂时不可用，请稍后重试', details),

  database: (message = '数据库错误', details?: any) =>
    createError(ErrorCode.DATABASE_ERROR, message, 500, '数据处理失败，请稍后重试', details),
};

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
  },
  error: (message: string, error?: Error | AppError | any, ...args: any[]) => {
    const errorInfo = error instanceof Error ? {
      message: error.message,
      code: (error as AppError).code || ErrorCode.UNKNOWN_ERROR,
      stack: error.stack
    } : error;
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, errorInfo, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
  }
};

export function errorHandler(error: Error | AppError, defaultMessage = '操作失败') {
  if ((error as AppError).code) {
    const appError = error as AppError;
    return {
      success: false,
      error: appError.userMessage || defaultMessage,
      code: appError.code,
      details: appError.details
    };
  }

  logger.error('未分类的错误', error);
  return {
    success: false,
    error: defaultMessage,
    code: ErrorCode.UNKNOWN_ERROR
  };
}
