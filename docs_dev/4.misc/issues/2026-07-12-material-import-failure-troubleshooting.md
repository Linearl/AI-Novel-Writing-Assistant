# 素材导入失败排查指南

## 问题描述

用户在创建小说时使用"粘贴素材"功能，点击导入后提示导入失败。

## 排查步骤

### 1. 重现问题

1. 访问 http://localhost:5173
2. 选择"手动创建小说"模式
3. 在"粘贴素材"区域粘贴一段文字（至少10个字符）
4. 点击"解析素材"按钮
5. 观察错误信息

### 2. 查看服务器控制台输出

重启服务器后，服务器控制台会显示详细的错误信息：

```bash
# 查看服务器日志（最新20行）
tail -20 server/logs/app-*.log

# 或者查看实时输出
pnpm dev
```

错误信息格式：
- **成功**：`[INFO] POST /parse-material - Parse successful`
- **失败**：`[ERROR] POST /parse-material failed: <具体错误信息>`

### 3. 常见错误原因

#### 错误1：LLM配置问题
```
Error: Missing API key for provider: deepseek
```
**解决方案**：
- 检查 `server/.env` 文件中的 `DEEPSEEK_API_KEY` 是否配置
- 或在应用设置中配置正确的API密钥

#### 错误2：模型不可用
```
Error: Model not found: <model-name>
```
**解决方案**：
- 检查设置中的模型配置是否正确
- 确认模型名称拼写无误

#### 错误3：素材过短
```
Error: 素材内容至少 10 个字符
```
**解决方案**：
- 粘贴更详细的素材内容

#### 错误4：素材过长
```
Error: 素材内容最多 50000 个字符
```
**解决方案**：
- 精简素材内容，只保留核心信息

#### 错误5：LLM调用失败
```
Error: Request timeout
Error: Rate limit exceeded
```
**解决方案**：
- 稍后重试
- 检查网络连接
- 检查LLM服务状态

### 4. 查看日志文件

日志文件位置：`server/logs/app-YYYY-MM-DD.log`

```bash
# 查看今天的日志
cat server/logs/app-$(date +%Y-%m-%d).log | grep -i error

# 查看最近的错误
find server/logs -name "app-*.log" -exec grep -l "ERROR" {} \; | tail -1 | xargs grep "ERROR"
```

### 5. 验证LLM配置

#### 检查环境变量
```bash
# 检查server/.env文件
cat server/.env | grep -i api_key

# 应该看到类似：
# DEEPSEEK_API_KEY=your-api-key-here
```

#### 检查应用设置
1. 打开应用
2. 进入设置页面
3. 查看模型配置
4. 确认选择了正确的Provider和Model

### 6. 手动测试API

```bash
# 测试parse-material API（需要认证token）
curl -X POST http://localhost:13000/api/novels/parse-material \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "material": "这是一段测试素材，用于验证素材解析功能是否正常工作。",
    "provider": "deepseek",
    "model": "deepseek-chat"
  }'
```

## 最新更新

✅ 已在 materialParse路由中添加日志记录（2026-07-12）

服务器现在会记录：
- 请求开始（provider、model、素材长度）
- 成功完成
- 失败详情（完整错误堆栈）

重启服务器后，错误信息将记录在：
- 服务器控制台输出
- `server/logs/app-*.log` 日志文件

## 联系支持

如果问题仍然存在，请提供：
1. 错误信息截图
2. 服务器控制台输出
3. 粘贴的素材内容（如果可能）
4. 使用的Provider和Model配置

---

**相关文件**：
- `server/src/modules/novel/http/novelMaterialParseRoutes.ts` - 素材解析路由
- `server/src/prompting/prompts/novel/materialParse.prompts.ts` - 解析prompt
- `client/src/pages/novels/components/MaterialParseDialog.tsx` - 前端对话框
