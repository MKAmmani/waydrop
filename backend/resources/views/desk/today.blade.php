<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Waydrop Desk: Today & Campus Pulse</title>
<link rel="stylesheet" href="/admin_desk/admin_desk.css">
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="map" viewBox="0 0 360 440" preserveAspectRatio="xMidYMid slice">
      <rect width="360" height="440" fill="#E9EDF1"/>
      <path d="M-10 300 Q120 250 200 290 T380 270 V460 H-10Z" fill="#D8EEDF"/>
      <path d="M250 -10 Q300 60 380 70 V-10Z" fill="#D3E6F8"/>
      <g fill="#DEE3E9">
        <rect x="18" y="20" width="84" height="64" rx="8"/><rect x="128" y="20" width="96" height="64" rx="8"/>
        <rect x="18" y="118" width="84" height="96" rx="8"/><rect x="128" y="118" width="46" height="96" rx="8"/><rect x="184" y="118" width="40" height="44" rx="8"/>
        <rect x="252" y="118" width="96" height="96" rx="8"/><rect x="252" y="98" width="0" height="0"/>
        <rect x="128" y="330" width="96" height="80" rx="8"/><rect x="252" y="330" width="96" height="80" rx="8"/>
      </g>
      <g stroke="#FFFFFF" stroke-linecap="round" fill="none">
        <path d="M-10 100 H370" stroke-width="12"/><path d="M-10 236 H370" stroke-width="10"/>
        <path d="M114 -10 V450" stroke-width="12"/><path d="M238 -10 V450" stroke-width="10"/>
        <path d="M-10 316 H370" stroke-width="7"/><path d="M60 236 V450" stroke-width="6"/>
      </g>
      <g font-family="DM Sans, sans-serif" font-size="9" fill="#94A3B8" font-weight="500">
        <text x="126" y="96">Library Rd</text><text x="250" y="232">Faculty Ave</text>
      </g>
    </symbol>

    <symbol id="m-parcel" viewBox="0 0 120 120">
      <rect x="16" y="30" width="88" height="74" rx="24" fill="#FF8A4C"/>
      <path d="M16 54 Q60 60 104 54 V52 Q104 30 80 30 H40 Q16 30 16 52Z" fill="#FF9F6B"/>
      <rect x="52" y="30" width="16" height="28" rx="4" fill="#FFD3B8"/>
      <ellipse cx="45" cy="74" rx="4.5" ry="6" fill="#0F172A"/><ellipse cx="75" cy="74" rx="4.5" ry="6" fill="#0F172A"/>
      <circle cx="46.5" cy="72" r="1.6" fill="#fff"/><circle cx="76.5" cy="72" r="1.6" fill="#fff"/>
      <path d="M52 86 Q60 93 68 86" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <circle cx="33" cy="84" r="6" fill="#FF4D6D" opacity=".32"/><circle cx="87" cy="84" r="6" fill="#FF4D6D" opacity=".32"/>
    </symbol>
    <symbol id="m-pin" viewBox="0 0 120 120">
      <path d="M60 10C88 10 104 30 104 54C104 82 78 102 60 114C42 102 16 82 16 54C16 30 32 10 60 10Z" fill="#34D399"/>
      <path d="M60 10C88 10 104 30 104 54C104 60 103 64 101 68C92 42 74 30 44 30C36 30 30 32 24 35C32 18 44 10 60 10Z" fill="#6EE7B7" opacity=".7"/>
      <path d="M42 56 q6 -7 12 0" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M66 56 q6 -7 12 0" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M50 70 Q60 80 70 70" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <circle cx="36" cy="66" r="6" fill="#FF4D6D" opacity=".28"/><circle cx="84" cy="66" r="6" fill="#FF4D6D" opacity=".28"/>
    </symbol>
    <symbol id="m-blob" viewBox="0 0 120 120">
      <path d="M26 64C18 36 42 16 66 20C92 24 108 44 100 70C93 94 70 108 46 100C30 94 30 82 26 64Z" fill="#B9A6FF"/>
      <path d="M40 34C52 24 72 24 86 34C78 30 62 30 50 38Z" fill="#fff" opacity=".5"/>
      <ellipse cx="50" cy="62" rx="4.5" ry="6" fill="#0F172A"/><ellipse cx="76" cy="62" rx="4.5" ry="6" fill="#0F172A"/>
      <circle cx="51.5" cy="60" r="1.6" fill="#fff"/><circle cx="77.5" cy="60" r="1.6" fill="#fff"/>
      <ellipse cx="63" cy="78" rx="6" ry="4.5" fill="#0F172A"/>
      <circle cx="38" cy="72" r="6" fill="#FF4D6D" opacity=".3"/><circle cx="88" cy="72" r="6" fill="#FF4D6D" opacity=".3"/>
    </symbol>
    <symbol id="m-coin" viewBox="0 0 120 120">
      <circle cx="60" cy="62" r="44" fill="#FFC94A"/>
      <circle cx="60" cy="62" r="34" fill="none" stroke="#F2A900" stroke-width="3.5"/>
      <path d="M34 40 A34 34 0 0 1 72 30" stroke="#FFE7A3" stroke-width="5" stroke-linecap="round" fill="none"/>
      <ellipse cx="48" cy="60" rx="4.5" ry="6" fill="#0F172A"/><ellipse cx="72" cy="60" rx="4.5" ry="6" fill="#0F172A"/>
      <circle cx="49.5" cy="58" r="1.6" fill="#fff"/><circle cx="73.5" cy="58" r="1.6" fill="#fff"/>
      <path d="M50 73 Q60 82 70 73" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <circle cx="37" cy="71" r="5.5" fill="#FF4D6D" opacity=".3"/><circle cx="83" cy="71" r="5.5" fill="#FF4D6D" opacity=".3"/>
    </symbol>
    <symbol id="logo" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="12" fill="#0F172A"/>
      <path d="M8 31 C 12 31, 13 25, 18 25" stroke="#FF5500" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 4.2" fill="none"/>
      <path d="M24 8c5.5 0 9 3.9 9 8.6 0 5.6-5.4 9.8-9 12.4-3.6-2.6-9-6.8-9-12.4C15 11.9 18.5 8 24 8Z" fill="#FF5500"/>
      <circle cx="24" cy="16.6" r="3.2" fill="#fff"/>
    </symbol>
  </defs>
</svg>
<div class="app">
<nav aria-label="Desk">
  <div class="brand"><a href="/desk/today" style="text-decoration:none;display:flex;align-items:center;gap:10px;color:inherit;"><svg width="30" height="30" aria-hidden="true"><use href="#logo"/></svg><b>Waydrop</b><span>DESK</span></a></div>
  <a href="/desk/today" class="nlink on" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M96,40l33.52,88H56Zm104,88H129.52L160,208Z" opacity="0.2"/><path d="M240,128a8,8,0,0,1-8,8H204.94l-37.78,75.58A8,8,0,0,1,160,216h-.4a8,8,0,0,1-7.08-5.14L95.35,60.76,63.28,131.31A8,8,0,0,1,56,136H24a8,8,0,0,1,0-16H50.85L88.72,36.69a8,8,0,0,1,14.76.46l57.51,151,31.85-63.71A8,8,0,0,1,200,120h32A8,8,0,0,1,240,128Z"/></svg> Today</a>
  <a href="/desk/queue" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V160H179.31a8,8,0,0,0-5.66,2.34l-19.31,19.32a8,8,0,0,1-5.66,2.34H107.31a8,8,0,0,1-5.66-2.34L82.34,162.34A8,8,0,0,0,76.68,160H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z" opacity="0.2"/><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,16V152h-28.7A15.86,15.86,0,0,0,168,156.69L148.69,176H107.31L88,156.68A15.89,15.89,0,0,0,76.69,152H48V48Zm0,160H48V168H76.69L96,187.32A15.89,15.89,0,0,0,107.31,192h41.38A15.86,15.86,0,0,0,160,187.31L179.31,168H208v40Z"/></svg> All open <em class=" hot">11</em></a>
  <a href="/desk/disputes" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M56,88l32,80c0,17.67-20,24-32,24s-32-6.33-32-24ZM200,56l-32,80c0,17.67,20,24,32,24s32-6.33,32-24Z" opacity="0.2"/><path d="M239.43,133l-32-80h0a8,8,0,0,0-9.16-4.84L136,62V40a8,8,0,0,0-16,0V65.58L54.26,80.19A8,8,0,0,0,48.57,85h0v.06L16.57,165a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32a7.92,7.92,0,0,0-.57-3L66.92,93.77,120,82V208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16H136V78.42L187,67.1,160.57,133a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32A7.92,7.92,0,0,0,239.43,133ZM56,184c-7.53,0-22.76-3.61-23.93-14.64L56,109.54l23.93,59.82C78.76,180.39,63.53,184,56,184Zm144-32c-7.53,0-22.76-3.61-23.93-14.64L200,77.54l23.93,59.82C222.76,148.39,207.53,152,200,152Z"/></svg> Disputes <em class="">3</em></a>
  <a href="/desk/kyc" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H40a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V56A8,8,0,0,0,216,48ZM96,144a24,24,0,1,1,24-24A24,24,0,0,1,96,144Z" opacity="0.2"/><path d="M200,112a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h40A8,8,0,0,1,200,112Zm-8,24H152a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16Zm40-80V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56ZM216,200V56H40V200H216Zm-80.26-34a8,8,0,1,1-15.5,4c-2.63-10.26-13.06-18-24.25-18s-21.61,7.74-24.25,18a8,8,0,1,1-15.5-4,39.84,39.84,0,0,1,17.19-23.34,32,32,0,1,1,45.12,0A39.76,39.76,0,0,1,135.75,166ZM96,136a16,16,0,1,0-16-16A16,16,0,0,0,96,136Z"/></svg> ID checks <em class="">5</em></a>
  <a href="/desk/locked-handovers" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg> Locked handovers <em class="">1</em></a>
  <a href="/desk/payouts" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M232,96H24L128,32Z" opacity="0.2"/><path d="M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Zm40,0H96v64H64Zm80,0v64H112V104Zm48,64H160V104h32ZM128,41.39,203.74,88H52.26ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H240A8,8,0,0,1,248,208Z"/></svg> Failed payouts <em class="">2</em></a>
  <div class="ngrp">Look up</div>
  <a href="/desk/locked-handovers" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,129.09V232a8,8,0,0,1-3.84-1l-88-48.18a8,8,0,0,1-4.16-7V80.18a8,8,0,0,1,.7-3.25Z" opacity="0.2"/><path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90l80,43.78v85.79L40,175.82Zm176,85.78h0l-80,43.79V133.82l32-17.51V152a8,8,0,0,0,16,0V107.55L216,90v85.77Z"/></svg> Errands</a>
  <a href="/desk/people" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a95.76,95.76,0,0,1-31.8,71.37A72,72,0,0,0,128,160a40,40,0,1,0-40-40,40,40,0,0,0,40,40,72,72,0,0,0-64.2,39.37h0A96,96,0,1,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/></svg> People</a>
  <div class="ngrp">Campus</div>
  <a href="/desk/places" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M184,80c0,56-56,88-56,88S72,136,72,80a56,56,0,0,1,112,0Z" opacity="0.2"/><path d="M112,80a16,16,0,1,1,16,16A16,16,0,0,1,112,80ZM64,80a64,64,0,0,1,128,0c0,59.95-57.58,93.54-60,94.95a8,8,0,0,1-7.94,0C121.58,173.54,64,140,64,80Zm16,0c0,42.2,35.84,70.21,48,78.5,12.15-8.28,48-36.3,48-78.5a48,48,0,0,0-96,0Zm122.77,67.63a8,8,0,0,0-5.54,15C213.74,168.74,224,176.92,224,184c0,13.36-36.52,32-96,32s-96-18.64-96-32c0-7.08,10.26-15.26,26.77-21.36a8,8,0,0,0-5.54-15C29.22,156.49,16,169.41,16,184c0,31.18,57.71,48,112,48s112-16.82,112-48C240,169.41,226.78,156.49,202.77,147.63Z"/></svg> Places <em class="">4</em></a>
  <a href="/desk/crew" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M168,144a40,40,0,1,1-40-40A40,40,0,0,1,168,144ZM64,56A32,32,0,1,0,96,88,32,32,0,0,0,64,56Zm128,0a32,32,0,1,0,32,32A32,32,0,0,0,192,56Z" opacity="0.2"/><path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1,0-16,24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.85,8,57,57,0,0,0-98.15,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z"/></svg> Crew and routines</a>
  <div class="ngrp">Control</div>
  <a href="/desk/rules" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,80a24,24,0,1,1-24-24A24,24,0,0,1,128,80Zm40,72a24,24,0,1,0,24,24A24,24,0,0,0,168,152Z" opacity="0.2"/><path d="M40,88H73a32,32,0,0,0,62,0h81a8,8,0,0,0,0-16H135a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16Zm64-24A16,16,0,1,1,88,80,16,16,0,0,1,104,64ZM216,168H199a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16h97a32,32,0,0,0,62,0h17a8,8,0,0,0,0-16Zm-48,24a16,16,0,1,1,16-16A16,16,0,0,1,168,192Z"/></svg> Rules</a>
  <a href="/desk/audit" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,48V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96a39.83,39.83,0,0,0-8,24v8h80V64a39.83,39.83,0,0,0-8-24h40A8,8,0,0,1,208,48Z" opacity="0.2"/><path d="M168,152a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,152Zm-8-40H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm56-64V216a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V48A16,16,0,0,1,56,32H92.26a47.92,47.92,0,0,1,71.48,0H200A16,16,0,0,1,216,48ZM96,64h64a32,32,0,0,0-64,0ZM200,48H173.25A47.93,47.93,0,0,1,176,64v8a8,8,0,0,1-8,8H88a8,8,0,0,1-8-8V64a47.93,47.93,0,0,1,2.75-16H56V216H200Z"/></svg> Audit log</a>
  <div class="shift"><span class="av">FA</span><div><b>Funmi A.</b><small>Support lead, on shift</small></div></div>
</nav>
  <main>
    <div class="top">
      <label class="search"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg><input id="q" placeholder="Phone number, name, or errand reference (WD-…)" aria-label="Search"><kbd>/</kbd></label>
      <div class="campus"><span class="dotlive"></span> University of Lagos <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z"/></svg></div>
      <div style="margin-left:auto;font-size:12px;color:var(--ink3)" id="clock"></div>
    </div>
    <div class="page">
<div class="ph"><div><h1>Today at UNILAG</h1><p>Peak hour. Two numbers matter most: how fast errands get a runner, and how many get none.</p></div><a href="/desk/crew" class="btn b-line" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M176,48a24,24,0,1,1-24-24A24,24,0,0,1,176,48Z" opacity="0.2"/><path d="M152,80a32,32,0,1,0-32-32A32,32,0,0,0,152,80Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,32Zm64,112a8,8,0,0,1-8,8c-35.31,0-52.95-17.81-67.12-32.12-2.74-2.77-5.36-5.4-8-7.84l-13.43,30.88,37.2,26.57A8,8,0,0,1,160,176v56a8,8,0,0,1-16,0V180.12l-31.07-22.2L79.34,235.19A8,8,0,0,1,72,240a7.84,7.84,0,0,1-3.19-.67,8,8,0,0,1-4.15-10.52l54.08-124.37c-9.31-1.65-20.92,1.2-34.7,8.58a163.88,163.88,0,0,0-30.57,21.77,8,8,0,0,1-10.95-11.66c2.5-2.35,61.69-57.22,98.72-25.08,3.83,3.32,7.48,7,11,10.58C166.19,122.7,179.36,136,208,136A8,8,0,0,1,216,144Z"/></svg> Crew on shift: 6</a></div>
  <div class="rail" aria-label="Campus pulse">
    <div><small><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,136a88,88,0,1,1-88-88A88,88,0,0,1,216,136Z" opacity="0.2"/><path d="M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z"/></svg> Time to match, median</small><div class="v"><span class="num">2:48</span><span>min</span></div><span class="goal ok">Goal under 4 min · 90% within 6:10</span><svg class="spark" viewBox="0 0 200 26" preserveAspectRatio="none" aria-hidden="true"><polyline points="0.0,3.0 28.57142857142857,10.692307692307686 57.14285714285714,6.076923076923073 85.71428571428571,16.84615384615384 114.28571428571428,19.92307692307692 142.85714285714286,21.46153846153846 171.42857142857142,13.769230769230766 200.0,23.0" fill="none" stroke="var(--paid)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></div>
    <div><small><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M215.46,216H40.54C27.92,216,20,202.79,26.13,192.09L113.59,40.22c6.3-11,22.52-11,28.82,0l87.46,151.87C236,202.79,228.08,216,215.46,216Z" opacity="0.2"/><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/></svg> Errands with no runner</small><div class="v"><span class="num">6.1%</span><span>last hour</span></div><span class="goal warn">Goal under 5% · Faculty of Science is short</span><svg class="spark" viewBox="0 0 200 26" preserveAspectRatio="none" aria-hidden="true"><polyline points="0.0,23.0 28.57142857142857,18.0 57.14285714285714,20.5 85.71428571428571,13.0 114.28571428571428,5.5 142.85714285714286,3.0 171.42857142857142,6.0 200.0,7.500000000000002" fill="none" stroke="var(--held)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></div>
    <div><small>Open errands</small><div class="v"><span class="num">38</span></div><span class="goal" style="color:var(--ink3)">12 buy for me</span></div>
    <div><small>Runners on routes</small><div class="v"><span class="num">54</span></div><span class="goal" style="color:var(--ink3)">17 on a routine</span></div>
    <div><small>Held in escrow</small><div class="v"><span class="num">₦41k</span></div><span class="goal" style="color:var(--ink3)">Ledger balanced ✓</span></div>
  </div>
  <div class="grid2">
    <div class="sheet"><div class="sh-h"><b>Live campus</b><div class="legend"><span><i style="background:var(--live)"></i>Waiting errand</span><span><i style="background:var(--ink1)"></i>Runner</span><span><i style="background:#F2A900"></i>Crew</span></div></div>
      <div class="mapbox" id="liveMap"><svg viewBox="0 0 900 1300" aria-hidden="true">
            <rect width="900" height="1300" fill="#EDF0F3"/>
            <path d="M540 60 C 640 20, 780 60, 800 150 C 820 240, 700 290, 610 260 C 530 235, 470 130, 540 60Z" fill="#CFE3F7"/>
            <text x="640" y="170" font-family="DM Sans" font-size="13" font-weight="500" fill="#7C9CC0" text-anchor="middle">Campus Lake</text>
            <path d="M40 1010 C 120 960, 260 980, 300 1060 C 330 1120, 200 1170, 110 1150 C 40 1130, 0 1060, 40 1010Z" fill="#D8EEDF"/>
            <path d="M560 700 H760 V900 H560Z" rx="20" fill="#D8EEDF"/>
            <g fill="#DFE4EA">
              <rect x="30" y="30" width="170" height="210" rx="10"/><rect x="240" y="30" width="110" height="100" rx="10"/><rect x="240" y="150" width="110" height="90" rx="10"/>
              <rect x="390" y="30" width="110" height="210" rx="10"/>
              <rect x="30" y="280" width="170" height="140" rx="10"/><rect x="240" y="280" width="110" height="140" rx="10"/><rect x="390" y="280" width="110" height="140" rx="10"/>
              <rect x="560" y="300" width="200" height="120" rx="10"/><rect x="800" y="300" width="80" height="300" rx="10"/>
              <rect x="30" y="460" width="170" height="140" rx="10"/><rect x="240" y="460" width="110" height="140" rx="10"/><rect x="390" y="460" width="110" height="140" rx="10"/><rect x="560" y="460" width="200" height="140" rx="10"/>
              <rect x="30" y="640" width="170" height="160" rx="10"/><rect x="240" y="640" width="110" height="150" rx="10"/><rect x="390" y="640" width="110" height="320" rx="10"/>
              <rect x="30" y="830" width="170" height="130" rx="10"/><rect x="240" y="820" width="110" height="140" rx="10"/><rect x="800" y="640" width="80" height="320" rx="10"/>
              <rect x="390" y="1010" width="110" height="130" rx="10"/><rect x="560" y="1010" width="200" height="110" rx="10"/><rect x="800" y="1010" width="80" height="140" rx="10"/>
            </g>
            <g stroke="#fff" stroke-linecap="round" fill="none">
              <path d="M0 260 H900" stroke-width="18"/><path d="M0 620 H900" stroke-width="18"/><path d="M0 985 H900" stroke-width="16"/>
              <path d="M220 0 V1300" stroke-width="16"/><path d="M530 0 V1300" stroke-width="18"/><path d="M780 260 V1300" stroke-width="14"/>
              <path d="M370 260 V985" stroke-width="9"/><path d="M220 440 H780" stroke-width="9"/><path d="M0 810 H530" stroke-width="9"/>
              <path d="M0 1230 Q450 1150 900 1250" stroke-width="14"/>
            </g>
            <g font-family="DM Sans" font-size="12" font-weight="500" fill="#94A3B8">
              <text x="600" y="614">University Rd</text><text x="30" y="254">Library Rd</text>
              <text x="524" y="560" transform="rotate(-90 524 560)">Faculty Ave</text>
            </g>
            <g font-family="DM Sans" font-size="13" font-weight="600" fill="#64748B" text-anchor="middle">
              <text x="115" y="545">Moremi Hall</text><text x="445" y="355">Main Library</text><text x="660" y="535">LT3</text>
              <text x="660" y="805">Sports Field</text><text x="295" y="718">Musa's Kitchen</text><text x="115" y="895">Ramat Hall</text><text x="660" y="1070">Faculty of Science</text>
            </g>
            <!-- Other people walking: ambient life -->
            <g class="layer" id="walkers">
              <g><circle r="9" fill="#fff"/><circle r="6" fill="#0F172A"/><animateMotion dur="70s" repeatCount="indefinite" path="M220 0 V1300"/></g>
              <g><circle r="9" fill="#fff"/><circle r="6" fill="#0F172A"/><animateMotion dur="58s" repeatCount="indefinite" path="M900 620 H0"/></g>
              <g><circle r="9" fill="#fff"/><circle r="6" fill="#0F172A"/><animateMotion dur="80s" repeatCount="indefinite" path="M530 1300 V0"/></g>
              <g><circle r="9" fill="#fff"/><circle r="6" fill="#0F172A"/><animateMotion dur="64s" repeatCount="indefinite" path="M0 260 H900"/></g>
              <g><circle r="9" fill="#fff"/><circle r="6" fill="#0F172A"/><animateMotion dur="44s" repeatCount="indefinite" path="M370 260 V985 V260"/></g>
              <g><circle r="9" fill="#fff"/><circle r="6" fill="#0F172A"/><animateMotion dur="52s" repeatCount="indefinite" path="M220 440 H780 H220"/></g>
              <g><circle r="9" fill="#fff"/><circle r="6" fill="#0F172A"/><animateMotion dur="90s" repeatCount="indefinite" path="M0 1230 Q450 1150 900 1250"/></g>
            </g>
          </svg></div></div>
    <div class="sheet"><div class="sh-h"><b>Needs you now</b><a href="/desk/queue" class="btn b-line" style="text-decoration:none;">See all 11</a></div>
      <div class="q"><a href="/desk/locked-handovers" class="qi" style="text-decoration:none;color:inherit;">
  <span class="qic" style="background:var(--fault-wash);color:var(--fault-ink)">
    <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg>
  </span>
  <span style="min-width:0"><b>Handover locked after 5 wrong PINs</b><small>Locked handover · WD-T9K4 · Indomie x2 · Ramat Hall · runner waiting</small></span>
  <span class="sla bad"><b>3 min</b>left</span>
</a><a href="/desk/disputes" class="qi" style="text-decoration:none;color:inherit;">
  <span class="qic" style="background:var(--held-wash);color:var(--held-ink)">
    <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg>
  </span>
  <span style="min-width:0"><b>Fried rice arrived spilled</b><small>Dispute · WD-4821 · Chidi N. vs Kunle B. · ₦800 held</small></span>
  <span class="sla bad"><b>9 min</b>left</span>
</a><a href="/desk/people" class="qi" style="text-decoration:none;color:inherit;">
  <span class="qic" style="background:var(--fault-wash);color:var(--fault-ink)">
    <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg>
  </span>
  <span style="min-width:0"><b>Safety report: "made me feel unsafe"</b><small>Safety · Report on runner Kunle B. by Ada O.</small></span>
  <span class="sla bad"><b>4 min</b>left</span>
</a><a href="/desk/kyc" class="qi" style="text-decoration:none;color:inherit;">
  <span class="qic" style="background:var(--inset);color:var(--ink2)">
    <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg>
  </span>
  <span style="min-width:0"><b>ID check: name mismatch to review</b><small>ID check · Ifeoma Chukwu · Student ID · provider unsure (0.71)</small></span>
  <span class="sla warn"><b>22 min</b>left</span>
</a><a href="/desk/disputes" class="qi" style="text-decoration:none;color:inherit;">
  <span class="qic" style="background:var(--held-wash);color:var(--held-ink)">
    <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg>
  </span>
  <span style="min-width:0"><b>Charged the wrong amount (buy for me)</b><small>Dispute · WD-5102 · receipt shows ₦1,650, logged ₦1,800</small></span>
  <span class="sla warn"><b>41 min</b>left</span>
</a><a href="/desk/payouts" class="qi" style="text-decoration:none;color:inherit;">
  <span class="qic" style="background:var(--inset);color:var(--ink2)">
    <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg>
  </span>
  <span style="min-width:0"><b>Withdrawal failed twice</b><small>Payout · Amaka O. · ₦3,500 to Access Bank</small></span>
  <span class="sla ok"><b>55 min</b>left</span>
</a></div>
    </div>
  </div>
    </div>
  </main>
</div>
<div class="scrim" id="scrim"><div class="modal" id="modal" role="dialog" aria-modal="true"></div></div>
<div class="toast" id="toast" role="status"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"/></svg><span></span></div>

<script src="/admin_desk/admin_desk.js"></script>
<script>
function drawLive() {
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
  box.insertAdjacentHTML('beforeend', `<div class="zone-tag" style="right:16px;bottom:16px"><b style="color:var(--held-ink)">Faculty of Science: short</b>3 waiting · 1 runner nearby<br><a href="/desk/crew" class="btn b-line" style="margin-top:6px;height:28px;text-decoration:none;display:inline-flex;">Send Crew</a></div><div class="zone-tag" style="left:16px;top:16px"><b>Moremi Hall</b>Matched in 1:52 median</div>`);
}
drawLive();

</script>
</body>
</html>
