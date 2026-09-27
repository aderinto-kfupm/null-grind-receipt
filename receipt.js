// System #001, quick version: the Time Receipt. An app-like flow, one screen at a time: role →
// tick your week → print the receipt → one kill plan per screen. Same maths as the Leverage
// Audit (vault/audit/audit.js). Runs in the browser; only the email (and role) is ever sent.
// Deploys on its own: every file it needs sits in this folder. Links back to the Vault use
// config.js → vaultUrl and hide themselves when it's empty.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);

  // runs per week
  const FREQ = [
    ['Several times a day', 15],
    ['Daily', 5],
    ['2–3× a week', 2.5],
    ['Weekly', 1],
    ['Every 2 weeks', 0.5],
    ['Monthly', 0.25],
  ];
  const WEEKS_PER_YEAR = 52;
  const WORK_WEEK_H = 40;
  const CHECK_MIN = 1; // question 3: you still spend up to a minute checking each run

  // ---- task catalogue ------------------------------------------------------------------
  // a = typical answers [would anyone notice if you stopped, same trigger every time, mistake caught < 1 min].
  // build = typical first setup in hours (a guess, shown as one). Minutes and runs are editable guesses too.
  const TASKS = {
    inbox: {name: 'Sorting the inbox', runs: 5, mins: 25, a: [1, 1, 1], build: 2},
    meetings: {name: 'Meeting notes and follow-up emails', runs: 5, mins: 20, a: [1, 1, 1], build: 2},
    status: {name: 'Weekly status update', runs: 1, mins: 45, a: [1, 0, 1], build: 2},
    scheduling: {name: 'Scheduling back-and-forth', runs: 2.5, mins: 10, a: [1, 1, 1], build: 0.5},
    copydata: {name: 'Copying data between tools', runs: 2.5, mins: 20, a: [1, 1, 1], build: 2},
    report: {name: 'Formatting the same report', runs: 1, mins: 60, a: [1, 1, 1], build: 3},
    sameqs: {name: 'Answering the same questions', runs: 5, mins: 15, a: [1, 0, 1], build: 1},
    files: {name: 'Renaming and filing attachments', runs: 2.5, mins: 10, a: [1, 1, 1], build: 1},
    ghost: {name: 'A report nobody replies to', runs: 1, mins: 30, a: [0, 1, 1], build: 0},
    expenses: {name: 'Expense receipts', runs: 0.25, mins: 40, a: [1, 1, 1], build: 1},
    // developers
    standup: {name: 'Standup notes', runs: 5, mins: 10, a: [1, 1, 1], build: 1},
    prs: {name: 'Writing PR descriptions', runs: 2.5, mins: 15, a: [1, 1, 1], build: 1},
    triage: {name: 'Triaging new issues', runs: 5, mins: 15, a: [1, 1, 1], build: 2},
    docs: {name: 'Updating docs after changes', runs: 1, mins: 45, a: [1, 0, 1], build: 1},
    deps: {name: 'Dependency updates', runs: 1, mins: 30, a: [1, 1, 1], build: 1},
    // founders
    leads: {name: 'Lead follow-up emails', runs: 5, mins: 20, a: [1, 1, 1], build: 2},
    metrics: {name: 'Weekly metrics report', runs: 1, mins: 60, a: [1, 1, 1], build: 3},
    support: {name: 'Answering the same customer questions', runs: 5, mins: 20, a: [1, 0, 1], build: 2},
    investor: {name: 'Investor update', runs: 0.25, mins: 120, a: [1, 0, 1], build: 0},
    // freelancers
    clientupd: {name: 'Client status updates', runs: 2.5, mins: 20, a: [1, 0, 1], build: 1},
    invoicing: {name: 'Time log cleanup and invoicing', runs: 1, mins: 30, a: [1, 1, 1], build: 1},
    chasing: {name: 'Chasing late payments', runs: 1, mins: 15, a: [1, 1, 1], build: 0.5},
    proposals: {name: 'Proposals from scratch', runs: 0.5, mins: 90, a: [1, 0, 0], build: 0},
    // researchers
    screening: {name: 'Screening new-paper alerts', runs: 2.5, mins: 45, a: [1, 1, 1], build: 3},
    papernotes: {name: 'Writing paper notes', runs: 2.5, mins: 40, a: [1, 0, 1], build: 2},
    refs: {name: 'Formatting references', runs: 1, mins: 30, a: [1, 1, 1], build: 1},
    supervisor: {name: 'Supervisor update', runs: 1, mins: 40, a: [1, 0, 1], build: 1},
    cleaning: {name: 'Cleaning the same data again', runs: 1, mins: 90, a: [1, 1, 1], build: 4},
    // the real work, per role (so the receipt shows what stays human)
    deep_work: {name: 'Decisions, 1:1s and real thinking', runs: 5, mins: 90, a: [1, 0, 0], build: 0},
    deep_dev: {name: 'Designing and writing code', runs: 5, mins: 180, a: [1, 0, 0], build: 0},
    deep_founder: {name: 'Talking to customers', runs: 2.5, mins: 60, a: [1, 0, 0], build: 0},
    deep_freelancer: {name: 'The client work itself', runs: 5, mins: 180, a: [1, 0, 0], build: 0},
    deep_research: {name: 'Experiments, analysis and writing', runs: 5, mins: 180, a: [1, 0, 0], build: 0},
  };

  const ROLES = {
    work: {label: 'Knowledge worker', hint: 'Office, ops, analysis, PM', tasks: ['inbox', 'meetings', 'status', 'scheduling', 'copydata', 'report', 'sameqs', 'files', 'ghost', 'expenses', 'deep_work']},
    dev: {label: 'Developer', hint: 'Engineering, data, IT', tasks: ['standup', 'prs', 'triage', 'docs', 'deps', 'inbox', 'meetings', 'status', 'ghost', 'deep_dev']},
    founder: {label: 'Founder', hint: 'Running a company or team', tasks: ['inbox', 'leads', 'meetings', 'metrics', 'support', 'scheduling', 'copydata', 'investor', 'expenses', 'ghost', 'deep_founder']},
    freelancer: {label: 'Freelancer', hint: 'Clients, projects, invoices', tasks: ['inbox', 'clientupd', 'invoicing', 'chasing', 'scheduling', 'files', 'proposals', 'expenses', 'ghost', 'deep_freelancer']},
    research: {label: 'Researcher / student', hint: 'PhD, masters, research staff', tasks: ['inbox', 'screening', 'papernotes', 'refs', 'supervisor', 'cleaning', 'meetings', 'files', 'ghost', 'deep_research']},
    other: {label: 'Something else', hint: 'A general list + your own', tasks: ['inbox', 'meetings', 'scheduling', 'copydata', 'report', 'files', 'status', 'ghost']},
  };

  // ---- kill plans ------------------------------------------------------------------------
  // trigger → steps → how you check it. Tools are examples; use whatever you already have.
  const VAULT = {
    check: {name: '#002 Ghost Citation Checker', path: 'check/'},
  };
  const PLANS = {
    inbox: {trigger: 'A new email arrives.', steps: [
      'Make four labels: Act, Reply, Read, Archive.',
      'Add plain filters for the obvious first: newsletters → Read, receipts and notifications → Archive.',
      'For the rest, one automation (Zapier, Make or n8n) sends the sender, subject and first lines to an AI model with one instruction: answer with exactly one of the four labels.',
      'It applies the label. It never sends, replies or deletes.',
    ], check: 'Skim the Archive label once a day (under a minute).', sys: 'Inbox Triage'},
    meetings: {trigger: 'The meeting transcript is ready (built into Meet, Teams and Zoom on most paid plans).', steps: [
      'An automation picks up the new transcript.',
      'A saved prompt pulls out: decisions, tasks (owner + deadline), open questions.',
      'It creates the tasks in your task tool and saves a follow-up email as a draft.',
    ], check: 'Read the draft before you send it. Only record with everyone’s consent.', sys: 'Meeting Aftermath'},
    status: {trigger: 'A calendar reminder every Friday at 3 PM.', steps: [
      'Save your update format once: Done / Next / Blocked.',
      'An automation collects this week’s closed tickets, finished tasks and calendar events.',
      'AI fills your format from that list only, and saves it as a draft.',
    ], check: 'You edit and send it. It drafts; you decide what your manager reads.', sys: 'Status Update Autopilot'},
    scheduling: {trigger: 'Someone asks “when are you free?”', steps: [
      'Turn on a booking page (Google Calendar appointment schedules, Outlook Bookings, Cal.com or Calendly).',
      'Set buffers, a daily meeting limit and the hours you protect.',
      'Save one reply: “Grab any slot that suits you here: [link]”.',
    ], check: 'Glance at tomorrow’s calendar at the end of the day.'},
    copydata: {trigger: 'The thing that creates the data: a form, a new row, a new deal.', steps: [
      'Write down which field goes where (A → B), once.',
      'Build one automation that copies those fields when the trigger fires.',
      'Add a “synced at” column, and have errors emailed to you.',
    ], check: 'Spot-check three rows once a week.'},
    report: {trigger: 'A schedule (e.g. every Monday 7 AM).', steps: [
      'Turn this week’s report into a template with blanks for the numbers.',
      'Point it at the source: a “raw data” tab you paste the export into, or a direct connection.',
      'Formulas or an automation fill the template and send the finished file where it goes.',
    ], check: 'Compare two numbers against the source before it goes out.'},
    sameqs: {trigger: 'The same question arrives again.', steps: [
      'Paste your last 20 answers into one doc: that’s your FAQ.',
      'Save the top five as text snippets / saved replies.',
      'For the rest, AI drafts an answer from the FAQ doc only, and says so when the answer isn’t in there.',
    ], check: 'You read before sending. Add every new answer to the doc.'},
    files: {trigger: 'A file lands in Downloads or an email attachment arrives.', steps: [
      'Pick one naming rule: YYYY-MM-DD_client_what.',
      'An automation (or a mail rule + cloud-folder rule) saves attachments from known senders to the right folder, renamed.',
      'Everything else goes to one “To file” folder.',
    ], check: 'Empty “To file” on Fridays.'},
    ghost: {del: 'Send one line: “I’m pausing the weekly [report]. If you use it, tell me and I’ll bring it back.” Then wait a month.'},
    standup: {trigger: 'Every weekday at 9 AM.', steps: [
      'A script or automation pulls yesterday’s commits, merged PRs and ticket moves.',
      'AI turns them into Yesterday / Today / Blockers.',
      'It sends the draft to you (Slack DM or email), not to the channel.',
    ], check: 'Edit and post (30 seconds).'},
    prs: {trigger: 'A pull request is opened.', steps: [
      'Check if your code host already writes AI PR summaries. If it does, switch it on and stop here.',
      'If not, a CI job sends the diff and the linked ticket to AI with your PR template.',
      'It fills in the description; it doesn’t touch the code.',
    ], check: 'You and the reviewer read it during review anyway.'},
    triage: {trigger: 'A new issue is opened.', steps: [
      'Use an issue form with required fields (steps, expected, actual, version).',
      'An automation labels area and severity with a classifier prompt, and asks the reporter for anything missing.',
      'Route by label to the right owner.',
    ], check: 'Skim the day’s labels once (under a minute).'},
    docs: {trigger: 'A change is merged.', steps: [
      'A CI job sends the diff and the affected doc pages to AI.',
      'It opens a docs PR with the suggested edits.',
    ], check: 'You review the docs PR like any other.'},
    deps: {trigger: 'A weekly schedule.', steps: [
      'Turn on Dependabot or Renovate.',
      'Group updates into one weekly PR.',
      'Auto-merge patch updates only when the tests pass.',
    ], check: 'CI is the check. Read the changelogs on major versions.'},
    leads: {trigger: 'A form fill, or a deal moving to a new CRM stage.', steps: [
      'Write 2–3 follow-up emails once, with name/company fields.',
      'Set up a sequence in your CRM (or an automation + your email) that stops the moment they reply.',
    ], check: 'Read every reply yourself.'},
    metrics: {trigger: 'Every Monday morning.', steps: [
      'Make a template with the 5–8 numbers you actually use.',
      'Connect the sources (payments, analytics, a sheet) or paste one export into a raw tab.',
      'An automation fills the template and posts it to the team channel or your inbox.',
    ], check: 'Compare one number with the dashboard.'},
    support: {trigger: 'A support question arrives.', steps: [
      'Collect your answers into help docs / an FAQ.',
      'AI drafts a reply from the docs only and links the page it used.',
      'Every new answer you write goes back into the docs.',
    ], check: 'A human approves every reply at first. Only automate the replies that never need edits.'},
    clientupd: {trigger: 'Every Friday afternoon.', steps: [
      'Save one update format: Done / Next / What I need from you.',
      'An automation pulls each client’s tracked time and finished tasks.',
      'AI drafts one email per client from that list only.',
    ], check: 'You edit and send. Clients read tone; you own it.', sys: 'Status Update Autopilot'},
    invoicing: {trigger: 'Every Friday.', steps: [
      'Track time in a tool that can invoice (Toggl, Clockify, Harvest) or connect it to your invoicing tool.',
      'It turns each client’s billable hours into a draft invoice.',
      'You approve; it sends.',
    ], check: 'Compare each total with what you expected (under a minute).', sys: 'Admin Autopilot'},
    chasing: {trigger: 'An invoice is due or overdue.', steps: [
      'Turn on automatic payment reminders in your invoicing tool (most have them).',
      'Set three: 3 days before due, on the due date, 7 days after.',
    ], check: 'None. You only step in if the third reminder fails.', sys: 'Admin Autopilot'},
    screening: {trigger: 'A new alert email (Google Scholar, journal contents, arXiv).', steps: [
      'Write your research focus in three sentences.',
      'An automation pulls titles and abstracts from the alerts.',
      'AI sorts them into Must read / Maybe / Skip against your focus, with one line on why.',
      'You get one digest instead of ten alerts.',
    ], check: 'Skim the Skip titles (under a minute). It sorts; it never discards.'},
    papernotes: {trigger: 'You drop a PDF into a folder.', steps: [
      'Save one note template: question, method, finding, limits.',
      'AI fills it and has to give a page number for every claim.',
      'The note lands next to the PDF.',
    ], check: 'Check the page numbers for the claims you’ll cite.', sys: 'Lit Notes Pipeline'},
    refs: {trigger: 'You cite something.', steps: [
      'Put every source in a reference manager (Zotero is free).',
      'Insert citations with its Word / Google Docs plugin in your required style, so you never type one by hand again.',
      'Before submitting, run the reference list through the Ghost Citation Checker.',
    ], check: 'The checker flags anything that doesn’t exist or was retracted.', vault: 'check'},
    supervisor: {trigger: 'A reminder the day before your meeting.', steps: [
      'Save one format: what I did, what I found, where I’m stuck, what I need.',
      'AI drafts it from your week’s notes and commits only.',
    ], check: 'You edit and send.', sys: 'Status Update Autopilot'},
    cleaning: {trigger: 'A new data file arrives.', steps: [
      'Next time you clean it, write the steps as a script (Python/R) or Power Query instead of by hand.',
      'Add checks that fail loudly: row counts, allowed ranges, no empty IDs.',
      'Rerun the script on every new file.',
    ], check: 'The checks do it. Read the output only when one fails.'},
  };
  const GENERIC = {trigger: 'Name the one event that always starts it: an email, a file, a form, a time.', steps: [
    'Write the steps you do by hand, in order, once.',
    'Build one automation (Zapier, Make or n8n) that starts on that trigger and does the steps up to the result.',
    'Have it send the result to you as a draft, not straight to anyone else.',
  ], check: 'You look at each result for under a minute (question 3). If that stops being true, stop automating it.'};

  // ---- state -------------------------------------------------------------------------------
  const KEY = 'vault.receipt.v1';
  let state = {role: null, rows: [], step: 'intro', no: Math.floor(1000 + Math.random() * 9000)};
  try { const saved = JSON.parse(Vault.store.get(KEY) || 'null'); if (saved?.rows) state = {...state, ...saved}; } catch { /* ignore */ }
  const save = () => Vault.store.set(KEY, JSON.stringify(state));
  let uid = Date.now();
  const fromKey = (key) => {
    const t = TASKS[key];
    return {id: ++uid, key, name: t.name, runs: t.runs, mins: t.mins, on: false, a: t.a.map(Boolean), open: false};
  };
  const custom = () => ({id: ++uid, key: null, name: '', runs: 1, mins: 30, on: true, a: [null, null, null], open: true});

  // ---- maths (same rules as the Leverage Audit) ----------------------------------------------
  const answered = (r) => r.a[0] === false || (r.a[0] === true && r.a[1] !== null && r.a[2] !== null);
  const counted = (r) => r.on && r.name.trim() && r.mins > 0 && answered(r);
  const verdict = (r) => {
    const [notice, same, check] = r.a;
    if (notice === false) return 'delete';
    const weekly = r.runs >= 1;
    if (weekly && same && check) return 'machine';
    if (weekly && check && !same) return 'pipe';
    if (!weekly && same && check) return 'rare';
    return 'human';
  };
  const V = {
    machine: ['Machine', 's-machine', 'Passes all three questions. A human shouldn’t be doing it.'],
    pipe: ['Pipe it', 's-pipe', 'The input changes each time, but checking is quick: AI drafts from a saved template, you check.'],
    delete: ['Delete', 's-delete', 'Nobody would notice. Stop doing it.'],
    human: ['Human', 's-human', 'Keep it. It needs you.'],
    rare: ['Too rare', 's-rare', 'Fits a machine, but it doesn’t happen often enough to be worth building.'],
  };
  const weeklyMin = (r) => r.runs * r.mins;
  const savedWeeklyMin = (r) => r.runs * Math.max(r.mins - CHECK_MIN, 0);
  const buildH = (r) => (r.key && TASKS[r.key].build) || 4;
  const paybackWeeks = (r) => { const s = savedWeeklyMin(r); return s > 0 ? (buildH(r) * 60) / s : Infinity; };
  const h = (min) => { const x = min / 60; return x >= 10 ? Math.round(x).toString() : (Math.round(x * 10) / 10).toString(); };
  const weeksText = (w) => (w === Infinity ? 'never' : w < 1 ? 'under a week' : `${Math.ceil(w)} week${Math.ceil(w) === 1 ? '' : 's'}`);
  const buildText = (hrs) => (hrs < 1 ? `${Math.round(hrs * 60)} min` : `${hrs} h`);

  const summary = () => {
    const rows = state.rows.filter(counted);
    const by = (v) => rows.filter((r) => verdict(r) === v);
    const machine = by('machine').sort((x, y) => paybackWeeks(x) - paybackWeeks(y) || savedWeeklyMin(y) - savedWeeklyMin(x));
    const del = by('delete');
    const machineMin = machine.reduce((s, r) => s + savedWeeklyMin(r), 0);
    const deleteMin = del.reduce((s, r) => s + weeklyMin(r), 0);
    const totalMin = rows.reduce((s, r) => s + weeklyMin(r), 0);
    return {
      rows, machine, del,
      pipe: by('pipe').sort((x, y) => weeklyMin(y) - weeklyMin(x)),
      pipeMin: by('pipe').reduce((s, r) => s + weeklyMin(r), 0),
      machineMin, deleteMin, totalMin,
      busyMin: machineMin + deleteMin,
    };
  };


  // ---- links back to the System Vault (config.js → vaultUrl; empty = hidden) --------------------
  const vaultHref = (path) => {
    const base = (Vault.cfg.vaultUrl || '').replace(/\/$/, '');
    if (!base) return '';
    return `${/^https?:\/\//.test(base) ? base : `https://${base}`}/${path}`;
  };
  const wireVaultLinks = () => {
    for (const a of document.querySelectorAll('[data-vault]')) {
      const href = vaultHref(a.dataset.vault);
      if (href) a.setAttribute('href', href); else a.removeAttribute('href');
    }
    for (const el of document.querySelectorAll('[data-vault-only]')) el.hidden = !vaultHref('');
  };

  // ---- receipt helpers -------------------------------------------------------------------------
  const weekOf = () => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
    return d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}).toUpperCase();
  };
  const ORDER = ['machine', 'delete', 'pipe', 'human', 'rare'];
  const receiptRows = (s) => [...s.rows].sort((x, y) => ORDER.indexOf(verdict(x)) - ORDER.indexOf(verdict(y)) || weeklyMin(y) - weeklyMin(x));
  const lineHours = (r) => (verdict(r) === 'machine' ? savedWeeklyMin(r) : weeklyMin(r));
  const workWeeks = (min) => Math.round(((min / 60) * WEEKS_PER_YEAR / WORK_WEEK_H) * 10) / 10;
  const perYear = (min) => Math.round((min / 60) * WEEKS_PER_YEAR);
  const gain = (r) => {
    const v = verdict(r);
    return v === 'machine' ? `saves ${h(savedWeeklyMin(r))} h/week` : v === 'delete' ? `frees ${h(weeklyMin(r))} h/week` : 'AI drafts, you check';
  };

  const planHtml = (r) => {
    const p = (r.key && PLANS[r.key]) || GENERIC;
    const v = verdict(r);
    if (v === 'delete') {
      return `<div class="recipe"><h4>${esc(r.name)} <span class="stamp s-delete">Delete</span></h4>
        <p class="small muted">Frees ${h(weeklyMin(r))} h/week · 0 min setup</p>
        <dl><dt>Do this</dt><dd>${p.del ? esc(p.del) : 'Tell whoever it’s for that you’re pausing it, and ask them to say if they miss it. Then wait a month.'}</dd></dl></div>`;
    }
    const href = p.vault && vaultHref(VAULT[p.vault].path);
    const link = p.vault ? (href ? `<a href="${href}">${esc(VAULT[p.vault].name)}</a>` : `the ${esc(VAULT[p.vault].name)} in the System Vault`) : '';
    return `<div class="recipe">
      <h4>${esc(r.name)} <span class="stamp ${V[v][1]}">${V[v][0]}</span></h4>
      <p class="small muted">${v === 'machine' ? `Saves ${h(savedWeeklyMin(r))} h/week · setup ~${buildText(buildH(r))} (a guess) · pays back in ${weeksText(paybackWeeks(r))}` : `AI drafts, you check. ${h(weeklyMin(r))} h/week today.`}</p>
      <dl>
        <dt>Trigger</dt><dd>${esc(p.trigger)}</dd>
        <dt>Steps</dt><dd><ol>${p.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></dd>
        <dt>Check</dt><dd>${esc(p.check)}</dd>
        ${link || p.sys ? `<dt>More</dt><dd>${[link && `${link} (free, live now)`, p.sys && `${esc(p.sys)}: a full ready-made version is coming to the Vault`].filter(Boolean).join('<br>')}</dd>` : ''}
      </dl></div>`;
  };

  const planMd = (s) => {
    const md = (r) => {
      const p = (r.key && PLANS[r.key]) || GENERIC;
      const v = verdict(r);
      if (v === 'delete') return [`### ${r.name} (DELETE)`, '', p.del || 'Tell whoever it’s for that you’re pausing it. Wait a month.', ''];
      return [
        `### ${r.name} (${V[v][0].toUpperCase()})`, '',
        v === 'machine' ? `Saves ${h(savedWeeklyMin(r))} h/week · setup ~${buildText(buildH(r))} · pays back in ${weeksText(paybackWeeks(r))}` : `AI drafts, you check. ${h(weeklyMin(r))} h/week today.`, '',
        `- **Trigger:** ${p.trigger}`,
        ...p.steps.map((x, i) => `${i + 1}. ${x}`),
        `- **Check:** ${p.check}`, '',
      ];
    };
    return [
      '# My Time Receipt plan', '',
      `Time Receipt (System #001) by ${Vault.cfg.handle || '@null_grind'} · week of ${weekOf()}`, '',
      `- Busywork: **${h(s.busyMin)} h/week** (${perYear(s.busyMin)} h/year)`,
      `- Machine work: ${h(s.machineMin)} h/week · Could delete: ${h(s.deleteMin)} h/week · AI could draft: ${h(s.pipeMin)} h/week`, '',
      '## Plan, fastest payback first', '',
      ...kills(s).flatMap(md),
      '## Rules', '',
      '- One at a time. Run each for two weeks before the next.',
      '- Automations draft; you send. Never let one reply, pay or delete on its own at first.',
      '- If it needs more upkeep than it saves, delete it.',
      '- Setup times are rough guesses. Check your company’s rules before connecting work accounts or AI tools.', '',
      `More systems: ${vaultHref('') || 'the System Vault'}`, '',
    ].join('\n');
  };
  const downloadPlan = () => Vault.download('my-time-receipt-plan.md', planMd(summary()));

  // The plan, in order: kill #1 is the fastest payback (free), the rest follow.
  const kills = (s = summary()) => {
    const first = s.machine[0] || s.del[0] || s.pipe[0];
    return first ? [first, ...[...s.machine, ...s.pipe, ...s.del].filter((r) => r !== first)] : [];
  };

  // ---- motion helpers ------------------------------------------------------------------------
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2, .8, .2, 1)';
  const rise = (els, {delay = 80, step = 45, y = 14, max = 10} = {}) => {
    if (calm()) return;
    [...els].forEach((e, i) => e.animate(
      [{opacity: 0, transform: `translateY(${y}px)`}, {opacity: 1, transform: 'none'}],
      {duration: 420, delay: delay + Math.min(i, max) * step, easing: EASE, fill: 'backwards'}));
  };
  const pop = (e, delay = 0) => {
    if (calm() || !e) return;
    e.animate([
      {opacity: 0, transform: 'scale(.5) rotate(-6deg)'},
      {opacity: 1, transform: 'scale(1.12) rotate(2deg)', offset: 0.6},
      {opacity: 1, transform: 'none'},
    ], {duration: 380, delay, easing: EASE, fill: 'backwards'});
  };
  // Numbers count up to their value (e.g. "9.5 h"). Keeps the text as-is under reduced motion.
  const countUp = (el, toMin, fmt, {from = 0, dur = 900, delay = 0} = {}) => {
    if (!el) return;
    el.textContent = fmt(toMin);
    if (calm() || toMin === from) return;
    const t0 = performance.now() + delay;
    const tick = (t) => {
      const k = Math.min(Math.max((t - t0) / dur, 0), 1);
      el.textContent = fmt(from + (toMin - from) * (1 - (1 - k) ** 3));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  // ---- screens ------------------------------------------------------------------------------
  const stage = $('#stage');
  const locked = () => !document.body.classList.contains('is-unlocked');
  const flow = () => {
    const out = ['intro', 'role', 'tasks', 'receipt'];
    const k = kills();
    k.forEach((_, i) => {
      if (i === 1 && locked()) out.push('gate');
      out.push(`kill:${i}`);
    });
    if (k.length) out.push('done');
    return out;
  };
  const make = (cls, html) => {
    const el = document.createElement('section');
    el.className = `screen scr-${cls}`; // prefixed: .receipt etc. are content classes
    el.innerHTML = html;
    return el;
  };
  const on = (el, sel, fn) => { for (const x of el.querySelectorAll(sel)) x.addEventListener('click', fn); };

  const SCREENS = {
    intro() {
      const to = state.step; // read now: opening the intro overwrites state.step
      const resume = state.rows.some((r) => r.on) && to && to !== 'intro' && to !== 'role';
      const el = make('intro', `
        <div class="screen-body center">
          <div class="mini" aria-hidden="true">
            <div class="mini-slot"></div>
            <div class="mini-wrap"><div class="mini-paper"><i></i><i></i><i class="s"></i><i></i><b>?? h</b></div></div>
          </div>
          <div><span class="chip"><span class="sys-no">System #001</span></span></div>
          <h1><span class="w">The</span> <span class="w hl">Time</span> <span class="w">Receipt</span></h1>
          <p class="lead">Tick what fills your week. See every hour you're spending on work a machine should do, and the first task to kill.</p>
          <div class="meta-row"><span class="chip">2 minutes</span><span class="chip">No typing</span><span class="chip">Private</span></div>
        </div>
        <div class="screen-foot">
          <button class="btn block big pulse" type="button" data-start>Start my receipt →</button>
          ${resume ? '<p class="foot-note"><button class="linkish" type="button" data-resume>Continue where I left off</button></p>' : ''}
        </div>`);
      on(el, '[data-start]', () => go('role'));
      on(el, '[data-resume]', () => go(flow().includes(to) ? to : 'tasks', 1));
      el.enter = () => {
        if (calm()) return;
        const paper = $('.mini-paper', el);
        paper.animate([{transform: 'translateY(-100%)'}, {transform: 'none'}], {duration: 1100, delay: 250, easing: 'steps(9, end)', fill: 'backwards'});
        [...el.querySelectorAll('.mini-paper i')].forEach((i, k) => i.animate([{transform: 'scaleX(0)'}, {transform: 'none'}], {duration: 380, delay: 700 + k * 110, easing: EASE, fill: 'backwards'}));
        pop($('.mini-paper b', el), 1250);
        rise(el.querySelectorAll('.chip'), {delay: 350, step: 60});
        rise(el.querySelectorAll('h1 .w'), {delay: 450, step: 90, y: 26});
        rise([$('.lead', el), $('.meta-row', el)], {delay: 800, step: 100});
        rise([$('.screen-foot', el)], {delay: 1100, y: 20});
        pop($('.appbar .logo-mark'), 150);
      };
      return el;
    },

    role() {
      const el = make('role', `
        <div class="screen-body">
          <p class="kicker">Step 1 of 3</p>
          <h2>What best describes your week?</h2>
          <p class="small muted">This picks the tasks to show you. You can add your own next.</p>
          <div class="roles-pick" role="group" aria-label="Your role">
            ${Object.entries(ROLES).map(([id, r]) => `<button type="button" data-role="${id}" aria-pressed="${state.role === id}"><span class="tick" aria-hidden="true">✓</span>${esc(r.label)}<small>${esc(r.hint)}</small></button>`).join('')}
          </div>
        </div>`);
      let armed = false;
      on(el, '[data-role]', (e) => {
        const b = e.currentTarget;
        const id = b.dataset.role;
        const changing = state.role !== id;
        if (changing && state.rows.some((x) => x.on)) {
          // Switching would wipe their ticks; ask inline instead of a blocking dialog.
          if (!armed) {
            armed = true;
            Vault.toast('That clears your ticks. Tap again to switch.');
            setTimeout(() => { armed = false; }, 3000);
            return;
          }
        }
        state.role = id;
        if (changing) {
          state.rows = ROLES[id].tasks.map(fromKey);
          if (id === 'other') state.rows.push(custom());
        }
        save();
        for (const x of el.querySelectorAll('[data-role]')) x.setAttribute('aria-pressed', x === b);
        pop($('.tick', b));
        setTimeout(() => go('tasks'), calm() ? 0 : 320);
      });
      el.enter = () => { rise(el.querySelectorAll('.kicker, h2, .small')); rise(el.querySelectorAll('[data-role]'), {delay: 200, step: 55}); };
      return el;
    },

    tasks() {
      const role = ROLES[state.role] || ROLES.other;
      const el = make('tasks', `
        <div class="screen-body">
          <p class="kicker">Step 2 of 3 · ${esc(role.label)}</p>
          <h2>Tick what you do most weeks</h2>
          <p class="small muted">Times are rough guesses: change them to match your week. Tap “Why?” to see the 3 questions behind each stamp.</p>
          <div class="rows"></div>
          <button class="btn ghost small" type="button" data-add>+ Add my own task</button>
        </div>
        <div class="screen-foot dark">
          <span class="tally" aria-live="polite"></span>
          <button class="btn" type="button" data-print>Print my receipt</button>
        </div>`);
      const rowsBox = $('.rows', el);
      let shown = 0;
      const tally = () => {
        const s = summary();
        const n = state.rows.filter((r) => r.on).length;
        const t = $('.tally', el);
        if (!n) { t.textContent = 'Tick at least one task'; shown = 0; } else {
          t.innerHTML = `<b></b>/week of busywork<br>${n} task${n === 1 ? '' : 's'} ticked`;
          countUp($('b', t), s.busyMin, (m) => `${h(m)} h`, {from: shown, dur: 450});
          shown = s.busyMin;
        }
        $('[data-print]', el).disabled = !s.rows.length;
        $('[data-add]', el).hidden = state.rows.filter((r) => !r.key).length >= 5;
      };
      rowsBox.append(...state.rows.map((r) => rowEl(r, tally)));
      on(el, '[data-add]', () => {
        const r = custom();
        state.rows.push(r);
        const rEl = rowEl(r, tally);
        rowsBox.append(rEl);
        rise([rEl], {delay: 0});
        $('input', rEl)?.focus();
        save(); tally();
      });
      on(el, '[data-print]', () => go('receipt'));
      tally();
      el.enter = () => { rise(el.querySelectorAll('.kicker, h2, .small')); rise(el.querySelectorAll('.row'), {delay: 180, step: 40}); };
      return el;
    },

    receipt() {
      const s = summary();
      const first = kills(s)[0];
      const pct = s.totalMin ? Math.round((s.busyMin / s.totalMin) * 100) : 0;
      const top = s.machine[0];
      const el = make('receipt', `
        <div class="screen-body">
          <div class="printer">
            <div class="slot" aria-hidden="true"></div>
            <div class="paper-wrap"><div class="receipt">
              <div class="r-c">
                <div class="r-brand">${esc(Vault.cfg.handle || '@null_grind')}</div>
                <div class="r-title">TIME RECEIPT</div>
                <div class="r-dim">WEEK OF ${weekOf()} · NO. ${state.no}</div>
                <div class="r-dim">${esc((ROLES[state.role] || ROLES.other).label.toUpperCase())}</div>
              </div>
              <div class="r-rule"></div>
              ${receiptRows(s).map((r) => `<div class="r-row"><span class="n">${esc(r.name)}</span><span class="h">${h(lineHours(r))} h</span><span class="v ${verdict(r)}">${V[verdict(r)][0].toUpperCase()}</span></div>`).join('')}
              <div class="r-rule"></div>
              <div class="r-sum"><span>MACHINE WORK</span><span>${h(s.machineMin)} h</span></div>
              <div class="r-sum"><span>COULD JUST DELETE</span><span>${h(s.deleteMin)} h</span></div>
              ${s.pipe.length ? `<div class="r-sum r-dim"><span>AI COULD DRAFT (not counted)</span><span>${h(s.pipeMin)} h</span></div>` : ''}
              <div class="r-rule"></div>
              <div class="r-sum r-total"><span>BUSYWORK / WEEK</span><span data-total>${h(s.busyMin)} h</span></div>
              <div class="r-sum"><span>PER YEAR</span><span data-year>${perYear(s.busyMin)} h</span></div>
              <div class="r-sum"><span>= WORK WEEKS</span><span>${workWeeks(s.busyMin)}</span></div>
              <div class="r-sum r-dim"><span>SHARE OF WEEK LISTED</span><span>${pct}%</span></div>
              <div class="r-kill">${top
                ? `KILL FIRST: <b>${esc(top.name.toUpperCase())}</b><br><span class="r-dim">~${buildText(buildH(top))} setup · pays back in ${weeksText(paybackWeeks(top))}</span>`
                : s.del.length
                  ? `DELETE FIRST: <b>${esc(s.del[0].name.toUpperCase())}</b><br><span class="r-dim">0 min setup · pays back today</span>`
                  : 'NOTHING TO KILL YET.<br><span class="r-dim">Tick the dull tasks you skipped. That’s where the hours hide.</span>'}</div>
              <div class="barcode" aria-hidden="true"></div>
              <div class="r-c r-thanks">THANK YOU FOR GRINDING.<br>PLEASE STOP.</div>
            </div></div>
          </div>
        </div>
        <div class="screen-foot">
          <div class="pair">
            <button class="btn ghost" type="button" data-share>Share</button>
            ${first ? '<button class="btn" type="button" data-next>Kill #1 →</button>' : '<button class="btn" type="button" data-back>Add tasks</button>'}
          </div>
          ${first ? `<p class="foot-note">Up next: <b>${esc(first.name)}</b>, the step-by-step plan</p>` : ''}
        </div>`);
      on(el, '[data-share]', share);
      on(el, '[data-next]', next);
      on(el, '[data-back]', () => go('tasks', -1));
      el.enter = () => {
        const FEED = 1500;
        if (!calm()) $('.receipt', el).animate([{transform: 'translateY(-100%)'}, {transform: 'none'}], {duration: FEED, delay: 150, easing: 'steps(16, end)', fill: 'backwards'});
        countUp($('[data-total]', el), s.busyMin, (m) => `${h(m)} h`, {delay: FEED, dur: 800});
        countUp($('[data-year]', el), s.busyMin, (m) => `${perYear(m)} h`, {delay: FEED, dur: 800});
        pop($('.r-kill', el), FEED + 700);
        rise([$('.screen-foot', el)], {delay: FEED + 300});
      };
      return el;
    },

    kill(i) {
      const list = kills();
      const r = list[i];
      const n = list.length;
      const nxt = list[i + 1];
      const el = make('kill', `
        <div class="screen-body">
          <div class="kill-top">
            <span class="slide-no">#${i + 1}</span>
            <p class="kicker">${i === 0 ? 'Your first kill · free' : `Kill ${i + 1} of ${n}`}</p>
          </div>
          ${planHtml(r)}
          ${i === 0 ? '<p class="tip">Set this one up this week. Run it for two weeks, then do the next one.</p>' : ''}
        </div>
        <div class="screen-foot">
          <button class="btn block" type="button" data-next>${nxt ? `Next kill: #${i + 2} →` : 'Finish my plan →'}</button>
          ${nxt ? `<p class="foot-note">Up next: <b>${esc(nxt.name)}</b> · ${gain(nxt)}</p>` : `<p class="foot-note">That's all ${n}. One screen left.</p>`}
        </div>`);
      on(el, '[data-next]', next);
      el.enter = () => {
        pop($('.slide-no', el), 120);
        rise(el.querySelectorAll('.kicker, .recipe h4, .recipe > p, .recipe dt, .recipe dd, .tip'), {delay: 220, step: 50, max: 12});
      };
      return el;
    },

    gate() {
      const n = kills().length;
      const el = make('gate', `
        <div class="screen-body center">
          <div><span class="slide-no">#2–#${n}</span></div>
          <h2 style="margin-top:22px">Unlock the rest of your kills</h2>
          <p>${n - 1} more step-by-step plans, in the order that pays you back fastest, plus a copy to keep.</p>
          <div data-slot></div>
        </div>
        <div class="screen-foot"><p class="foot-note" style="margin:0"><button class="linkish" type="button" data-skip>Not now</button></p></div>`);
      $('[data-slot]', el).append($('#gate'));
      on(el, '[data-skip]', () => go('done'));
      el.enter = () => { pop($('.slide-no', el), 100); rise(el.querySelectorAll('h2, p, .gate'), {delay: 220}); };
      return el;
    },

    done() {
      const s = summary();
      const n = kills(s).length;
      const el = make('done', `
        <div class="screen-body center">
          <p class="kicker">${n} kill${n === 1 ? '' : 's'} · your whole plan</p>
          <div><span class="big-stat" data-back-h>${h(s.busyMin)} h</span></div>
          <p style="font-weight:800; margin-top:14px">a week back when you're done.</p>
          <p class="small muted">Kill one at a time. Run each for two weeks before the next. If one needs more upkeep than it saves, delete it.</p>
        </div>
        <div class="screen-foot">
          <button class="btn alt block" type="button" data-dl>⬇ Download my plan (.md)</button>
          <div class="pair" style="margin-top:10px">
            <button class="btn ghost small" type="button" data-share>Share my receipt</button>
            ${vaultHref('') ? `<a class="btn ghost small" href="${vaultHref('')}">More free systems</a>` : '<button class="btn ghost small" type="button" data-restart>Start over</button>'}
          </div>
        </div>`);
      on(el, '[data-dl]', downloadPlan);
      on(el, '[data-restart]', () => go('role', -1));
      on(el, '[data-share]', share);
      el.enter = () => {
        pop($('.big-stat', el), 150);
        countUp($('[data-back-h]', el), s.busyMin, (m) => `${h(m)} h`, {delay: 150, dur: 900});
        rise(el.querySelectorAll('.kicker, p'), {delay: 300});
      };
      return el;
    },
  };

  // ---- one task row (tick, times, the 3 questions) ----------------------------------------------
  const yn = (r, i, label) => `
    <div class="q"><span>${label}</span>
      <span class="yn" role="group" aria-label="${esc(label)}">
        <button type="button" data-a="${i}" data-v="1" aria-pressed="${r.a[i] === true}">Yes</button>
        <button type="button" data-a="${i}" data-v="0" aria-pressed="${r.a[i] === false}">No</button>
      </span></div>`;
  const stampHtml = (r) => (answered(r)
    ? `<span class="stamp ${V[verdict(r)][1]}">${V[verdict(r)][0]}</span>`
    : '<span class="stamp s-pending">3 Qs ↓</span>');

  const rowEl = (r, changed) => {
    const el = document.createElement('div');
    const fill = (popStamp) => {
      el.className = `row${r.on ? ' on' : ''}`;
      const nameHtml = r.key
        ? `<span class="row-name">${esc(r.name)}</span>`
        : `<span class="row-name"><label class="sr-only" for="n${r.id}">Task name</label><input id="n${r.id}" value="${esc(r.name)}" placeholder="Name a task you repeat" maxlength="60"></span>`;
      el.innerHTML = `
        <div class="row-main">
          ${r.key ? `<input type="checkbox" ${r.on ? 'checked' : ''} aria-label="${esc(r.name)}">` : '<button class="rm" type="button" aria-label="Remove task">×</button>'}
          ${nameHtml}
          ${r.on ? stampHtml(r) : ''}
        </div>
        <div class="row-more">
          <div class="nums">
            <select data-f="runs" aria-label="How often">${FREQ.map(([l, v]) => `<option value="${v}" ${v === r.runs ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <span>×</span>
            <input data-f="mins" type="number" inputmode="numeric" min="1" max="600" value="${r.mins}" aria-label="Minutes each time">
            <span>min = <span class="per">${h(weeklyMin(r))} h/week</span></span>
          </div>
          <button class="why-btn" type="button" aria-expanded="${r.open}">${r.open ? 'Hide the 3 questions' : `Why ${answered(r) ? V[verdict(r)][0].toUpperCase() : 'this'}? Change the answers`}</button>
          ${r.open ? `<div class="why">
            ${answered(r) ? `<p class="note">${V[verdict(r)][2]}</p>` : '<p class="note">Answer these to get a stamp.</p>'}
            ${r.key ? '<p class="note">These are the usual answers. Change them if your version is different.</p>' : ''}
            ${yn(r, 0, 'If you stopped, would anyone notice within a month?')}
            ${r.a[0] === false ? '' : `
              <div class="q auto"><span>Does it happen every week?</span><b>${r.runs >= 1 ? 'Yes' : 'No'}</b></div>
              ${yn(r, 1, 'Does it start the same way every time (an email, a file, a form)?')}
              ${yn(r, 2, 'If a machine got it wrong, would you catch it in under a minute?')}`}
          </div>` : ''}
        </div>`;
      if (popStamp) pop($('.row-main .stamp', el));
      const update = (stamp) => { save(); fill(stamp); changed(); };
      const toggle = () => { r.on = !r.on; update(r.on); if (r.on) rise([$('.row-more', el)], {delay: 0, y: -6}); };
      $('input[type=checkbox]', el)?.addEventListener('change', toggle);
      $('.row-name', el).addEventListener('click', (e) => { if (r.key && e.target.tagName !== 'INPUT') toggle(); });
      const nameIn = $('.row-name input', el);
      if (nameIn) nameIn.addEventListener('input', () => { r.name = nameIn.value; save(); changed(); });
      $('.rm', el)?.addEventListener('click', () => { state.rows = state.rows.filter((x) => x !== r); el.remove(); save(); changed(); });
      $('[data-f=runs]', el).addEventListener('change', (e) => { const was = verdict(r); r.runs = +e.target.value; update(verdict(r) !== was); });
      $('[data-f=mins]', el).addEventListener('change', (e) => { r.mins = Math.min(Math.max(Math.round(+e.target.value) || 0, 0), 600); update(false); });
      $('.why-btn', el).addEventListener('click', () => { r.open = !r.open; save(); fill(false); if (r.open) rise(el.querySelectorAll('.why > *'), {delay: 0, step: 30, y: 6}); });
      for (const b of el.querySelectorAll('.yn button')) {
        b.addEventListener('click', () => { const was = answered(r) && verdict(r); r.a[+b.dataset.a] = b.dataset.v === '1'; update(answered(r) && verdict(r) !== was); });
      }
    };
    fill(false);
    return el;
  };

  // ---- navigation --------------------------------------------------------------------------
  let current = null;
  const LABEL_ORDER = (name) => flow().indexOf(name);
  const build = (name) => (name.startsWith('kill:') ? SCREENS.kill(+name.slice(5)) : SCREENS[name]());
  const go = (name, dir) => {
    const f = flow();
    if (!f.includes(name)) name = 'intro';
    if (dir === undefined) dir = current && LABEL_ORDER(name) < LABEL_ORDER(current.name) ? -1 : 1;
    const el = build(name);
    const old = current?.el;
    current = {name, el};
    state.step = name;
    save();
    stage.append(el);
    const dx = calm() ? 0 : 40;
    if (old) {
      old.inert = true;
      old.style.zIndex = 0;
      el.style.zIndex = 1;
      const out = old.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: `translateX(${-dx * dir}px)`}],
        {duration: calm() ? 1 : 220, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards'});
      out.onfinish = () => {
        const g = old.querySelector('#gate');
        if (g) $('#gate-home').append(g); // the gate form goes home so the next gate screen can borrow it
        old.remove();
      };
      if (!calm()) el.animate([{opacity: 0, transform: `translateX(${dx * dir}px)`}, {opacity: 1, transform: 'none'}], {duration: 360, delay: 80, easing: EASE, fill: 'backwards'});
    }
    el.enter?.();
    $('#back').classList.toggle('gone', name === 'intro');
    $('#progress').style.width = `${progressOf(name)}%`;
    $('.screen-body', el).scrollTop = 0;
  };
  // Fixed checkpoints so the bar never jumps back when ticking adds kill screens.
  const progressOf = (name) => {
    const fixed = {intro: 0, role: 15, tasks: 35, receipt: 55, done: 100};
    if (name in fixed) return fixed[name];
    const n = kills().length;
    const at = name === 'gate' ? 1.5 : +name.slice(5) + 1;
    return 55 + (40 * at) / (n + 1);
  };
  const next = () => { const f = flow(); const i = f.indexOf(current.name); if (i < f.length - 1) go(f[i + 1], 1); };
  const back = () => { const f = flow(); const i = f.indexOf(current.name); if (i > 0) go(f[i - 1], -1); };
  $('#back').addEventListener('click', back);

  // ---- share ---------------------------------------------------------------------------------
  const drawCard = () => {
    const s = summary();
    const c = $('#share-canvas');
    const x = c.getContext('2d');
    const MONO = 'ui-monospace, "Cascadia Mono", Consolas, "Courier New", monospace';
    const F = (w, px, fam = MONO) => `${w} ${px}px ${fam}`;
    const L = 150, R = 930, W = R - L;
    x.fillStyle = '#00D2FF'; x.fillRect(0, 0, 1080, 1920);

    const rows = receiptRows(s);
    const shown = rows.slice(0, 9);
    const top = 170;
    const bottom = top + 330 + shown.length * 52 + (rows.length > shown.length ? 52 : 0) + 520;

    // paper with a zig-zag tear
    const paper = (fill) => {
      x.fillStyle = fill;
      x.beginPath();
      x.moveTo(L - 50, top - 60);
      x.lineTo(R + 50, top - 60);
      x.lineTo(R + 50, bottom);
      const teeth = 22, tw = (W + 100) / teeth;
      for (let i = teeth; i > 0; i--) {
        x.lineTo(L - 50 + (i - 0.5) * tw, bottom + 20);
        x.lineTo(L - 50 + (i - 1) * tw, bottom);
      }
      x.closePath();
      x.fill();
    };
    x.fillStyle = '#1E1E1E'; x.fillRect(R + 50, top - 44, 16, bottom - top + 44); // shadow on the straight edge only
    paper('#FFFFFF');

    const ink = '#1E1E1E', dim = '#6B6B6B';
    const center = (t, y, font, color = ink) => { x.font = font; x.fillStyle = color; x.textAlign = 'center'; x.fillText(t, 540, y); x.textAlign = 'left'; };
    const lr = (a, b, y, font, color = ink) => {
      x.font = font; x.fillStyle = color; x.textAlign = 'left'; x.fillText(a, L, y);
      x.textAlign = 'right'; x.fillText(b, R, y); x.textAlign = 'left';
    };
    const rule = (y) => { x.fillStyle = ink; for (let i = L; i < R; i += 20) x.fillRect(i, y, 12, 3); };
    const fit = (t, max, font) => {
      x.font = font;
      if (x.measureText(t).width <= max) return t;
      while (t.length > 1 && x.measureText(`${t}…`).width > max) t = t.slice(0, -1);
      return `${t}…`;
    };

    let y = top;
    center(Vault.cfg.handle || '@null_grind', y, F(900, 52, 'Montserrat, system-ui, sans-serif'));
    center('T I M E   R E C E I P T', y += 60, F(700, 34));
    center(`WEEK OF ${weekOf()} · NO. ${state.no}`, y += 50, F(500, 26), dim);
    center((ROLES[state.role] || ROLES.other).label.toUpperCase(), y += 38, F(500, 26), dim);
    rule(y += 40);
    y += 30;
    for (const r of shown) {
      y += 52;
      const v = verdict(r);
      const f = F(500, 30);
      x.font = f; x.fillStyle = ink;
      x.fillText(fit(r.name, 430, f), L, y);
      x.textAlign = 'right'; x.fillText(`${h(lineHours(r))} h`, R - 190, y);
      x.font = F(800, 26);
      x.fillText(V[v][0].toUpperCase(), R, y);
      if (v === 'machine') { const tw = x.measureText('MACHINE').width; x.fillRect(R - tw, y - 9, tw, 4); }
      x.textAlign = 'left';
    }
    if (rows.length > shown.length) lr(`+ ${rows.length - shown.length} more`, '', y += 52, F(500, 28), dim);
    rule(y += 36);
    lr('MACHINE WORK', `${h(s.machineMin)} h`, y += 56, F(500, 30));
    lr('COULD JUST DELETE', `${h(s.deleteMin)} h`, y += 46, F(500, 30));
    rule(y += 30);
    y += 70;
    x.font = F(800, 40);
    const tot = `${h(s.busyMin)} h`;
    const tw = x.measureText(tot).width;
    x.fillStyle = '#00D2FF'; x.fillRect(R - tw - 16, y - 42, tw + 32, 56);
    lr('BUSYWORK / WEEK', tot, y, F(800, 40));
    lr('PER YEAR', `${perYear(s.busyMin)} h`, y += 54, F(500, 30));
    lr('= WORK WEEKS', `${workWeeks(s.busyMin)}`, y += 44, F(500, 30));
    // barcode
    y += 50;
    x.fillStyle = ink;
    let bx = L + 60;
    let seed = state.no;
    while (bx < R - 60) { seed = (seed * 9301 + 49297) % 233280; const bw = 3 + (seed % 3) * 3; x.fillRect(bx, y, bw, 80); bx += bw + 4 + (seed % 4) * 2; }
    center('THANK YOU FOR GRINDING.', y += 140, F(700, 30));
    center('PLEASE STOP.', y += 42, F(700, 30));

    // call to action under the paper
    center('Print yours free', 1760, F(900, 48, 'Montserrat, system-ui, sans-serif'));
    center(Vault.cfg.siteUrl ? Vault.siteUrl() : `comment RECEIPT on ${Vault.cfg.handle || '@null_grind'}`, 1825, F(700, 34, 'Montserrat, system-ui, sans-serif'));
  };
  const shareText = () => {
    const s = summary();
    return `My week's receipt: ${h(s.busyMin)} h of busywork a week, ${perYear(s.busyMin)} h a year. Print yours (free, 2 min)${Vault.cfg.siteUrl ? `: https://${Vault.siteUrl()}/` : ''} · by ${Vault.cfg.handle || '@null_grind'}`;
  };
  const share = async () => {
    await document.fonts?.ready;
    drawCard();
    const c = $('#share-canvas');
    // Native share sheet on phones (with the image when supported); otherwise the save/copy dialog.
    if (navigator.canShare && matchMedia('(pointer: coarse)').matches) {
      try {
        const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
        const file = new File([blob], 'my-time-receipt.png', {type: 'image/png'});
        if (navigator.canShare({files: [file]})) { await navigator.share({files: [file], text: shareText()}); return; }
      } catch (e) { if (e?.name === 'AbortError') return; /* unsupported: fall through to the dialog */ }
    }
    $('#share-dlg').showModal();
  };
  $('#dl').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = $('#share-canvas').toDataURL('image/png');
    a.download = 'my-time-receipt.png';
    a.click();
  });
  $('#copy').addEventListener('click', async () => { if (await Vault.copyText(shareText())) Vault.toast('Caption copied'); });

  // ---- dialogs -------------------------------------------------------------------------------
  $('#how-open').addEventListener('click', () => $('#how').showModal());
  for (const d of document.querySelectorAll('dialog.dlg')) {
    on(d, '[data-close]', () => d.close());
    d.addEventListener('click', (e) => { // tap the backdrop (outside the box) to close
      const r = d.getBoundingClientRect();
      if (e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) d.close();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // After a real sign-up (not the silent unlock on load), carry straight on to kill #2.
    let submitted = false;
    $('form[data-gate="receipt"]').addEventListener('submit', () => { submitted = true; }, true);
    Vault.gate('receipt', {
      toast: 'Unlocked. Here’s kill #2.',
      extra: () => ({role: state.role || ''}),
      onUnlock: () => { if (submitted && current?.name === 'gate') go('kill:1', 1); },
    });
    wireVaultLinks();
    go('intro');
  });
})();
