import os

source_path = r"C:\Users\arkTech\Downloads\waydrop-app\admin-ui\10_Admin_Desk_open_on_computer.html"
pages_dir = r"C:\Users\arkTech\Downloads\waydrop-app\admin-ui\pages"
os.makedirs(pages_dir, exist_ok=True)

with open(source_path, "r", encoding="utf-8") as f:
    raw = f.read()

# Extract defs
defs = raw[raw.find('<svg width="0" height="0"'):raw.find('</svg>\n<div class="app">') + 6]

# Extract WORLD, BAG, SPILL SVG
world_svg = raw[raw.find('const WORLD = `') + len('const WORLD = `'):raw.find('`;\nconst BAG = `')]
bag_svg = raw[raw.find('const BAG = `') + len('const BAG = `'):raw.find('`;\nconst SPILL = `')]
spill_svg = raw[raw.find('const SPILL = `') + len('const SPILL = `'):raw.find('`;\nfunction drawLive()')]

def get_sidebar(active_key):
    items = [
        ("today", "01_today.html", "Today", None, None),
        ("queue", "02_queue.html", "All open", "hot", "11"),
        ("disputes", "03_disputes.html", "Disputes", None, "3"),
        ("kyc", "04_kyc.html", "ID checks", None, "5"),
        ("locked", "05_locked_handovers.html", "Locked handovers", None, "1"),
        ("payouts", "07_payouts.html", "Failed payouts", None, "2"),
        ("lookup_group", None, "Look up", None, None),
        ("errands", "05_locked_handovers.html", "Errands", None, None),
        ("people", "06_people.html", "People", None, None),
        ("campus_group", None, "Campus", None, None),
        ("places", "08_places.html", "Places", None, "4"),
        ("crew", "09_crew_routines.html", "Crew and routines", None, None),
        ("control_group", None, "Control", None, None),
        ("rules", "10_rules.html", "Rules", None, None),
        ("audit", "11_audit.html", "Audit log", None, None),
    ]

icons = {
    "today": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M96,40l33.52,88H56Zm104,88H129.52L160,208Z" opacity="0.2"/><path d="M240,128a8,8,0,0,1-8,8H204.94l-37.78,75.58A8,8,0,0,1,160,216h-.4a8,8,0,0,1-7.08-5.14L95.35,60.76,63.28,131.31A8,8,0,0,1,56,136H24a8,8,0,0,1,0-16H50.85L88.72,36.69a8,8,0,0,1,14.76.46l57.51,151,31.85-63.71A8,8,0,0,1,200,120h32A8,8,0,0,1,240,128Z"/></svg>',
    "queue": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V160H179.31a8,8,0,0,0-5.66,2.34l-19.31,19.32a8,8,0,0,1-5.66,2.34H107.31a8,8,0,0,1-5.66-2.34L82.34,162.34A8,8,0,0,0,76.68,160H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z" opacity="0.2"/><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,16V152h-28.7A15.86,15.86,0,0,0,168,156.69L148.69,176H107.31L88,156.68A15.89,15.89,0,0,0,76.69,152H48V48Zm0,160H48V168H76.69L96,187.32A15.89,15.89,0,0,0,107.31,192h41.38A15.86,15.86,0,0,0,160,187.31L179.31,168H208v40Z"/></svg>',
    "disputes": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M56,88l32,80c0,17.67-20,24-32,24s-32-6.33-32-24ZM200,56l-32,80c0,17.67,20,24,32,24s32-6.33,32-24Z" opacity="0.2"/><path d="M239.43,133l-32-80h0a8,8,0,0,0-9.16-4.84L136,62V40a8,8,0,0,0-16,0V65.58L54.26,80.19A8,8,0,0,0,48.57,85h0v.06L16.57,165a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32a7.92,7.92,0,0,0-.57-3L66.92,93.77,120,82V208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16H136V78.42L187,67.1,160.57,133a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32A7.92,7.92,0,0,0,239.43,133ZM56,184c-7.53,0-22.76-3.61-23.93-14.64L56,109.54l23.93,59.82C78.76,180.39,63.53,184,56,184Zm144-32c-7.53,0-22.76-3.61-23.93-14.64L200,77.54l23.93,59.82C222.76,148.39,207.53,152,200,152Z"/></svg>',
    "kyc": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H40a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V56A8,8,0,0,0,216,48ZM96,144a24,24,0,1,1,24-24A24,24,0,0,1,96,144Z" opacity="0.2"/><path d="M200,112a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h40A8,8,0,0,1,200,112Zm-8,24H152a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16Zm40-80V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56ZM216,200V56H40V200H216Zm-80.26-34a8,8,0,1,1-15.5,4c-2.63-10.26-13.06-18-24.25-18s-21.61,7.74-24.25,18a8,8,0,1,1-15.5-4,39.84,39.84,0,0,1,17.19-23.34,32,32,0,1,1,45.12,0A39.76,39.76,0,0,1,135.75,166ZM96,136a16,16,0,1,0-16-16A16,16,0,0,0,96,136Z"/></svg>',
    "locked": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg>',
    "payouts": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M232,96H24L128,32Z" opacity="0.2"/><path d="M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Zm40,0H96v64H64Zm80,0v64H112V104Zm48,64H160V104h32ZM128,41.39,203.74,88H52.26ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H240A8,8,0,0,1,248,208Z"/></svg>',
    "errands": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,129.09V232a8,8,0,0,1-3.84-1l-88-48.18a8,8,0,0,1-4.16-7V80.18a8,8,0,0,1,.7-3.25Z" opacity="0.2"/><path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90l80,43.78v85.79L40,175.82Zm176,85.78h0l-80,43.79V133.82l32-17.51V152a8,8,0,0,0,16,0V107.55L216,90v85.77Z"/></svg>',
    "people": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a95.76,95.76,0,0,1-31.8,71.37A72,72,0,0,0,128,160a40,40,0,1,0-40-40,40,40,0,0,0,40,40,72,72,0,0,0-64.2,39.37h0A96,96,0,1,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/></svg>',
    "places": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M184,80c0,56-56,88-56,88S72,136,72,80a56,56,0,0,1,112,0Z" opacity="0.2"/><path d="M112,80a16,16,0,1,1,16,16A16,16,0,0,1,112,80ZM64,80a64,64,0,0,1,128,0c0,59.95-57.58,93.54-60,94.95a8,8,0,0,1-7.94,0C121.58,173.54,64,140,64,80Zm16,0c0,42.2,35.84,70.21,48,78.5,12.15-8.28,48-36.3,48-78.5a48,48,0,0,0-96,0Zm122.77,67.63a8,8,0,0,0-5.54,15C213.74,168.74,224,176.92,224,184c0,13.36-36.52,32-96,32s-96-18.64-96-32c0-7.08,10.26-15.26,26.77-21.36a8,8,0,0,0-5.54-15C29.22,156.49,16,169.41,16,184c0,31.18,57.71,48,112,48s112-16.82,112-48C240,169.41,226.78,156.49,202.77,147.63Z"/></svg>',
    "crew": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M168,144a40,40,0,1,1-40-40A40,40,0,0,1,168,144ZM64,56A32,32,0,1,0,96,88,32,32,0,0,0,64,56Zm128,0a32,32,0,1,0,32,32A32,32,0,0,0,192,56Z" opacity="0.2"/><path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1,0-16,24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.85,8,57,57,0,0,0-98.15,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z"/></svg>',
    "rules": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,80a24,24,0,1,1-24-24A24,24,0,0,1,128,80Zm40,72a24,24,0,1,0,24,24A24,24,0,0,0,168,152Z" opacity="0.2"/><path d="M40,88H73a32,32,0,0,0,62,0h81a8,8,0,0,0,0-16H135a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16Zm64-24A16,16,0,1,1,88,80,16,16,0,0,1,104,64ZM216,168H199a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16h97a32,32,0,0,0,62,0h17a8,8,0,0,0,0-16Zm-48,24a16,16,0,1,1,16-16A16,16,0,0,1,168,192Z"/></svg>',
    "audit": '<svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,48V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96a39.83,39.83,0,0,0-8,24v8h80V64a39.83,39.83,0,0,0-8-24h40A8,8,0,0,1,208,48Z" opacity="0.2"/><path d="M168,152a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,152Zm-8-40H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm56-64V216a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V48A16,16,0,0,1,56,32H92.26a47.92,47.92,0,0,1,71.48,0H200A16,16,0,0,1,216,48ZM96,64h64a32,32,0,0,0-64,0ZM200,48H173.25A47.93,47.93,0,0,1,176,64v8a8,8,0,0,1-8,8H88a8,8,0,0,1-8-8V64a47.93,47.93,0,0,1,2.75-16H56V216H200Z"/></svg>'
}

def get_sidebar(active_key):
    items = [
        ("today", "01_today.html", "Today", None, None),
        ("queue", "02_queue.html", "All open", "hot", "11"),
        ("disputes", "03_disputes.html", "Disputes", None, "3"),
        ("kyc", "04_kyc.html", "ID checks", None, "5"),
        ("locked", "05_locked_handovers.html", "Locked handovers", None, "1"),
        ("payouts", "07_payouts.html", "Failed payouts", None, "2"),
        ("lookup_group", None, "Look up", None, None),
        ("errands", "05_locked_handovers.html", "Errands", None, None),
        ("people", "06_people.html", "People", None, None),
        ("campus_group", None, "Campus", None, None),
        ("places", "08_places.html", "Places", None, "4"),
        ("crew", "09_crew_routines.html", "Crew and routines", None, None),
        ("control_group", None, "Control", None, None),
        ("rules", "10_rules.html", "Rules", None, None),
        ("audit", "11_audit.html", "Audit log", None, None),
    ]

    html = ['<nav aria-label="Desk">',
            '  <div class="brand"><a href="01_today.html" style="text-decoration:none;display:flex;align-items:center;gap:10px;color:inherit;"><svg width="30" height="30" aria-hidden="true"><use href="#logo"/></svg><b>Waydrop</b><span>DESK</span></a></div>']

    for key, url, label, badge_type, badge_val in items:
        if url is None:
            html.append(f'  <div class="ngrp">{label}</div>')
        else:
            is_on = " on" if key == active_key else ""
            ic = icons.get(key, "")
            badge = ""
            if badge_val:
                hot_cls = " hot" if badge_type == "hot" else ""
                badge = f' <em class="{hot_cls}">{badge_val}</em>'
            html.append(f'  <a href="{url}" class="nlink{is_on}" style="text-decoration:none;">{ic} {label}{badge}</a>')

    html.append('  <div class="shift"><span class="av">FA</span><div><b>Funmi A.</b><small>Support lead, on shift</small></div></div>')
    html.append('</nav>')
    return "\n".join(html)

def build_page(filename, title, active_key, content_html, script_js=""):
    sidebar = get_sidebar(active_key)
    full = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Waydrop Desk: {title}</title>
<link rel="stylesheet" href="../assets/admin_desk.css">
</head>
<body>
{defs}
<div class="app">
{sidebar}
  <main>
    <div class="top">
      <label class="search"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg><input id="q" placeholder="Phone number, name, or errand reference (WD-…)" aria-label="Search"><kbd>/</kbd></label>
      <div class="campus"><span class="dotlive"></span> University of Lagos <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"/></svg></div>
      <div style="margin-left:auto;font-size:12px;color:var(--ink3)" id="clock"></div>
    </div>
    <div class="page">
{content_html}
    </div>
  </main>
</div>
<div class="scrim" id="scrim"><div class="modal" id="modal" role="dialog" aria-modal="true"></div></div>
<div class="toast" id="toast" role="status"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"/></svg><span></span></div>

<script src="../assets/admin_desk.js"></script>
<script>
{script_js}
</script>
</body>
</html>
"""
    with open(os.path.join(pages_dir, filename), "w", encoding="utf-8") as out:
        out.write(full)
    print(f"Generated {filename}")

# Helper for sparklines
def spark_svg(vals, color):
    w, h = 200, 26
    v_max, v_min = max(vals), min(vals)
    pts = " ".join([f"{(i / (len(vals)-1)) * w},{h - 3 - ((v - v_min) / max(1, v_max - v_min)) * (h - 6)}" for i, v in enumerate(vals)])
    return f'<svg class="spark" viewBox="0 0 {w} {h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>'

# Helper for Queue rows
QUEUE_DATA = [
  {"id": 'q1', "type": 'pin', "icon": 'lock', "title": 'Handover locked after 5 wrong PINs', "sub": 'WD-T9K4 · Indomie x2 · Ramat Hall · runner waiting', "sla": '3 min', "sla_cls": 'bad', "link": '05_locked_handovers.html', "type_lbl": 'Locked handover', "bg": 'var(--fault-wash)', "fg": 'var(--fault-ink)'},
  {"id": 'q2', "type": 'dispute', "icon": 'scales', "title": 'Fried rice arrived spilled', "sub": 'WD-4821 · Chidi N. vs Kunle B. · ₦800 held', "sla": '9 min', "sla_cls": 'bad', "link": '03_disputes.html', "type_lbl": 'Dispute', "bg": 'var(--held-wash)', "fg": 'var(--held-ink)'},
  {"id": 'q3', "type": 'safety', "icon": 'siren', "title": 'Safety report: "made me feel unsafe"', "sub": 'Report on runner Kunle B. by Ada O.', "sla": '4 min', "sla_cls": 'bad', "link": '06_people.html', "type_lbl": 'Safety', "bg": 'var(--fault-wash)', "fg": 'var(--fault-ink)'},
  {"id": 'q4', "type": 'kyc', "icon": 'id', "title": 'ID check: name mismatch to review', "sub": 'Ifeoma Chukwu · Student ID · provider unsure (0.71)', "sla": '22 min', "sla_cls": 'warn', "link": '04_kyc.html', "type_lbl": 'ID check', "bg": 'var(--inset)', "fg": 'var(--ink2)'},
  {"id": 'q5', "type": 'dispute', "icon": 'scales', "title": 'Charged the wrong amount (buy for me)', "sub": 'WD-5102 · receipt shows ₦1,650, logged ₦1,800', "sla": '41 min', "sla_cls": 'warn', "link": '03_disputes.html', "type_lbl": 'Dispute', "bg": 'var(--held-wash)', "fg": 'var(--held-ink)'},
  {"id": 'q6', "type": 'payout', "icon": 'bank', "title": 'Withdrawal failed twice', "sub": 'Amaka O. · ₦3,500 to Access Bank', "sla": '55 min', "sla_cls": 'ok', "link": '07_payouts.html', "type_lbl": 'Payout', "bg": 'var(--inset)', "fg": 'var(--ink2)'},
]

def render_queue_row(item):
    return f'''<a href="{item['link']}" class="qi" style="text-decoration:none;color:inherit;">
  <span class="qic" style="background:{item['bg']};color:{item['fg']}">
    <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg>
  </span>
  <span style="min-width:0"><b>{item['title']}</b><small>{item['type_lbl']} · {item['sub']}</small></span>
  <span class="sla {item['sla_cls']}"><b>{item['sla']}</b>left</span>
</a>'''

# ==========================================================
# PAGE 1: 01_today.html
# ==========================================================
p1_content = f"""<div class="ph"><div><h1>Today at UNILAG</h1><p>Peak hour. Two numbers matter most: how fast errands get a runner, and how many get none.</p></div><a href="09_crew_routines.html" class="btn b-line" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M176,48a24,24,0,1,1-24-24A24,24,0,0,1,176,48Z" opacity="0.2"/><path d="M152,80a32,32,0,1,0-32-32A32,32,0,0,0,152,80Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,32Zm64,112a8,8,0,0,1-8,8c-35.31,0-52.95-17.81-67.12-32.12-2.74-2.77-5.36-5.4-8-7.84l-13.43,30.88,37.2,26.57A8,8,0,0,1,160,176v56a8,8,0,0,1-16,0V180.12l-31.07-22.2L79.34,235.19A8,8,0,0,1,72,240a7.84,7.84,0,0,1-3.19-.67,8,8,0,0,1-4.15-10.52l54.08-124.37c-9.31-1.65-20.92,1.2-34.7,8.58a163.88,163.88,0,0,0-30.57,21.77,8,8,0,0,1-10.95-11.66c2.5-2.35,61.69-57.22,98.72-25.08,3.83,3.32,7.48,7,11,10.58C166.19,122.7,179.36,136,208,136A8,8,0,0,1,216,144Z"/></svg> Crew on shift: 6</a></div>
  <div class="rail" aria-label="Campus pulse">
    <div><small><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,136a88,88,0,1,1-88-88A88,88,0,0,1,216,136Z" opacity="0.2"/><path d="M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z"/></svg> Time to match, median</small><div class="v"><span class="num">2:48</span><span>min</span></div><span class="goal ok">Goal under 4 min · 90% within 6:10</span>{spark_svg([4.1, 3.6, 3.9, 3.2, 3.0, 2.9, 3.4, 2.8], 'var(--paid)')}</div>
    <div><small><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M215.46,216H40.54C27.92,216,20,202.79,26.13,192.09L113.59,40.22c6.3-11,22.52-11,28.82,0l87.46,151.87C236,202.79,228.08,216,215.46,216Z" opacity="0.2"/><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/></svg> Errands with no runner</small><div class="v"><span class="num">6.1%</span><span>last hour</span></div><span class="goal warn">Goal under 5% · Faculty of Science is short</span>{spark_svg([3, 4, 3.5, 5, 6.5, 7, 6.4, 6.1], 'var(--held)')}</div>
    <div><small>Open errands</small><div class="v"><span class="num">38</span></div><span class="goal" style="color:var(--ink3)">12 buy for me</span></div>
    <div><small>Runners on routes</small><div class="v"><span class="num">54</span></div><span class="goal" style="color:var(--ink3)">17 on a routine</span></div>
    <div><small>Held in escrow</small><div class="v"><span class="num">₦41k</span></div><span class="goal" style="color:var(--ink3)">Ledger balanced ✓</span></div>
  </div>
  <div class="grid2">
    <div class="sheet"><div class="sh-h"><b>Live campus</b><div class="legend"><span><i style="background:var(--live)"></i>Waiting errand</span><span><i style="background:var(--ink1)"></i>Runner</span><span><i style="background:#F2A900"></i>Crew</span></div></div>
      <div class="mapbox" id="liveMap">{world_svg}</div></div>
    <div class="sheet"><div class="sh-h"><b>Needs you now</b><a href="02_queue.html" class="btn b-line" style="text-decoration:none;">See all 11</a></div>
      <div class="q">{ "".join([render_queue_row(item) for item in QUEUE_DATA]) }</div>
    </div>
  </div>"""

p1_js = """function drawLive() {
  const box = document.getElementById('liveMap');
  const svg = box.querySelector('svg');
  if (!svg) return;
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  const ns = 'http://www.w3.org/2000/svg', g = document.createElementNS(ns, 'g');
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 26; i++) g.insertAdjacentHTML('beforeend', `<circle cx="${rnd(60, 840)}" cy="${rnd(200, 1150)}" r="8" fill="#0F172A" stroke="#fff" stroke-width="3"/>`);
  for (let i = 0; i < 5; i++) g.insertAdjacentHTML('beforeend', `<circle cx="${rnd(100, 800)}" cy="${rnd(250, 1100)}" r="9" fill="#F2A900" stroke="#fff" stroke-width="3"/>`);
  [[445, 355], [660, 1070], [690, 1100], [640, 1040], [115, 545], [300, 720], [520, 900]].forEach(([x, y]) => g.insertAdjacentHTML('beforeend', `<circle cx="${x}" cy="${y}" r="26" fill="#FF5500" opacity=".16"><animate attributeName="r" values="14;34;14" dur="2.4s" repeatCount="indefinite"/></circle><circle cx="${x}" cy="${y}" r="9" fill="#FF5500" stroke="#fff" stroke-width="3"/>`));
  svg.appendChild(g);
  box.insertAdjacentHTML('beforeend', `<div class="zone-tag" style="right:16px;bottom:16px"><b style="color:var(--held-ink)">Faculty of Science: short</b>3 waiting · 1 runner nearby<br><a href="09_crew_routines.html" class="btn b-line" style="margin-top:6px;height:28px;text-decoration:none;display:inline-flex;">Send Crew</a></div><div class="zone-tag" style="left:16px;top:16px"><b>Moremi Hall</b>Matched in 1:52 median</div>`);
}
drawLive();
"""

build_page("01_today.html", "Today & Campus Pulse", "today", p1_content, p1_js)

# ==========================================================
# PAGE 2: 02_queue.html
# ==========================================================
p2_content = f"""<div class="ph"><div><h1>Everything open</h1><p>Sorted by time left on the promise we made. Red means under 10 minutes.</p></div></div>
<div class="sheet">
  <div class="tabs">
    <button class="on" data-tab="all">All</button>
    <button data-tab="dispute">Disputes</button>
    <button data-tab="kyc">ID checks</button>
    <button data-tab="pin">Locked</button>
  </div>
  <div class="q" id="queueList">
    {"".join([render_queue_row(item) for item in QUEUE_DATA])}
  </div>
</div>"""

p2_js = """$$('.tabs button').forEach(b => {
  b.onclick = () => {
    $$('.tabs button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    toast('Filtered queue to ' + b.textContent);
  };
});"""

build_page("02_queue.html", "Needs You Queue", "queue", p2_content, p2_js)

# ==========================================================
# PAGE 3: 03_disputes.html
# ==========================================================
p3_content = f"""<div class="ph"><div><a href="02_queue.html" class="btn b-line" style="margin-bottom:10px;text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z"/></svg> Queue</a><h1>Fried rice arrived spilled</h1><p><span class="ref">CASE WD-4821</span> · Opened Mon 7:12 PM by Chidi N. · <span class="chip c-held">₦800 held</span> <span class="chip c-fault">9 min left</span></p></div>
  <div style="display:flex;gap:8px"><button class="btn b-line" id="callR"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z"/></svg> Call Chidi</button><button class="btn b-line" id="callK"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z"/></svg> Call Kunle</button></div></div>
<div class="case-grid"><div style="display:flex;flex-direction:column;gap:16px">
  <div class="sheet"><div class="sh-h"><b>Evidence, side by side</b><small>Pickup photo vs what arrived</small></div>
    <div class="evid">
      <div class="ev">{bag_svg}<div><b>Pickup photo, runner</b>Musa's Kitchen, 6:41 PM · bag sealed, upright</div></div>
      <div class="ev">{spill_svg}<div><b>Requester photo</b>Block C, 7:09 PM · bag tipped, sauce leaked</div></div>
      <div class="ev"><div style="padding:12px;height:150px;font-size:12.5px;color:var(--ink2);background:#fff">"Bag tipped when someone pushed me near the gate. I told Chidi straight away."<br><br><span style="color:var(--ink3)">Kunle, runner reply, 7:40 PM</span></div><div><b>Runner's side</b>Replied within 28 min</div></div>
    </div></div>
  <div class="sheet"><div class="sh-h"><b>What happened</b><small>From the errand record</small></div><div class="tl">
    <div class="tli g"><time>6:31 PM</time><i></i><div>Kunle accepted<small>Offer ₦800, 3 min to pickup</small></div></div>
    <div class="tli g"><time>6:41 PM</time><i></i><div>Picked up, photo taken<small>Bag sealed in photo</small></div></div>
    <div class="tli o"><time>6:58 PM</time><i></i><div>Message from Kunle<small>"Someone pushed me, the bag tipped. So sorry."</small></div></div>
    <div class="tli g"><time>7:06 PM</time><i></i><div>Arrived at Block C</div></div>
    <div class="tli g"><time>7:08 PM</time><i></i><div>PIN entered correctly<small>Escrow release paused: dispute opened at 7:12</small></div></div>
    <div class="tli r"><time>7:12 PM</time><i></i><div>Dispute opened by Chidi<small>2 photos, "food is half gone"</small></div></div>
  </div></div>
  <div class="sheet"><div class="sh-h"><b>Messages with support</b></div><div class="chat"><p>I've added photos. The rice is all over the bag.<small>Chidi, 7:14 PM</small></p><p class="r">Thanks Chidi, I'm looking at it now. Your ₦800 stays held until we decide.<small>Funmi (you), 7:44 PM</small></p></div></div>
  <div class="sheet"><div class="sh-h"><b>History</b></div><div class="kv"><div><small>Chidi, disputes</small><b class="num">1</b> in 23 errands</div><div><small>Kunle, disputes</small><b class="num">2</b> in 61 errands</div><div><small>Kunle, rating</small><b class="num">4.6</b></div><div><small>Similar cases</small><b class="num">78%</b> refund, Waydrop covers</div></div></div>
</div>
<div class="sheet decide"><div class="sh-h"><b>Decide</b><small>Both people are told in the app</small></div><div style="padding:4px 16px 16px">
  <button class="opt on" data-c="refund_cover"><span class="rd"></span><span><b>Full refund, Waydrop covers the runner</b><small>Item damaged in transit, runner honest and quick to report. Most common.</small></span></button>
  <button class="opt" data-c="refund_runner"><span class="rd"></span><span><b>Full refund, runner not paid</b><small>Runner careless or at fault.</small></span></button>
  <button class="opt" data-c="partial"><span class="rd"></span><span><b>Partial refund</b><small>Some of the item was fine.</small></span></button>
  <button class="opt" data-c="release"><span class="rd"></span><span><b>No refund, pay the runner</b><small>Evidence doesn't support the claim.</small></span></button>
  <div class="fld"><label for="why">Reason <span style="color:var(--fault-ink)">*</span> <span style="font-weight:400;color:var(--ink3)">(both sides see a short version)</span></label><textarea id="why" rows="3" placeholder="e.g. Pickup photo shows sealed bag; damage happened in transit; runner reported it at once."></textarea></div>
  <div class="ledger"><div class="lh"><span>Ledger preview</span><span>balances to ₦0 ✓</span></div><div class="ln"><span>escrow WD-4821</span><span class="minus">−₦800</span></div><div class="ln"><span>Chidi N. · available</span><span class="plus">+₦800</span></div><div class="ln"><span>Waydrop · goodwill</span><span class="minus">−₦720</span></div><div class="ln"><span>Kunle B. · available</span><span class="plus">+₦720</span></div><div class="sum">Chidi gets ₦800 back. Kunle still gets ₦720; Waydrop covers it.</div></div>
  <button class="btn b-ink" id="decide" style="width:100%;justify-content:center;height:40px;margin-top:12px">Confirm decision</button>
  <p class="note">Logged with your name. Either side can appeal once within 7 days.</p>
</div></div></div>"""

p3_js = """$('#callR').onclick = () => toast('Calling Chidi through masked line...');
$('#callK').onclick = () => toast('Calling Kunle through masked line...');
$('#decide').onclick = () => {
  toast('Decision confirmed. Ledger posted, both parties notified.');
  setTimeout(() => location.href = '02_queue.html', 1200);
};"""

build_page("03_disputes.html", "Dispute Resolution Desk", "disputes", p3_content, p3_js)

# ==========================================================
# PAGE 4: 04_kyc.html
# ==========================================================
p4_content = f"""<div class="ph"><div><a href="02_queue.html" class="btn b-line" style="margin-bottom:10px;text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z"/></svg> Queue</a><h1>ID check: Ifeoma Chukwu</h1><p>The provider wasn't sure (score 0.71). Everything else passed. You decide.</p></div><span class="chip c-held">22 min left</span></div>
<div class="kyc">
  <div class="sheet"><div class="sh-h"><b>Student ID</b><small>Front, uploaded 9:18 PM</small></div><div class="idimg"><div class="idcard"><div class="st">UNIVERSITY OF LAGOS · STUDENT</div><div class="ph2"></div><div class="ln2"><b>CHUKWU, Ifeoma N.</b><span>Mat. No. 200805417</span><span>Faculty of Engineering</span><span>Valid to 07/2027</span></div></div></div></div>
  <div class="sheet"><div class="sh-h"><b>Selfie</b><small>Liveness passed: turned head, blinked</small></div><div class="idimg"><div class="selfie"><div class="face"></div></div></div></div>
  <div class="sheet"><div class="sh-h"><b>Checks</b></div><div style="padding:4px 16px 16px">
    <table class="cmp"><tr><td>Name on account</td><td>Ifeoma Chukwu</td></tr><tr><td>Name on ID</td><td>Chukwu, Ifeoma N.</td></tr><tr><td>Match</td><td class="ok-i">Same name, order swapped</td></tr><tr><td>Face match</td><td class="ok-i">0.94</td></tr><tr><td>Liveness</td><td class="ok-i">Passed</td></tr><tr><td>Age (18+)</td><td class="ok-i">21</td></tr><tr><td>ID expiry</td><td class="ok-i">07/2027</td></tr><tr><td>Same ID used before</td><td class="ok-i">No</td></tr></table>
    <p class="note">Why it was flagged: the name order on the card differs from the account. That's normal on Nigerian student IDs.</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
      <button class="btn b-paid" id="approve" style="justify-content:center;height:40px"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg> Approve runner</button>
      <button class="btn b-line" id="redo" style="justify-content:center">Ask to redo one step</button>
      <button class="btn b-fault" id="reject" style="justify-content:center">Reject</button>
    </div></div></div>
</div>"""

p4_js = """$('#approve').onclick = () => {
  toast('Approved. Ifeoma can earn on her routes now.');
  setTimeout(() => location.href = '02_queue.html', 1000);
};
$('#redo').onclick = () => reasonModal('Ask Ifeoma to redo a step', 'Only the step you pick is redone. Everything else is kept.', ['ID photo is blurry or cut off', 'Selfie too dark', 'Use a different ID'], 'Send request', () => {
  toast('Request sent to Ifeoma.');
  setTimeout(() => location.href = '02_queue.html', 1000);
});
$('#reject').onclick = () => reasonModal('Reject Ifeoma check', 'She can appeal once. Pick the reason she will see.', ['Face does not match the ID', 'ID looks edited or fake', 'Under 18', 'Same ID used on another account'], 'Reject', () => {
  toast('Rejected. Ifeoma was told why.');
  setTimeout(() => location.href = '02_queue.html', 1000);
}, true);"""

build_page("04_kyc.html", "ID Checks & Verification Desk", "kyc", p4_content, p4_js)

# ==========================================================
# PAGE 5: 05_locked_handovers.html
# ==========================================================
p5_content = f"""<div class="ph"><div><h1>Errand <span class="ref" style="font-size:18px">WD-T9K4</span></h1><p>Indomie noodles x2 · Shoprite to Ramat Hall · requester Bola T., runner Amaka O.</p></div><div style="display:flex;gap:8px"><button class="btn b-line" id="callB"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z"/></svg> Call both</button></div></div>
<div class="sheet"><div class="sh-h"><b>Where it is</b><small>Lifecycle from the handoff document</small></div><div class="states"><span class="done">pending</span><i>→</i><span class="done">accepted</span><i>→</i><span class="done">at_pickup</span><i>→</i><span class="done">picked_up</span><i>→</i><span class="done">arrived</span><i>→</i><span class="now">locked</span></div></div>
<div class="grid2">
  <div class="sheet"><div class="sh-h"><b>Timeline</b></div><div class="tl">
    <div class="tli g"><time>8:12 PM</time><i></i><div>Posted, ₦700 held</div></div>
    <div class="tli g"><time>8:13 PM</time><i></i><div>Amaka accepted</div></div>
    <div class="tli g"><time>8:26 PM</time><i></i><div>Picked up with photo</div></div>
    <div class="tli g"><time>8:37 PM</time><i></i><div>Arrived at Ramat Hall</div></div>
    <div class="tli r"><time>8:38–8:40 PM</time><i></i><div>5 wrong PINs<small>4029 · 4092 · 4920 · 2049 · 9042 (real PIN starts with 4)</small></div></div>
    <div class="tli r"><time>8:40 PM</time><i></i><div>Locked, case opened<small>Amaka told to keep the item</small></div></div>
  </div></div>
  <div class="sheet"><div class="sh-h"><b>Fix it</b><small>Every action is logged</small></div><div style="padding:12px 16px;display:flex;flex-direction:column;gap:10px">
    <p style="font-size:13px;color:var(--ink2)">Looks like digits read out in the wrong order. Call both, confirm the item is with Bola, then unlock.</p>
    <button class="btn b-ink" id="unlock" style="justify-content:center;height:40px"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216.57,39.43A80,80,0,0,0,83.91,120.78L28.69,176A15.86,15.86,0,0,0,24,187.31V216a16,16,0,0,0,16,16H72a8,8,0,0,0,8-8V208H96a8,8,0,0,0,8-8V184h16a8,8,0,0,0,5.66-2.34l9.56-9.57A79.73,79.73,0,0,0,160,176h.1A80,80,0,0,0,216.57,39.43ZM224,98.1c-1.09,34.09-29.75,61.86-63.89,61.9H160a63.7,63.7,0,0,1-23.65-4.51,8,8,0,0,0-8.84,1.68L116.69,168H96a8,8,0,0,0-8,8v16H72a8,8,0,0,0-8,8v16H40V187.31l58.83-58.82a8,8,0,0,0,1.68-8.84A63.72,63.72,0,0,1,96,95.92c0-34.14,27.81-62.8,61.9-63.89A64,64,0,0,1,224,98.1ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z"/></svg> Confirm handover by phone</button>
    <button class="btn b-line" id="newpin" style="justify-content:center">Send Bola a fresh PIN</button>
    <button class="btn b-fault" id="cxr" style="justify-content:center">Cancel errand and refund Bola</button>
    <div class="ledger"><div class="lh"><span>Escrow</span><span>held</span></div><div class="ln"><span>escrow WD-T9K4</span><span>₦700</span></div><div class="ln"><span>if handover confirmed → Amaka</span><span class="plus">+₦630</span></div><div class="ln"><span>→ Waydrop fee</span><span class="plus">+₦70</span></div></div>
  </div></div>
</div>"""

p5_js = """$('#callB').onclick = () => toast('Starting a 3-way masked call...');
$('#unlock').onclick = () => reasonModal('Confirm handover by phone', 'Only after speaking to both. This releases ₦630 to Amaka.', ['Spoke to both, item delivered', 'Requester confirmed in chat'], 'Confirm and release', () => {
  toast('Released. Amaka paid ₦630.');
  setTimeout(() => location.href = '01_today.html', 1000);
});
$('#newpin').onclick = () => toast('New PIN sent to Bola by SMS and in the app.');
$('#cxr').onclick = () => reasonModal('Cancel and refund', 'Bola gets ₦700 back. Amaka gets ₦150 for her time.', ['Item lost or not delivered', 'Requester unreachable'], 'Cancel errand', () => {
  toast('Cancelled. Refund posted.');
  setTimeout(() => location.href = '01_today.html', 1000);
}, true);"""

build_page("05_locked_handovers.html", "Locked Handovers & PIN Resolution", "locked", p5_content, p5_js)

# ==========================================================
# PAGE 6: 06_people.html
# ==========================================================
p6_content = f"""<div class="ph"><div><h1>Kunle Bankole</h1><p>Runner and requester · joined Aug 2026 · <span class="chip c-paid">Verified runner</span> <span class="chip c-fault">1 open safety report</span></p></div>
  <div style="display:flex;gap:8px"><button class="btn b-line" id="msgU"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-4-1.08,7.85,7.85,0,0,0-2.53.42L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z"/></svg> Message</button><button class="btn b-line" id="pause"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M223.77,150.09a8,8,0,0,1-5.86,9.68l-24.64,6,6.46,24.11a8,8,0,0,1-5.66,9.8A8.25,8.25,0,0,1,192,200a8,8,0,0,1-7.72-5.93l-7.72-28.8L136,141.86v46.83l21.66,21.65a8,8,0,0,1-11.32,11.32L128,203.31l-18.34,18.35a8,8,0,0,1-11.32-11.32L120,188.69V141.86L79.45,165.27l-7.72,28.8A8,8,0,0,1,64,200a8.25,8.25,0,0,1-2.08-.27,8,8,0,0,1-5.66-9.8l6.46-24.11-24.64-6a8,8,0,0,1,3.82-15.54l29.45,7.23L112,128,71.36,104.54l-29.45,7.23A7.85,7.85,0,0,1,40,112a8,8,0,0,1-1.91-15.77l24.64-6L56.27,66.07a8,8,0,0,1,15.46-4.14l7.72,28.8L120,114.14V67.31L98.34,45.66a8,8,0,0,1,11.32-11.32L128,52.69l18.34-18.35a8,8,0,0,1,11.32,11.32L136,67.31v46.83l40.55-23.41,7.72-28.8a8,8,0,0,1,15.46,4.14l-6.46,24.11,24.64,6A8,8,0,0,1,216,112a7.85,7.85,0,0,1-1.91-.23l-29.45-7.23L144,128l40.64,23.46,29.45-7.23A8,8,0,0,1,223.77,150.09Z"/></svg> Pause from running</button><button class="btn b-fault" id="block"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.56,87.56,0,0,1-20.41,56.28L71.72,60.4A88,88,0,0,1,216,128ZM40,128A87.56,87.56,0,0,1,60.41,71.72L184.28,195.6A88,88,0,0,1,40,128Z"/></svg> Block</button></div></div>
<div class="sheet"><div class="kv"><div><small>Available</small><b class="num">₦6,140</b></div><div><small>Held in errands</small><b class="num">₦0</b></div><div><small>Rating</small><b class="num">4.6</b> from 61</div><div><small>Disputes</small><b class="num">2</b> · 1 refunded</div></div></div>
<div class="grid2">
  <div class="sheet"><div class="sh-h"><b>Safety report</b><span class="chip c-fault">4 min left</span></div><div style="padding:12px 16px;font-size:13px;color:var(--ink2)">
    <p><b style="color:var(--ink1)">Ada O. (requester), 9:22 PM:</b> "Asked me to pay him ₦300 extra in cash before handing over my parcel, and wouldn't leave."</p>
    <p style="margin-top:8px;color:var(--ink3)">Asking for money outside the app breaks the Runner Guidelines. First report for Kunle.</p>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn b-ink" id="pause2">Pause Kunle and call Ada</button><button class="btn b-line" id="warn">Send a warning</button></div></div></div>
  <div class="sheet"><div class="sh-h"><b>Recent errands</b></div><table><thead><tr><th>Ref</th><th>Errand</th><th>Role</th><th class="r">Amount</th></tr></thead><tbody>
    <tr><td class="ref">WD-5120</td><td>Parcel to Moremi <span class="chip c-fault">Reported</span></td><td>Runner</td><td class="r num">₦600</td></tr>
    <tr><td class="ref">WD-4821</td><td>Fried rice to Block C <span class="chip c-held">Dispute</span></td><td>Runner</td><td class="r num">₦720</td></tr>
    <tr><td class="ref">WD-4710</td><td>Lab coat to Science <span class="chip c-paid">Paid</span></td><td>Runner</td><td class="r num">₦450</td></tr>
    <tr><td class="ref">WD-4688</td><td>Charger from Yaba <span class="chip c-paid">Done</span></td><td>Requester</td><td class="r num">₦1,400</td></tr>
  </tbody></table></div>
</div>"""

p6_js = """const pauseHandler = () => reasonModal('Pause Kunle from running', 'He can still send errands. He sees a message to contact support.', ['Safety report under review', 'Repeated disputes', 'Asked for money outside the app'], 'Pause runner', () => {
  toast('Kunle paused. Calling Ada next.');
});
$('#pause').onclick = pauseHandler;
$('#pause2').onclick = pauseHandler;
$('#block').onclick = () => reasonModal('Block Kunle', 'Blocks the whole account. His wallet is frozen until reviewed.', ['Confirmed safety risk', 'Fraud', 'Fake identity'], 'Block account', () => {
  toast('Account blocked, wallet frozen.');
}, true);
$('#warn').onclick = () => toast('Warning sent and logged.');
$('#msgU').onclick = () => toast('Opens a support chat with Kunle.');"""

build_page("06_people.html", "People & Safety Desk", "people", p6_content, p6_js)

# ==========================================================
# PAGE 7: 07_payouts.html
# ==========================================================
p7_content = f"""<div class="ph"><div><h1>Payouts</h1><p>Money always returns to the person's wallet when a bank fails. These need a nudge, not a rescue.</p></div></div>
<div class="sheet"><div class="kv"><div><small>Withdrawals today</small><b class="num">212</b></div><div><small>Median time</small><b class="num">36 s</b></div><div><small>Failed</small><b class="num">2</b> · 0.9%</div><div><small>Partner balance vs ledger</small><b class="num" style="color:var(--paid-ink)">Matches</b></div></div></div>
<div class="sheet"><table><thead><tr><th>Ref</th><th>Person</th><th>To</th><th class="r">Amount</th><th>Status</th><th></th></tr></thead><tbody>
  <tr><td class="ref">WD-PAY-1201</td><td>Amaka O.</td><td>Access Bank •• 4471</td><td class="r num">₦3,500</td><td><span class="chip c-fault">Failed twice</span><br><small style="color:var(--ink3)">Bank timeout</small></td><td class="r"><button class="btn b-line" onclick="toast('Retrying payout...');">{icons['payouts']} Retry</button> <button class="btn b-line" onclick="toast('Requested new bank details from Amaka.');">Ask for new bank</button></td></tr>
  <tr><td class="ref">WD-PAY-1197</td><td>Bola T.</td><td>Kuda •• 0912</td><td class="r num">₦1,200</td><td><span class="chip c-fault">Reversed</span><br><small style="color:var(--ink3)">Account name changed</small></td><td class="r"><button class="btn b-line" onclick="toast('Retrying payout...');">{icons['payouts']} Retry</button> <button class="btn b-line" onclick="toast('Requested new bank details from Bola.');">Ask for new bank</button></td></tr>
  <tr><td class="ref">WD-PAY-1188</td><td>Tobi A.</td><td>GTBank •• 2210</td><td class="r num">₦2,000</td><td><span class="chip c-paid">Retried, sent</span><br><small style="color:var(--ink3)">GTBank was down</small></td><td class="r"></td></tr>
</tbody></table></div>"""

build_page("07_payouts.html", "Payouts & Banking Desk", "payouts", p7_content, "")

# ==========================================================
# PAGE 8: 08_places.html
# ==========================================================
p8_content = f"""<div class="ph"><div><h1>Campus places</h1><p>Names students gave to dropped pins. Approve the good ones and Waydrop knows UNILAG better than any map. People who name a place get ₦50 when it's approved.</p></div></div>
<div class="grid2"><div class="sheet"><div class="sh-h"><b>Waiting for approval</b><small>Most used first</small></div><table><tbody>
  <tr><td><b>Back gate of Jaja Hall</b><br><small style="color:var(--ink3)">New name · used by 4 people</small></td><td class="r" style="white-space:nowrap"><button class="btn b-paid" onclick="toast('Approved. ₦50 sent to student.'); this.closest('tr').remove();"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg> Approve</button> <button class="btn b-line" onclick="toast('Rename modal opened.');">✏️</button> <button class="btn b-line" onclick="toast('Pick existing place to merge.');">🔀</button></td></tr>
  <tr><td><b>Moremi junction</b><br><small style="color:var(--ink3)">Possible duplicate of 'Moremi Hall gate' · used by 9 people</small></td><td class="r" style="white-space:nowrap"><button class="btn b-paid" onclick="toast('Approved. ₦50 sent to student.'); this.closest('tr').remove();"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg> Approve</button> <button class="btn b-line" onclick="toast('Rename modal opened.');">✏️</button> <button class="btn b-line" onclick="toast('Pick existing place to merge.');">🔀</button></td></tr>
  <tr><td><b>Mama Put behind Sports Centre</b><br><small style="color:var(--ink3)">New name · used by 3 people</small></td><td class="r" style="white-space:nowrap"><button class="btn b-paid" onclick="toast('Approved. ₦50 sent to student.'); this.closest('tr').remove();"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"/></svg> Approve</button> <button class="btn b-line" onclick="toast('Rename modal opened.');">✏️</button> <button class="btn b-line" onclick="toast('Pick existing place to merge.');">🔀</button></td></tr>
</tbody></table></div>
<div class="sheet"><div class="sh-h"><b>Where they are</b></div><div class="place-map">{world_svg}</div>
  <p class="note" style="padding:0 16px 16px">Approved places appear in everyone's search on this campus within a minute.</p></div></div>"""

build_page("08_places.html", "Campus Places & Landmarks", "places", p8_content, "")

# ==========================================================
# PAGE 9: 09_crew_routines.html
# ==========================================================
p9_content = f"""<div class="ph"><div><h1>Crew and routines</h1><p>Crew are paid by the hour at launch so nobody's errand goes unanswered. Routines are the regular walks runners have saved.</p></div></div>
<div class="sheet"><div class="sh-h"><b>Crew safety net</b><span style="display:flex;align-items:center;gap:10px;font-size:13px">Send unmatched errands to Crew after <b class="num">90 s</b><button class="toggle" role="switch" aria-checked="true" aria-label="Crew safety net on" id="crewOn" onclick="const v = this.getAttribute('aria-checked') !== 'true'; this.setAttribute('aria-checked', String(v)); toast(v ? 'Crew safety net ON' : 'Crew safety net OFF');"></button></span></div>
  <table><thead><tr><th>On shift</th><th>Covering</th><th>Hours</th><th class="r">Errands tonight</th><th class="r">Available</th></tr></thead><tbody>
    <tr><td><b>Seyi A.</b></td><td>Moremi to Faculty of Science</td><td>6–10 PM</td><td class="r num">4</td><td class="r"><button class="toggle" role="switch" aria-checked="true" onclick="const v = this.getAttribute('aria-checked') !== 'true'; this.setAttribute('aria-checked', String(v)); toast('Updated Seyi availability');"></button></td></tr>
    <tr><td><b>Halima M.</b></td><td>Main gate to Jaja</td><td>6–10 PM</td><td class="r num">3</td><td class="r"><button class="toggle" role="switch" aria-checked="true" onclick="const v = this.getAttribute('aria-checked') !== 'true'; this.setAttribute('aria-checked', String(v)); toast('Updated Halima availability');"></button></td></tr>
    <tr><td><b>Uche N.</b></td><td>Library loop</td><td>6–9 PM</td><td class="r num">5</td><td class="r"><button class="toggle" role="switch" aria-checked="true" onclick="const v = this.getAttribute('aria-checked') !== 'true'; this.setAttribute('aria-checked', String(v)); toast('Updated Uche availability');"></button></td></tr>
  </tbody></table></div>
<div class="sheet"><div class="sh-h"><b>Busiest routines tomorrow morning</b><small>Pre-matched at 8 PM tonight</small></div><table><thead><tr><th>Route</th><th>Window</th><th class="r">Runners</th><th class="r">Errands waiting</th><th class="r">Coverage</th></tr></thead><tbody>
  <tr><td><b>Moremi Hall → LT3</b></td><td>7:40–8:10 AM</td><td class="r num">9</td><td class="r num">14</td><td class="r"><span class="chip c-paid">Covered</span></td></tr>
  <tr><td><b>Jaja → Faculty of Engineering</b></td><td>7:30–8:00 AM</td><td class="r num">4</td><td class="r num">9</td><td class="r"><span class="chip c-held">Tight</span></td></tr>
  <tr><td><b>Main gate → Senate</b></td><td>8:00–8:30 AM</td><td class="r num">2</td><td class="r num">6</td><td class="r"><span class="chip c-fault">Short: add Crew</span></td></tr>
</tbody></table></div>"""

build_page("09_crew_routines.html", "Crew and Routines Desk", "crew", p9_content, "")

# ==========================================================
# PAGE 10: 10_rules.html
# ==========================================================
p10_content = f"""<div class="ph"><div><h1>Rules</h1><p>Change these without an app update. Every change needs a reason and shows in the audit log.</p></div><button class="btn b-ink" id="saveR" disabled>Save changes</button></div>
<div class="sheet"><table><thead><tr><th>Rule</th><th>What it does</th><th class="r">Value</th></tr></thead><tbody>
  <tr><td><b>Service fee</b><br><span class="ref">fee_rate</span></td><td style="color:var(--ink3)">Taken from the runner's share</td><td class="r"><input class="rule-in" value="10"> %</td></tr>
  <tr><td><b>Minimum offer</b><br><span class="ref">min_offer</span></td><td style="color:var(--ink3)">Below this, errands cannot be posted</td><td class="r">₦ <input class="rule-in" value="100"></td></tr>
  <tr><td><b>Offer timer for runners</b><br><span class="ref">offer_ttl</span></td><td style="color:var(--ink3)">How long a runner has to swipe</td><td class="r"><input class="rule-in" value="25"> s</td></tr>
  <tr><td><b>Send to Crew after</b><br><span class="ref">crew_after</span></td><td style="color:var(--ink3)">Unmatched errands go to Crew on shift</td><td class="r"><input class="rule-in" value="90"> s</td></tr>
  <tr><td><b>PIN attempts</b><br><span class="ref">pin_attempts</span></td><td style="color:var(--ink3)">Then the handover locks and opens a case</td><td class="r"><input class="rule-in" value="5"></td></tr>
  <tr><td><b>Cash purchase cap</b><br><span class="ref">cash_cap</span></td><td style="color:var(--ink3)">Highest a runner can front per errand</td><td class="r">₦ <input class="rule-in" value="3000"></td></tr>
</tbody></table></div>"""

p10_js = """$$('.rule-in').forEach(i => i.oninput = () => { $('#saveR').disabled = false; });
$('#saveR').onclick = () => reasonModal('Save changes', 'Enter reason for updating live rules', ['Market rate change', 'Campus peak adjustment'], 'Save and apply', () => {
  toast('Saved. Applies to new errands.');
  $('#saveR').disabled = true;
});"""

build_page("10_rules.html", "Rules Configuration", "rules", p10_content, p10_js)

# ==========================================================
# PAGE 11: 11_audit.html
# ==========================================================
p11_content = f"""<div class="ph"><div><h1>Audit log</h1><p>Every staff action and every automatic lock. It cannot be edited or deleted, by anyone.</p></div><button class="btn b-line" onclick="toast('CSV Export started...');">Export CSV</button></div>
<div class="sheet"><table><thead><tr><th>Time</th><th>Who</th><th>Action</th><th>On</th><th>Reason</th></tr></thead><tbody>
  <tr><td class="ref">9:31 PM</td><td>Funmi A.</td><td><b>Approved ID check</b></td><td>Tobi Adeyemi</td><td style="color:var(--ink3)">Student ID matches selfie and name</td></tr>
  <tr><td class="ref">9:12 PM</td><td>Kunle O.</td><td><b>Retried payout</b></td><td>WD-PAY-1188</td><td style="color:var(--ink3)">GTBank back online</td></tr>
  <tr><td class="ref">8:58 PM</td><td>Funmi A.</td><td><b>Changed rule</b></td><td>Offer timer: 20s → 25s</td><td style="color:var(--ink3)">Walkers missed offers while crossing roads</td></tr>
  <tr><td class="ref">8:40 PM</td><td>System</td><td><b>Locked handover</b></td><td>WD-T9K4</td><td style="color:var(--ink3)">5 wrong PINs</td></tr>
</tbody></table></div>"""

build_page("11_audit.html", "Audit Log", "audit", p11_content, "")

print("ALL 11 STANDALONE PAGES GENERATED SUCCESSFULLY!")
