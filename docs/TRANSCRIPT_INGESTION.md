# Transcript Ingestion

Use the transcript ingestion script to load conversation transcripts and upload them into AnythingLLM for model context enrichment.

## Usage

```bash
node server/transcript-ingestion.mjs --input ./data/transcripts.json
```

### Options

- `--input <path>`: Path to a JSON file containing transcript data.
- `--batch <size>`: Optional batch size (default: 50).
- `--label <name>`: File label prefix when uploading (default: `conversation-transcripts`).
- `--model-out <path>`: Write a unigram token model JSON file.
- `--model-only`: Generate the model without uploading batches.
- `--dry-run`: Parse and batch transcripts without uploading.

## Expected JSON shapes

The script accepts an array of transcript objects, or an object with a `transcripts` or `calls` array.
Each transcript entry may include:

- `transcription`, `transcript`, `lines`, or `utterances` arrays
- `messages` or `conversation` arrays with `{ role, content }` entries
- Plain `text`/`content` fields

## Environment variables

```env
ML_TRANSCRIPT_PATH=./data/transcripts.json
ML_TRANSCRIPT_BATCH_SIZE=50
ML_TRANSCRIPT_LABEL=conversation-transcripts
ML_TRANSCRIPT_DRY_RUN=false
ML_TRANSCRIPT_MODEL_PATH=./data/transcript-model.json
ML_TRANSCRIPT_MODEL_ONLY=false
```

AnythingLLM variables (`ANYTHINGLLM_API_URL`, `ANYTHINGLLM_API_KEY`, `ANYTHINGLLM_WORKSPACE_SLUG`) must also be set unless using `--dry-run`.

## Model output

When you pass `--model-out`, the script writes a unigram token frequency model with counts and metadata.
This can be used to kickstart downstream ML workflows before full training.

## Sample model

A sample unigram model is available at `models/transcript-unigram-model.sample.json` to illustrate the output format.
