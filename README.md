\*This project is powered by FastAPI and React Vite

# Accessibility Checker

This website allows you to audit any public website to ensure that it meets most accessibility standards

# Getting Started with Axe-core and Playwright
Run `pip install playwright axe-playwright-python`
`playwright install chromium`

# Installing React and Vite
Run `npm install`
then `npm run dev` to start the front end
# installing Fast API
 `pip install fastapi "uvicorn[standard]"`




# Installing the chat dependency
`pip install huggingface_hub`

# Running the back end
From the project folder (with your virtual environment active):

```
cd src
uvicorn scanner:app --reload --port 8000
```

Run this in a second terminal while `npm run dev` is running, then open http://localhost:5173.
The API docs are at http://127.0.0.1:8000/docs. Opening http://127.0.0.1:8000/ shows `{"detail":"Not Found"}`, which is expected.

# Setting up the chat (optional)
The "Ask about this scan" chat needs a Hugging Face token. Scanning works without one.

1. Create a fine-grained token at https://huggingface.co/settings/tokens with **"Make calls to Inference Providers"** checked.
2. Put it in a `.env` file in the project folder (already ignored by git, never commit it):
   ```
   HF_TOKEN=hf_your_token_here
   ```
3. Start the back end with the token loaded:
   ```
   set -a && source .env && set +a && cd src && uvicorn scanner:app --reload --port 8000
   ```

Each teammate should use their own token.
