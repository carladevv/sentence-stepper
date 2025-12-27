# Share Your Entire Repo with Any AI (Free Method)

No paid tools needed! Convert your whole repo into a single text file for any AI.

## Step 1: Save this script as `repo_to_file.py`
```python
import os

def combine_repo(root_dir, output_file="entire_repo.txt"):
    with open(output_file, "w", encoding="utf-8") as out:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Skip hidden folders
            dirnames[:] = [d for d in dirnames if not d.startswith('.')]
            for d in ['node_modules', '__pycache__']:
                if d in dirnames:
                    dirnames.remove(d)
            for filename in sorted(filenames):
                if filename == output_file:
                    continue
                # Skip binary files
                if any(filename.endswith(ext) for ext in ['.png','.jpg','.jpeg','.gif','.pdf','.zip','.bin']):
                    continue
                filepath = os.path.join(dirpath, filename)
                try:
                    out.write(f"\n{'='*60}\nFILE: {filepath}\n{'='*60}\n\n")
                    with open(filepath, "r", encoding="utf-8") as f:
                        out.write(f.read())
                except Exception as e:
                    out.write(f"[ERROR reading {filepath}: {str(e)}]\n")
    print(f"✅ Done! File saved as: {output_file}")

if __name__ == "__main__":
    combine_repo(".")
```

## Step 2: Run it in your repo folder
```bash
# Navigate to your repo root
cd /path/to/your/repo

# Run the script
python repo_to_file.py
```

## Step 3: Use the output
1. Open `entire_repo.txt` in your repo folder
2. **Copy the entire contents**
3. Paste into any free AI chat (DeepSeek, Qwen, etc.)

> **Note**: 
> - Works on Windows/macOS/Linux
> - Requires [Python](https://python.org) installed
> - Automatically skips binaries, `.git`, and `node_modules`
> - Keeps all file paths and code structure intact

*Now any AI can "see" your whole project for free!*
