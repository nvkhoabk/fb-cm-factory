import { assetsService } from "../assets/assets.service";
import { AppError } from "../shared/resource";

export const uploadAssetSources = [
  "IMAGE_EDIT_NEXT_SOURCE",
  "VIDEO_EDIT_NEXT_PAIR",
  "VIDEO_COMPOSE_ALL_VIDEOS",
  "MANUAL_ASSET"
] as const;

type UploadAssetSource = typeof uploadAssetSources[number];

type UploadAsset = {
  assetId: string;
  assetType: string | null;
  characterId: string | null;
  role: string;
  filePath: string | null;
  publicUrl: string | null;
  absolutePath: string | null;
  orderNo: number;
};

function objectValue(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getPathValue(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function sourceAssetsSnapshot(context: Record<string, unknown>) {
  const direct = context.sourceAssetsSnapshot;
  const nested = getPathValue(context, "batch.metadata.sourceAssetsSnapshot")
    ?? getPathValue(context, "productionBatch.metadata.sourceAssetsSnapshot")
    ?? getPathValue(context, "sourceBatch.metadata.sourceAssetsSnapshot")
    ?? getPathValue(context, "sourceBatch.metadata.characterGroupBatch.sourceAssetsSnapshot");
  return objectValue(direct && typeof direct === "object" ? direct : nested);
}

function uploadAssetFromSnapshot(asset: unknown, role: string, characterId: string | null, orderNo: number): UploadAsset | null {
  const record = objectValue(asset);
  const assetId = stringValue(record.id) ?? stringValue(record.assetId);
  if (!assetId) return null;
  return {
    assetId,
    assetType: stringValue(record.assetType) ?? stringValue(record.assetCategory),
    characterId,
    role,
    filePath: stringValue(record.filePath),
    publicUrl: stringValue(record.publicUrl),
    absolutePath: stringValue(record.absolutePath) ?? stringValue(record.filePath),
    orderNo
  };
}

function imageEditSourceQueue(context: Record<string, unknown>) {
  const snapshot = sourceAssetsSnapshot(context);
  const characters = Array.isArray(snapshot.characters) ? snapshot.characters : [];
  return characters.flatMap((item, characterIndex) => {
    const character = objectValue(item);
    const characterId = stringValue(character.characterId) ?? stringValue(getPathValue(character, "character.id"));
    return [
      uploadAssetFromSnapshot(character.youngOriginalImage, "young", characterId, characterIndex * 2 + 1),
      uploadAssetFromSnapshot(character.oldOriginalImage, "old", characterId, characterIndex * 2 + 2)
    ].filter((asset): asset is UploadAsset => Boolean(asset));
  });
}

function editedAssetsForCharacter(characterId: string | null) {
  if (!characterId) return [];
  return assetsService.list({ characterId })
    .filter((asset) => String(asset.assetCategory ?? asset.assetType ?? "").toUpperCase() === "CHARACTER_IMAGE")
    .filter((asset) => ["EDITED_IMAGE", "BEST_EDITED_VERSION"].includes(String(asset.assetSubType ?? "").toUpperCase()))
    .sort((a, b) => Number(Boolean(b.isBestVersion)) - Number(Boolean(a.isBestVersion)) || String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
}

function editedPair(characterId: string | null, orderNo: number) {
  const assets = editedAssetsForCharacter(characterId);
  const oldEdited = assets.find((asset) => String(objectValue(asset.metadata).sourceRole ?? objectValue(asset.attributes).sourceRole ?? "").toLowerCase() === "old") ?? assets[0];
  const youngEdited = assets.find((asset) => String(objectValue(asset.metadata).sourceRole ?? objectValue(asset.attributes).sourceRole ?? "").toLowerCase() === "young") ?? assets.find((asset) => asset.id !== oldEdited?.id) ?? assets[0];
  return [oldEdited, youngEdited]
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset?.id))
    .map((asset, index) => ({
      assetId: String(asset.id),
      assetType: asset.assetType ?? asset.assetCategory ?? null,
      characterId,
      role: index === 0 ? "old_edited" : "young_edited",
      filePath: asset.filePath ?? null,
      publicUrl: asset.publicUrl ?? null,
      absolutePath: asset.filePath ?? null,
      orderNo: orderNo + index
    }));
}

function videoEditPairQueue(context: Record<string, unknown>) {
  const snapshot = sourceAssetsSnapshot(context);
  const characters = Array.isArray(snapshot.characters) ? snapshot.characters : [];
  const characterIds = characters.map((item) => {
    const character = objectValue(item);
    return stringValue(character.characterId) ?? stringValue(getPathValue(character, "character.id"));
  });
  return characterIds.flatMap((characterId, index) => editedPair(characterId, index * 2 + 1));
}

function videoComposeAssets(context: Record<string, unknown>) {
  const sourceBatchId = stringValue(getPathValue(context, "sourceBatch.id"))
    ?? stringValue(getPathValue(context, "batch.id"))
    ?? stringValue(context.sourceBatchId);
  return assetsService.list({})
    .filter((asset) => {
      const category = String(asset.assetCategory ?? asset.assetType ?? "").toUpperCase();
      const metadata = objectValue(asset.metadata);
      return category.includes("VIDEO")
        && (!sourceBatchId || stringValue(metadata.sourceBatchId) === sourceBatchId || stringValue(metadata.batchId) === sourceBatchId);
    })
    .map((asset, index) => ({
      assetId: String(asset.id),
      assetType: asset.assetType ?? asset.assetCategory ?? null,
      characterId: asset.characterId ?? null,
      role: "video_transition",
      filePath: asset.filePath ?? null,
      publicUrl: asset.publicUrl ?? null,
      absolutePath: asset.filePath ?? null,
      orderNo: index + 1
    }));
}

function resolverState(context: Record<string, unknown>) {
  const state = objectValue(context.resolverState);
  return {
    imageEditUploadCursor: numberValue(state.imageEditUploadCursor ?? context.imageEditUploadCursor, 0),
    videoEditPairCursor: numberValue(state.videoEditPairCursor ?? context.videoEditPairCursor, 0)
  };
}

function requireProductionContext(assetSource: UploadAssetSource, context: Record<string, unknown>) {
  if (assetSource === "MANUAL_ASSET") return;
  const snapshot = sourceAssetsSnapshot(context);
  if (!Object.keys(snapshot).length) {
    throw new AppError(
      "UPLOAD_ASSET_CONTEXT_REQUIRED",
      `This assetSource requires ${assetSource.startsWith("IMAGE_EDIT") ? "IMAGE_EDIT" : "production"} runtime context. Use MANUAL_ASSET for Test Run.`,
      400
    );
  }
}

export const scriptAssetResolver = {
  resolveUploadAsset(stepConfig: Record<string, unknown>, runtimeContext: Record<string, unknown>) {
    const testOverride = objectValue(runtimeContext.testRunUploadOverride);
    const overrideStepNo = numberValue(testOverride.stepNo, 0);
    const currentStepNo = numberValue(runtimeContext.currentStepNo, 0);
    const overrideApplies = !overrideStepNo || !currentStepNo || overrideStepNo === currentStepNo;
    const effectiveConfig: Record<string, unknown> = {
      ...stepConfig,
      ...(overrideApplies && stringValue(testOverride.assetSource) ? { assetSource: testOverride.assetSource } : {}),
      ...(overrideApplies && stringValue(testOverride.assetId) ? { assetId: testOverride.assetId } : {})
    };
    const configuredSource = String(effectiveConfig.assetSource ?? (effectiveConfig.assetId ? "MANUAL_ASSET" : "IMAGE_EDIT_NEXT_SOURCE"));
    const assetSource = uploadAssetSources.includes(configuredSource as UploadAssetSource)
      ? configuredSource as UploadAssetSource
      : "MANUAL_ASSET";
    const state = resolverState(runtimeContext);

    if (assetSource === "IMAGE_EDIT_NEXT_SOURCE") {
      const currentUpload = objectValue(runtimeContext.currentUpload);
      const currentSource = objectValue(getPathValue(runtimeContext, "asset.currentSourceImage"));
      const sourceAsset = objectValue(runtimeContext.sourceAsset);
      const sourceAssetId = stringValue(currentUpload.assetId)
        ?? stringValue(currentSource.id)
        ?? stringValue(currentSource.assetId)
        ?? stringValue(sourceAsset.id)
        ?? stringValue(sourceAsset.assetId)
        ?? stringValue(runtimeContext.sourceAssetId);
      if (sourceAssetId) {
        const asset = assetsService.get(sourceAssetId);
        if (!asset) throw new AppError("ASSET_NOT_FOUND", "Asset not found", 404);
        const role = stringValue(currentUpload.sourceImageRole)
          ?? stringValue(currentUpload.role)
          ?? stringValue(currentSource.role)
          ?? stringValue(sourceAsset.role)
          ?? stringValue(runtimeContext.sourceImageRole)
          ?? "source";
        return {
          assetsToUpload: [{
            assetId: sourceAssetId,
            assetType: asset.assetType ?? asset.assetCategory ?? null,
            characterId: stringValue(currentUpload.characterId) ?? asset.characterId ?? stringValue(runtimeContext.characterId),
            role,
            filePath: asset.filePath ?? stringValue(currentSource.filePath) ?? stringValue(sourceAsset.filePath),
            publicUrl: asset.publicUrl ?? stringValue(currentSource.publicUrl) ?? stringValue(sourceAsset.publicUrl),
            absolutePath: asset.filePath ?? stringValue(currentSource.absolutePath) ?? stringValue(sourceAsset.absolutePath),
            orderNo: numberValue(currentUpload.orderNo ?? runtimeContext.orderNo, 1)
          }],
          resolverState: state
        };
      }
    }

    if (assetSource === "MANUAL_ASSET") {
      const assetId = stringValue(effectiveConfig.assetId) ?? stringValue(effectiveConfig.fileAssetId);
      if (!assetId) throw new AppError("ASSET_ID_REQUIRED", "upload-file with MANUAL_ASSET requires assetId", 400);
      const asset = assetsService.get(assetId);
      if (!asset) throw new AppError("ASSET_NOT_FOUND", "Asset not found", 404);
      return {
        assetsToUpload: [{
          assetId,
          assetType: asset.assetType ?? asset.assetCategory ?? null,
          characterId: asset.characterId ?? null,
          role: "manual",
          filePath: asset.filePath ?? null,
          publicUrl: asset.publicUrl ?? null,
          absolutePath: asset.filePath ?? null,
          orderNo: 1
        }],
        resolverState: state
      };
    }

    requireProductionContext(assetSource, runtimeContext);

    if (assetSource === "IMAGE_EDIT_NEXT_SOURCE") {
      const queue = imageEditSourceQueue(runtimeContext);
      const asset = queue[state.imageEditUploadCursor];
      if (!asset) throw new AppError("UPLOAD_ASSET_QUEUE_EXHAUSTED", "No remaining IMAGE_EDIT source assets to upload", 400);
      return {
        assetsToUpload: [asset],
        resolverState: {
          ...state,
          imageEditUploadCursor: state.imageEditUploadCursor + 1
        }
      };
    }

    if (assetSource === "VIDEO_EDIT_NEXT_PAIR") {
      const queue = videoEditPairQueue(runtimeContext);
      const offset = state.videoEditPairCursor * 2;
      const pair = queue.slice(offset, offset + 2);
      if (!pair.length) throw new AppError("UPLOAD_ASSET_QUEUE_EXHAUSTED", "No remaining VIDEO_EDIT asset pairs to upload", 400);
      return {
        assetsToUpload: pair,
        resolverState: {
          ...state,
          videoEditPairCursor: state.videoEditPairCursor + 1
        }
      };
    }

    const assetsToUpload = videoComposeAssets(runtimeContext);
    if (!assetsToUpload.length) throw new AppError("UPLOAD_ASSET_QUEUE_EMPTY", "No VIDEO_COMPOSE video assets are available", 400);
    return {
      assetsToUpload,
      resolverState: state
    };
  }
};
