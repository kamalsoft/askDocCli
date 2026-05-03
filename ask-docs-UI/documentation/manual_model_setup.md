# Manual Model Setup Guide (Offline Mode)

Since automated downloads can be intercepted by firewalls, follow these steps to manually populate the `models/` directory with the correct **4-bit quantized** weights.

## 1. Directory Structure
Ensure your `models` folder is organized exactly like this:
```text
ask-docs/models/
└── onnx-community/
    └── Phi-3.5-mini-instruct-ONNX-GQA/
        ├── config.json
        ├── tokenizer.json
        ├── tokenizer_config.json
        ├── special_tokens_map.json
        └── onnx/
            ├── model_q4.onnx      (MUST be ~649 MB)
            └── model_q4.onnx_data (MUST be ~1.90 GB)
└── Xenova/
    └── jina-embeddings-v2-base-en/
        ├── config.json
        ├── tokenizer.json
        ├── tokenizer_config.json
        └── onnx/
            └── model_q4.onnx
```

## 2. Download URLs (Use a browser or personal network)
Download the following files. **Note:** If `model_q4.onnx` is smaller than 2GB, the download failed.

### Option A: Using Hugging Face CLI (Recommended)
First, install the CLI if you haven't already:
```bash
python3 -m pip install -U "huggingface_hub[cli]"
```

Then download the model weights:
```bash
huggingface-cli download onnx-community/Phi-3.5-mini-instruct-ONNX-GQA --local-dir ./models/onnx-community/Phi-3.5-mini-instruct-ONNX-GQA --local-dir-use-symlinks False
```

### Option B: Manual Download Links

| File | Direct Link | Expected Size |
| :--- | :--- | :--- |
| **Config** | [config.json](https://huggingface.co/onnx-community/Phi-3.5-mini-instruct-ONNX-GQA/resolve/main/config.json?download=true) | ~3 KB |
| **Tokenizer** | [tokenizer.json](https://huggingface.co/onnx-community/Phi-3.5-mini-instruct-ONNX-GQA/resolve/main/tokenizer.json?download=true) | ~9 MB |
| **Tokenizer Config** | [tokenizer_config.json](https://huggingface.co/onnx-community/Phi-3.5-mini-instruct-ONNX-GQA/resolve/main/tokenizer_config.json?download=true) | ~4 KB |
| **Tokens Map** | [special_tokens_map.json](https://huggingface.co/onnx-community/Phi-3.5-mini-instruct-ONNX-GQA/resolve/main/special_tokens_map.json?download=true) | ~1 KB |
| **Model Graph** | [model_q4.onnx](https://huggingface.co/onnx-community/Phi-3.5-mini-instruct-ONNX-GQA/resolve/main/onnx/model_q4.onnx?download=true) | ~649 MB |
| **Model Weights** | [model_q4.onnx_data](https://huggingface.co/onnx-community/Phi-3.5-mini-instruct-ONNX-GQA/resolve/main/onnx/model_q4.onnx_data?download=true) | ~1.90 GB |

## 4. Verification
Run the following command in the `ask-docs` folder to verify the setup:
```bash
node list-models.js
```
It should report **✅ Available** and a size of approximately **1.96 GB to 2.11 GB** for the Phi 3.5 model.