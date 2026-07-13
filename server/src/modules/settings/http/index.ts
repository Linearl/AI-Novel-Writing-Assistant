import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth";
import { registerCustomProviderRoutes } from "./customProviderRoutes";
import { registerLLMSelectionRoutes } from "./llmSelectionRoutes";
import { registerProviderRoutes } from "./providerRoutes";
import { registerRagSettingsRoutes } from "./ragSettingsRoutes";
import { registerStyleEngineRoutes } from "./styleEngineSettingsRoutes";

const router = Router();
router.use(authMiddleware);

registerCustomProviderRoutes(router);
registerLLMSelectionRoutes(router);
registerProviderRoutes(router);
registerRagSettingsRoutes(router);
registerStyleEngineRoutes(router);

export default router;
