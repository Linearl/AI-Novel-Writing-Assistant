import type { NextFunction, Request, Response } from "express";
import { tokenService } from "../services/auth/TokenService";
import { resolveAppRuntimeMode } from "../runtime/appPaths";

/**
 * API Token 认证中间件
 * 检查 Authorization: Bearer <token> header
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 桌面运行时：server 仅监听 127.0.0.1 本地回环（ALLOW_LAN=false），且桌面
  // 客户端没有 token 注入通道（client 端无 api_token 写入点），token 鉴权会
  // 挡住全部 UI 请求。桌面模式下跳过鉴权，web 部署保持原行为。
  if (resolveAppRuntimeMode() === "desktop") {
    next();
    return;
  }

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
