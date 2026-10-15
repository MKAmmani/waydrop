<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Waydrop Desk: Dispute Resolution Desk</title>
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
  <a href="/desk/today" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M96,40l33.52,88H56Zm104,88H129.52L160,208Z" opacity="0.2"/><path d="M240,128a8,8,0,0,1-8,8H204.94l-37.78,75.58A8,8,0,0,1,160,216h-.4a8,8,0,0,1-7.08-5.14L95.35,60.76,63.28,131.31A8,8,0,0,1,56,136H24a8,8,0,0,1,0-16H50.85L88.72,36.69a8,8,0,0,1,14.76.46l57.51,151,31.85-63.71A8,8,0,0,1,200,120h32A8,8,0,0,1,240,128Z"/></svg> Today</a>
  <a href="/desk/queue" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V160H179.31a8,8,0,0,0-5.66,2.34l-19.31,19.32a8,8,0,0,1-5.66,2.34H107.31a8,8,0,0,1-5.66-2.34L82.34,162.34A8,8,0,0,0,76.68,160H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z" opacity="0.2"/><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,16V152h-28.7A15.86,15.86,0,0,0,168,156.69L148.69,176H107.31L88,156.68A15.89,15.89,0,0,0,76.69,152H48V48Zm0,160H48V168H76.69L96,187.32A15.89,15.89,0,0,0,107.31,192h41.38A15.86,15.86,0,0,0,160,187.31L179.31,168H208v40Z"/></svg> All open <em class=" hot">11</em></a>
  <a href="/desk/disputes" class="nlink on" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M56,88l32,80c0,17.67-20,24-32,24s-32-6.33-32-24ZM200,56l-32,80c0,17.67,20,24,32,24s32-6.33,32-24Z" opacity="0.2"/><path d="M239.43,133l-32-80h0a8,8,0,0,0-9.16-4.84L136,62V40a8,8,0,0,0-16,0V65.58L54.26,80.19A8,8,0,0,0,48.57,85h0v.06L16.57,165a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32a7.92,7.92,0,0,0-.57-3L66.92,93.77,120,82V208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16H136V78.42L187,67.1,160.57,133a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32A7.92,7.92,0,0,0,239.43,133ZM56,184c-7.53,0-22.76-3.61-23.93-14.64L56,109.54l23.93,59.82C78.76,180.39,63.53,184,56,184Zm144-32c-7.53,0-22.76-3.61-23.93-14.64L200,77.54l23.93,59.82C222.76,148.39,207.53,152,200,152Z"/></svg> Disputes <em class="">3</em></a>
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
<div class="ph"><div><a href="/desk/queue" class="btn b-line" style="margin-bottom:10px;text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z"/></svg> Queue</a><h1>Fried rice arrived spilled</h1><p><span class="ref">CASE WD-4821</span> · Opened Mon 7:12 PM by Chidi N. · <span class="chip c-held">₦800 held</span> <span class="chip c-fault">9 min left</span></p></div>
  <div style="display:flex;gap:8px"><button class="btn b-line" id="callR"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z"/></svg> Call Chidi</button><button class="btn b-line" id="callK"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z"/></svg> Call Kunle</button></div></div>
<div class="case-grid"><div style="display:flex;flex-direction:column;gap:16px">
  <div class="sheet"><div class="sh-h"><b>Evidence, side by side</b><small>Pickup photo vs what arrived</small></div>
    <div class="evid">
      <div class="ev"><svg viewBox="0 0 160 150" preserveAspectRatio="xMidYMid slice"><rect width="160" height="150" fill="#C9A27A"/><path d="M48 52 L112 52 L104 132 L56 132 Z" fill="#B7834F"/><path d="M66 52 C66 30, 94 30, 94 52" fill="none" stroke="#8C5E33" stroke-width="6"/><rect x="64" y="76" width="34" height="18" rx="3" fill="#fff"/></svg><div><b>Pickup photo, runner</b>Musa's Kitchen, 6:41 PM · bag sealed, upright</div></div>
      <div class="ev"><svg viewBox="0 0 160 150" preserveAspectRatio="xMidYMid slice"><rect width="160" height="150" fill="#E2E8F0"/><ellipse cx="88" cy="104" rx="56" ry="26" fill="#F59E0B" opacity=".7"/><path d="M40 70 L104 58 L112 120 L52 132 Z" fill="#B7834F" transform="rotate(-24 76 96)"/></svg><div><b>Requester photo</b>Block C, 7:09 PM · bag tipped, sauce leaked</div></div>
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
</div></div></div>
    </div>
  </main>
</div>
<div class="scrim" id="scrim"><div class="modal" id="modal" role="dialog" aria-modal="true"></div></div>
<div class="toast" id="toast" role="status"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"/></svg><span></span></div>

<script src="/admin_desk/admin_desk.js"></script>
<script>
$('#callR').onclick = () => toast('Calling Chidi through masked line...');
$('#callK').onclick = () => toast('Calling Kunle through masked line...');
$('#decide').onclick = () => {
  toast('Decision confirmed. Ledger posted, both parties notified.');
  setTimeout(() => location.href = '/desk/queue', 1200);
};
</script>
</body>
</html>
