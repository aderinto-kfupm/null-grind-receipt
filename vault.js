// System Vault: shared page behaviour (email gate, UTM pass-through, copy buttons, socials).
(() => {
  const cfg = window.VAULT_CONFIG || {};
  const email = cfg.email || {};

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: fine */ } },
    sget(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    sset(k, v) { try { sessionStorage.setItem(k, v); } catch { /* fine */ } },
  };

  // ---- UTM: remember where this visit came from, and keep it on internal links ----------
  const params = new URLSearchParams(location.search);
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  const utm = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k) || store.sget(k);
    if (v) { utm[k] = v; store.sset(k, v); }
  }
  const withUtm = (href) => {
    if (!Object.keys(utm).length) return href;
    const u = new URL(href, location.href);
    if (u.origin !== location.origin) return href;
    for (const [k, v] of Object.entries(utm)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    return u.pathname + u.search + u.hash;
  };

  const toast = (msg) => {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2200);
  };

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.append(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
      return ok;
    }
  };

  const download = (filename, text, type = 'text/markdown') => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], {type}));
    a.download = filename;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // ---- Email gate ----------------------------------------------------------------------
  const gateOn = () => email.provider === 'kit' || (email.provider === 'custom' && !!email.action);
  const formAction = (system) => {
    if (email.provider === 'kit') {
      const id = (email.kitForms || {})[system] || (email.kitForms || {}).default;
      return id ? `https://app.kit.com/forms/${encodeURIComponent(id)}/subscriptions` : '';
    }
    return email.provider === 'custom' ? email.action : '';
  };

  const subscribe = async (system, address, extra = {}) => {
    const action = formAction(system);
    if (!action) return true;
    const fd = new FormData();
    if (email.provider === 'kit') {
      fd.set('email_address', address);
      if (email.kitCustomFields) {
        fd.set('fields[source]', utm.utm_source || 'direct');
        if (extra.role) fd.set('fields[role]', extra.role);
      }
    } else {
      fd.set(email.emailField || 'email', address);
      fd.set('tag', system);
      if (extra.role) fd.set('role', extra.role);
      if (utm.utm_source) fd.set('source', utm.utm_source);
    }
    // no-cors: the provider gets the POST; we can't read the reply, so we trust the send.
    await fetch(action, {method: 'POST', mode: 'no-cors', body: fd});
    return true;
  };

  // Unlocks `.locked` content on this page. opts.extra() can add fields (e.g. the Audit role).
  const gate = (system, opts = {}) => {
    const unlock = (silent) => {
      document.body.classList.add('is-unlocked');
      store.set(`vault.unlocked.${system}`, '1');
      opts.onUnlock?.();
      if (!silent) toast(opts.toast || 'Unlocked. A copy is on its way to your inbox.');
    };
    if (!gateOn() || !formAction(system) || store.get(`vault.unlocked.${system}`)) {
      unlock(true);
      return {open: true};
    }
    for (const form of document.querySelectorAll(`form[data-gate="${system}"]`)) {
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const input = form.querySelector('input[type=email]');
        const btn = form.querySelector('button');
        const err = form.parentElement.querySelector('.err');
        const address = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) {
          if (err) err.textContent = 'That email doesn’t look right.';
          input.focus();
          return;
        }
        if (err) err.textContent = '';
        btn.disabled = true;
        btn.textContent = 'Sending…';
        try {
          await subscribe(system, address, opts.extra?.() || {});
        } catch {
          // Network blocked (ad blocker, offline). Don't punish the visitor: open it anyway.
        }
        unlock(false);
      });
    }
    return {open: false};
  };

  // ---- Page bootstrap ------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    for (const el of document.querySelectorAll('[data-handle]')) el.textContent = cfg.handle || '';
    for (const el of document.querySelectorAll('[data-bio]')) el.textContent = cfg.bio || '';
    for (const el of document.querySelectorAll('[data-year]')) el.textContent = new Date().getFullYear();

    // Internal links keep the UTM tags so signups are credited to the right platform.
    for (const a of document.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href');
      if (h && !/^(https?:|mailto:|#)/.test(h) && !a.hasAttribute('download')) a.setAttribute('href', withUtm(h));
    }

    const labels = {instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn'};
    for (const box of document.querySelectorAll('[data-socials]')) {
      for (const [k, url] of Object.entries(cfg.socials || {})) {
        if (!url) continue;
        const a = document.createElement('a');
        a.className = 'btn ghost small'; a.href = url; a.rel = 'me noopener'; a.target = '_blank';
        a.textContent = labels[k] || k;
        box.append(a);
      }
      if (!box.children.length) box.remove();
    }

    // Copy buttons on every code/prompt block.
    for (const block of document.querySelectorAll('.code')) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'copy'; b.textContent = 'Copy';
      b.addEventListener('click', async () => {
        const text = [...block.childNodes].filter((n) => n !== b).map((n) => n.textContent).join('').trim();
        if (await copyText(text)) { b.textContent = 'Copied'; b.classList.add('done'); setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('done'); }, 1600); }
      });
      block.append(b);
    }
  });

  window.Vault = {cfg, utm, gate, toast, copyText, download, store, withUtm, gateOn,
    siteUrl: () => (cfg.siteUrl || location.host || '').replace(/^https?:\/\//, '').replace(/\/$/, '')};
})();
