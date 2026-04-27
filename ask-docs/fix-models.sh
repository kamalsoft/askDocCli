#!/bin/bash
# fix-models.sh

MODELS_DIR="./models"

# 1. Fix Jina v2 (Embedding Model)
JINA_PATH="$MODELS_DIR/Xenova/jina-embeddings-v2-base-en/onnx"
if [ -f "$JINA_PATH/model_quantized.onnx" ]; then
    echo "✅ Renaming Jina: model_quantized.onnx -> model_q4.onnx"
    mv "$JINA_PATH/model_quantized.onnx" "$JINA_PATH/model_q4.onnx"
fi

# 2. Fix Phi-3.5
PHI_PATH="$MODELS_DIR/onnx-community/Phi-3.5-mini-instruct-ONNX-GQA/onnx"
if [ -f "$PHI_PATH/decoder_model_merged_quantized.onnx" ]; then
    echo "✅ Renaming Phi-3.5: decoder_model_merged_quantized.onnx -> model_q4.onnx"
    mv "$PHI_PATH/decoder_model_merged_quantized.onnx" "$PHI_PATH/model_q4.onnx"
fi

if [ -f "$PHI_PATH/decoder_model_merged_quantized.onnx_data" ]; then
    echo "✅ Renaming Phi-3.5 Data: decoder_model_merged_quantized.onnx_data -> model_q4.onnx_data"
    mv "$PHI_PATH/decoder_model_merged_quantized.onnx_data" "$PHI_PATH/model_q4.onnx_data"
fi

# 3. Fix Llama-3.2
LLAMA_PATH="$MODELS_DIR/onnx-community/Llama-3.2-1B-Instruct/onnx"
if [ -f "$LLAMA_PATH/decoder_model_merged_quantized.onnx" ]; then
    echo "✅ Renaming Llama: decoder_model_merged_quantized.onnx -> model_q4.onnx"
    mv "$LLAMA_PATH/decoder_model_merged_quantized.onnx" "$LLAMA_PATH/model_q4.onnx"
fi

# 4. Fix Qwen-2.5
QWEN_PATH="$MODELS_DIR/onnx-community/Qwen2.5-0.5B-Instruct/onnx"
if [ -f "$QWEN_PATH/decoder_model_merged_quantized.onnx" ]; then
    echo "✅ Renaming Qwen: decoder_model_merged_quantized.onnx -> model_q4.onnx"
    mv "$QWEN_PATH/decoder_model_merged_quantized.onnx" "$QWEN_PATH/model_q4.onnx"
fi

echo "🚀 All files renamed correctly. Now run: node list-models.js"