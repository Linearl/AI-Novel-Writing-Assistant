import { EmbeddingService } from "./EmbeddingService";
import { VectorStoreService } from "./VectorStoreService";
import { HybridRetrievalService } from "./HybridRetrievalService";
import { RagIndexService } from "./RagIndexService";
import { RagJobCleanupService } from "./RagJobCleanupService";
import { RagWorker } from "./RagWorker";
import { RagContextualChunkService } from "./RagContextualChunkService";
import { RagRerankerService } from "./RagRerankerService";
import { RagRetrievalTracer } from "./RagRetrievalTracer";
import { ragRetrievalTraceRetention } from "./RagRetrievalTraceRetention";

const embeddingService = new EmbeddingService();
const vectorStoreService = new VectorStoreService();
const ragIndexService = new RagIndexService(embeddingService, vectorStoreService);
const ragJobCleanupService = new RagJobCleanupService();
const hybridRetrievalService = new HybridRetrievalService(embeddingService, vectorStoreService);
const ragWorker = new RagWorker(ragIndexService);
const ragContextualChunkService = new RagContextualChunkService();
const ragRerankerService = new RagRerankerService();
const ragRetrievalTracer = new RagRetrievalTracer();

export const ragServices = {
  embeddingService,
  vectorStoreService,
  ragIndexService,
  ragJobCleanupService,
  hybridRetrievalService,
  ragWorker,
  ragContextualChunkService,
  ragRerankerService,
  ragRetrievalTracer,
  ragRetrievalTraceRetention,
};
