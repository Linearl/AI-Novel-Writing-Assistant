import puppeteer from "puppeteer";

const BASE = "http://localhost:5173";
const TOKEN = "0a147fb3a5eb86f90b4a38a4d65e456087a11c07356f7df2b492bc8a1655d18f";
const NOVEL_ID = "cmr4f5il90009e046j9fqlqm2";

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument((token) => {
    localStorage.setItem("api_token", token);
  }, TOKEN);

  // 收集所有请求
  const allRequests = [];
  page.on("request", (req) => {
    allRequests.push({ url: req.url(), method: req.method(), startTime: Date.now(), id: allRequests.length });
  });
  page.on("response", (res) => {
    const match = allRequests.findLast((r) => r.url === res.url() && !r.endTime);
    if (match) {
      match.endTime = Date.now();
      match.status = res.status();
      match.duration = match.endTime - match.startTime;
    }
  });

  // 监控导航
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      console.log(`  [NAV] ${frame.url().split("?")[1] ?? frame.url()}`);
    }
  });

  console.log("=== 1. 首次加载 ===");
  const loadStart = Date.now();
  await page.goto(`${BASE}/novels/${NOVEL_ID}/edit?stage=basic`, { waitUntil: "domcontentloaded", timeout: 15000 });
  // 等待 React 渲染
  await page.waitForSelector("button", { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 3000));
  console.log(`加载耗时: ${Date.now() - loadStart}ms`);
  console.log(`总请求数: ${allRequests.length}`);
  allRequests.length = 0;

  // 找到所有 tab 按钮
  const tabButtons = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const tabLabels = ["项目设定", "故事宏观规划", "角色准备", "卷战略", "节奏", "章节执行", "质量修复", "版本历史"];
    const found = [];
    for (const btn of buttons) {
      const text = btn.textContent?.trim() ?? "";
      for (const label of tabLabels) {
        if (text.includes(label)) {
          found.push({ text: text.slice(0, 30), label });
          break;
        }
      }
    }
    return found;
  });
  console.log(`\n找到 ${tabButtons.length} 个 Tab 按钮:`);
  for (const t of tabButtons) console.log(`  "${t.text}"`);

  // 定义切换序列
  const switchSequence = [
    { target: "章节执行", name: "chapter" },
    { target: "卷战略", name: "outline" },
    { target: "节奏", name: "structured" },
    { target: "质量修复", name: "pipeline" },
    { target: "角色准备", name: "character" },
    { target: "项目设定", name: "basic" },
    // 第二轮：热缓存
    { target: "章节执行", name: "chapter(2nd)" },
    { target: "卷战略", name: "outline(2nd)" },
    { target: "章节执行", name: "chapter(3rd)" },
  ];

  console.log("\n=== 2. Tab 切换详细测量 ===");
  for (const { target, name } of switchSequence) {
    allRequests.length = 0;

    // 记录切换前的 DOM 特征
    const beforeText = await page.evaluate(() => {
      const main = document.querySelector("main") || document.querySelector("[class*='space-y']");
      return main?.textContent?.slice(0, 50) ?? "";
    });

    const start = Date.now();

    // 点击按钮
    const clicked = await page.evaluate((label) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent?.includes(label));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, target);

    if (!clicked) {
      console.log(`→ ${name}: 按钮未找到，跳过`);
      continue;
    }

    // 等待 DOM 变化（最多 5 秒）
    let domChangeTime = 0;
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const afterText = await page.evaluate(() => {
        const main = document.querySelector("main") || document.querySelector("[class*='space-y']");
        return main?.textContent?.slice(0, 50) ?? "";
      });
      if (afterText !== beforeText) {
        domChangeTime = Date.now() - start;
        break;
      }
    }

    // 等待网络安静（再等 2 秒收集后续请求）
    await new Promise((r) => setTimeout(r, 2000));
    const totalTime = Date.now() - start;

    // 分类请求
    const viteModuleReqs = allRequests.filter((r) => r.url.includes("/src/") || r.url.includes("/@"));
    const apiReqs = allRequests.filter((r) => r.url.includes("/api/") && !r.url.includes("/src/"));
    const otherReqs = allRequests.filter((r) => !r.url.includes("/src/") && !r.url.includes("/@") && !r.url.includes("/api/"));

    const navHappened = allRequests.some((r) => r.url.includes("/src/main") || r.url.includes("/src/index"));

    console.log(`→ ${name}: domChange=${domChangeTime}ms total=${totalTime}ms nav=${navHappened}`);
    console.log(`  请求: vite=${viteModuleReqs.length} api=${apiReqs.length} other=${otherReqs.length}`);

    if (apiReqs.length > 0) {
      for (const req of apiReqs) {
        const short = req.url.replace(/https?:\/\/[^/]+/, "");
        console.log(`    API: ${req.method} ${short.slice(0, 70)} → ${req.status} ${req.duration}ms`);
      }
    }
    if (navHappened) {
      console.log(`  ⚠️ 检测到整页导航！Vite 模块重新加载`);
    }
  }

  await browser.close();
  console.log("\n=== 完成 ===");
})().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
