import type { NextFunction, Request, Response } from "express";
import { tokenService } from "../services/auth/TokenService";

/**
 * API Token 认证中间件
 * 检查 Authorization: Bearer <token> header
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 跳过健康检查端点（中间件挂载在 /api，req.path 是相对路径）
  if (req.path === "/health" || req.path === "/health/ready") {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: "Missing authorization header",
    });
    return;
  }

  // 支持 Bearer token 格式
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!tokenService.validateToken(token)) {
    res.status(401).json({
      success: false,
      error: "Invalid API token",
    });
    return;
  }

  next();
}
