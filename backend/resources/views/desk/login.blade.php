<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Waydrop Desk: Sign In</title>
<link rel="stylesheet" href="{{ asset('admin_desk/admin_desk.css') }}">
<style>
  :root {
    --bg-page: #FAF8F5;
    --card-bg: #FFFFFF;
    --brand-primary: #FF5500;
    --brand-dark: #0F172A;
    --border-color: #E2E8F0;
  }
  body {
    margin: 0;
    padding: 0;
    background-color: var(--bg-page);
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: var(--brand-dark);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-image: 
      radial-gradient(#E2E8F0 1px, transparent 1px),
      radial-gradient(#E2E8F0 1px, var(--bg-page) 1px);
    background-size: 24px 24px;
    background-position: 0 0, 12px 12px;
  }
  .login-card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04);
    border-radius: 20px;
    width: 100%;
    max-width: 420px;
    padding: 38px 34px;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
  }
  .login-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #FF5500 0%, #FF8A4C 100%);
  }
  .brand-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 22px;
  }
  .brand-header b {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 20px;
    letter-spacing: -0.5px;
    color: var(--brand-dark);
  }
  .brand-header span.tag {
    background: var(--brand-dark);
    color: #FFFFFF;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    letter-spacing: 0.8px;
  }
  .login-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 6px 0;
    letter-spacing: -0.4px;
    color: var(--brand-dark);
  }
  .login-subtitle {
    font-size: 13.5px;
    color: #64748B;
    margin: 0 0 24px 0;
    line-height: 1.45;
  }
  .form-group {
    margin-bottom: 18px;
  }
  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
  }
  .form-input {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid var(--border-color);
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    color: var(--brand-dark);
    background: #FFFFFF;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .form-input:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(255, 85, 0, 0.15);
  }
  .btn-submit {
    width: 100%;
    background: var(--brand-primary);
    color: #FFFFFF;
    border: none;
    padding: 13px;
    border-radius: 10px;
    font-size: 14.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background-color 0.15s ease, transform 0.05s ease;
    margin-top: 10px;
  }
  .btn-submit:hover {
    background: #E04B00;
  }
  .btn-submit:active {
    transform: scale(0.99);
  }
  .alert-error {
    background: #FEF2F2;
    border: 1px solid #FCA5A5;
    color: #991B1B;
    padding: 11px 14px;
    border-radius: 9px;
    font-size: 13px;
    margin-bottom: 20px;
    line-height: 1.4;
  }
  .demo-box {
    margin-top: 24px;
    padding: 12px 14px;
    background: #F8FAFC;
    border: 1px dashed #CBD5E1;
    border-radius: 10px;
    font-size: 12px;
    color: #475569;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .demo-fill-btn {
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    padding: 4px 9px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--brand-primary);
    cursor: pointer;
  }
  .demo-fill-btn:hover {
    background: #FFF7ED;
    border-color: #FDBA74;
  }
  .footer-safety {
    margin-top: 22px;
    font-size: 11.5px;
    color: #94A3B8;
    text-align: center;
    display: flex;
    align-items: center;
    gap: 6px;
  }
</style>
</head>
<body>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <symbol id="logo" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="12" fill="#0F172A"/>
      <path d="M8 31 C 12 31, 13 25, 18 25" stroke="#FF5500" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 4.2" fill="none"/>
      <path d="M24 8c5.5 0 9 3.9 9 8.6 0 5.6-5.4 9.8-9 12.4-3.6-2.6-9-6.8-9-12.4C15 11.9 18.5 8 24 8Z" fill="#FF5500"/>
      <circle cx="24" cy="16.6" r="3.2" fill="#fff"/>
    </symbol>
  </defs>
</svg>

<div class="login-card">
  <div class="brand-header">
    <svg width="34" height="34" aria-hidden="true"><use href="#logo"/></svg>
    <b>Waydrop</b>
    <span class="tag">DESK</span>
  </div>

  <h1 class="login-title">Operations Desk</h1>
  <p class="login-subtitle">Sign in to review campus errands, solve student disputes, and verify runner KYC.</p>

  @if ($errors->any())
    <div class="alert-error">
      @foreach ($errors->all() as $error)
        <div>{{ $error }}</div>
      @endforeach
    </div>
  @endif

  <form method="POST" action="{{ route('login.post') }}">
    @csrf

    <div class="form-group">
      <label class="form-label" for="email">Staff Email Address</label>
      <input 
        type="email" 
        name="email" 
        id="email" 
        class="form-input" 
        value="{{ old('email', 'admin@waydrop.ng') }}" 
        required 
        autocomplete="email" 
        autofocus
      >
    </div>

    <div class="form-group">
      <label class="form-label" for="password">Password</label>
      <input 
        type="password" 
        name="password" 
        id="password" 
        class="form-input" 
        required 
        placeholder="••••••••••••"
        autocomplete="current-password"
      >
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;font-size:13px;color:#475569;">
      <label style="display:flex;align-items:center;gap:7px;cursor:pointer;">
        <input type="checkbox" name="remember" value="1" checked style="accent-color:var(--brand-primary);">
        <span>Remember this workstation</span>
      </label>
    </div>

    <button type="submit" class="btn-submit">
      Sign In to Desk
      <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
        <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"/>
      </svg>
    </button>

    <div class="demo-box" style="flex-direction:column;align-items:stretch;gap:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span><strong style="color:var(--brand-dark);">HQ Super Admin:</strong> superadmin@waydrop.ng</span>
        <button type="button" class="demo-fill-btn" onclick="fillSuperAdmin()">Fill HQ</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #E2E8F0;padding-top:6px;">
        <span><strong style="color:var(--brand-dark);">🏫 BUK Campus Lead:</strong> admin@waydrop.ng</span>
        <button type="button" class="demo-fill-btn" onclick="fillCampusAdmin()">Fill Campus</button>
      </div>
    </div>
  </form>
</div>

<div class="footer-safety">
  <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor">
    <path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z"/>
  </svg>
  <span>Secured Campus Escrow & Operational Network · Nigeria Platform Operations</span>
</div>

<script>
  function fillSuperAdmin() {
    document.getElementById('email').value = 'superadmin@waydrop.ng';
    document.getElementById('password').value = 'password123';
  }
  function fillCampusAdmin() {
    document.getElementById('email').value = 'admin@waydrop.ng';
    document.getElementById('password').value = 'password123';
  }
</script>

</body>
</html>
