import os
import re

source_path = r"C:\Users\arkTech\Downloads\waydrop-app\admin-ui\10_Admin_Desk_open_on_computer.html"
pages_dir = r"C:\Users\arkTech\Downloads\waydrop-app\admin-ui\pages"
os.makedirs(pages_dir, exist_ok=True)

with open(source_path, "r", encoding="utf-8") as f:
    raw_html = f.read()

# Extract defs
defs_match = re.search(r'(<svg width="0" height="0".*?</svg>)', raw_html, re.DOTALL)
svg_defs = defs_match.group(1) if defs_match else ""

# Extract WORLD, BAG, SPILL SVG strings
world_match = re.search(r'const WORLD = `(.*?)`;', raw_html, re.DOTALL)
world_svg = world_match.group(1) if world_match else ""

bag_match = re.search(r'const BAG = `(.*?)`;', raw_html, re.DOTALL)
bag_svg = bag_match.group(1) if bag_match else ""

spill_match = re.search(r'const SPILL = `(.*?)`;', raw_html, re.DOTALL)
spill_svg = spill_match.group(1) if spill_match else ""

print("Extracted SVGs: WORLD len", len(world_svg), "BAG len", len(bag_svg), "SPILL len", len(spill_svg))
