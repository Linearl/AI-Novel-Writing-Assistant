import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const TOKEN_LENGTH = 32;
const ENV_FILE_PATH = resolve(process.cwd(), ".env");

export class TokenService {
  private token: string | null = null;

  /**
   * 获取 API Token，如果不存在则生成并写入 .env
   */
  getToken(): string {
    if (this.token) {
      return this.token;
    }

    // 尝试从环境变量读取
    if (process.env.API_TOKEN) {
      this.token = process.env.API_TOKEN;
      return this.token;
    }

    // 生成新 token 并写入 .env
    this.token = randomBytes(TOKEN_LENGTH).toString("hex");
    this.appendToEnvFile(this.token);
    return this.token;
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
   * 将 token 追加到 .env 文件
   */
  private appendToEnvFile(token: string): void {
    const envLine = `\nAPI_TOKEN=${token}\n`;

    if (existsSync(ENV_FILE_PATH)) {
      const content = readFileSync(ENV_FILE_PATH, "utf-8");
      if (!content.includes("API_TOKEN=")) {
        writeFileSync(ENV_FILE_PATH, content + envLine, "utf-8");
      }
    } else {
      writeFileSync(ENV_FILE_PATH, `# AI Novel API Token${envLine}`, "utf-8");
    }

    // 同步到 process.env
    process.env.API_TOKEN = token;
  }
}

// 单例导出
export const tokenService = new TokenService();
