import subprocess, json

files = subprocess.check_output(['git','ls-files']).decode().splitlines()
repo = "TiagoProw/lerempixels-codebase"
branch = "main"
out = [{"path": f, "raw_url": f"https://raw.githubusercontent.com/{repo}/{branch}/{f}"} for f in files]

with open('public/file-index.json','w', encoding='utf-8') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
