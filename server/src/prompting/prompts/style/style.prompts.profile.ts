import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { PromptAsset } from "../../core/promptTypes";
import {
  antiAiRuleAiDraftSchema,
  chapterEditAntiAiExtractSchema,
  chapterEditStyleForkSchema,
  styleProfileAntiAiSelectionSchema,
  styleGeneratedProfileSchema,
  styleProfileExtractionSchema,
  styleProfileMetadataSchema,
  styleProfileSanitizeForGenerationSchema,
} from "./style.promptSchemas";

export interface StyleProfileExtractionPromptInput {
  name: string;
  category?: string;
  sourceText: string;
  retryForFeatures?: boolean;
}

export interface StyleProfileFromBookAnalysisPromptInput {
  analysisTitle: string;
  name: string;
  sourceText: string;
}

export interface StyleProfileFromBriefPromptInput {
  brief: string;
  name?: string;
  category?: string;
}

export interface StyleProfileMetadataPromptInput {
  name: string;
  sourceType: "from_text" | "from_brief" | "from_book_analysis";
  preferredCategory?: string;
  styleDigest: string;
}

export interface StyleProfileAntiAiSelectionPromptInput {
  name: string;
  summary?: string;
  styleDigest: string;
  riskDigest: string;
  catalogText: string;
  maxRuleCount?: number;
}

export interface StyleProfileSanitizeForGenerationPromptInput {
  profileName: string;
  styleContractText: string;
  sourceDigest: string;
}

export interface AntiAiRuleAiDraftPromptInput {
  mode: "create" | "improve";
  instruction: string;
  currentRuleText?: string;
}

export const styleProfileExtractionPrompt: PromptAsset<
  StyleProfileExtractionPromptInput,
  z.infer<typeof styleProfileExtractionSchema>
> = {
  id: "style.profile.extract",
  version: "v2",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: styleProfileExtractionSchema,
  render: (input) => [
    new SystemMessage([
      "你是小说写法特征提取器，负责把用户提供的文本整理成一份可用于仿写、迁移、调参和后续规则生成的“写法核心草稿 JSON”。",
      "你的任务不是写赏析，不是写读后感，而是尽可能完整地提取可执行、可迁移、可控制的写法特征。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "输出字段必须且只能包括：",
      "name, description, analysisMarkdown, summary, features。",
      "",
      "全局硬规则：",
      "1. 所有字段值必须使用简体中文。",
      "2. 只能基于用户提供的原文提取，不得编造原文中不存在的写法特征。",
      "3. 允许做低风险归纳，但禁止把模糊印象写成强结论。",
      "4. 输出目标是“为后续仿写与迁移服务”，因此优先提取可操作特征，而不是空泛评价。",
      "5. 这一步只负责高价值核心信息，不负责分类标签、适配题材、反AI规则选择或 preset 组合。",
      "",
      "字段要求：",
      "1. name：保留输入写法名称，或在其基础上做极小幅度规范化，不要另起新名。",
      "2. description：用简洁中文概括这套写法最核心的辨识度、读感和适用方向。",
      "3. analysisMarkdown：写成面向内部使用的短分析稿，说明这套写法的组成、优势、迁移边界与风险。要求短、实、可编辑，不要写成赏析腔长文。",
      "4. summary：用 1-2 句话概括“这套写法最值得抓住的核心”。",
      "",
      "features 规则：",
      "1. features 是本次输出的核心，必须尽量完整覆盖 narrative、language、dialogue、rhythm、fingerprint 五类特征。",
      "2. 不要为了保守而过度删减，能稳定抽出的都要保留。",
      "3. 每个 feature 都必须提供 keepRulePatch；如果该特征适合在迁移时做弱化，再提供 weakenRulePatch。",
      "4. 每个 feature 都必须具体、可执行，不能写成“文笔较好”“节奏不错”“人物鲜明”这类空话。",
      "5. feature 应优先描述“怎么写出来”，而不是只描述“读起来像什么”。",
      "6. group 只能使用：narrative、language、dialogue、rhythm、fingerprint。",
      "7. importance / imitationValue / transferability / fingerprintRisk 都必须是 0-1 之间的小数。",
      "8. fingerprint 类特征要特别注意：既要指出辨识度来源，也要评估直接照搬的风险。",
      "",
      "质量要求：",
      "1. narrative 特征优先提取：推进方式、信息释放方式、视角控制、冲突组织、场景切换逻辑。",
      "2. language 特征优先提取：句式长度、修辞习惯、用词密度、口语/书面倾向、感官描写方式。",
      "3. dialogue 特征优先提取：台词长短、信息承载方式、潜台词强弱、人物区分度。",
      "4. rhythm 特征优先提取：段落密度、快慢切换、钩子点、停顿方式、爆点节奏。",
      "5. fingerprint 特征优先提取：最容易让人认出“像这一路写法”的结构性痕迹。",
      "6. 不要把 analysisMarkdown 和 features 写成同义重复，analysisMarkdown 负责总分析，features 负责结构化拆解。",
      "",
      input.retryForFeatures
        ? [
            "重试硬规则：",
            "1. 上一次返回的 features 不可用，这一次必须返回非空 features 数组。",
            "2. 如果原文长度与信息密度允许，优先返回至少 8 个 feature。",
            "3. 若其他字段不好判断，可以简短处理，但绝不能省略 features。",
            "4. 优先补足结构化特征，而不是继续写泛分析。",
          ].join("\n")
        : "",
    ].filter(Boolean).join("\n")),
    new HumanMessage([
      `写法名称：${input.name}`,
      `建议分类：${input.category ?? "未指定"}`,
      "",
      "原文：",
      input.sourceText,
      input.retryForFeatures
        ? [
            "",
            "重试要求：",
            "- 至少返回 8 个 feature（如果原文足够长）。",
            "- 必须使用精确字段名 features。",
            "- feature.group 只能是 narrative、language、dialogue、rhythm、fingerprint。",
          ].join("\n")
        : "",
    ].filter(Boolean).join("\n")),
  ],
};

export const styleProfileFromBookAnalysisPrompt: PromptAsset<
  StyleProfileFromBookAnalysisPromptInput,
  z.infer<typeof styleGeneratedProfileSchema>
> = {
  id: "style.profile.from_book_analysis",
  version: "v3",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: styleGeneratedProfileSchema,
  render: (input) => [
    new SystemMessage([
      "你是小说写法资产编辑器。",
      "你的任务是把拆书分析中的“文风与技法”整理为一份可直接进入系统使用的“写法核心资产 JSON”。",
      "这不是读后感，不是文学赏析，也不是泛泛总结，而是要把写法拆成可落地、可迁移、可控制的规则资产。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "输出字段必须且只能包括：",
      "name, description, analysisMarkdown, narrativeRules, characterRules, languageRules, rhythmRules。",
      "",
      "全局硬规则：",
      "1. 所有字段值必须使用简体中文。",
      "2. 只能基于给定的拆书分析文本进行提炼，不得捏造原分析中没有依据的写法特征。",
      "3. 允许做低风险归纳，但禁止把模糊印象写成强规则。",
      "4. 输出目标是“给后续写作系统直接使用”，因此必须优先强调可执行性，而不是分析腔。",
      "5. 这一步只负责核心规则与短分析稿，不负责分类标签、适配题材或反AI规则选择。",
      "",
      "字段要求：",
      "1. name：使用给定写法名称，可做轻微规范化，但不要另起一套新名称。",
      "2. description：用简洁中文概括这套写法最核心的风格定位、使用方向和辨识度来源。",
      "3. analysisMarkdown：写成结构化短分析稿，说明这套写法的组成、适用边界、长处、迁移风险和使用重点，但不要空泛。",
      "",
      "规则层要求：",
      "1. narrativeRules / characterRules / languageRules / rhythmRules 必须是结构化对象，不能写成字符串或数组摘要。",
      "2. 每组规则都必须尽量体现“应该怎么写”“应该避免什么”“优先保留什么”，而不是只写风格印象。",
      "3. 规则必须具体、清楚、可执行，避免“增强代入感”“注意节奏”“人物更鲜明”这类空话。",
      "4. narrativeRules 重点提取：推进方式、信息释放、视角组织、冲突组织、场景切换、钩子设计。",
      "5. characterRules 重点提取：人物出场方式、情绪表达、关系张力、台词承载、人物区分方式、行为逻辑呈现。",
      "6. languageRules 重点提取：句式长度倾向、用词风格、修辞习惯、描写密度、口语/书面倾向、表达克制度。",
      "7. rhythmRules 重点提取：快慢节奏、段落密度、停顿方式、爆点布置、信息推进频率、收尾牵引方式。",
      "",
      "质量要求：",
      "1. 输出必须像一份可直接存入系统的写法资产，而不是分析备注。",
      "2. 各字段之间必须一致，不得出现 description 说一种风格、规则却落成另一种写法。",
      "3. 不要把 analysisMarkdown 与各规则层写成同义重复，analysisMarkdown 负责总分析，规则层负责执行约束。",
      "4. 如果输入分析偏少，应做保守提炼，宁可少而稳，也不要凭空补复杂规则。",
    ].join("\n")),
    new HumanMessage([
      `拆书分析标题：${input.analysisTitle}`,
      `写法名称：${input.name}`,
      "",
      "拆书中的文风与技法：",
      input.sourceText,
    ].join("\n")),
  ],
};

export const styleProfileFromBriefPrompt: PromptAsset<
  StyleProfileFromBriefPromptInput,
  z.infer<typeof styleGeneratedProfileSchema>
> = {
  id: "style.profile.from_brief",
  version: "v2",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: styleGeneratedProfileSchema,
  render: (input) => [
    new SystemMessage([
      "你是小说写法资产编辑器，服务对象是刚开始写小说、只知道自己想要什么感觉、但不会自己拆规则的小白作者。",
      "你的任务是把用户一句话或几句话描述的“想要的写法感觉”，整理成一份可直接进入系统使用的“写法核心资产 JSON”。",
      "这不是读后感，不是模仿练习，也不是空泛风格点评，而是要给新手一套可以直接拿来改和继续细化的起步写法。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "输出字段必须且只能包括：",
      "name, description, analysisMarkdown, narrativeRules, characterRules, languageRules, rhythmRules。",
      "",
      "全局硬规则：",
      "1. 所有字段值必须使用简体中文。",
      "2. 输入可能很短、很模糊，甚至只是一句“像某部作品的写法”。你要做的是抽取可迁移的写作维度，而不是要求用户先懂术语。",
      "3. 如果输入提到具体作品、作者或风格参照，只能提炼可迁移的写法特征，例如叙事克制度、对话张力、信息密度、节奏组织、现实摩擦感、思辨感等。",
      "4. 严禁复刻具体剧情、人物名称、设定名词、标志性语句、名场面结构或其他容易构成直接模仿的可识别表达。",
      "5. 允许做保守推断，但不要把模糊印象夸大成过度具体的规则。",
      "6. 输出目标是“帮新手直接起步”，所以规则必须清楚、稳定、能执行，不要写成专家黑话。",
      "7. 这一步只负责核心规则与短分析稿，不负责分类标签、适配题材或反AI规则选择。",
      "",
      "字段要求：",
      "1. name：如果用户给了名称，就保留并轻微规范化；如果没给，就基于抽象后的写法本质起一个稳定、好懂的名字。不要直接沿用受保护作品标题做名称。",
      "2. description：用简洁中文概括这套写法最核心的风格定位、读感和适用方向。",
      "3. analysisMarkdown：写成结构化短分析稿，说明这套写法的核心抓手、适用边界、翻车点和给新手的使用提醒。",
      "",
      "规则层要求：",
      "1. narrativeRules / characterRules / languageRules / rhythmRules 必须是结构化对象，不能写成字符串或数组摘要。",
      "2. 每组规则都必须体现“应该怎么写”“优先保留什么”“尽量避免什么”，让新手打开后就知道该怎么用。",
      "3. narrativeRules 重点提取：推进方式、信息释放、视角组织、冲突组织、场景切换、章节收尾牵引。",
      "4. characterRules 重点提取：人物表达克制度、情绪外露方式、台词承载、关系拉扯方式、行为逻辑显露方式。",
      "5. languageRules 重点提取：句式长短、口语/书面倾向、修辞密度、解释冲动、抽象表达比例、语言锋利度。",
      "6. rhythmRules 重点提取：段落密度、快慢切换、留白、压迫感、爆点布置、回收方式。",
      "7. 规则必须具体、可执行，禁止出现“增强感染力”“更有代入感”“注意节奏”这类空话。",
      "",
      "质量要求：",
      "1. 输出必须像一份可以马上保存到系统里的写法资产，而不是一句模糊建议。",
      "2. 各字段之间必须一致，description、analysisMarkdown 与规则层不能互相打架。",
      "3. 如果输入非常短，就做一个“小而稳”的起步版本，不要凭空生成大而虚的复杂系统。",
      "4. 如果输入涉及现实思辨、哲理对话、克制表达等高级感觉，也要翻译成普通用户能直接照着写的规则，而不是抽象评价。",
    ].join("\n")),
    new HumanMessage([
      `写法名称：${input.name?.trim() || "未指定，请你生成一个合适名称"}`,
      `建议分类：${input.category?.trim() || "未指定"}`,
      "",
      "用户对想要写法的描述：",
      input.brief,
    ].join("\n")),
  ],
};

export const styleProfileMetadataPrompt: PromptAsset<
  StyleProfileMetadataPromptInput,
  z.infer<typeof styleProfileMetadataSchema>
> = {
  id: "style.profile.metadata",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: styleProfileMetadataSchema,
  render: (input) => [
    new SystemMessage([
      "你是小说写法资产元信息整理器。",
      "你的任务是基于已经提炼好的写法核心摘要，补齐便于检索和推荐的元信息。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "输出字段必须且只能包括：",
      "category, tags, applicableGenres。",
      "",
      "全局硬规则：",
      "1. 所有字段值必须使用简体中文。",
      "2. 只能基于给定写法摘要归纳，不得发散到摘要中没有依据的标签。",
      "3. category 必须稳、短、可复用，不要写成长句。",
      "4. tags 只保留有区分度的短标签，避免空泛形容词；通常返回 3-8 个。",
      "5. applicableGenres 只保留真正适合迁移的题材；通常返回 2-6 个，不要泛滥铺满。",
      "6. 如果给了建议分类且它与摘要不冲突，优先沿用建议分类。",
      "7. 宁可少而准，也不要堆砌无意义标签。",
    ].join("\n")),
    new HumanMessage([
      `写法名称：${input.name}`,
      `来源：${input.sourceType}`,
      `建议分类：${input.preferredCategory?.trim() || "未指定"}`,
      "",
      "写法核心摘要：",
      input.styleDigest,
    ].join("\n")),
  ],
};

export const styleProfileAntiAiSelectionPrompt: PromptAsset<
  StyleProfileAntiAiSelectionPromptInput,
  z.infer<typeof styleProfileAntiAiSelectionSchema>
> = {
  id: "style.profile.select_anti_ai",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: styleProfileAntiAiSelectionSchema,
  render: (input) => [
    new SystemMessage([
      "你是小说写法资产的反AI规则精配器。",
      "你的任务是从给定的合法规则目录中，只挑出真正适合当前写法的反AI规则 key。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "输出字段必须且只能包括：",
      "antiAiRuleKeys。",
      "",
      "全局硬规则：",
      "1. 只能从输入目录中出现过的 key 里选择，严禁自造新 key。",
      "2. 只有当某条规则真的能帮助维持当前写法、抑制对应风险时才可选择。",
      "3. 如果目录中没有真正匹配的规则，返回空数组。",
      `4. 最多返回 ${input.maxRuleCount ?? 4} 个 key。`,
      "5. 优先选择和当前写法的高风险点、常见翻车点直接对应的规则，不要为了凑数量泛选。",
      "6. 不要把“通用安全感”误当成“强相关”；弱相关规则宁可不选。",
    ].join("\n")),
    new HumanMessage([
      `写法名称：${input.name}`,
      `写法摘要：${input.summary?.trim() || "未提供"}`,
      "",
      "写法核心摘要：",
      input.styleDigest,
      "",
      "风险摘要：",
      input.riskDigest,
      "",
      "合法规则目录：",
      input.catalogText,
    ].join("\n")),
  ],
};

export const styleProfileSanitizeForGenerationPrompt: PromptAsset<
  StyleProfileSanitizeForGenerationPromptInput,
  z.infer<typeof styleProfileSanitizeForGenerationSchema>
> = {
  id: "style.profile.sanitize_for_generation",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: styleProfileSanitizeForGenerationSchema,
  render: (input) => [
    new SystemMessage([
      "你是小说写法资产安全净化器。",
      "你的任务是把写法 profile 转换成可用于生成的抽象写法指导，并识别禁止泄露的源作品实体。",
      "只输出严格 JSON，不要 Markdown、解释或额外文本。",
      "",
      "输出字段只能包含：writingGuidance, forbiddenEntities, sourceRiskSummary。",
      "",
      "规则：",
      "1. writingGuidance 只能保留可迁移的写法维度，例如叙事节奏、信息密度、对话张力、句式组织、留白方式。",
      "2. forbiddenEntities 必须列出源作品角色名、地名、专有称谓、组织名、标志性梗和可识别组合词。",
      "3. writingGuidance 里严禁出现 forbiddenEntities 中的任何词。",
      "4. 不要复述源作品剧情、设定名词、人物关系或名场面。",
      "5. 如果无法判断某个具体名词是否可迁移，优先放入 forbiddenEntities。",
    ].join("\n")),
    new HumanMessage([
      `写法 profile：${input.profileName}`,
      "",
      "当前写法合同：",
      input.styleContractText,
      "",
      "源素材摘要：",
      input.sourceDigest,
    ].join("\n")),
  ],
};

export const antiAiRuleAiDraftPrompt: PromptAsset<
  AntiAiRuleAiDraftPromptInput,
  z.infer<typeof antiAiRuleAiDraftSchema>
> = {
  id: "style.anti_ai_rule.draft",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: antiAiRuleAiDraftSchema,
  render: (input) => [
    new SystemMessage([
      "你是小说写作产品里的反 AI 规则编辑助手。",
      "你的任务是把用户的自然语言需求整理成一条可执行、可编辑、可检测的反 AI 规则草稿。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "输出字段必须且只能包括：draft, rationale, safetyNotes。",
      "draft 必须且只能包含：key, name, type, severity, description, detectPatterns, promptInstruction, rewriteSuggestion。",
      "",
      "规则类型含义：",
      "1. forbidden：明确禁止的 AI 味、模板痕迹或不适合正文生成的表达。",
      "2. risk：常见风险，需要提醒模型规避，但允许在特定语境下自然出现。",
      "3. encourage：鼓励采用的替代表达方式或正向写法。",
      "",
      "生成要求：",
      "1. 所有文本字段必须使用简体中文，key 必须使用英文小写、数字和下划线。",
      "2. 规则必须具体、可执行，不要写“提升真实感”“避免AI感”这类空泛要求。",
      "3. detectPatterns 只放少量高价值短语，通常 3-8 个；不要堆砌同义词。",
      "4. promptInstruction 要能直接进入正文生成约束，使用命令式表达。",
      "5. rewriteSuggestion 要给出命中后如何改，不要只重复问题名称。",
      "6. 不要生成会要求模型照搬某个具体作品、作者、角色、设定或标志性句子的规则。",
      "7. 如果用户要求过宽，要收束成一条规则，不要一次做成多条规则。",
      "",
      input.mode === "improve"
        ? [
            "当前模式：优化已有规则。",
            "你必须在当前规则基础上改得更清楚、更可执行。",
            "除非用户明确要求改规则标识，否则 key 应尽量保持原值。",
            "不要改变启用状态、全局默认状态或自动改写开关；这些开关由系统处理。",
          ].join("\n")
        : [
            "当前模式：新建规则。",
            "你要根据用户描述生成一条新的规则草稿。",
            "不要假设这条规则会进入全局默认，也不要决定自动改写开关。",
          ].join("\n"),
      "",
      "rationale 用一句话说明为什么这样组织规则。",
      "safetyNotes 用 0-3 条说明使用风险，例如适合写法绑定、不建议全局默认、容易误伤的语境。",
    ].join("\n")),
    new HumanMessage([
      `模式：${input.mode}`,
      "",
      input.currentRuleText
        ? [
            "当前规则：",
            input.currentRuleText,
            "",
          ].join("\n")
        : "",
      "用户需求：",
      input.instruction,
    ].filter(Boolean).join("\n")),
  ],
};

// --- Chapter Edit Diff Extraction Prompts ---

export interface ChapterEditDiffExtractPromptInput {
  beforeText: string;
  afterText: string;
  existingAntiAiRules?: string;
}

export interface ChapterEditStyleForkPromptInput {
  beforeText: string;
  afterText: string;
  currentStyleRules: string;
}

export const chapterEditAntiAiExtractPrompt: PromptAsset<
  ChapterEditDiffExtractPromptInput,
  z.infer<typeof chapterEditAntiAiExtractSchema>
> = {
  id: "style.chapter_edit.anti_ai_extract",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: chapterEditAntiAiExtractSchema,
  render: (input) => [
    new SystemMessage([
      "你是小说写作产品中的反 AI 规则提取器。",
      "你的任务是分析用户对 AI 生成文本的编辑修改，提取出可复用的反 AI 规则。",
      "",
      "你会收到两个版本的章节正文：修改前（AI 生成）和修改后（用户手动编辑）。",
      "你的工作是：",
      "1. 分析用户修改的意图——用户在消除什么 AI 痕迹？在纠正什么表达习惯？",
      "2. 将这些意图提炼为可执行的反 AI 规则草稿。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "输出字段必须且只能包括：intentSummary, drafts。",
      "",
      "全局硬规则：",
      "1. 所有文本字段必须使用简体中文，key 必须使用英文小写、数字和下划线。",
      "2. 只能基于用户实际修改内容提取规则，不得凭空编造用户未体现的修改意图。",
      "3. 每条规则必须具体、可执行，不能写'避免 AI 感'这类空泛要求。",
      "4. detectPatterns 放用户修改中实际消除的 AI 表达模式，通常 3-8 个。",
      "5. promptInstruction 使用命令式表达，能直接进入正文生成约束。",
      "6. rewriteSuggestion 说明命中后如何修改。",
      "7. 如果用户修改没有体现明显的 AI 痕迹问题，返回空 drafts 数组。",
      "",
      "字段要求：",
      "1. intentSummary：用 2-3 句话概括用户修改的核心意图，说明用户在追求什么写法效果。",
      "2. drafts：每条规则包含 key, name, type, severity, description, detectPatterns, promptInstruction, rewriteSuggestion。",
      "3. type 使用 forbidden（明确禁止）、risk（需规避的风险）、encourage（鼓励的替代表达）。",
      "4. severity 使用 low/medium/high 根据问题影响程度判断。",
      "",
      input.existingAntiAiRules
        ? [
            "已有反 AI 规则（用于去重，不要生成重复规则）：",
            input.existingAntiAiRules,
          ].join("\n")
        : "",
    ].filter(Boolean).join("\n")),
    new HumanMessage([
      "修改前正文（AI 生成）：",
      input.beforeText,
      "",
      "修改后正文（用户编辑）：",
      input.afterText,
    ].join("\n")),
  ],
};

export const chapterEditStyleForkPrompt: PromptAsset<
  ChapterEditStyleForkPromptInput,
  z.infer<typeof chapterEditStyleForkSchema>
> = {
  id: "style.chapter_edit.style_fork",
  version: "v1",
  taskType: "planner",
  mode: "structured",
  language: "zh",
  contextPolicy: {
    maxTokensBudget: 0,
  },
  outputSchema: chapterEditStyleForkSchema,
  render: (input) => [
    new SystemMessage([
      "你是小说写法资产编辑器。",
      "你的任务是分析用户对 AI 生成文本的编辑修改，理解用户的写法偏好，并基于当前风格画像生成一份调整后的规则 patch。",
      "",
      "你会收到两个版本的章节正文和当前风格画像的规则。",
      "你的工作是：",
      "1. 对比修改前后两个版本，理解用户在叙事、角色、语言、节奏四个维度上的偏好调整。",
      "2. 生成规则 patch，在原规则基础上做合理调整。",
      "3. 给出变更摘要和推荐的新画像名。",
      "",
      "只输出一个合法 JSON 对象，不要输出 Markdown、解释、注释、代码块或额外文本。",
      "输出字段必须且只能包括：changeSummary, suggestedName, narrativeRules, characterRules, languageRules, rhythmRules。",
      "",
      "全局硬规则：",
      "1. 所有文本字段必须使用简体中文。",
      "2. 只能基于用户实际修改推断偏好，不得凭空编造。",
      "3. 规则必须具体、可执行，不能写'增强代入感'这类空话。",
      "4. 如果用户修改没有体现明显的写法偏好变化，返回空的规则对象（不返回任何规则字段）。",
      "5. patch 应该只包含用户修改体现的变化，不要大幅重写原规则。",
      "",
      "字段要求：",
      "1. changeSummary：用 2-3 句话概括用户修改体现的写法偏好变化。",
      "2. suggestedName：基于原画像名和变化特征生成推荐名，格式为'{原画像名}-编辑偏好v{N}'。",
      "3. narrativeRules / characterRules / languageRules / rhythmRules：仅在对应维度有明显变化时填写，每个都是对原规则的 patch（新增或覆盖的字段）。",
      "",
      "质量要求：",
      "1. 优先捕捉语言风格变化（句式、用词、修辞）。",
      "2. 其次捕捉节奏变化（段落密度、快慢、留白）。",
      "3. 关注角色表达变化（情绪外露方式、台词风格、行为逻辑呈现）。",
      "4. 注意叙事手法变化（视角控制、信息释放、场景切换）。",
      "5. 不要把局部删改误判为系统性风格变化。",
    ].join("\n")),
    new HumanMessage([
      "当前风格画像规则：",
      input.currentStyleRules,
      "",
      "修改前正文（AI 生成）：",
      input.beforeText,
      "",
      "修改后正文（用户编辑）：",
      input.afterText,
    ].join("\n")),
  ],
};
