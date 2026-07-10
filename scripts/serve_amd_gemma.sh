#!/usr/bin/env bash
# Serve Gemma ON the AMD MI300X with vLLM (ROCm) so RecipeReel's synthesis runs on
# AMD compute — this is what competes for the Track-3 "Best AMD-HOSTED Gemma" prize.
# vLLM exposes an OpenAI-compatible endpoint, so RecipeReel just points at it with
# SYNTHESIZER=amd (see .env: AMD_LLM_BASE_URL / AMD_LLM_MODEL).
#
# Run this on the AMD Developer Cloud pod (uses AMD's prebuilt vLLM ROCm image).
set -euo pipefail

MODEL="${AMD_LLM_MODEL:-google/gemma-3-27b-it}"
PORT="${AMD_LLM_PORT:-8001}"

echo "▶ Serving $MODEL with vLLM on ROCm (MI300X), OpenAI API on :$PORT"
docker run --rm -it \
  --device=/dev/kfd --device=/dev/dri --group-add video \
  --ipc=host --shm-size 16G \
  -p "${PORT}:8000" \
  -e HF_TOKEN="${HF_TOKEN:-}" \
  rocm/vllm:latest \
  vllm serve "$MODEL" --host 0.0.0.0 --port 8000 --max-model-len 8192

# Then run RecipeReel with:
#   SYNTHESIZER=amd AMD_LLM_BASE_URL=http://localhost:${PORT}/v1 \
#     AMD_LLM_MODEL=$MODEL uvicorn app.main:app
