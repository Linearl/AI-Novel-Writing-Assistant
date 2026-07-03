import rateLimit from "express-rate-limit";

/**
 * 全局速率限制：100 req/min
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 100,
  standardHeaders: true, // 返回 RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later",
  },
});

/**
 * LLM 端点速率限制：20 req/min
 */
export const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "LLM rate limit exceeded, please try again later",
  },
});

/**
 * Feedback 端点速率限制：30 req/min
 */
export const feedbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Feedback rate limit exceeded, please try again later",
  },
});
