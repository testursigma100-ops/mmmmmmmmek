const chat = document.getElementById('chat');
const input = document.getElementById('input');
const composer = document.getElementById('composer');
const welcome = document.getElementById('welcome');
const newChat = document.getElementById('newChat');
const clearChat = document.getElementById('clearChat');

let messages = [];

function scrollBottom(){ chat.scrollTop = chat.scrollHeight; }

function addMessage(role, text){
  welcome?.remove();
  messages.push({role, content:text});
  const row = document.createElement('div');
  row.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
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

async function askAI(){
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({messages})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Gemini API error');
  return data.text;
}

composer.addEventListener('submit', async e => {
  e.preventDefault();
  const text = input.value.trim();
  if(!text) return;

  input.value = '';
  input.style.height = 'auto';
  addMessage('user', text);
  input.disabled = true;
  document.querySelector('.send').disabled = true;
  addTyping();

  try{
    const reply = await askAI();
    removeTyping();
    addMessage('ai', reply);
  }catch(err){
    removeTyping();
    addMessage('ai', `Error: ${err.message}`);
    console.error(err);
  }finally{
    input.disabled = false;
    document.querySelector('.send').disabled = false;
    input.focus();
  }
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
  chat.innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-orb">✦</div>
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
newChat.addEventListener('click', resetChat);
clearChat.addEventListener('click', resetChat);
