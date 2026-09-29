const chat = document.getElementById('chat');
const input = document.getElementById('input');
const composer = document.getElementById('composer');
const welcome = document.getElementById('welcome');
const newChat = document.getElementById('newChat');
const clearChat = document.getElementById('clearChat');
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const historyEl = document.getElementById('history');
const historyKey = 'ujayy_chat_history';
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const attachmentPreview = document.getElementById('attachmentPreview');

let messages = [];
let selectedFiles = [];
let interactionId = null;
let currentChatId = null;

function scrollBottom(){ chat.scrollTop = chat.scrollHeight; }

function closeSidebar(){
  sidebar.classList.remove('open');
  sidebarBackdrop.classList.remove('show');
}
function openSidebar(){
  sidebar.classList.add('open');
  sidebarBackdrop.classList.add('show');
}
function saveHistory(title){
  if(!title) return;
  const items = JSON.parse(localStorage.getItem(historyKey) || '[]');
  const id = currentChatId || Date.now().toString();
  currentChatId = id;
  const existing = items.find(x => x.id === id);
  if(existing) existing.title = title;
  else items.unshift({id,title});
  localStorage.setItem(historyKey, JSON.stringify(items.slice(0,30)));
  renderHistory();
}
function renderHistory(){
  const items = JSON.parse(localStorage.getItem(historyKey) || '[]');
  historyEl.innerHTML = '';
  if(!items.length){
    historyEl.innerHTML = '<div class="history-empty">Belum ada riwayat chat.</div>';
    return;
  }
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'history-item' + (item.id === currentChatId ? ' active' : '');
    btn.innerHTML = '<span>◌</span><span></span>';
    btn.lastElementChild.textContent = item.title;
    btn.addEventListener('click', () => {
      currentChatId = item.id;
      renderHistory();
      closeSidebar();
    });
    historyEl.appendChild(btn);
  });
}


function formatSize(bytes){
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderSelectedFiles(){
  attachmentPreview.innerHTML = '';

  selectedFiles.forEach((file, index) => {
    const chip = document.createElement('div');
    chip.className = 'file-chip';

    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = file.type.startsWith('image/') ? '🖼️' : '📎';

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name;

    const size = document.createElement('div');
    size.className = 'file-size';
    size.textContent = formatSize(file.size);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'file-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Hapus file');
    remove.addEventListener('click', () => {
      selectedFiles.splice(index, 1);
      renderSelectedFiles();
    });

    chip.append(icon, name, size, remove);
    attachmentPreview.appendChild(chip);
  });

  attachmentPreview.classList.toggle('show', selectedFiles.length > 0);
}

function addMessage(role, text, files = []){
  welcome?.remove();

  if(text) {
    const apiRole = role === 'ai' ? 'assistant' : 'user';
    messages.push({role: apiRole, content: text});
  }

  const row = document.createElement('div');
  row.className = `msg ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if(role === 'ai' && window.marked && window.DOMPurify){
    bubble.classList.add('markdown');
    bubble.innerHTML = DOMPurify.sanitize(
      marked.parse(text || '', {gfm:true, breaks:true})
    );
  }else if(text){
    bubble.textContent = text;
  }

  if(files.length){
    const fileList = document.createElement('div');
    fileList.className = 'message-files';

    files.forEach(file => {
      const item = document.createElement('div');
      item.className = 'message-file';

      if(file.type.startsWith('image/')){
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        item.appendChild(img);
      }

      const meta = document.createElement('div');
      meta.className = 'message-file-meta';
      meta.innerHTML = `<strong></strong><span></span>`;
      meta.querySelector('strong').textContent = file.name;
      meta.querySelector('span').textContent = formatSize(file.size);
      item.appendChild(meta);

      fileList.appendChild(item);
    });

    bubble.appendChild(fileList);
  }

  row.appendChild(bubble);
  chat.appendChild(row);
  scrollBottom();
  return bubble;
}

function addTyping(){
  welcome?.remove();
  const row = document.createElement('div');
  row.className = 'msg ai';
  row.id = 'typing';
  row.innerHTML = '<div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div>';
  chat.appendChild(row);
  scrollBottom();
}

function removeTyping(){ document.getElementById('typing')?.remove(); }

async function askAI(text, files){
  const formData = new FormData();
  formData.append('message', text);
  if(interactionId) formData.append('previous_interaction_id', interactionId);

  files.forEach(file => formData.append('files', file));

  const response = await fetch('/api/chat', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if(!response.ok) throw new Error(data.error || 'Gemini API error');

  interactionId = data.interaction_id || interactionId;
  return data.text;
}

async function sendCurrentMessage(){
  const text = input.value.trim();
  const files = [...selectedFiles];

  if(!text && !files.length) return;

  if(!currentChatId && text) saveHistory(text.slice(0, 42));
  input.value = '';
  input.style.height = 'auto';

  selectedFiles = [];
  renderSelectedFiles();

  addMessage('user', text || 'File terlampir', files);

  input.disabled = true;
  attachBtn.disabled = true;
  document.querySelector('.send').disabled = true;
  addTyping();

  try{
    const reply = await askAI(text, files);
    removeTyping();
    addMessage('ai', reply);
  }catch(err){
    removeTyping();
    addMessage('ai', `Error: ${err.message}`);
    console.error(err);
  }finally{
    input.disabled = false;
    attachBtn.disabled = false;
    document.querySelector('.send').disabled = false;
    input.focus();
  }
}

composer.addEventListener('submit', async e => {
  e.preventDefault();
  await sendCurrentMessage();
});

attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const incoming = [...fileInput.files];

  for(const file of incoming){
    if(selectedFiles.length >= 5) break;
    if(file.size > 25 * 1024 * 1024) continue;
    if(!selectedFiles.some(existing =>
      existing.name === file.name &&
      existing.size === file.size &&
      existing.lastModified === file.lastModified
    )){
      selectedFiles.push(file);
    }
  }

  fileInput.value = '';
  renderSelectedFiles();
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight,130) + 'px';
});

input.addEventListener('keydown', e => {
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    composer.requestSubmit();
  }
});

function bindSuggestions(){
  document.querySelectorAll('.suggestions button').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.textContent;
      input.focus();
      input.dispatchEvent(new Event('input'));
    });
  });
}
bindSuggestions();

function resetChat(){
  messages = [];
  selectedFiles = [];
  interactionId = null;
  currentChatId = null;
  renderSelectedFiles();
  chat.innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-orb"><img src="assets/ujayy.jpg" alt="Ujayy"></div>
      <h1>Halo 👋</h1>
      <p>Ada yang mau lu tanyain?</p>
      <div class="suggestions">
        <button>Jelasin sesuatu dengan simpel</button>
        <button>Bantu gue bikin ide</button>
        <button>Tulis kode buat gue</button>
      </div>
    </div>`;
  bindSuggestions();
}

newChat.addEventListener('click', () => { resetChat(); closeSidebar(); });
clearChat.addEventListener('click', resetChat);
menuBtn.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarBackdrop.addEventListener('click', closeSidebar);
renderHistory();
