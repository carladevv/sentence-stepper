# Contributing to Sentence-Stepper

Thank you for your interest in helping improve **Sentence-Stepper**! 🎉  
This guide explains how to contribute code, documentation, or ideas in a way that keeps things organized and welcoming for everyone.

---

## 🔁 Contribution Workflow

1. **Fork the repo**  
   Click the **Fork** button on [the GitHub page](https://github.com/carladevv/sentence-stepper) to create your own copy.

2. **Clone your fork**  
   ```bash
   git clone https://github.com/YOUR-USERNAME/sentence-stepper.git
   cd sentence-stepper
   ```

3. **Create a new branch from `dev`**

   First, make sure you have the latest `dev`:
    ```bash
   git checkout dev
   git pull origin dev
   ```
   Then, create your feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

5. **Make your changes**  
   - Keep commits small and focused.
   - Follow the code style already used in the project.
   - Test your changes in Firefox or Chrome.

6. **Commit with a clear message**  
   Use one of these prefixes:
   - `feat:` — new feature (e.g., `feat: add epub reader`)
   - `fix:` — bug fix (e.g., `fix: correct toolbar alignment`)
   - `docs:` — documentation only (e.g., `docs: update installation guide`)
   - `chore:` — maintenance (e.g., `chore: update dependencies`)

7. **Push to your fork**  
   ```bash
   git push origin your-branch-name
   ```

8. **Open a Pull Request (PR)**  
   - Go to your fork on GitHub.
   - Click **Compare & pull request**.
   - **Target branch**: `dev` (not `main`!)
   - Write a clear description of what your PR does and why.

---

## 🧪 How to Test Your Changes

### Firefox (Recommended)
1. Open **Firefox**.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click **"Load Temporary Add-on..."**.
4. Navigate to your local repo folder and select **`manifest.json`**.
5. The extension will appear in your toolbar!  
   → Any changes to code require **reloading** the extension (click "Reload" on the debug page).

### Chrome
1. Open **Chrome**.
2. Go to `chrome://extensions`.
3. Enable **"Developer mode"** (toggle in top right).
4. Click **"Load unpacked"**.
5. Select your local repo folder (the one containing `manifest.json`).
6. The extension will appear in your toolbar!  
   → After code changes, click the **"Reload"** button on the extension card.

---

## 📌 Notes

- **`main` branch** is for stable, released code — **never** target it directly.
- **`dev` branch** is for active development and experiments.
- If you’re unsure where to start, check the [Issues](https://github.com/carladevv/sentence-stepper/issues) or just say hello!
---

## 💖 Thank You!

Every contribution—big or small—makes Sentence-Stepper better for everyone.  
We appreciate your time, care, and enthusiasm! ❤️
