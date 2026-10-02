import { NextResponse } from "next/server";
import type { ProofResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAGNOSTIC_TIMEOUT_MS = 5_000;

type TagsPayload = {
  models?: Array<{ name?: unknown; model?: unknown }>;
};

type PsPayload = {
  models?: Array<{
    name?: unknown;
    model?: unknown;
    size?: unknown;
    size_vram?: unknown;
  }>;
};

async function readJson(baseUrl: string, path: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DIAGNOSTIC_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function GET() {
  const proof: ProofResponse = {
    proofTimestamp: new Date().toISOString(),
    modelEndpointReachable: false,
  };

  const baseUrl = process.env.MODEL_BASE_URL?.trim().replace(/\/+$/, "");
  const configuredModel = process.env.OLLAMA_MODEL?.trim();
  const configuredCompute = process.env.GPU_LABEL?.trim();
  const rawCommitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  const commitSha = rawCommitSha && /^[0-9a-f]{7,40}$/i.test(rawCommitSha) ? rawCommitSha : undefined;

  if (configuredCompute) proof.configuredCompute = configuredCompute;
  if (configuredModel) proof.configuredModel = configuredModel;
  if (commitSha) proof.deploymentCommitSha = commitSha;

  if (!baseUrl) {
    return NextResponse.json(proof, { headers: { "Cache-Control": "no-store" } });
  }

  const [versionPayload, tagsPayload, psPayload] = await Promise.all([
    readJson(baseUrl, "/api/version"),
    readJson(baseUrl, "/api/tags"),
    readJson(baseUrl, "/api/ps"),
  ]);

  proof.modelEndpointReachable = Boolean(versionPayload || tagsPayload || psPayload);

  if (versionPayload && typeof versionPayload === "object" && "version" in versionPayload) {
    const version = (versionPayload as { version?: unknown }).version;
    if (typeof version === "string" && version.trim()) proof.ollamaVersion = version.trim();
  }

  if (configuredModel && tagsPayload && typeof tagsPayload === "object") {
    const models = (tagsPayload as TagsPayload).models;
    if (Array.isArray(models)) {
      proof.configuredModelPresent = models.some((item) => item.name === configuredModel || item.model === configuredModel);
    }
  }

  if (psPayload && typeof psPayload === "object") {
    const models = (psPayload as PsPayload).models;
    if (Array.isArray(models) && models.length > 0) {
      const preferred = configuredModel
        ? models.find((item) => item.name === configuredModel || item.model === configuredModel) ?? models[0]
        : models[0];
      const name = typeof preferred.name === "string"
        ? preferred.name
        : typeof preferred.model === "string"
          ? preferred.model
          : null;
      if (name) {
        const sizeBytes = finiteNumber(preferred.size);
        const sizeVramBytes = finiteNumber(preferred.size_vram);
        proof.loadedModel = {
          name,
          ...(sizeBytes === undefined ? {} : { sizeBytes }),
          ...(sizeVramBytes === undefined ? {} : { sizeVramBytes }),
        };
      }
    }
  }

  return NextResponse.json(proof, { headers: { "Cache-Control": "no-store" } });
}
