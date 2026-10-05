const examCatalog = {
  WAEC: {
    greeting: 'Your next good result starts with today.',
    subjects: [
      { name: 'Mathematics', topic: 'Algebra & number', progress: 68, symbol: '∑' },
      { name: 'English Language', topic: 'Comprehension', progress: 42, symbol: 'A' },
      { name: 'Integrated Science', topic: 'Living things', progress: 31, symbol: '◉' },
      { name: 'Social Studies', topic: 'Citizenship', progress: 54, symbol: '◎' },
      { name: 'Agricultural Science', topic: 'Soil & crops', progress: 18, symbol: '⌁' },
      { name: 'ICT', topic: 'Computer basics', progress: 25, symbol: '⌘' },
    ],
  },
  NPSE: {
    greeting: 'Small, steady steps make a strong foundation.',
    subjects: [
      { name: 'Mathematics', topic: 'Fractions & decimals', progress: 46, symbol: '∑' },
      { name: 'English Language', topic: 'Reading & grammar', progress: 38, symbol: 'A' },
      { name: 'General Paper', topic: 'Everyday knowledge', progress: 22, symbol: '◎' },
      { name: 'Quantitative Aptitude', topic: 'Patterns & reasoning', progress: 35, symbol: '◌' },
    ],
  },
  BECE: {
    greeting: 'Build your confidence one topic at a time.',
    subjects: [
      { name: 'Mathematics', topic: 'Ratio & proportion', progress: 52, symbol: '∑' },
      { name: 'English Language', topic: 'Writing skills', progress: 36, symbol: 'A' },
      { name: 'Integrated Science', topic: 'Energy & matter', progress: 29, symbol: '◉' },
      { name: 'Social Studies', topic: 'Our environment', progress: 41, symbol: '◎' },
      { name: 'Basic Technology', topic: 'Tools & materials', progress: 16, symbol: '⌘' },
    ],
  },
};

const questions = [
  { subject: 'Mathematics', topic: 'Fractions', prompt: 'What is 3/4 of 28?', options: ['18', '21', '24', '7'], answer: 1, explanation: 'Divide 28 by 4 to get 7, then multiply by 3: 7 × 3 = 21.' },
  { subject: 'English Language', topic: 'Grammar', prompt: 'Choose the sentence with correct subject-verb agreement.', options: ['The players runs fast.', 'The player run fast.', 'The players run fast.', 'The players is fast.'], answer: 2, explanation: 'The plural subject “players” takes the plural verb “run”.' },
  { subject: 'Integrated Science', topic: 'Plants', prompt: 'Which part of a plant absorbs most water from the soil?', options: ['Flower', 'Leaf', 'Root hairs', 'Stem'], answer: 2, explanation: 'Root hairs provide a large surface area for absorbing water and minerals.' },
  { subject: 'Social Studies', topic: 'Civics', prompt: 'Which action is an example of responsible citizenship?', options: ['Ignoring community rules', 'Taking part in community clean-up', 'Damaging public property', 'Refusing to help others'], answer: 1, explanation: 'Caring for shared spaces is one way citizens contribute to their community.' },
];

const papers = [
  { subject: 'Mathematics', title: 'Core Mathematics · Paper 1', year: '2023', type: 'Objective', exam: 'WAEC' },
  { subject: 'English Language', title: 'English Language · Paper 2', year: '2022', type: 'Essay', exam: 'WAEC' },
  { subject: 'Mathematics', title: 'Mathematics practice set', year: '2024', type: 'Practice', exam: 'NPSE' },
  { subject: 'General Paper', title: 'General Paper revision set', year: '2023', type: 'Practice', exam: 'NPSE' },
  { subject: 'Integrated Science', title: 'Integrated Science · Paper 1', year: '2022', type: 'Objective', exam: 'BECE' },
  { subject: 'Social Studies', title: 'Social Studies revision paper', year: '2021', type: 'Practice', exam: 'BECE' },
];

const storageKey = 'fieldnotes-study-data-v1';
const notesProfileKey = 'fieldnotes-notes-profile-v1';
const defaultData = { exam: 'WAEC', view: 'dashboard', answered: 0, correct: 0, streak: 1, completedPapers: [], notes: [{ title: 'Untitled note', body: '' }] };
let data = loadData();
let notesProfile = loadNotesProfile();
let notesEncryptionKey = null;
let notesUnlocked = false;
let notesSaveQueue = Promise.resolve();
let quizIndex = 0;
let selectedAnswer = null;
let quizSubmitted = false;
let paperFilter = 'All';
let activeNote = 0;

const root = document.querySelector('#view-root');
const examSelect = document.querySelector('#exam-select');

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return { ...defaultData, ...saved };
  } catch {
    return { ...defaultData };
  }
}

function saveData() {
  const { notes, ...studyData } = data;
  localStorage.setItem(storageKey, JSON.stringify(studyData));
}

function loadNotesProfile() {
  try {
    return JSON.parse(localStorage.getItem(notesProfileKey));
  } catch {
    return null;
  }
}

function encodeBytes(bytes) {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}

function decodeBytes(encoded) {
  return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
}

async function deriveNotesKey(passphrase, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encryptNotes(notes, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(notes));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv: encodeBytes(iv), ciphertext: encodeBytes(new Uint8Array(ciphertext)) };
}

async function saveEncryptedNotes() {
  if (!notesProfile || !notesEncryptionKey || !notesUnlocked) return;
  const key = notesEncryptionKey;
  const notesSnapshot = JSON.parse(JSON.stringify(data.notes));
  notesSaveQueue = notesSaveQueue.then(async () => {
    const encrypted = await encryptNotes(notesSnapshot, key);
    const currentProfile = JSON.parse(localStorage.getItem(notesProfileKey));
    notesProfile = { ...currentProfile, ...encrypted };
    localStorage.setItem(notesProfileKey, JSON.stringify(notesProfile));
  }).catch(() => {
    const saved = document.querySelector('#note-saved');
    if (saved) saved.textContent = 'Could not save securely. Check browser storage.';
  });
  return notesSaveQueue;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function subjectsForExam() {
  return examCatalog[data.exam].subjects;
}

function subjectProgress(name) {
  return subjectsForExam().find((subject) => subject.name === name)?.progress ?? 0;
}

function heading(eyebrow, title, description, extra = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lede">${description}</p></div>${extra}</div>`;
}

function subjectRow(subject) {
  return `<div class="subject-row"><span class="subject-icon">${subject.symbol}</span><div><div class="subject-name">${escapeHTML(subject.name)}</div><div class="subject-meta">${escapeHTML(subject.topic)}</div></div><div class="subject-progress"><span>${subject.progress}%</span><span class="progress-track"><span class="progress-fill" style="width:${subject.progress}%"></span></span></div></div>`;
}

function renderDashboard() {
  const subjects = subjectsForExam();
  const minutes = data.answered * 3;
  const upcoming = subjects[0];
  root.innerHTML = `${heading('Your study space', `Good ${timeOfDay()}, learner.`, `A calm place to prepare for ${data.exam}. Pick up where you left off.`, '<span class="date-chip">Your progress saves automatically</span>')}
    <section class="dashboard-hero" aria-label="Continue studying"><div class="hero-copy"><p class="eyebrow">A LITTLE EVERY DAY</p><h2>${escapeHTML(examCatalog[data.exam].greeting)}</h2><p>Continue with ${escapeHTML(upcoming.name)}: ${escapeHTML(upcoming.topic)}. Your lessons and practice are ready on this device.</p><button class="button-primary" data-action="continue">Continue studying <span aria-hidden="true">→</span></button></div><div class="hero-art" aria-hidden="true"><span class="hero-spark hero-spark-one">✳</span><span class="hero-spark hero-spark-two">✦</span><div class="book-stack"><div class="book book-one"><div class="book-lines"><i></i><i></i><i></i></div></div><div class="book book-two"><div class="book-lines"><i></i><i></i><i></i></div></div><div class="book book-three"><div class="book-lines"><i></i><i></i><i></i></div></div></div></div></section>
    <section class="stats-grid" aria-label="Study statistics"><div class="stat-card"><span class="stat-icon" aria-hidden="true">✳</span><div class="stat-copy"><strong>${data.streak}</strong><span>day study streak</span></div></div><div class="stat-card"><span class="stat-icon" aria-hidden="true">✓</span><div class="stat-copy"><strong>${data.correct}</strong><span>correct answers</span></div></div><div class="stat-card"><span class="stat-icon" aria-hidden="true">◷</span><div class="stat-copy"><strong>${minutes}</strong><span>minutes practised</span></div></div></section>
    <div class="content-grid"><section><div class="section-head"><h2>Your subjects</h2><button class="text-button" data-view="subjects">See all subjects →</button></div><div class="subject-list">${subjects.slice(0, 4).map(subjectRow).join('')}</div></section><section><div class="section-head"><h2>Today's small plan</h2></div><div class="plan-box"><div class="plan-date"><span>A good place to begin</span><strong>${data.exam}</strong></div><div class="plan-item"><span class="plan-check ${data.answered > 0 ? 'is-done' : ''}">${data.answered > 0 ? '✓' : ''}</span><div><strong>Try a quick question</strong><span>About 3 minutes</span></div></div><div class="plan-item"><span class="plan-check ${data.completedPapers.length > 0 ? 'is-done' : ''}">${data.completedPapers.length > 0 ? '✓' : ''}</span><div><strong>Choose a past paper</strong><span>Work at your own pace</span></div></div><button class="text-button" data-view="practice">Start a practice round →</button></div></section></div>`;
}

function renderSubjects() {
  root.innerHTML = `${heading(`${data.exam} · STUDY GUIDE`, 'Subjects & topics', 'Choose a subject to explore the topics you are working through.')}
    <section class="subject-cards">${subjectsForExam().map((subject) => `<button class="subject-card" data-subject="${escapeHTML(subject.name)}"><span class="card-kicker"><span>${escapeHTML(subject.topic)}</span><span>${subject.progress}% started</span></span><h3>${escapeHTML(subject.name)}</h3><p>Review key ideas, then check what you remember with a short question.</p><span class="card-bottom"><span>Open subject</span><span aria-hidden="true">→</span></span></button>`).join('')}</section>
    <section class="page-section"><div class="section-head"><h2>Topic notes</h2><button class="text-button" data-view="notes">Open my notes →</button></div><p class="lede">Lessons in this starter hub are bundled locally. More curriculum content can be added as you grow your library.</p></section>`;
}

function renderPractice() {
  const question = questions[quizIndex % questions.length];
  const answeredCount = Math.min(quizIndex + (quizSubmitted ? 1 : 0), questions.length);
  const options = question.options.map((option, index) => {
    let state = selectedAnswer === index ? 'is-picked' : '';
    if (quizSubmitted && index === question.answer) state = 'is-correct';
    else if (quizSubmitted && selectedAnswer === index) state = 'is-wrong';
    return `<button class="answer-option ${state}" data-answer="${index}" ${quizSubmitted ? 'disabled' : ''}><span class="answer-letter">${String.fromCharCode(65 + index)}</span>${escapeHTML(option)}</button>`;
  }).join('');
  root.innerHTML = `${heading(`${data.exam} · QUICK PRACTICE`, 'One question at a time', 'A short mixed-subject round. Your score stays on this device.')}
    <section class="quiz-panel"><div class="quiz-topline"><span>${escapeHTML(question.subject)} · ${escapeHTML(question.topic)}</span><span>Question ${(quizIndex % questions.length) + 1} of ${questions.length}</span></div><div class="quiz-progress"><span style="width:${Math.max(25, (answeredCount / questions.length) * 100)}%"></span></div><h2>${escapeHTML(question.prompt)}</h2><div class="answer-list">${options}</div><p class="quiz-feedback" role="status">${quizSubmitted ? `${selectedAnswer === question.answer ? 'That is right. ' : 'Not quite. '}${escapeHTML(question.explanation)}` : selectedAnswer === null ? 'Choose the answer you think is correct.' : 'Ready to check your answer?'}</p><div class="quiz-footer"><span class="subject-meta">${data.correct} correct so far</span>${quizSubmitted ? '<button class="button-primary" data-action="next-question">Next question →</button>' : `<button class="button-primary" data-action="check-answer" ${selectedAnswer === null ? 'disabled' : ''}>Check answer <span aria-hidden="true">→</span></button>`}</div></section>`;
}

function renderPapers() {
  const availablePapers = papers.filter((paper) => paper.exam === data.exam);
  const shownPapers = paperFilter === 'All' ? availablePapers : availablePapers.filter((paper) => paper.type === paperFilter);
  const filters = ['All', 'Objective', 'Essay', 'Practice'];
  root.innerHTML = `${heading(`${data.exam} · REVISION LIBRARY`, 'Past papers', 'Pick a paper to practise. Completed items are saved locally.')}
    <div class="filter-row" role="group" aria-label="Filter papers">${filters.map((filter) => `<button class="filter-chip ${paperFilter === filter ? 'is-selected' : ''}" data-filter="${filter}">${filter}</button>`).join('')}</div>
    <div class="paper-table">${shownPapers.length ? shownPapers.map((paper, index) => { const id = `${paper.exam}-${paper.year}-${paper.subject}`; const done = data.completedPapers.includes(id); return `<div class="paper-row"><div><div class="paper-title">${escapeHTML(paper.title)}</div><div class="paper-meta">${escapeHTML(paper.subject)}</div></div><span class="paper-tag">${escapeHTML(paper.type)}</span><span class="paper-year">${paper.year} ${done ? '· Done' : ''}</span><button class="button-secondary" data-paper="${escapeHTML(id)}" data-index="${index}">${done ? 'Review' : 'Mark complete'}</button></div>`; }).join('') : '<div class="empty-state">No papers in this category yet. Try another filter.</div>'}</div>`;
}

function renderNotes() {
  if (!notesUnlocked) return renderNotesGate();
  if (!data.notes.length) data.notes.push({ title: 'Untitled note', body: '' });
  activeNote = Math.max(0, Math.min(activeNote, data.notes.length - 1));
  const note = data.notes[activeNote];
  root.innerHTML = `${heading(`${data.exam} · PERSONAL`, 'My notes', 'Keep the reminders, formulas, and ideas you want to return to.', '<div class="notes-actions"><button class="button-primary" data-action="new-note">＋ New note</button><button class="button-secondary" data-action="lock-notes">Lock notes</button></div>')}
    <div class="notes-layout"><div class="note-list">${data.notes.map((item, index) => `<button class="note-entry ${index === activeNote ? 'is-active' : ''}" data-note="${index}"><strong>${escapeHTML(item.title || 'Untitled note')}</strong><span>${escapeHTML((item.body || 'No note yet').slice(0, 46))}</span></button>`).join('')}</div><div class="note-editor"><input id="note-title" aria-label="Note title" maxlength="60" value="${escapeHTML(note.title)}" /><textarea id="note-body" aria-label="Note content" placeholder="Write a reminder, a formula, or a question to revisit...">${escapeHTML(note.body)}</textarea><div id="note-saved" class="note-saved" role="status">Saved on this device</div></div></div>`;
  document.querySelector('#note-title').addEventListener('input', updateActiveNote);
  document.querySelector('#note-body').addEventListener('input', updateActiveNote);
}

function renderNotesGate(message = '') {
  const hasProfile = Boolean(notesProfile);
  const profileName = hasProfile ? escapeHTML(notesProfile.name) : '';
  root.innerHTML = `${heading('PRIVATE STUDY SPACE', hasProfile ? `Welcome back, ${profileName}` : 'Create your local profile', hasProfile ? 'Sign in to unlock your encrypted notes.' : 'Set up a passphrase before creating or viewing notes.')}
    <section class="notes-gate"><div class="gate-mark" aria-hidden="true">F</div><form id="notes-auth-form" class="gate-form"><p class="eyebrow">${hasProfile ? 'SIGN IN' : 'FIRST-TIME SETUP'}</p><h2>${hasProfile ? 'Unlock your notes' : 'Keep your notes private'}</h2>${hasProfile ? '' : '<label for="profile-name">Your name</label><input id="profile-name" name="name" autocomplete="name" maxlength="40" required />'}<label for="notes-passphrase">${hasProfile ? 'Passphrase' : 'Create a passphrase'}</label><input id="notes-passphrase" name="passphrase" type="password" autocomplete="${hasProfile ? 'current-password' : 'new-password'}" minlength="8" maxlength="128" required /><p class="gate-hint">Use at least 8 characters. Your passphrase encrypts notes on this device and cannot be recovered if forgotten.</p>${hasProfile ? '' : '<label for="notes-confirm">Confirm passphrase</label><input id="notes-confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required />'}<p class="gate-error" role="status">${escapeHTML(message)}</p><button class="button-primary gate-submit" type="submit">${hasProfile ? 'Sign in' : 'Create local profile'} <span aria-hidden="true">→</span></button><p class="gate-footnote">This is an offline, device-local profile. It does not create an online account.</p></form></section>`;
  document.querySelector('#notes-auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[role="status"]');
    const passphrase = form.elements.passphrase.value;
    submit.disabled = true;
    status.textContent = '';

    try {
      if (notesProfile) {
        const key = await deriveNotesKey(passphrase, decodeBytes(notesProfile.salt));
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBytes(notesProfile.iv) }, key, decodeBytes(notesProfile.ciphertext));
        const notes = JSON.parse(new TextDecoder().decode(decrypted));
        if (!Array.isArray(notes)) throw new Error('Invalid notes');
        notesEncryptionKey = key;
        notesUnlocked = true;
        data.notes = notes;
      } else {
        const name = form.elements.name.value.trim();
        if (passphrase !== form.elements.confirm.value) throw new Error('Passphrases do not match.');
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await deriveNotesKey(passphrase, salt);
        const encrypted = await encryptNotes(data.notes, key);
        notesProfile = { name, salt: encodeBytes(salt), ...encrypted };
        localStorage.setItem(notesProfileKey, JSON.stringify(notesProfile));
        notesEncryptionKey = key;
        notesUnlocked = true;
      }
      saveData();
      render();
    } catch (error) {
      status.textContent = error.message === 'Passphrases do not match.' ? error.message : notesProfile ? 'That passphrase did not unlock these notes.' : 'Could not create the local profile in this browser.';
      submit.disabled = false;
    }
  });
}

function updateActiveNote() {
  data.notes[activeNote].title = document.querySelector('#note-title').value;
  data.notes[activeNote].body = document.querySelector('#note-body').value;
  saveData();
  saveEncryptedNotes();
  const title = document.querySelector('.note-entry.is-active strong');
  const preview = document.querySelector('.note-entry.is-active span');
  if (title) title.textContent = data.notes[activeNote].title || 'Untitled note';
  if (preview) preview.textContent = (data.notes[activeNote].body || 'No note yet').slice(0, 46);
  const saved = document.querySelector('#note-saved');
  if (saved) saved.textContent = 'Saved just now';
}

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function render() {
  const labels = { dashboard: 'Overview', subjects: 'Subjects', practice: 'Quick practice', papers: 'Past papers', notes: 'My notes' };
  document.querySelector('#page-title').textContent = labels[data.view] || 'Overview';
  document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('is-active', button.dataset.view === data.view));
  examSelect.value = data.exam;
  if (data.view === 'subjects') renderSubjects();
  else if (data.view === 'practice') renderPractice();
  else if (data.view === 'papers') renderPapers();
  else if (data.view === 'notes') renderNotes();
  else renderDashboard();
}

function setView(view) {
  data.view = view;
  saveData();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateConnection() {
  const online = navigator.onLine;
  document.querySelector('#offline-label').textContent = online ? 'Ready to study' : 'Offline mode';
  document.querySelector('#connection-label').textContent = online ? 'Lessons available on this device' : 'Your saved study space is available';
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.view) return setView(button.dataset.view);
  if (button.dataset.action === 'continue') return setView('subjects');
  if (button.dataset.action === 'new-note') {
    data.notes.unshift({ title: 'Untitled note', body: '' });
    activeNote = 0;
    saveData();
    saveEncryptedNotes();
    return render();
  }
  if (button.dataset.action === 'lock-notes') {
    notesUnlocked = false;
    notesEncryptionKey = null;
    data.notes = [];
    activeNote = 0;
    return render();
  }
  if (button.dataset.action === 'check-answer' && selectedAnswer !== null && !quizSubmitted) {
    quizSubmitted = true;
    data.answered += 1;
    if (selectedAnswer === questions[quizIndex % questions.length].answer) data.correct += 1;
    saveData();
    return renderPractice();
  }
  if (button.dataset.action === 'next-question') {
    quizIndex = (quizIndex + 1) % questions.length;
    selectedAnswer = null;
    quizSubmitted = false;
    return renderPractice();
  }
  if (button.dataset.answer !== undefined && !quizSubmitted) {
    selectedAnswer = Number(button.dataset.answer);
    return renderPractice();
  }
  if (button.dataset.filter) {
    paperFilter = button.dataset.filter;
    return renderPapers();
  }
  if (button.dataset.paper) {
    if (!data.completedPapers.includes(button.dataset.paper)) data.completedPapers.push(button.dataset.paper);
    saveData();
    return renderPapers();
  }
  if (button.dataset.note !== undefined) {
    activeNote = Number(button.dataset.note);
    return renderNotes();
  }
  if (button.dataset.subject) {
    setView('practice');
  }
});

examSelect.addEventListener('change', () => {
  data.exam = examSelect.value;
  paperFilter = 'All';
  saveData();
  render();
});
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
updateConnection();
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {
    document.querySelector('#connection-label').textContent = 'Offline cache unavailable in this browser';
  }));
}
