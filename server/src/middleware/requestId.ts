import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * 请求 ID 中间件
 * 读取 x-request-id header 或生成 UUID，附加到 req.id 并设置响应 header
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId =
    (req.headers["x-request-id"] as string) || randomUUID();
  req.id = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
