<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1dvu3b28flLd5RedGN1Ikqvup6AETvvhl

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. # a. Download & install Ollama
# https://ollama.com/download  (Windows installer)

# b. Pull the model (small, fast, 2GB)
ollama pull llama3.2

# c. Ollama auto-starts on Windows after install.
#    To verify it's running:
ollama list

3. Run the app:
   `npm run dev`
