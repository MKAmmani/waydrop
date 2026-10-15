import os
import re

source_path = r"C:\Users\arkTech\Downloads\waydrop-app\admin-ui\10_Admin_Desk_open_on_computer.html"
output_dir = r"C:\Users\arkTech\Downloads\waydrop-app\admin-ui"

with open(source_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract CSS
css_match = re.search(r"<style>(.*?)</style>", content, re.DOTALL)
if css_match:
    css_content = css_match.group(1).strip()
    with open(os.path.join(output_dir, "assets", "admin_desk.css"), "w", encoding="utf-8") as f:
        f.write(css_content)
    print("Extracted admin_desk.css successfully.")

# 2. Extract SVG defs
svg_defs_match = re.search(r'(<svg width="0" height="0".*?</svg>)', content, re.DOTALL)
svg_defs = svg_defs_match.group(1) if svg_defs_match else ""

print("SVG defs extracted successfully.")
