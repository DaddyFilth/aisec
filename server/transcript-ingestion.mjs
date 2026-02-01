import dotenv from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
import { buildTranscriptBatches, normalizeTranscriptPayload, DEFAULT_TRANSCRIPT_BATCH_SIZE } from './transcript-ingestion-utils.mjs';
import { buildTranscriptUnigramModel } from './transcript-model-utils.mjs';

const USAGE = `Usage: node server/transcript-ingestion.mjs --input <path> [--batch <size>] [--label <name>] [--model-out <path>] [--model-only] [--dry-run]`;

const MODEL_NOTES = 'Use --model-out to write a unigram token model JSON file.';

dotenv.config();

const ANYTHINGLLM_API_URL = process.env.ANYTHINGLLM_API_URL;
const ANYTHINGLLM_API_KEY = process.env.ANYTHINGLLM_API_KEY;
const ANYTHINGLLM_WORKSPACE_SLUG = process.env.ANYTHINGLLM_WORKSPACE_SLUG;
const ML_TRANSCRIPT_PATH = process.env.ML_TRANSCRIPT_PATH;
const ML_TRANSCRIPT_BATCH_SIZE = Number.parseInt(process.env.ML_TRANSCRIPT_BATCH_SIZE ?? '', 10);
const ML_TRANSCRIPT_LABEL = process.env.ML_TRANSCRIPT_LABEL || 'conversation-transcripts';
const ML_TRANSCRIPT_DRY_RUN = process.env.ML_TRANSCRIPT_DRY_RUN === 'true';
const ML_TRANSCRIPT_MODEL_PATH = process.env.ML_TRANSCRIPT_MODEL_PATH;
const ML_TRANSCRIPT_MODEL_ONLY = process.env.ML_TRANSCRIPT_MODEL_ONLY === 'true';

const args = process.argv.slice(2);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
};

const inputPath = getArgValue('--input') ?? ML_TRANSCRIPT_PATH;
const batchSizeArg = getArgValue('--batch');
const batchSize = Number.parseInt(batchSizeArg ?? '', 10);
const resolvedBatchSize = Number.isFinite(batchSize) && batchSize > 0
  ? batchSize
  : Number.isFinite(ML_TRANSCRIPT_BATCH_SIZE) && ML_TRANSCRIPT_BATCH_SIZE > 0
    ? ML_TRANSCRIPT_BATCH_SIZE
    : DEFAULT_TRANSCRIPT_BATCH_SIZE;
const label = getArgValue('--label') ?? ML_TRANSCRIPT_LABEL;
const dryRun = args.includes('--dry-run') || ML_TRANSCRIPT_DRY_RUN;
const modelPath = getArgValue('--model-out') ?? ML_TRANSCRIPT_MODEL_PATH;
const modelOnly = args.includes('--model-only') || ML_TRANSCRIPT_MODEL_ONLY;

const ensureConfig = () => {
  if (!inputPath) {
    console.error('Transcript input file is required.');
    console.error(USAGE);
    console.error(MODEL_NOTES);
    process.exitCode = 1;
    return false;
  }
  if (!dryRun && !modelOnly && (!ANYTHINGLLM_API_URL || !ANYTHINGLLM_API_KEY || !ANYTHINGLLM_WORKSPACE_SLUG)) {
    console.error('AnythingLLM configuration is missing. Set ANYTHINGLLM_API_URL, ANYTHINGLLM_API_KEY, and ANYTHINGLLM_WORKSPACE_SLUG.');
    process.exitCode = 1;
    return false;
  }
  return true;
};

const uploadBatch = async (batch) => {
  const response = await fetch(`${ANYTHINGLLM_API_URL}/v1/document/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANYTHINGLLM_API_KEY}`
    },
    body: (() => {
      const form = new FormData();
      const filename = `${label}-batch-${batch.index + 1}.txt`;
      form.append('file', new Blob([batch.text], { type: 'text/plain' }), filename);
      form.append('addToWorkspaces', ANYTHINGLLM_WORKSPACE_SLUG);
      return form;
    })()
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AnythingLLM upload failed: ${response.status} ${text}`);
  }
};

const run = async () => {
  if (!ensureConfig()) return;
  const raw = await readFile(inputPath, 'utf8');
  const parsed = JSON.parse(raw);
  const entries = normalizeTranscriptPayload(parsed);
  const { batches, skipped } = buildTranscriptBatches(entries, resolvedBatchSize);

  if (modelPath) {
    const model = buildTranscriptUnigramModel(entries);
    await writeFile(modelPath, JSON.stringify(model, null, 2));
    console.log(`Saved transcript model to ${modelPath}.`);
  }

  console.log(`Prepared ${batches.length} batch(es) from ${entries.length} transcript(s). Skipped ${skipped}.`);
  if (dryRun || modelOnly) {
    console.log('Model-only or dry run enabled. No uploads performed.');
    return;
  }
  for (const batch of batches) {
    await uploadBatch(batch);
    console.log(`Uploaded batch ${batch.index + 1}/${batches.length} (${batch.count} transcripts).`);
  }
};

run().catch(error => {
  console.error('Transcript ingestion failed:', error);
  process.exitCode = 1;
});
