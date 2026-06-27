const test = require("node:test");
const assert = require("node:assert/strict");

const {
  StreamingRepetitionDetector,
} = require("../../dist/llm/streamingRepetitionDetector.js");

test("StreamingRepetitionDetector detects repeated content", async () => {
  const config = {
    enabled: true,
    windowSize: 5,
    ngramSize: 10,
    repetitionThreshold: 0.6,
    consecutiveHitCount: 3,
    minValidContentLength: 10,
  };
  const detector = new StreamingRepetitionDetector(config);
  const repeatChunk = "这是重复的测试内容，需要足够长来触发检测。";

  let result = null;
  for (let i = 0; i < 10; i++) {
    result = detector.feed(repeatChunk);
    if (result?.isLoop) break;
  }
  assert.ok(result, "should detect loop");
  assert.ok(result.isLoop, "isLoop should be true");
  assert.ok(result.truncationIndex >= 0, "truncationIndex should be non-negative");
});

test("StreamingRepetitionDetector does not false-positive on diverse content", async () => {
  const config = {
    enabled: true,
    windowSize: 5,
    ngramSize: 10,
    repetitionThreshold: 0.7,
    consecutiveHitCount: 5,
    minValidContentLength: 10,
  };
  const detector = new StreamingRepetitionDetector(config);
  const chunks = [
    "第一章开始了，主角走进了那栋废弃的大楼。",
    "夜色中，月光透过破碎的窗户洒在地板上。",
    "他小心翼翼地避开了地上的碎玻璃，向楼梯走去。",
    "远处传来一声低沉的叹息，让他停住了脚步。",
    "心跳加速，他握紧了手中的手电筒。",
    "黑暗中，有什么东西在移动。",
    "他深吸一口气，继续向前走。",
    "每一步都让他更加紧张，但他不能回头。",
    "突然，一道光芒闪过他的眼前。",
    "那是一面古老的铜镜，映照出他苍白的面容。",
  ];
  let result = null;
  for (const chunk of chunks) {
    result = detector.feed(chunk);
    if (result?.isLoop) break;
  }
  assert.equal(result, null, "should not detect false positive");
});

test("StreamingRepetitionDetector reset clears state", async () => {
  const detector = new StreamingRepetitionDetector({
    enabled: true,
    windowSize: 3,
    ngramSize: 5,
    repetitionThreshold: 0.5,
    consecutiveHitCount: 2,
    minValidContentLength: 10,
  });
  detector.feed("重复内容".repeat(100));
  detector.reset();
  const result = detector.feed("全新的不同内容");
  assert.equal(result, null, "after reset should not detect from old content");
});
