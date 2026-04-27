#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "💡 Loading environment variables from .env..."
    export $(grep -v '^#' .env | xargs)
fi

# Path where models will be stored (relative to project root)
MODELS_DIR="./models"

# Portable file size function (macOS/Linux)
get_file_size() {
    local file=$1
    if [[ "$(uname)" == "Darwin" ]]; then
        stat -f%z "$file" 2>/dev/null || echo 0
    else
        stat -c%s "$file" 2>/dev/null || echo 0
    fi
}

download_model() {
    local org=$1
    local repo=$2
    local folder="$MODELS_DIR/$org/$repo"
    
    echo "📂 Creating directory: $folder"
    mkdir -p "$folder/onnx"

    base_url="https://huggingface.co/$org/$repo/resolve/main"
    echo "Base URL: $base_url"

    # Prepare authentication header if HF_TOKEN is set
    # Ensure HF_TOKEN is trimmed of any whitespace/carriage returns
    AUTH_ARGS=()
    if [ -n "$HF_TOKEN" ]; then
        AUTH_ARGS=(-H "Authorization: Bearer $HF_TOKEN")
    fi

    # List of essential files for Xenova/transformers
    files=(
        "config.json"
        "tokenizer.json"
        "tokenizer_config.json"
        "special_tokens_map.json"
    )

    for file in "${files[@]}"; do
        # Check if file exists AND is larger than 100 bytes (ignoring LFS pointers)
        if [ -f "$folder/$file" ] && [ $(stat -f%z "$folder/$file" 2>/dev/null || stat -c%s "$folder/$file") -gt 100 ]; then
            echo "⏭️ $file already exists, skipping."
        else
            echo "⬇️ Downloading $file..."
            curl "${AUTH_ARGS[@]}" -LfgC - --progress-bar "$base_url/${file}?download=true" -o "$folder/$file"
        fi
    done

    # Download ONNX weights
    local hub_file=""
    local target=""

    if [[ "$repo" == "Phi-3.5-mini-instruct-ONNX-GQA" || "$repo" == "Qwen2.5-0.5B-Instruct" || "$repo" == "Llama-3.2-1B-Instruct" ]]; then
        hub_file="onnx/model_q4.onnx"
        target="onnx/model_q4.onnx"
    elif [[ "$repo" == "jina-embeddings-v2-base-en" ]]; then
        hub_file="onnx/model_quantized.onnx"
        target="onnx/model_q4.onnx"
    else
        hub_file="$target"
    fi

    local weights_size=$(get_file_size "$folder/$target")
    if [ -f "$folder/$target" ] && [ "$weights_size" -gt 1000000 ]; then
        echo "⏭️ Weights already exist, skipping."
    else
        echo "⬇️ Downloading weights from Hub: $hub_file"
        # Using the direct download endpoint for LFS weights with better fallback
        if ! curl "${AUTH_ARGS[@]}" -LfgC - --progress-bar "https://huggingface.co/$org/$repo/resolve/main/$hub_file?download=true" -o "$folder/$target"; then
            echo "⚠️  Failed to download $target, trying fallback names..."
            
            # Special case for Phi-3.5 GQA repo which names its weight model_q4.onnx
            local fallbacks=()
            if [[ "$repo" == "Phi-3.5-mini-instruct-ONNX-GQA" ]]; then
                fallbacks=("onnx/model_q4.onnx")
            fi
            fallbacks+=("onnx/model_quantized.onnx" "onnx/decoder_model_merged_quantized.onnx")
            
            for fb in "${fallbacks[@]}"; do
                if [[ "$fb" != "$target" ]]; then
                    echo "🔍 Trying fallback: $fb"
                    if curl "${AUTH_ARGS[@]}" -Lf --progress-bar "https://huggingface.co/$org/$repo/download/main/$fb" -o "$folder/$target"; then
                       echo "✅ Found weights at $fb"
                       break
                    fi
                fi
            done
        fi
    fi

    # Check for and download external data file (required for models > 2GB)
    echo "🔍 Checking for external data weights: ${hub_file}_data"
    if curl "${AUTH_ARGS[@]}" -I -Lf "https://huggingface.co/$org/$repo/resolve/main/${hub_file}_data" > /dev/null 2>&1; then
        echo "⬇️ Downloading external data weights..."
        curl "${AUTH_ARGS[@]}" -LfgC - --progress-bar "https://huggingface.co/$org/$repo/resolve/main/${hub_file}_data?download=true" -o "$folder/${target}_data"
    fi

    # Post-download integrity check (LFS pointer check)
    local final_size=$(get_file_size "$folder/$target")
    local min_size=100000 # 1MB
    
    # Phi 3.5 main .onnx file is ~680MB. The rest is in _data
    if [[ "$repo" == "Phi-3.5-mini-instruct-ONNX-GQA" ]]; then
        min_size=600000000
    fi

    if [ "$final_size" -lt "$min_size" ]; then
        echo "❌ ERROR: $folder/$target is too small ($final_size bytes). Expected at least $min_size."
        echo "   This is likely a Git LFS pointer. Re-run on an unrestricted network."
        # Clean up corrupt file
        rm -f "$folder/$target"
        exit 1
    fi
}

echo "🚀 Starting offline model download..."

# 1. Download Reasoning Models
download_model "onnx-community" "Phi-3.5-mini-instruct-ONNX-GQA"
download_model "onnx-community" "Llama-3.2-1B-Instruct"
download_model "onnx-community" "Qwen2.5-0.5B-Instruct"

# 2. Download Embedding Model (Jina v2)
download_model "Xenova" "jina-embeddings-v2-base-en"

echo "✅ Download complete."
echo "🔍 Starting model verification..."
node "$(dirname "$0")/verify-models.js"

echo "💡 Copy the '$MODELS_DIR' folder to your restricted environment."
echo "🔗 Ensure your config.js 'modelsPath' points to this directory."