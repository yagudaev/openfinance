#!/bin/bash
set -e

MODELS=(
  "openrouter/z-ai/glm-4.7"
  "openrouter/z-ai/glm-5"
  "openrouter/anthropic/claude-sonnet-4-5"
  "openrouter/google/gemini-3.1-pro-preview"
  "openrouter/google/gemini-3-flash-preview"
  "openrouter/openai/gpt-4o-mini"
  "openrouter/openai/gpt-4o"
)

for m in "${MODELS[@]}"; do
  echo ""
  echo "========== Running eval: $m =========="
  EVAL_MODEL="$m" node --env-file=.env node_modules/.bin/volt eval run \
    --experiment ./src/voltagent/evals/math-tool-usage.ts
done

echo ""
echo "All models evaluated."
