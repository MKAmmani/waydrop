<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Waydrop Desk: Campuses & Administrators</title>
<link rel="stylesheet" href="/admin_desk/admin_desk.css">
<style>
  :root {
    --brand: #FF5500;
    --brand-hover: #E04B00;
  }
  .admin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }
  @media (max-width: 900px) {
    .admin-grid { grid-template-columns: 1fr; }
  }
  .form-card {
    background: #FFFFFF;
    border: 1px solid var(--rule-strong, #CBD5E1);
    border-radius: 14px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    scroll-margin-top: 20px;
  }
  .form-card h2 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px 0;
    color: var(--ink1);
  }
  .form-card p {
    font-size: 13px;
    color: var(--ink2);
    margin: 0 0 16px 0;
  }
  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }
  .field {
    margin-bottom: 12px;
  }
  .field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink2);
    margin-bottom: 5px;
  }
  .field input, .field select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    font-size: 13.5px;
    font-family: inherit;
    background: #FFFFFF;
    color: #0F172A;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .field input:focus, .field select:focus {
    outline: none;
    border-color: #FF5500;
    box-shadow: 0 0 0 3px rgba(255, 85, 0, 0.12);
  }
  .btn-action {
    background: #FF5500;
    color: #FFFFFF !important;
    border: none;
    padding: 11px 22px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 6px rgba(255, 85, 0, 0.28);
    transition: background 0.15s, transform 0.05s, box-shadow 0.15s;
  }
  .btn-action:hover {
    background: #E04B00;
    box-shadow: 0 3px 8px rgba(255, 85, 0, 0.35);
  }
  .btn-action:active {
    transform: scale(0.98);
  }
  .btn-action.dark {
    background: #0F172A;
    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25);
  }
  .btn-action.dark:hover {
    background: #1E293B;
  }
  .badge-hq {
    background: #EFF6FF;
    color: #1D4ED8;
    border: 1px solid #BFDBFE;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
  }
  .badge-campus {
    background: #FEF3C7;
    color: #B45309;
    border: 1px solid #FDE68A;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
  }
  /* Drawer Component */
  .drawer-scrim {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(2px);
    display: none;
    z-index: 100;
  }
  .drawer-scrim.open {
    display: block;
  }
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 500px;
    max-width: 95vw;
    background: #FFFFFF;
    box-shadow: -10px 0 35px rgba(15, 23, 42, 0.2);
    display: flex;
    flex-direction: column;
    z-index: 101;
    transform: translateX(100%);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .drawer.open {
    transform: translateX(0);
  }
  .drawer-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--rule-soft, #EEF2F6);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .drawer-body {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }
  .drawer-section {
    margin-bottom: 22px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--rule-soft, #EEF2F6);
  }
  .drawer-section:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 12px 0;
  }
  .stat-box {
    background: var(--inset, #F1F5F9);
    padding: 10px 8px;
    border-radius: 8px;
    text-align: center;
  }
  .stat-box .num {
    font-size: 17px;
    color: var(--ink1);
    font-weight: 700;
  }
  .stat-box .label {
    font-size: 11px;
    color: var(--ink3);
    margin-top: 2px;
  }
</style>
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
  <a href="/desk/queue" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48V160H179.31a8,8,0,0,0-5.66,2.34l-19.31,19.32a8,8,0,0,1-5.66,2.34H107.31a8,8,0,0,1-5.66-2.34L82.34,162.34A8,8,0,0,0,76.68,160H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z" opacity="0.2"/><path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,16V152h-28.7A15.86,15.86,0,0,0,168,156.69L148.69,176H107.31L88,156.68A15.89,15.89,0,0,0,76.69,152H48V48Zm0,160H48V168H76.69L96,187.32A15.89,15.89,0,0,0,107.31,192h41.38A15.86,15.86,0,0,0,160,187.31L179.31,168H208v40Z"/></svg> All open <em class="{{ ($deskBadges['openErrands'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['openErrands'] ?? 0 }}</em></a>
  <a href="/desk/disputes" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M56,88l32,80c0,17.67-20,24-32,24s-32-6.33-32-24ZM200,56l-32,80c0,17.67,20,24,32,24s32-6.33,32-24Z" opacity="0.2"/><path d="M239.43,133l-32-80h0a8,8,0,0,0-9.16-4.84L136,62V40a8,8,0,0,0-16,0V65.58L54.26,80.19A8,8,0,0,0,48.57,85h0v.06L16.57,165a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32a7.92,7.92,0,0,0-.57-3L66.92,93.77,120,82V208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16H136V78.42L187,67.1,160.57,133a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32A7.92,7.92,0,0,0,239.43,133ZM56,184c-7.53,0-22.76-3.61-23.93-14.64L56,109.54l23.93,59.82C78.76,180.39,63.53,184,56,184Zm144-32c-7.53,0-22.76-3.61-23.93-14.64L200,77.54l23.93,59.82C222.76,148.39,207.53,152,200,152Z"/></svg> Disputes <em class="{{ ($deskBadges['disputes'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['disputes'] ?? 0 }}</em></a>
  <a href="/desk/kyc" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H40a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V56A8,8,0,0,0,216,48ZM96,144a24,24,0,1,1,24-24A24,24,0,0,1,96,144Z" opacity="0.2"/><path d="M200,112a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h40A8,8,0,0,1,200,112Zm-8,24H152a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16Zm40-80V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56ZM216,200V56H40V200H216Zm-80.26-34a8,8,0,1,1-15.5,4c-2.63-10.26-13.06-18-24.25-18s-21.61,7.74-24.25,18a8,8,0,1,1-15.5-4,39.84,39.84,0,0,1,17.19-23.34,32,32,0,1,1,45.12,0A39.76,39.76,0,0,1,135.75,166ZM96,136a16,16,0,1,0-16-16A16,16,0,0,0,96,136Z"/></svg> ID checks <em class="{{ ($deskBadges['kyc'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['kyc'] ?? 0 }}</em></a>
  <a href="/desk/locked-handovers" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,88H48a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V96A8,8,0,0,0,208,88Zm-80,72a20,20,0,1,1,20-20A20,20,0,0,1,128,160Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-80-96a28,28,0,0,0-8,54.83V184a8,8,0,0,0,16,0V166.83A28,28,0,0,0,128,112Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"/></svg> Locked handovers <em class="{{ ($deskBadges['locked'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['locked'] ?? 0 }}</em></a>
  <a href="/desk/payouts" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M232,96H24L128,32Z" opacity="0.2"/><path d="M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Zm40,0H96v64H64Zm80,0v64H112V104Zm48,64H160V104h32ZM128,41.39,203.74,88H52.26ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H240A8,8,0,0,1,248,208Z"/></svg> Failed payouts <em class="{{ ($deskBadges['failedPayouts'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['failedPayouts'] ?? 0 }}</em></a>
  <div class="ngrp">Look up</div>
  <a href="/desk/queue" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,129.09V232a8,8,0,0,1-3.84-1l-88-48.18a8,8,0,0,1-4.16-7V80.18a8,8,0,0,1,.7-3.25Z" opacity="0.2"/><path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90l80,43.78v85.79L40,175.82Zm176,85.78h0l-80,43.79V133.82l32-17.51V152a8,8,0,0,0,16,0V107.55L216,90v85.77Z"/></svg> Errands</a>
  <a href="/desk/people" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M224,128a95.76,95.76,0,0,1-31.8,71.37A72,72,0,0,0,128,160a40,40,0,1,0-40-40,40,40,0,0,0,40,40,72,72,0,0,0-64.2,39.37h0A96,96,0,1,1,224,128Z" opacity="0.2"/><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/></svg> People</a>
  <div class="ngrp">Campus</div>
  <a href="/desk/places" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M184,80c0,56-56,88-56,88S72,136,72,80a56,56,0,0,1,112,0Z" opacity="0.2"/><path d="M112,80a16,16,0,1,1,16,16A16,16,0,0,1,112,80ZM64,80a64,64,0,0,1,128,0c0,59.95-57.58,93.54-60,94.95a8,8,0,0,1-7.94,0C121.58,173.54,64,140,64,80Zm16,0c0,42.2,35.84,70.21,48,78.5,12.15-8.28,48-36.3,48-78.5a48,48,0,0,0-96,0Zm122.77,67.63a8,8,0,0,0-5.54,15C213.74,168.74,224,176.92,224,184c0,13.36-36.52,32-96,32s-96-18.64-96-32c0-7.08,10.26-15.26,26.77-21.36a8,8,0,0,0-5.54-15C29.22,156.49,16,169.41,16,184c0,31.18,57.71,48,112,48s112-16.82,112-48C240,169.41,226.78,156.49,202.77,147.63Z"/></svg> Places <em class="{{ ($deskBadges['pendingPlaces'] ?? 0) > 0 ? ' hot' : '' }}">{{ $deskBadges['pendingPlaces'] ?? 0 }}</em></a>
  <a href="/desk/crew" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M168,144a40,40,0,1,1-40-40A40,40,0,0,1,168,144ZM64,56A32,32,0,1,0,96,88,32,32,0,0,0,64,56Zm128,0a32,32,0,1,0,32,32A32,32,0,0,0,192,56Z" opacity="0.2"/><path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1,0-16,24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.85,8,57,57,0,0,0-98.15,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z"/></svg> Crew and routines</a>
  <div class="ngrp">Control</div>
  <a href="/desk/rules" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,80a24,24,0,1,1-24-24A24,24,0,0,1,128,80Zm40,72a24,24,0,1,0,24,24A24,24,0,0,0,168,152Z" opacity="0.2"/><path d="M40,88H73a32,32,0,0,0,62,0h81a8,8,0,0,0,0-16H135a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16Zm64-24A16,16,0,1,1,88,80,16,16,0,0,1,104,64ZM216,168H199a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16h97a32,32,0,0,0,62,0h17a8,8,0,0,0,0-16Zm-48,24a16,16,0,1,1,16-16A16,16,0,0,1,168,192Z"/></svg> Rules</a>
  <a href="/desk/audit" class="nlink" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M208,48V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96a39.83,39.83,0,0,0-8,24v8h80V64a39.83,39.83,0,0,0-8-24h40A8,8,0,0,1,208,48Z" opacity="0.2"/><path d="M168,152a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,152Zm-8-40H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm56-64V216a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V48A16,16,0,0,1,56,32H92.26a47.92,47.92,0,0,1,71.48,0H200A16,16,0,0,1,216,48ZM96,64h64a32,32,0,0,0-64,0ZM200,48H173.25A47.93,47.93,0,0,1,176,64v8a8,8,0,0,1-8,8H88a8,8,0,0,1-8-8V64a47.93,47.93,0,0,1,2.75-16H56V216H200Z"/></svg> Audit log</a>
  @if(auth()->user()?->isSuperAdmin())
  <a href="/desk/campuses" class="nlink on" style="text-decoration:none;"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM144,80a16,16,0,1,1-16-16A16,16,0,0,1,144,80Zm24,72a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h16V120a8,8,0,0,1,16,0v24h16A8,8,0,0,1,168,152Z"/></svg> Campuses & Admins</a>
  @endif
  <div class="shift"><span class="av">{{ strtoupper(substr(auth()->user()->name ?? 'HQ', 0, 2)) }}</span><div style="flex:1;"><b>{{ auth()->user()->name ?? 'Waydrop Operations' }}</b><small>{{ ucfirst(auth()->user()->role ?? 'super_admin') }} · <a href="/logout" style="color:var(--brand);text-decoration:none;font-weight:600;">Sign out</a></small></div></div>
</nav>

<main>
  <div class="top">
    <label class="search"><svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/></svg><input id="q" placeholder="Search campus, lead, or matric..." aria-label="Search"><kbd>/</kbd></label>
    
    <!-- Super Admin Campus Scope Selector -->
    <form method="POST" action="{{ route('desk.campus.switch') }}" style="display:inline-flex;margin:0;">
      @csrf
      <div class="campus" style="cursor:pointer;padding:4px 10px;">
        <span class="dotlive" style="background:#2563EB;"></span>
        <select name="campus_id" onchange="this.form.submit()" style="border:none;background:transparent;font-family:inherit;font-weight:600;font-size:12.5px;color:inherit;outline:none;cursor:pointer;">
          <option value="all" {{ empty(session('active_campus_id')) ? 'selected' : '' }}>National HQ (All Campuses)</option>
          @foreach ($campuses as $c)
            <option value="{{ $c->id }}" {{ session('active_campus_id') === $c->id ? 'selected' : '' }}>🏫 {{ $c->name }}</option>
          @endforeach
        </select>
      </div>
    </form>
    
    <div style="margin-left:auto;font-size:12px;color:var(--ink3)" id="clock"></div>
  </div>

  <div class="page">
    <div class="ph">
      <div>
        <h1>National Campus Network & Administrative Staff</h1>
        <p>Headquarters desk. Provision new Nigerian university campuses and assign dedicated Campus Lead administrators.</p>
      </div>
    </div>

    @if (session('success'))
      <div style="background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;padding:12px 16px;border-radius:10px;font-size:13.5px;margin-bottom:20px;">
        ✓ {{ session('success') }}
      </div>
    @endif

    @if (isset($errors) && $errors->any())
      <div style="background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;padding:12px 16px;border-radius:10px;font-size:13.5px;margin-bottom:20px;">
        @foreach ($errors->all() as $error)
          <div>• {{ $error }}</div>
        @endforeach
      </div>
    @endif

    <div class="admin-grid">
      <!-- 1. Provision Campus Form -->
      <div class="form-card" id="newCampusForm">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <h2>🏫 Add New University Campus</h2>
          <span class="chip c-live">HQ Provisioning</span>
        </div>
        <p>Define geofence perimeter and campus center coordinates for runner dispatch.</p>
        <form method="POST" action="{{ route('desk.campuses.store') }}">
          @csrf
          <div class="field-row">
            <div class="field">
              <label>Campus ID (Slug) <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="text" name="id" placeholder="e.g. unilag, oau, abu" required>
            </div>
            <div class="field">
              <label>Full University Name <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="text" name="name" placeholder="e.g. University of Lagos" required>
            </div>
          </div>
          <div class="field">
            <label>Location Subtitle <span style="color:var(--fault-ink, #E11D48)">*</span></label>
            <input type="text" name="subtitle" placeholder="e.g. Main Campus, Akoka, Yaba, Lagos" required>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Latitude (Lat) <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="text" name="lat" placeholder="e.g. 6.515800" required>
            </div>
            <div class="field">
              <label>Longitude (Lng) <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="text" name="lng" placeholder="e.g. 3.389800" required>
            </div>
          </div>
          <div class="field">
            <label>Geofence Radius (Meters) <span style="color:var(--fault-ink, #E11D48)">*</span></label>
            <input type="number" name="radius_meters" value="3500" required>
          </div>
          <button type="submit" class="btn-action">
            <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor" style="width:16px;height:16px;"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/></svg>
            Provision Campus
          </button>
        </form>
      </div>

      <!-- 2. Provision Campus Lead Admin -->
      <div class="form-card" id="newAdminForm">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <h2>👤 Provision Campus Lead Admin</h2>
          <span class="chip c-paid">Staff Onboarding</span>
        </div>
        <p>Assign an administrator to oversee campus operations, routines, and disputes.</p>
        <form method="POST" action="{{ route('desk.admins.store') }}">
          @csrf
          <div class="field-row">
            <div class="field">
              <label>Admin Full Name <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="text" name="name" placeholder="e.g. Babatunde Fashola" required>
            </div>
            <div class="field">
              <label>Staff Email <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="email" name="email" placeholder="e.g. lead@unilag.waydrop.ng" required>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Phone Number <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="text" name="phone" placeholder="+2348012345678" required>
            </div>
            <div class="field">
              <label>Initial Password <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="password" name="password" placeholder="••••••••••••" required>
            </div>
          </div>
          <div class="field">
            <label>Assign to University Campus <span style="color:var(--fault-ink, #E11D48)">*</span></label>
            <select name="area_id" required>
              <option value="">Select University...</option>
              @foreach ($campuses as $campus)
                <option value="{{ $campus->id }}">{{ $campus->name }} ({{ $campus->id }})</option>
              @endforeach
            </select>
          </div>
          <button type="submit" class="btn-action dark">
            <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor" style="width:16px;height:16px;"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/></svg>
            Create Campus Lead
          </button>
        </form>
      </div>
    </div>

    <!-- 3. Active Campuses Table -->
    <div class="sheet" style="margin-bottom:24px;">
      <div class="sh-h">
        <b>Active University Campuses ({{ count($campuses) }})</b>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>Campus ID</th>
            <th>Name & Details</th>
            <th>Coordinates</th>
            <th>Radius</th>
            <th>Places</th>
            <th>Active Errands</th>
            <th>Status</th>
            <th style="text-align:right;">Action</th>
          </tr>
        </thead>
        <tbody>
          @foreach ($campuses as $c)
            <tr>
              <td><code>{{ $c->id }}</code></td>
              <td><b>{{ $c->name }}</b><div style="font-size:12px;color:var(--ink3)">{{ $c->subtitle }}</div></td>
              <td><span style="font-size:12px;">{{ $c->lat }}, {{ $c->lng }}</span></td>
              <td>{{ number_format($c->radius_meters) }}m</td>
              <td>{{ $c->places_count }} places</td>
              <td>{{ $c->tasks_count }} errands</td>
              <td>
                @if ($c->is_active)
                  <span class="badge-hq" style="background:#ECFDF5;color:#047857;border-color:#A7F3D0;">● Live</span>
                @else
                  <span class="badge-campus" style="background:#F1F5F9;color:#64748B;border-color:#CBD5E1;">○ Inactive</span>
                @endif
              </td>
              <td style="text-align:right;">
                <button type="button" class="btn b-line" style="height:28px;padding:0 10px;font-size:12px;" onclick='openCampusDrawer(@json($c))'>
                  <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor" style="font-size:14px;"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.6,107.6,0,0,0-10.88-26.25,8,8,0,0,0-6-4.22L192,68.22a96.69,96.69,0,0,0-7.48-7.48L183.07,37.2a8,8,0,0,0-4.22-6A107.6,107.6,0,0,0,152.6,20.32a8,8,0,0,0-7.06,1.48L126.9,36.72q-2.16-.06-4.32,0L103.94,21.8a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,70.63,31.2a8,8,0,0,0-4.22,6L64.93,60.74a96.69,96.69,0,0,0-7.48,7.48L34.1,69.67a8,8,0,0,0-6,4.22A107.6,107.6,0,0,0,17.22,100.14a8,8,0,0,0,1.48,7.06L33.62,125.84q-.06,2.16,0,4.32L18.7,148.8a8,8,0,0,0-1.48,7.06,107.6,107.6,0,0,0,10.88,26.25,8,8,0,0,0,6,4.22l23.35,1.45a96.69,96.69,0,0,0,7.48,7.48l1.45,23.35a8,8,0,0,0,4.22,6,107.6,107.6,0,0,0,26.25,10.88,8,8,0,0,0,7.06-1.48l18.64-14.92q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.6,107.6,0,0,0,26.25-10.88,8,8,0,0,0,4.22-6l1.45-23.35a96.69,96.69,0,0,0,7.48-7.48l23.35-1.45a8,8,0,0,0,6-4.22,107.6,107.6,0,0,0,10.88-26.25,8,8,0,0,0-1.48-7.06ZM204,136.66l-19.16,3.61a8,8,0,0,0-6.19,6.19l-3.61,19.16a81.16,81.16,0,0,1-13.78,13.78l-19.16-3.61a8,8,0,0,0-7.85,2.44L128,194.59l-6.25-16.36a8,8,0,0,0-7.85-2.44L94.74,179.4a81.16,81.16,0,0,1-13.78-13.78l-3.61-19.16a81.16,81.16,0,0,1-13.78-13.78l-3.61-19.16a8,8,0,0,0-6.19-6.19L52,136.66a81.16,81.16,0,0,1,0-17.32L71.16,115.73a8,8,0,0,0,6.19-6.19l3.61-19.16A81.16,81.16,0,0,1,94.74,76.6l19.16,3.61a8,8,0,0,0,7.85-2.44L128,61.41l6.25,16.36a8,8,0,0,0,7.85,2.44l19.16-3.61a81.16,81.16,0,0,1,13.78,13.78l3.61,19.16a8,8,0,0,0,6.19,6.19L204,119.34A81.16,81.16,0,0,1,204,136.66Z"/></svg>
                  Manage
                </button>
              </td>
            </tr>
          @endforeach
        </tbody>
      </table>
    </div>

    <!-- 4. Administrative Staff Table -->
    <div class="sheet">
      <div class="sh-h">
        <b>Administrative Staff & Campus Leads ({{ count($admins) }})</b>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>Staff Name</th>
            <th>Role Tier</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Assigned University</th>
            <th>Status</th>
            <th>Account Created</th>
            <th style="text-align:right;">Action</th>
          </tr>
        </thead>
        <tbody>
          @foreach ($admins as $adm)
            <tr>
              <td><b>{{ $adm->name }}</b></td>
              <td>
                @if ($adm->isSuperAdmin())
                  <span class="badge-hq">Super Admin (HQ)</span>
                @else
                  <span class="badge-campus">🏫 Campus Lead</span>
                @endif
              </td>
              <td>{{ $adm->email }}</td>
              <td>{{ $adm->phone }}</td>
              <td>
                @if ($adm->isSuperAdmin())
                  <em>All Campuses (National)</em>
                @else
                  <b>{{ $adm->area?->name ?? $adm->area_id }}</b>
                @endif
              </td>
              <td>
                @if ($adm->is_blocked)
                  <span class="badge-campus" style="background:#FEF2F2;color:#991B1B;border-color:#FECDD3;">✕ Blocked</span>
                @elseif ($adm->is_paused)
                  <span class="badge-campus" style="background:#FFFBEB;color:#B45309;border-color:#FDE68A;">⏸ Paused</span>
                @else
                  <span class="badge-hq" style="background:#ECFDF5;color:#047857;border-color:#A7F3D0;">● Live</span>
                @endif
              </td>
              <td>{{ $adm->created_at->format('M d, Y') }}</td>
              <td style="text-align:right;">
                <button type="button" class="btn b-line" style="height:28px;padding:0 10px;font-size:12px;" onclick='openAdminDrawer(@json($adm))'>
                  <svg class="ic" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor" style="font-size:14px;"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.6,107.6,0,0,0-10.88-26.25,8,8,0,0,0-6-4.22L192,68.22a96.69,96.69,0,0,0-7.48-7.48L183.07,37.2a8,8,0,0,0-4.22-6A107.6,107.6,0,0,0,152.6,20.32a8,8,0,0,0-7.06,1.48L126.9,36.72q-2.16-.06-4.32,0L103.94,21.8a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,70.63,31.2a8,8,0,0,0-4.22,6L64.93,60.74a96.69,96.69,0,0,0-7.48,7.48L34.1,69.67a8,8,0,0,0-6,4.22A107.6,107.6,0,0,0,17.22,100.14a8,8,0,0,0,1.48,7.06L33.62,125.84q-.06,2.16,0,4.32L18.7,148.8a8,8,0,0,0-1.48,7.06,107.6,107.6,0,0,0,10.88,26.25,8,8,0,0,0,6,4.22l23.35,1.45a96.69,96.69,0,0,0,7.48,7.48l1.45,23.35a8,8,0,0,0,4.22,6,107.6,107.6,0,0,0,26.25,10.88,8,8,0,0,0,7.06-1.48l18.64-14.92q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.6,107.6,0,0,0,26.25-10.88,8,8,0,0,0,4.22-6l1.45-23.35a96.69,96.69,0,0,0,7.48-7.48l23.35-1.45a8,8,0,0,0,6-4.22,107.6,107.6,0,0,0,10.88-26.25,8,8,0,0,0-1.48-7.06ZM204,136.66l-19.16,3.61a8,8,0,0,0-6.19,6.19l-3.61,19.16a81.16,81.16,0,0,1-13.78,13.78l-19.16-3.61a8,8,0,0,0-7.85,2.44L128,194.59l-6.25-16.36a8,8,0,0,0-7.85-2.44L94.74,179.4a81.16,81.16,0,0,1-13.78-13.78l-3.61-19.16a8,8,0,0,0-6.19-6.19L52,136.66a81.16,81.16,0,0,1,0-17.32L71.16,115.73a8,8,0,0,0,6.19-6.19l3.61-19.16A81.16,81.16,0,0,1,94.74,76.6l19.16,3.61a8,8,0,0,0,7.85-2.44L128,61.41l6.25,16.36a8,8,0,0,0,7.85,2.44l19.16-3.61a81.16,81.16,0,0,1,13.78,13.78l3.61,19.16a8,8,0,0,0,6.19,6.19L204,119.34A81.16,81.16,0,0,1,204,136.66Z"/></svg>
                  Manage
                </button>
              </td>
            </tr>
          @endforeach
        </tbody>
      </table>
    </div>

    <!-- Shared Drawer Backdrop -->
    <div class="drawer-scrim" id="drawerScrim" onclick="closeAllDrawers()"></div>

    <!-- 1. Campus Slide-over Drawer Panel -->
    <div class="drawer" id="campusDrawer" aria-modal="true" role="dialog">
      <div class="drawer-header">
        <div>
          <div style="display:flex;align-items:center;gap:8px;">
            <h3 id="dName" style="font-size:17px;font-weight:700;margin:0;color:var(--ink1);">Campus Name</h3>
            <span id="dStatusBadge" class="badge-hq">Live</span>
          </div>
          <div style="font-size:12px;color:var(--ink3);margin-top:4px;">
            Slug ID: <code id="dIdCode" style="font-family:var(--mono);font-size:12px;background:var(--inset);padding:2px 6px;border-radius:4px;color:var(--ink1);"></code>
          </div>
        </div>
        <button type="button" onclick="closeAllDrawers()" class="btn b-line" style="width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:15px;line-height:1;">✕</button>
      </div>

      <div class="drawer-body">
        <!-- Attached Records Pulse -->
        <div class="drawer-section">
          <b style="font-size:13px;color:var(--ink1);">Attached Records & Ecosystem Pulse</b>
          <p style="font-size:12px;color:var(--ink3);margin:2px 0 10px 0;">Safety check for deletion. Campuses with existing activity are protected.</p>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="num" id="dPlacesCount">0</div>
              <div class="label">Places</div>
            </div>
            <div class="stat-box">
              <div class="num" id="dTasksCount">0</div>
              <div class="label">Errands</div>
            </div>
            <div class="stat-box">
              <div class="num" id="dUsersCount">0</div>
              <div class="label">Users</div>
            </div>
            <div class="stat-box">
              <div class="num" id="dShiftsCount">0</div>
              <div class="label">Shifts</div>
            </div>
          </div>
        </div>

        <!-- Edit Campus Info Form -->
        <div class="drawer-section">
          <b style="font-size:13px;color:var(--ink1);">Edit Campus Coordinates & Details</b>
          <p style="font-size:12px;color:var(--ink3);margin:2px 0 12px 0;">Update campus naming, dispatch center, or geofence boundary.</p>
          <form id="editCampusForm" method="POST" action="">
            @csrf
            <div class="field">
              <label>Full University Name <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="text" name="name" id="dInputName" required>
            </div>
            <div class="field">
              <label>Location Subtitle <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="text" name="subtitle" id="dInputSubtitle" required>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Latitude (Lat) <span style="color:var(--fault-ink, #E11D48)">*</span></label>
                <input type="text" name="lat" id="dInputLat" required>
              </div>
              <div class="field">
                <label>Longitude (Lng) <span style="color:var(--fault-ink, #E11D48)">*</span></label>
                <input type="text" name="lng" id="dInputLng" required>
              </div>
            </div>
            <div class="field">
              <label>Geofence Radius (Meters) <span style="color:var(--fault-ink, #E11D48)">*</span></label>
              <input type="number" name="radius_meters" id="dInputRadius" required min="500">
            </div>
            <button type="submit" class="btn-action" style="width:100%;justify-content:center;margin-top:6px;">
              Save Campus Details
            </button>
          </form>
        </div>

        <!-- Activate / Deactivate Campus Operations -->
        <div class="drawer-section">
          <b style="font-size:13px;color:var(--ink1);">Campus Operations & Visibility</b>
          <p id="dStatusText" style="font-size:12px;color:var(--ink3);margin:3px 0 12px 0;">Control runner dispatch and errand ordering for this university.</p>
          <form id="toggleCampusForm" method="POST" action="">
            @csrf
            <button type="submit" id="dToggleBtn" class="btn" style="width:100%;height:38px;justify-content:center;font-weight:600;font-size:13px;border-radius:8px;">
              Toggle Status
            </button>
          </form>
        </div>

        <!-- Permanent Deletion Section -->
        <div class="drawer-section">
          <b style="font-size:13px;color:var(--fault-ink, #E11D48);">Delete Campus</b>
          <div id="dDeleteNotice" style="margin:8px 0 12px 0;font-size:12px;line-height:1.45;padding:10px 12px;border-radius:8px;">
          </div>
          <form id="deleteCampusForm" method="POST" action="" onsubmit="return confirm('Are you sure you want to permanently delete this campus? This operation cannot be reversed.')">
            @csrf
            <button type="submit" id="dDeleteBtn" class="btn b-fault" style="width:100%;height:38px;justify-content:center;border-radius:8px;font-weight:600;">
              🗑 Delete Campus
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- 2. Administrative Staff Slide-over Drawer Panel -->
    <div class="drawer" id="adminDrawer" aria-modal="true" role="dialog">
      <div class="drawer-header">
        <div>
          <div style="display:flex;align-items:center;gap:8px;">
            <h3 id="admName" style="font-size:17px;font-weight:700;margin:0;color:var(--ink1);">Staff Name</h3>
            <span id="admStatusBadge" class="badge-hq">Live</span>
          </div>
          <div style="font-size:12px;color:var(--ink3);margin-top:4px;display:flex;align-items:center;gap:6px;">
            <span id="admRoleBadge" class="badge-campus">Staff</span>
            <span id="admEmailSub" style="color:var(--ink2);"></span>
          </div>
        </div>
        <button type="button" onclick="closeAllDrawers()" class="btn b-line" style="width:32px;height:32px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:15px;line-height:1;">✕</button>
      </div>

      <div class="drawer-body">
        <!-- Attached Activity Pulse -->
        <div class="drawer-section">
          <b style="font-size:13px;color:var(--ink1);">Account Activity & Escrow Float</b>
          <p style="font-size:12px;color:var(--ink3);margin:2px 0 10px 0;">Track transaction records and operational float assigned to this staff member.</p>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="num" id="admReqTasks">0</div>
              <div class="label">Requested</div>
            </div>
            <div class="stat-box">
              <div class="num" id="admRunTasks">0</div>
              <div class="label">Delivered</div>
            </div>
            <div class="stat-box">
              <div class="num" id="admPayouts">0</div>
              <div class="label">Payouts</div>
            </div>
            <div class="stat-box">
              <div class="num" id="admWalletFloat" style="font-size:15px;color:var(--paid-ink);">₦0</div>
              <div class="label">Float</div>
            </div>
          </div>
        </div>

        <!-- Edit Staff Form -->
        <div class="drawer-section">
          <b style="font-size:13px;color:var(--ink1);">Edit Administrator Profile & Scope</b>
          <p style="font-size:12px;color:var(--ink3);margin:2px 0 12px 0;">Update credentials, role privilege tier, or assigned campus.</p>
          <form id="editAdminForm" method="POST" action="">
            @csrf
            <div class="field-row">
              <div class="field">
                <label>Staff Full Name <span style="color:var(--fault-ink, #E11D48)">*</span></label>
                <input type="text" name="name" id="admInputName" required>
              </div>
              <div class="field">
                <label>Official Email <span style="color:var(--fault-ink, #E11D48)">*</span></label>
                <input type="email" name="email" id="admInputEmail" required>
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Phone Number <span style="color:var(--fault-ink, #E11D48)">*</span></label>
                <input type="text" name="phone" id="admInputPhone" required>
              </div>
              <div class="field">
                <label>Role Privilege Tier <span style="color:var(--fault-ink, #E11D48)">*</span></label>
                <select name="role" id="admSelectRole" required onchange="toggleAdminAreaField(this.value)">
                  <option value="admin">🏫 Campus Lead Administrator</option>
                  <option value="super_admin">🌐 National Super Administrator (HQ)</option>
                </select>
              </div>
            </div>
            <div class="field" id="admAreaField">
              <label>Assigned University Campus</label>
              <select name="area_id" id="admSelectArea">
                <option value="">National HQ (All Campuses)</option>
                @foreach ($campuses as $campus)
                  <option value="{{ $campus->id }}">{{ $campus->name }} ({{ $campus->id }})</option>
                @endforeach
              </select>
            </div>
            <div class="field">
              <label>New Password <small style="font-weight:normal;color:var(--ink3);">(Leave blank to keep current password)</small></label>
              <input type="password" name="password" id="admInputPassword" placeholder="••••••••••••" minlength="6">
            </div>
            <button type="submit" class="btn-action dark" style="width:100%;justify-content:center;margin-top:6px;">
              Save Staff Changes
            </button>
          </form>
        </div>

        <!-- Access & Status Control -->
        <div class="drawer-section">
          <b style="font-size:13px;color:var(--ink1);">Operations Access & Status</b>
          <p id="admStatusText" style="font-size:12px;color:var(--ink3);margin:3px 0 12px 0;">Control administrator dashboard access.</p>
          <form id="toggleAdminForm" method="POST" action="">
            @csrf
            <button type="submit" id="admToggleBtn" class="btn" style="width:100%;height:38px;justify-content:center;font-weight:600;font-size:13px;border-radius:8px;">
              Toggle Access
            </button>
          </form>
        </div>

        <!-- Delete Staff Danger Zone -->
        <div class="drawer-section">
          <b style="font-size:13px;color:var(--fault-ink, #E11D48);">Delete Staff Account</b>
          <div id="admDeleteNotice" style="margin:8px 0 12px 0;font-size:12px;line-height:1.45;padding:10px 12px;border-radius:8px;">
          </div>
          <form id="deleteAdminForm" method="POST" action="" onsubmit="return confirm('Are you sure you want to permanently delete this administrator account? This action cannot be undone.')">
            @csrf
            <button type="submit" id="admDeleteBtn" class="btn b-fault" style="width:100%;height:38px;justify-content:center;border-radius:8px;font-weight:600;">
              🗑 Delete Administrator Account
            </button>
          </form>
        </div>
      </div>
    </div>

  </div>
</main>
</div>
<script src="/admin_desk/admin_desk.js"></script>
<script>
const currentUserId = "{{ auth()->id() }}";

function toggleAdminAreaField(role) {
  const areaField = document.getElementById('admAreaField');
  if (role === 'super_admin') {
    areaField.style.display = 'none';
  } else {
    areaField.style.display = 'block';
  }
}

function openCampusDrawer(c) {
  const attachedTotal = (c.places_count || 0) + (c.tasks_count || 0) + (c.users_count || 0) + (c.crew_shifts_count || 0);

  // Set titles and codes
  document.getElementById('dName').innerText = c.name;
  document.getElementById('dIdCode').innerText = c.id;

  // Status badge
  const badge = document.getElementById('dStatusBadge');
  if (c.is_active) {
    badge.className = 'badge-hq';
    badge.style.background = '#ECFDF5';
    badge.style.color = '#047857';
    badge.style.borderColor = '#A7F3D0';
    badge.innerText = '● Live';
  } else {
    badge.className = 'badge-campus';
    badge.style.background = '#F1F5F9';
    badge.style.color = '#64748B';
    badge.style.borderColor = '#CBD5E1';
    badge.innerText = '○ Inactive';
  }

  // Counts
  document.getElementById('dPlacesCount').innerText = c.places_count || 0;
  document.getElementById('dTasksCount').innerText = c.tasks_count || 0;
  document.getElementById('dUsersCount').innerText = c.users_count || 0;
  document.getElementById('dShiftsCount').innerText = c.crew_shifts_count || 0;

  // Edit form inputs & action route
  document.getElementById('editCampusForm').action = '/desk/campuses/' + encodeURIComponent(c.id) + '/update';
  document.getElementById('dInputName').value = c.name;
  document.getElementById('dInputSubtitle').value = c.subtitle;
  document.getElementById('dInputLat').value = c.lat;
  document.getElementById('dInputLng').value = c.lng;
  document.getElementById('dInputRadius').value = c.radius_meters;

  // Toggle status form
  const toggleForm = document.getElementById('toggleCampusForm');
  toggleForm.action = '/desk/campuses/' + encodeURIComponent(c.id) + '/toggle-status';
  const toggleBtn = document.getElementById('dToggleBtn');
  const statusText = document.getElementById('dStatusText');

  if (c.is_active) {
    statusText.innerText = 'Campus is currently LIVE. Deactivating will pause student ordering and runner match routines for this campus.';
    toggleBtn.className = 'btn b-line';
    toggleBtn.style.color = 'var(--fault-ink, #BE123C)';
    toggleBtn.style.borderColor = '#FECDD3';
    toggleBtn.innerText = '⏸ Deactivate Campus (Pause Live Operations)';
  } else {
    statusText.innerText = 'Campus is currently INACTIVE. Activating will make it live for students, runners, and errands.';
    toggleBtn.className = 'btn b-paid';
    toggleBtn.style.color = 'var(--ink1)';
    toggleBtn.style.borderColor = '';
    toggleBtn.innerText = '▶ Activate Campus (Make Live)';
  }

  // Delete section
  const deleteForm = document.getElementById('deleteCampusForm');
  deleteForm.action = '/desk/campuses/' + encodeURIComponent(c.id) + '/delete';
  const deleteBtn = document.getElementById('dDeleteBtn');
  const deleteNotice = document.getElementById('dDeleteNotice');

  if (attachedTotal > 0) {
    deleteNotice.style.background = '#FFFBEB';
    deleteNotice.style.border = '1px solid #FDE68A';
    deleteNotice.style.color = '#92400E';
    deleteNotice.innerHTML = `⚠️ <b>Deletion Protected:</b> This campus has <b>${attachedTotal}</b> attached record(s) (${c.places_count || 0} places, ${c.tasks_count || 0} errands, ${c.users_count || 0} users, ${c.crew_shifts_count || 0} shifts). To protect data integrity, active campuses with existing records cannot be deleted. You can deactivate the campus above instead.`;
    deleteBtn.disabled = true;
    deleteBtn.title = 'Cannot delete campus with attached records';
    deleteBtn.style.opacity = '0.35';
    deleteBtn.style.cursor = 'not-allowed';
  } else {
    deleteNotice.style.background = '#FEF2F2';
    deleteNotice.style.border = '1px solid #FECDD3';
    deleteNotice.style.color = '#991B1B';
    deleteNotice.innerHTML = '✓ <b>Safe to Delete:</b> There are 0 places, 0 errands, 0 users, and 0 shifts linked to this campus. Permanent deletion is allowed.';
    deleteBtn.disabled = false;
    deleteBtn.title = '';
    deleteBtn.style.opacity = '1';
    deleteBtn.style.cursor = 'pointer';
  }

  // Open drawer
  document.getElementById('adminDrawer').classList.remove('open');
  document.getElementById('drawerScrim').classList.add('open');
  document.getElementById('campusDrawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function openAdminDrawer(adm) {
  const attachedTotal = (adm.tasks_as_requester_count || 0) + (adm.tasks_as_runner_count || 0) + (adm.payouts_count || 0);

  // Headers
  document.getElementById('admName').innerText = adm.name;
  document.getElementById('admEmailSub').innerText = adm.email;

  // Role Badge
  const roleBadge = document.getElementById('admRoleBadge');
  if (adm.role === 'super_admin') {
    roleBadge.className = 'badge-hq';
    roleBadge.innerText = 'Super Admin (HQ)';
  } else {
    roleBadge.className = 'badge-campus';
    roleBadge.innerText = '🏫 Campus Lead';
  }

  // Status Badge
  const statusBadge = document.getElementById('admStatusBadge');
  const isDeactivated = adm.is_blocked || adm.is_paused;
  if (isDeactivated) {
    statusBadge.className = 'badge-campus';
    statusBadge.style.background = '#FEF2F2';
    statusBadge.style.color = '#991B1B';
    statusBadge.style.borderColor = '#FECDD3';
    statusBadge.innerText = '✕ Deactivated';
  } else {
    statusBadge.className = 'badge-hq';
    statusBadge.style.background = '#ECFDF5';
    statusBadge.style.color = '#047857';
    statusBadge.style.borderColor = '#A7F3D0';
    statusBadge.innerText = '● Live';
  }

  // Counts
  document.getElementById('admReqTasks').innerText = adm.tasks_as_requester_count || 0;
  document.getElementById('admRunTasks').innerText = adm.tasks_as_runner_count || 0;
  document.getElementById('admPayouts').innerText = adm.payouts_count || 0;
  const balanceKobo = adm.wallet ? (adm.wallet.balance_kobo || 0) : 0;
  document.getElementById('admWalletFloat').innerText = '₦' + (balanceKobo / 100).toLocaleString('en-NG', {minimumFractionDigits: 0});

  // Edit form inputs
  document.getElementById('editAdminForm').action = '/desk/admins/' + encodeURIComponent(adm.id) + '/update';
  document.getElementById('admInputName').value = adm.name;
  document.getElementById('admInputEmail').value = adm.email;
  document.getElementById('admInputPhone').value = adm.phone;
  document.getElementById('admSelectRole').value = adm.role;
  document.getElementById('admSelectArea').value = adm.area_id || '';
  document.getElementById('admInputPassword').value = '';
  toggleAdminAreaField(adm.role);

  // Toggle status form
  const toggleForm = document.getElementById('toggleAdminForm');
  toggleForm.action = '/desk/admins/' + encodeURIComponent(adm.id) + '/toggle-status';
  const toggleBtn = document.getElementById('admToggleBtn');
  const statusText = document.getElementById('admStatusText');

  if (adm.id === currentUserId) {
    statusText.innerText = 'This is your own active administrator account. Self-deactivation is prohibited to prevent lockout.';
    toggleBtn.className = 'btn b-line';
    toggleBtn.style.color = 'var(--ink3)';
    toggleBtn.style.borderColor = '#E2E8F0';
    toggleBtn.innerText = '🔒 Cannot Deactivate Current Session';
    toggleBtn.disabled = true;
    toggleBtn.style.cursor = 'not-allowed';
  } else if (!isDeactivated) {
    statusText.innerText = 'Account is currently LIVE with active access to the desk. Deactivating will immediately revoke login sessions.';
    toggleBtn.className = 'btn b-line';
    toggleBtn.style.color = 'var(--fault-ink, #BE123C)';
    toggleBtn.style.borderColor = '#FECDD3';
    toggleBtn.innerText = '⏸ Suspend / Deactivate Staff Access';
    toggleBtn.disabled = false;
    toggleBtn.style.cursor = 'pointer';
  } else {
    statusText.innerText = 'Account is currently DEACTIVATED and cannot sign in. Activating will restore operations desk privileges.';
    toggleBtn.className = 'btn b-paid';
    toggleBtn.style.color = 'var(--ink1)';
    toggleBtn.style.borderColor = '';
    toggleBtn.innerText = '▶ Activate Staff Account (Make Live)';
    toggleBtn.disabled = false;
    toggleBtn.style.cursor = 'pointer';
  }

  // Delete section
  const deleteForm = document.getElementById('deleteAdminForm');
  deleteForm.action = '/desk/admins/' + encodeURIComponent(adm.id) + '/delete';
  const deleteBtn = document.getElementById('admDeleteBtn');
  const deleteNotice = document.getElementById('admDeleteNotice');

  if (adm.id === currentUserId) {
    deleteNotice.style.background = '#FFFBEB';
    deleteNotice.style.border = '1px solid #FDE68A';
    deleteNotice.style.color = '#92400E';
    deleteNotice.innerHTML = '🔒 <b>Self-Deletion Blocked:</b> You cannot delete the account you are currently logged into.';
    deleteBtn.disabled = true;
    deleteBtn.style.opacity = '0.35';
    deleteBtn.style.cursor = 'not-allowed';
  } else if (attachedTotal > 0) {
    deleteNotice.style.background = '#FFFBEB';
    deleteNotice.style.border = '1px solid #FDE68A';
    deleteNotice.style.color = '#92400E';
    deleteNotice.innerHTML = `⚠️ <b>Deletion Protected:</b> This account has <b>${attachedTotal}</b> transaction record(s) (${adm.tasks_as_requester_count || 0} requested, ${adm.tasks_as_runner_count || 0} delivered, ${adm.payouts_count || 0} payouts). To protect audit history, accounts with existing records cannot be deleted. You can deactivate access above instead.`;
    deleteBtn.disabled = true;
    deleteBtn.style.opacity = '0.35';
    deleteBtn.style.cursor = 'not-allowed';
  } else {
    deleteNotice.style.background = '#FEF2F2';
    deleteNotice.style.border = '1px solid #FECDD3';
    deleteNotice.style.color = '#991B1B';
    deleteNotice.innerHTML = '✓ <b>Safe to Delete:</b> 0 errands or payouts are linked to this staff account. Permanent deletion is allowed.';
    deleteBtn.disabled = false;
    deleteBtn.style.opacity = '1';
    deleteBtn.style.cursor = 'pointer';
  }

  // Open drawer
  document.getElementById('campusDrawer').classList.remove('open');
  document.getElementById('drawerScrim').classList.add('open');
  document.getElementById('adminDrawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAllDrawers() {
  document.getElementById('drawerScrim').classList.remove('open');
  document.getElementById('campusDrawer').classList.remove('open');
  document.getElementById('adminDrawer').classList.remove('open');
  document.body.style.overflow = '';
}

function closeCampusDrawer() {
  closeAllDrawers();
}

function closeAdminDrawer() {
  closeAllDrawers();
}

// Close on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeAllDrawers();
  }
});
</script>
</body>
</html>
