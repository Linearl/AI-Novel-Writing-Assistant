import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { resolveAppDataRoot, resolveAppRuntimeMode } from "../../runtime/appPaths";

const TOKEN_LENGTH = 32;

/**
 * 解析 API_TOKEN 持久化文件路径：
 * - 桌面打包环境（asar 只读）：写入可写的用户数据目录 server.env
 * - Web/开发环境：保持写入 server/.env（__dirname 是 server/src/services/auth/）
 */
function resolveEnvFilePath(): string {
  if (resolveAppRuntimeMode() === "desktop") {
    return join(resolveAppDataRoot(), "server.env");
  }
  return resolve(__dirname, "../../../.env");
}

export class TokenService {
  private token: string | null = null;

  /**
   * 获取 API Token，如果不存在则生成并写入 .env
   */
  getToken(): string {
    if (this.token) {
      return this.token;
    }

    // 从 API_TOKEN 持久化文件读取（dotenv/config 可能加载的是项目根目录的 .env）
    this.token = this.readTokenFromEnvFile();
    if (this.token) {
      return this.token;
    }

    // 生成新 token 并写入持久化文件
    this.token = randomBytes(TOKEN_LENGTH).toString("hex");
    this.appendToEnvFile(this.token);
    return this.token;
  }

  /**
   * 从 API_TOKEN 持久化文件读取
   */
  private readTokenFromEnvFile(): string | null {
    if (!existsSync(resolveEnvFilePath())) {
      return null;
    }

    const content = readFileSync(resolveEnvFilePath(), "utf-8");
    const match = content.match(/^API_TOKEN=(.+)$/m);
    if (match && match[1]) {
      const token = match[1].trim();
      if (token) {
        // 同步到 process.env
        process.env.API_TOKEN = token;
        return token;
      }
    }

    return null;
  }

  /**
   * 验证 token 是否有效
   */
  validateToken(token: string | undefined): boolean {
    if (!token) {
      return false;
    }
    const currentToken = this.getToken();
    return token === currentToken;
  }

  /**
   * 将 token 追加到持久化文件
   */
  private appendToEnvFile(token: string): void {
    const envFilePath = resolveEnvFilePath();
    mkdirSync(dirname(envFilePath), { recursive: true });
    const envLine = `\nAPI_TOKEN=${token}\n`;

    if (existsSync(envFilePath)) {
      const content = readFileSync(envFilePath, "utf-8");
      if (!content.includes("API_TOKEN=")) {
        writeFileSync(envFilePath, content + envLine, "utf-8");
      }
    } else {
      writeFileSync(envFilePath, `# AI Novel API Token${envLine}`, "utf-8");
    }

    // 同步到 process.env
    process.env.API_TOKEN = token;
  }
}

// 单例导出
export const tokenService = new TokenService();
