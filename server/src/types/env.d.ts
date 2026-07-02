/**
 * Custom environment variable type declarations for the AI Novel server.
 *
 * This file provides TypeScript type safety for `process.env` access.
 * Standard Node.js environment variables (NODE_ENV, PATH, HOME, etc.)
 * are already declared by @types/node and are NOT repeated here.
 *
 * Provider API keys (*_API_KEY) follow a dynamic access pattern via
 * `process.env[envKey]` in providers.ts, but are listed here for
 * documentation completeness.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // ── Server / Network ──────────────────────────────────────────────
    /** Server listen port (default: 3000) */
    AI_NOVEL_SERVER_PORT?: string;
    /** Legacy alias for AI_NOVEL_SERVER_PORT */
    PORT?: string;
    /** Server bind host (default: "localhost") */
    HOST?: string;
    /** Comma-separated allowed CORS origins */
    CORS_ORIGIN?: string;
    /** JSON body size limit (default: "20mb") */
    API_JSON_LIMIT?: string;
    /** Bind to all network interfaces when "true" */
    ALLOW_LAN?: string;

    // ── Database ──────────────────────────────────────────────────────
    /** Database connection URL (file: for SQLite, postgresql:// for PG) */
    DATABASE_URL?: string;
    /** Force database mode: "sqlite" | "postgres" | "postgresql" | "pg" */
    AI_NOVEL_DATABASE_MODE?: string;
    /** SQLite busy timeout in milliseconds (default: 15000) */
    SQLITE_BUSY_TIMEOUT_MS?: string;
    /** Set to "false" to disable SQLite WAL mode */
    SQLITE_ENABLE_WAL?: string;

    // ── LLM Provider API Keys ────────────────────────────────────────
    DEEPSEEK_API_KEY?: string;
    SILICONFLOW_API_KEY?: string;
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    XAI_API_KEY?: string;
    KIMI_API_KEY?: string;
    MINIMAX_API_KEY?: string;
    GLM_API_KEY?: string;
    QWEN_API_KEY?: string;
    GEMINI_API_KEY?: string;
    OLLAMA_API_KEY?: string;

    // ── LLM Provider Base URLs (override defaults) ────────────────────
    DEEPSEEK_BASE_URL?: string;
    SILICONFLOW_BASE_URL?: string;
    OPENAI_BASE_URL?: string;
    ANTHROPIC_BASE_URL?: string;
    XAI_BASE_URL?: string;
    KIMI_BASE_URL?: string;
    MINIMAX_BASE_URL?: string;
    GLM_BASE_URL?: string;
    QWEN_BASE_URL?: string;
    GEMINI_BASE_URL?: string;
    OLLAMA_BASE_URL?: string;

    // ── LLM Provider Model Overrides ──────────────────────────────────
    DEEPSEEK_MODEL?: string;
    SILICONFLOW_MODEL?: string;
    OPENAI_MODEL?: string;
    ANTHROPIC_MODEL?: string;
    XAI_MODEL?: string;
    KIMI_MODEL?: string;
    MINIMAX_MODEL?: string;
    GLM_MODEL?: string;
    QWEN_MODEL?: string;
    GEMINI_MODEL?: string;
    OLLAMA_MODEL?: string;

    // ── LLM General ───────────────────────────────────────────────────
    /** Global LLM request timeout in milliseconds */
    LLM_REQUEST_TIMEOUT_MS?: string;
    /** Enable LLM request/response debug logging ("true"/"false") */
    LLM_DEBUG_LOG?: string;
    /** Enable LLM file-based session logging ("true"/"false") */
    LLM_DEBUG_FILE_LOG?: string;
    /** Anthropic API version header (default: "2023-06-01") */
    ANTHROPIC_VERSION?: string;

    // ── Logging ───────────────────────────────────────────────────────
    /** Winston log level (default: "info") */
    LOG_LEVEL?: string;
    /** Explicit LLM log file path */
    RUN_WITH_LOG_LLM_PATH?: string;
    /** Explicit LLM repair log file path */
    RUN_WITH_LOG_LLM_REPAIR_PATH?: string;
    /** Parent log directory/file path */
    RUN_WITH_LOG_PATH?: string;

    // ── Streaming Loop Detector ───────────────────────────────────────
    /** Enable streaming loop detector ("true"/"false", default: true) */
    LOOP_DETECTOR_ENABLED?: string;
    /** Loop detector sliding window size */
    LOOP_DETECTOR_WINDOW_SIZE?: string;
    /** Loop detector n-gram size */
    LOOP_DETECTOR_NGRAM_SIZE?: string;
    /** Loop detector repetition threshold */
    LOOP_DETECTOR_REPETITION_THRESHOLD?: string;
    /** Loop detector consecutive hit count */
    LOOP_DETECTOR_CONSECUTIVE_HIT_COUNT?: string;
    /** Loop detector minimum valid content length */
    LOOP_DETECTOR_MIN_VALID_CONTENT_LENGTH?: string;

    // ── RAG / Embedding ───────────────────────────────────────────────
    /** Enable RAG ("true"/"false", default: true) */
    RAG_ENABLED?: string;
    /** Verbose RAG logging ("true"/"false") */
    RAG_VERBOSE_LOG?: string;
    /** Default RAG tenant ID (default: "default") */
    RAG_DEFAULT_TENANT?: string;
    /** Embedding provider override */
    EMBEDDING_PROVIDER?: string;
    /** Embedding model version */
    EMBEDDING_VERSION?: string;
    /** Embedding batch size (default: 64) */
    EMBEDDING_BATCH_SIZE?: string;
    /** OpenAI embedding model name */
    OPENAI_EMBEDDING_MODEL?: string;
    /** SiliconFlow embedding model name */
    SILICONFLOW_EMBEDDING_MODEL?: string;
    /** Embedding request timeout in ms */
    RAG_EMBEDDING_TIMEOUT_MS?: string;
    /** Embedding max retries */
    RAG_EMBEDDING_MAX_RETRIES?: string;
    /** Embedding retry base delay in ms */
    RAG_EMBEDDING_RETRY_BASE_MS?: string;
    /** Shared HTTP timeout for RAG requests in ms */
    RAG_HTTP_TIMEOUT_MS?: string;
    /** Text chunk size for RAG (default: 800) */
    RAG_CHUNK_SIZE?: string;
    /** Text chunk overlap for RAG (default: 120) */
    RAG_CHUNK_OVERLAP?: string;
    /** Vector candidate count (default: 40) */
    RAG_VECTOR_CANDIDATES?: string;
    /** Keyword candidate count (default: 40) */
    RAG_KEYWORD_CANDIDATES?: string;
    /** Final top-K results (default: 8) */
    RAG_FINAL_TOP_K?: string;
    /** Worker poll interval in ms */
    RAG_WORKER_POLL_MS?: string;
    /** Worker max attempts */
    RAG_WORKER_MAX_ATTEMPTS?: string;
    /** Worker retry base delay in ms */
    RAG_WORKER_RETRY_BASE_MS?: string;

    // ── Qdrant ────────────────────────────────────────────────────────
    /** Qdrant server URL (default: "http://127.0.0.1:6333") */
    QDRANT_URL?: string;
    /** Qdrant API key */
    QDRANT_API_KEY?: string;
    /** Qdrant collection name (default: "ai_novel_chunks_v1") */
    QDRANT_COLLECTION?: string;
    /** Qdrant request timeout in ms */
    QDRANT_TIMEOUT_MS?: string;
    /** Qdrant upsert max bytes (default: 24MB) */
    QDRANT_UPSERT_MAX_BYTES?: string;

    // ── Image Storage (S3 / MinIO) ───────────────────────────────────
    /** Image storage driver: "local" | "s3" */
    IMAGE_STORAGE_DRIVER?: string;
    /** Local image storage root path */
    IMAGE_STORAGE_ROOT?: string;
    IMAGE_STORAGE_S3_ENDPOINT?: string;
    IMAGE_STORAGE_S3_REGION?: string;
    IMAGE_STORAGE_S3_BUCKET?: string;
    IMAGE_STORAGE_S3_ACCESS_KEY_ID?: string;
    IMAGE_STORAGE_S3_SECRET_ACCESS_KEY?: string;
    IMAGE_STORAGE_S3_FORCE_PATH_STYLE?: string;
    /** Legacy MinIO aliases */
    MINIO_ENDPOINT?: string;
    MINIO_REGION?: string;
    MINIO_BUCKET?: string;
    MINIO_ACCESS_KEY?: string;
    MINIO_SECRET_KEY?: string;
    MINIO_FORCE_PATH_STYLE?: string;

    // ── Image Generation ──────────────────────────────────────────────
    /** Image generation HTTP timeout in ms */
    IMAGE_GENERATION_HTTP_TIMEOUT_MS?: string;
    /** Provider-specific image model overrides */
    OPENAI_IMAGE_MODEL?: string;
    SILICONFLOW_IMAGE_MODEL?: string;
    XAI_IMAGE_MODEL?: string;
    MINIMAX_IMAGE_MODEL?: string;
    /** MiniMax image generation base URL (default: "https://api.minimaxi.com") */
    MINIMAX_IMAGE_BASE_URL?: string;

    // ── Director / Auto-Director ──────────────────────────────────────
    /** Director worker unique ID */
    DIRECTOR_WORKER_ID?: string;
    /** Director worker lease duration in ms */
    DIRECTOR_WORKER_LEASE_MS?: string;
    /** Director stale task scan interval in ms */
    DIRECTOR_WORKER_STALE_SCAN_MS?: string;
    /** Director concurrent execution slots */
    DIRECTOR_WORKER_EXECUTION_SLOTS?: string;
    /** Director worker poll interval in ms */
    DIRECTOR_WORKER_POLL_MS?: string;
    /** Director debug logging ("true"/"false") */
    DIRECTOR_DEBUG_LOG_ENABLED?: string;
    /** Director debug log detail level */
    DIRECTOR_DEBUG_LOG_DETAIL_LEVEL?: string;
    /** Director debug log retention hours */
    DIRECTOR_DEBUG_LOG_RETENTION_HOURS?: string;
    /** Tool call loop threshold (default: 3) */
    TOOL_CALL_LOOP_THRESHOLD?: string;
    /** Auto-director stale running task timeout in ms */
    AUTO_DIRECTOR_STALE_RUNNING_TASK_MS?: string;

    // ── Novel Snapshots ───────────────────────────────────────────────
    /** Max auto-snapshots to retain per novel (default: 20) */
    NOVEL_SNAPSHOT_RETENTION_COUNT?: string;

    // ── Novel Side-Effect Worker ──────────────────────────────────────
    /** Side-effect worker unique ID */
    NOVEL_SIDE_EFFECT_WORKER_ID?: string;
    /** Side-effect worker lease duration in ms */
    NOVEL_SIDE_EFFECT_WORKER_LEASE_MS?: string;
    /** Side-effect worker poll interval in ms */
    NOVEL_SIDE_EFFECT_WORKER_POLL_MS?: string;

    // ── Feature Flags ─────────────────────────────────────────────────
    /** Enable world-building wizard ("true"/"false", default: true) */
    WORLD_WIZARD_ENABLED?: string;
    /** Enable world visualization ("true"/"false", default: true) */
    WORLD_VIS_ENABLED?: string;
    /** Enable world graph view ("true"/"false", default: false) */
    WORLD_GRAPH_ENABLED?: string;

    // ── Style Engine ──────────────────────────────────────────────────
    /** Style extraction LLM timeout in ms */
    STYLE_EXTRACTION_LLM_TIMEOUT_MS?: string;
    /** Style extraction task heartbeat interval in ms */
    STYLE_EXTRACTION_TASK_HEARTBEAT_INTERVAL_MS?: string;

    // ── Book Analysis ─────────────────────────────────────────────────
    /** Max concurrent book analysis tasks */
    BOOK_ANALYSIS_MAX_CONCURRENT_TASKS?: string;
    /** Book analysis notes concurrency */
    BOOK_ANALYSIS_NOTES_CONCURRENCY?: string;
    /** Book analysis section concurrency */
    BOOK_ANALYSIS_SECTION_CONCURRENCY?: string;
    /** Book analysis cache segment version */
    BOOK_ANALYSIS_CACHE_SEGMENT_VERSION?: string;

    // ── Drama / Video / TTS ───────────────────────────────────────────
    /** Drama cost currency (default: "CNY") */
    DRAMA_COST_CURRENCY?: string;
    /** Drama image cost per image */
    DRAMA_IMAGE_COST_PER_IMAGE?: string;
    /** Drama video mock cost per second */
    DRAMA_VIDEO_MOCK_COST_PER_SECOND?: string;
    /** Drama video HTTP create endpoint URL */
    DRAMA_VIDEO_HTTP_CREATE_URL?: string;
    /** Drama video HTTP status endpoint URL */
    DRAMA_VIDEO_HTTP_STATUS_URL?: string;
    DRAMA_VIDEO_HTTP_PROVIDER_ID?: string;
    DRAMA_VIDEO_HTTP_PROVIDER_LABEL?: string;
    DRAMA_VIDEO_HTTP_PROVIDER_DESCRIPTION?: string;
    DRAMA_VIDEO_HTTP_API_KEY?: string;
    DRAMA_VIDEO_HTTP_TIMEOUT_MS?: string;
    DRAMA_VIDEO_HTTP_SUPPORTS_REF_IMAGES?: string;
    DRAMA_VIDEO_HTTP_COST_PER_SECOND?: string;
    DRAMA_VIDEO_HTTP_COST_CURRENCY?: string;
    /** Drama video reference image base URL */
    DRAMA_VIDEO_REF_IMAGE_BASE_URL?: string;
    /** Drama TTS mock cost per second */
    DRAMA_TTS_MOCK_COST_PER_SECOND?: string;
    /** Drama TTS HTTP synthesize endpoint URL */
    DRAMA_TTS_HTTP_SYNTHESIZE_URL?: string;
    DRAMA_TTS_HTTP_PROVIDER_ID?: string;
    DRAMA_TTS_HTTP_PROVIDER_LABEL?: string;
    DRAMA_TTS_HTTP_PROVIDER_DESCRIPTION?: string;
    DRAMA_TTS_HTTP_API_KEY?: string;
    DRAMA_TTS_HTTP_TIMEOUT_MS?: string;
    DRAMA_TTS_HTTP_COST_PER_SECOND?: string;
    DRAMA_TTS_HTTP_COST_CURRENCY?: string;

    // ── Auth ──────────────────────────────────────────────────────────
    /** API bearer token for authentication */
    API_TOKEN?: string;

    // ── Auto-Director Channels ────────────────────────────────────────
    /** Public base URL for channel callbacks */
    APP_BASE_URL?: string;
    /** DingTalk webhook URL */
    AUTO_DIRECTOR_DINGTALK_WEBHOOK_URL?: string;
    /** DingTalk callback verification token */
    AUTO_DIRECTOR_DINGTALK_CALLBACK_TOKEN?: string;
    /** DingTalk operator mapping (JSON string) */
    AUTO_DIRECTOR_DINGTALK_OPERATOR_MAP_JSON?: string;
    /** DingTalk event types to subscribe (comma-separated) */
    AUTO_DIRECTOR_DINGTALK_EVENT_TYPES?: string;
    /** WeCom webhook URL */
    AUTO_DIRECTOR_WECOM_WEBHOOK_URL?: string;
    /** WeCom callback verification token */
    AUTO_DIRECTOR_WECOM_CALLBACK_TOKEN?: string;
    /** WeCom operator mapping (JSON string) */
    AUTO_DIRECTOR_WECOM_OPERATOR_MAP_JSON?: string;
    /** WeCom event types to subscribe (comma-separated) */
    AUTO_DIRECTOR_WECOM_EVENT_TYPES?: string;

    // ── Runtime / Paths ───────────────────────────────────────────────
    /** Custom app data directory path */
    AI_NOVEL_APP_DATA_DIR?: string;
    /** Runtime mode: "desktop" | "web" */
    AI_NOVEL_RUNTIME?: string;

    // ── Log Retention ─────────────────────────────────────────────────
    /** Enable automatic log cleanup ("true"/"false") */
    AI_NOVEL_LOG_CLEANUP_ENABLED?: string;
    /** Log retention in days */
    AI_NOVEL_LOG_RETENTION_DAYS?: string;
    /** LLM log retention in days */
    AI_NOVEL_LLM_LOG_RETENTION_DAYS?: string;
    /** Max log file size in MB */
    AI_NOVEL_LOG_MAX_FILE_MB?: string;
    /** Minimum log age in hours before cleanup */
    AI_NOVEL_LOG_MIN_AGE_HOURS?: string;
  }
}
