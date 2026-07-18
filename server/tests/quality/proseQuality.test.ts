/**
 * REQ-7072: 散文质量检测器 — 单元测试
 *
 * 验证 9 种问题码的检测效果、安全机制（引号豁免、代码块豁免、上限控制）
 * 以及 RuntimeAuditReport 格式转换。
 *
 * Note: 测试名称中的中文引号「」用于避免与 JS 字符串分隔符冲突。
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectProseQuality,
  buildProseQualityAuditReport,
} from "../../src/services/novel/runtime/proseQuality/ProseQualityDetector";

// ─── P1: 否定翻转句 ─────────────────────────────────────────────────────

describe("prose_negative_flip (P1)", () => {
  it('detects 「不是……而是……」 pattern', () => {
    const content = "这并不是一个简单的问题，而是一个需要深思的困境。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_negative_flip");
    assert.ok(found.length > 0, "应检测到否定翻转句");
    assert.equal(found[0].severity, "high");
  });

  it('skips negative flip inside quotes', () => {
    const content = '他说：“这并不是一个简单的问题，而是一个复杂的难题。”';
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_negative_flip");
    assert.equal(found.length, 0, "引号内否定翻转句应豁免");
  });

  it('does not flag 「不是……就是……」 short antithesis', () => {
    const content = "他不是在读书就是在写字，总之没闲着。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_negative_flip");
    assert.equal(found.length, 0);
  });

  it("does not flag normal narration", () => {
    const content = "夕阳西下，天边的云彩被染成了金红色。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_negative_flip");
    assert.equal(found.length, 0);
  });
});

// ─── P2: 破折号/省略号 ──────────────────────────────────────────────────

describe("prose_dash_or_ellipsis (P2)", () => {
  it("detects em dash ——", () => {
    const content = "他站在那里——一动不动，仿佛时间停止了。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_dash_or_ellipsis");
    assert.ok(found.length > 0);
  });

  it("detects ellipsis ……", () => {
    const content = "他欲言又止……最终还是没有说出口。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_dash_or_ellipsis");
    assert.ok(found.length > 0);
  });

  it("does not flag normal punctuation", () => {
    const content = "他走过来，看了看四周。没有发现什么异常。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_dash_or_ellipsis");
    assert.equal(found.length, 0);
  });
});

// ─── P3: 连续过短句号 ──────────────────────────────────────────────────

describe("prose_period_stutter (P3)", () => {
  it("detects 6+ consecutive short sentences", () => {
    const content =
      "他看过来了。她低下了头。风吹过树梢。叶子落下了。心跳加速了。他开口说话。她转身离去。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_period_stutter");
    assert.ok(found.length > 0);
    assert.equal(found[0].severity, "medium");
  });

  it("does not flag fewer than 6 short sentences", () => {
    const content = "他看过来了。她低下了头。风吹过树梢。这是一段正常长度的叙述文字。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_period_stutter");
    assert.equal(found.length, 0);
  });

  it("skips dialogue lines", () => {
    const content = '“说吧。我听着。你继续说。为什么不说话。告诉我真相。别走。”';
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_period_stutter");
    assert.equal(found.length, 0);
  });
});

// ─── P4: 超长段落 ──────────────────────────────────────────────────────

describe("prose_long_paragraph (P4)", () => {
  it("detects paragraph over 220 visible chars", () => {
    const content =
      "他走过那扇古老而又斑驳的铁门时，暮色已经完全笼罩了整个寂静的庭院。墙角的青苔在昏暗的光线下泛着暗绿色的微光，仿佛有什么东西正在那里悄然生长。远处的钟声传来，一下又一下，像是某种古老的仪式正在被悄然唤醒。他停下脚步，回头看了看来时的路，那条蜿蜒曲折的小径已被浓雾完全吞没，根本看不清楚来处。他深深吸了一口气，空气中混合着潮湿泥土和腐烂落叶的气味，还有一丝若有若无的栀子花香。这一切都让他感到强烈的不安，但又说不出具体是什么原因让他如此困扰和恐惧。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_long_paragraph");
    assert.ok(found.length > 0);
    assert.equal(found[0].severity, "medium");
  });

  it("does not flag short paragraphs", () => {
    const content = "这是一段很短的文字。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_long_paragraph");
    assert.equal(found.length, 0);
  });
});

// ─── P5: 逐字复读 ──────────────────────────────────────────────────────

describe("prose_verbatim_repeat (P5)", () => {
  it("detects adjacent identical paragraphs", () => {
    const content = `这是第一段内容，为了测试相邻段落复读检测功能。

这是第一段内容，为了测试相邻段落复读检测功能。`;
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_verbatim_repeat");
    assert.ok(found.length > 0);
    assert.equal(found[0].severity, "critical");
  });

  it("does not flag normal distinct paragraphs", () => {
    const content = `这是第一段不一样的内容。

这是另一段完全不同的内容。`;
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_verbatim_repeat");
    assert.equal(found.length, 0);
  });
});

// ─── P6: 疑似截断 ──────────────────────────────────────────────────────

describe("prose_truncation (P6)", () => {
  it("detects text without terminal punctuation at end", () => {
    const content =
      "他推开门走进了那间幽暗的房间，房间里弥漫着一股奇怪的气味，混合着潮湿和灰尘的味道。他警觉地环顾四周，发现桌子上静静放着一封信，信上写着他的名字，信封边缘已经泛黄，但收件人地址那一栏却是空白";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_truncation");
    assert.ok(found.length > 0);
    assert.equal(found[0].severity, "critical");
  });

  it("does not flag properly-ended text", () => {
    const content = "他推开门走进了房间，房间里很安静，窗外传来阵阵鸟鸣。他走到桌前坐下，打开了那封期待已久的信。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_truncation");
    assert.equal(found.length, 0);
  });

  it("skips truncation check for very short text (<80 chars)", () => {
    const content = "未完待续";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_truncation");
    assert.equal(found.length, 0);
  });
});

// ─── P7: AI 身份泄漏 ────────────────────────────────────────────────────

describe("prose_ai_self_reference (P7)", () => {
  it("detects AI identity leak via 「作为AI」", () => {
    const content = "作为一名人工智能，我无法继续创作这个章节。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_ai_self_reference");
    assert.ok(found.length > 0);
    assert.equal(found[0].severity, "critical");
  });

  it("detects refusal language 「我无法生成」", () => {
    const content = "我无法继续提供本章的完整内容。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_ai_self_reference");
    assert.ok(found.length > 0);
  });

  it("exempts AI language inside quotes", () => {
    const content = '他说：“作为一名人工智能，这个世界需要重新审视。”';
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_ai_self_reference");
    assert.equal(found.length, 0);
  });

  it("does not flag normal text containing single characters of pattern", () => {
    const content = "他是一个聪明的人，工智能解决很多问题。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_ai_self_reference");
    assert.equal(found.length, 0);
  });
});

// ─── P8: 占位符残留 ────────────────────────────────────────────────────

describe("prose_placeholder_leak (P8)", () => {
  it("detects TODO", () => {
    const content = "他走进了房间。TODO: 这里需要补充房间的描述。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_placeholder_leak");
    assert.ok(found.length > 0);
    assert.equal(found[0].severity, "critical");
  });

  it("detects 「待补充」", () => {
    const content = "这是一段文字内容。待补充。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_placeholder_leak");
    assert.ok(found.length > 0);
  });

  it("exempts placeholders inside quotes", () => {
    const content = '“这里有TODO标签”，他说。';
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_placeholder_leak");
    assert.equal(found.length, 0);
  });
});

// ─── P9: 工程术语泄漏 ──────────────────────────────────────────────────

describe("prose_engineering_term_leak (P9)", () => {
  it("detects strong term 「细纲」", () => {
    const content = "根据细纲的设计，这一章需要完成三个情节点。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_engineering_term_leak");
    assert.ok(found.length > 0);
    assert.equal(found[0].severity, "high");
  });

  it("detects soft term 「伏笔」", () => {
    const content = "这里要为后文埋下一个伏笔，让读者感到意外。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_engineering_term_leak");
    assert.ok(found.length > 0);
    assert.equal(found[0].severity, "medium");
  });

  it("exempts engineering terms inside quotes", () => {
    const content = '“这个伏笔埋得好”，她称赞道。';
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_engineering_term_leak");
    assert.equal(found.length, 0);
  });

  it("does not flag normal storytelling", () => {
    const content = "夕阳西下，他走在回家的路上，想起今天发生的一切。";
    const report = detectProseQuality(content);
    const found = report.findings.filter((f) => f.code === "prose_engineering_term_leak");
    assert.equal(found.length, 0);
  });
});

// ─── 安全机制 ──────────────────────────────────────────────────────────

describe("Safety mechanisms", () => {
  it("skips text inside code fences", () => {
    const content = `正常段落。待补充的内容。
\`\`\`
TODO: 这里是代码块
作为AI，这段不应该被检测
\`\`\`
`;
    const report = detectProseQuality(content);
    const findings = report.findings;
    for (const f of findings) {
      assert.ok(
        f.excerpt.includes("代码块") === false,
        "代码块内文本不应产生finding",
      );
    }
  });

  it("skips blockquote lines", () => {
    const content = "> TODO: 这是一个引用行，不应被检测";
    const report = detectProseQuality(content);
    assert.equal(report.findings.length, 0);
  });

  it("caps at 8 findings per code", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `第${i + 1}段破折号——`);
    const content = lines.join("\n");
    const report = detectProseQuality(content);
    const dashFindings = report.findings.filter((f) => f.code === "prose_dash_or_ellipsis");
    assert.ok(dashFindings.length <= 8, `同种问题码不应超过8条，实际: ${dashFindings.length}`);
  });

  it("caps at 40 total findings", () => {
    const lines: string[] = [];
    for (let i = 0; i < 60; i++) {
      lines.push(`第${i}段——有问题——`);
    }
    const content = lines.join("\n");
    const report = detectProseQuality(content);
    assert.ok(report.findings.length <= 40, `总计不应超过40条，实际: ${report.findings.length}`);
  });
});

// ─── RuntimeAuditReport 格式转换 ───────────────────────────────────────

describe("buildProseQualityAuditReport", () => {
  it("returns null when no findings", () => {
    const report = detectProseQuality("正常的文学叙述文字，没有任何AI痕迹。");
    const auditReport = buildProseQualityAuditReport({
      novelId: "novel-1",
      chapterId: "chapter-1",
      report,
    });
    assert.equal(auditReport, null);
  });

  it("produces valid RuntimeAuditReport when findings exist", () => {
    const content = "这是一段有TODO的文本。";
    const report = detectProseQuality(content);
    const auditReport = buildProseQualityAuditReport({
      novelId: "n1",
      chapterId: "c1",
      report,
    });
    assert.ok(auditReport !== null);
    assert.equal(auditReport!.auditType, "mode_fit");
    assert.ok(auditReport!.issues.length > 0);
    assert.equal(auditReport!.novelId, "n1");
    assert.equal(auditReport!.chapterId, "c1");
    assert.ok(typeof auditReport!.overallScore === "number");
    assert.ok(auditReport!.overallScore! >= 30 && auditReport!.overallScore! <= 100);
  });
});

// ─── hasBlockingFindings ────────────────────────────────────────────────

describe("hasBlockingFindings", () => {
  it("is false when no issues", () => {
    const report = detectProseQuality("正常的叙事文字，没有AI痕迹。");
    assert.equal(report.hasBlockingFindings, false);
  });

  it("is true with critical issues", () => {
    const content = "TODO: 这里需要补充";
    const report = detectProseQuality(content);
    assert.equal(report.hasBlockingFindings, true);
  });

  it("is true with high issues", () => {
    const content = "并不是他不想去，而是那扇门——早已锁死了。";
    const report = detectProseQuality(content);
    assert.equal(report.hasBlockingFindings, true);
  });

  it("is false with only medium issues", () => {
    const content = "这是一个正常的段落长度。".repeat(30);
    const report = detectProseQuality(content);
    const allMediumOrLow = report.findings.every(
      (f) => f.severity === "medium" || f.severity === "low",
    );
    if (allMediumOrLow) {
      assert.equal(report.hasBlockingFindings, false);
    }
  });
});
