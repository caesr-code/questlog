import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  nip19,
  SimplePool
} from 'https://esm.sh/nostr-tools@2.10.4';

const TWO_DAYS = 48 * 60 * 60;
const APP_TAG = 'questlog-dnd-social-v1';
const ACCOUNT_KEY = 'questlog-nostr-account-v1';
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net'
];

const pool = new SimplePool();
const feed = document.getElementById('feed');
const syncStatus = document.getElementById('syncStatus');
const composerModal = document.getElementById('composerModal');
const accountModal = document.getElementById('accountModal');
const publishButton = document.getElementById('publishPost');
let selectedPostType = 'Session recap';
let selectedAvatarSeed = 'QuestKnight';
let account = loadAccount();
let seenEvents = new Set();

const $ = id => document.getElementById(id);
const avatarUrl = seed => `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed || 'Questlog')}`;

function loadAccount() {
  try {
    const value = JSON.parse(localStorage.getItem(ACCOUNT_KEY));
    if (value?.secret && value?.name && value?.avatarSeed) return value;
  } catch (_) {}
  return null;
}

function saveAccount(next) {
  account = next;
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
  updateAccountUI();
}

function updateAccountUI() {
  const seed = account?.avatarSeed || 'Guest';
  $('topAvatar').src = avatarUrl(seed);
  $('composerAvatar').src = avatarUrl(seed);
  $('composerName').textContent = account?.name || 'Sign in to publish';
  $('signedOutPanel').hidden = Boolean(account);
  $('signedInPanel').hidden = !account;
  if (account) {
    const secretBytes = hexToBytes(account.secret);
    const pubkey = getPublicKey(secretBytes);
    $('accountAvatar').src = avatarUrl(account.avatarSeed);
    $('accountDisplayName').textContent = account.name;
    $('accountPublicId').textContent = nip19.npubEncode(pubkey).slice(0, 24) + '…';
    $('recoveryKey').textContent = nip19.nsecEncode(secretBytes);
    $('accountTitle').textContent = 'Your Questlog account';
  } else {
    $('accountTitle').textContent = 'Join Questlog';
  }
}

function hexToBytes(hex) {
  return Uint8Array.from(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}
function bytesToHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function formatBody(value = '') {
  return escapeHtml(value).replace(/\n/g, '<br>');
}
function randomIdentifier() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
}
function setStatus(message, type = '') {
  syncStatus.textContent = message;
  syncStatus.className = `sync-status ${type}`;
}
function relativeTime(timestamp) {
  const mins = Math.max(0, Math.floor((Date.now()/1000 - timestamp) / 60));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins/60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours/24)}d`;
}
function expiryText(timestamp) {
  const remaining = Math.max(0, timestamp + TWO_DAYS - Date.now()/1000);
  const hours = Math.ceil(remaining/3600);
  return hours > 24 ? `in ${Math.ceil(hours/24)} days` : `in ${hours}h`;
}
function tagValue(event, key) {
  return event.tags.find(tag => tag[0] === key)?.[1] || '';
}

function openModal(modal) {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeModal(modal) {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

['openComposer','heroCompose','inlineCompose','mobileCompose'].forEach(id => {
  $(id)?.addEventListener('click', () => account ? openModal(composerModal) : openModal(accountModal));
});
$('closeComposer').onclick = () => closeModal(composerModal);
$('profileButton').onclick = () => openModal(accountModal);
$('closeAccount').onclick = () => closeModal(accountModal);
[composerModal, accountModal].forEach(modal => modal.addEventListener('click', e => e.target === modal && closeModal(modal)));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(composerModal); closeModal(accountModal); }
});

const avatarSeeds = ['QuestKnight','MoonMage','DiceGoblin','DragonBard','ForestDruid','RuneRogue'];
$('avatarPicker').innerHTML = avatarSeeds.map((seed, i) => `<button data-seed="${seed}" class="${i===0?'selected':''}"><img src="${avatarUrl(seed)}" alt="Avatar option"></button>`).join('');
$('avatarPicker').addEventListener('click', e => {
  const button = e.target.closest('button');
  if (!button) return;
  selectedAvatarSeed = button.dataset.seed;
  $('avatarPicker').querySelectorAll('button').forEach(b => b.classList.toggle('selected', b === button));
});

$('createAccount').onclick = async () => {
  const name = $('accountName').value.trim().slice(0,40);
  if (!name) return showToast('Choose a display name first.');
  const secret = generateSecretKey();
  saveAccount({ name, avatarSeed: selectedAvatarSeed, secret: bytesToHex(secret) });
  await publishProfile();
  showToast('Account created. Save your recovery key.');
};

$('signInAccount').onclick = async () => {
  try {
    const decoded = nip19.decode($('recoveryInput').value.trim());
    if (decoded.type !== 'nsec') throw new Error('Not an nsec key');
    const secret = decoded.data;
    const pubkey = getPublicKey(secret);
    setStatus('Finding your adventurer profile…');
    const profiles = await pool.querySync(RELAYS, { kinds:[0], authors:[pubkey], limit:1 });
    let metadata = {};
    try { metadata = JSON.parse(profiles.sort((a,b)=>b.created_at-a.created_at)[0]?.content || '{}'); } catch (_) {}
    saveAccount({ name: metadata.name || 'Returning Adventurer', avatarSeed: metadata.questlog_avatar || pubkey.slice(0,12), secret: bytesToHex(secret) });
    setStatus('Shared chronicle online · Posts vanish after 48 hours', 'live');
    showToast('Signed in on this device.');
  } catch (error) {
    showToast('That recovery key is not valid.');
  }
};

$('copyRecovery').onclick = async () => {
  await navigator.clipboard.writeText($('recoveryKey').textContent);
  showToast('Recovery key copied. Keep it private.');
};
$('logoutAccount').onclick = () => {
  localStorage.removeItem(ACCOUNT_KEY);
  account = null;
  updateAccountUI();
  showToast('Signed out on this device.');
};

async function publishProfile() {
  if (!account) return;
  const secret = hexToBytes(account.secret);
  const event = finalizeEvent({
    kind: 0,
    created_at: Math.floor(Date.now()/1000),
    tags: [],
    content: JSON.stringify({ name: account.name, questlog_avatar: account.avatarSeed, about: 'Questlog adventurer' })
  }, secret);
  await Promise.any(pool.publish(RELAYS, event));
}

$('postTypeOptions').addEventListener('click', e => {
  const button = e.target.closest('button[data-type]');
  if (!button) return;
  selectedPostType = button.dataset.type;
  $('postTypeOptions').querySelectorAll('button').forEach(b => b.classList.toggle('selected', b === button));
});

publishButton.onclick = async () => {
  if (!account) return openModal(accountModal);
  const title = $('postTitle').value.trim().slice(0,140);
  const body = $('postText').value.trim().slice(0,8000);
  const image = $('postImage').value.trim().slice(0,1000);
  const campaign = $('campaignSelect').value;
  if (!title || !body) return showToast('Add a title and the blog post first.');
  if (image && !/^https:\/\//i.test(image)) return showToast('Image links must start with https://');

  publishButton.disabled = true;
  publishButton.textContent = 'Publishing…';
  const createdAt = Math.floor(Date.now()/1000);
  const secret = hexToBytes(account.secret);
  const payload = { title, body, image, campaign, type:selectedPostType, author:account.name, avatarSeed:account.avatarSeed };
  const event = finalizeEvent({
    kind: 30023,
    created_at: createdAt,
    content: JSON.stringify(payload),
    tags: [
      ['d', randomIdentifier()],
      ['t', APP_TAG],
      ['title', title],
      ['summary', body.slice(0,180)],
      ['published_at', String(createdAt)],
      ['expiration', String(createdAt + TWO_DAYS)]
    ]
  }, secret);

  try {
    await Promise.any(pool.publish(RELAYS, event));
    renderEvent(event, true);
    closeModal(composerModal);
    $('postTitle').value = '';
    $('postText').value = '';
    $('postImage').value = '';
    showToast('Your blog post is live for 48 hours.');
  } catch (error) {
    console.error(error);
    showToast('No public relay accepted the post. Try again shortly.');
  } finally {
    publishButton.disabled = false;
    publishButton.textContent = 'Publish blog post';
  }
};

function renderEvent(event, prepend = false) {
  if (!event?.id || seenEvents.has(event.id) || event.created_at + TWO_DAYS <= Date.now()/1000) return;
  let post;
  try { post = JSON.parse(event.content); } catch (_) { return; }
  if (!post.title || !post.body || !post.author) return;
  seenEvents.add(event.id);
  const article = document.createElement('article');
  article.className = 'post-card cloud-post';
  article.dataset.postId = event.id;
  article.dataset.createdAt = event.created_at;
  article.dataset.search = `${post.title} ${post.body} ${post.author} ${post.campaign}`.toLowerCase();
  const image = post.image ? `<img class="blog-image" src="${escapeHtml(post.image)}" alt="Post image" loading="lazy" onerror="this.remove()">` : '';
  article.innerHTML = `
    <header class="post-header">
      <img src="${avatarUrl(post.avatarSeed || event.pubkey.slice(0,12))}" alt="${escapeHtml(post.author)}">
      <div><strong>${escapeHtml(post.author)}</strong><small>${escapeHtml(post.campaign || 'Homebrew Adventure')} · ${relativeTime(event.created_at)}</small></div>
      <button class="more" aria-label="More options">•••</button>
    </header>
    <div class="post-body compact">
      <span class="post-label recap">${escapeHtml((post.type || 'Session recap').toUpperCase())}</span>
      <h2>${escapeHtml(post.title)}</h2>
      <div class="blog-copy">${formatBody(post.body)}</div>
    </div>
    ${image}
    <div class="post-stats"><span><b>0</b> inspirations</span><span class="post-expiry">Expires ${expiryText(event.created_at)}</span></div>
    <div class="post-actions"><button class="react-btn">♡ <span>Inspire</span></button><button class="comment-btn">◫ <span>Comment</span></button><button class="share-btn">↗ <span>Share</span></button><button class="save-btn">▱</button></div>`;
  prepend ? feed.prepend(article) : feed.append(article);
  bindPostActions(article);
}

function bindPostActions(root = document) {
  root.querySelectorAll('.react-btn:not([data-bound])').forEach(btn => {
    btn.dataset.bound='1';
    btn.onclick=()=>{btn.classList.toggle('liked');btn.firstChild.textContent=btn.classList.contains('liked')?'♥ ':'♡ ';};
  });
  root.querySelectorAll('.save-btn:not([data-bound])').forEach(btn => {
    btn.dataset.bound='1';
    btn.onclick=()=>{btn.classList.toggle('liked');btn.textContent=btn.classList.contains('liked')?'▰':'▱';};
  });
  root.querySelectorAll('.share-btn:not([data-bound])').forEach(btn => {
    btn.dataset.bound='1';
    btn.onclick=async()=>{await navigator.clipboard.writeText(location.href);showToast('Questlog link copied.');};
  });
  root.querySelectorAll('.comment-btn:not([data-bound])').forEach(btn => {
    btn.dataset.bound='1';btn.onclick=()=>showToast('Comments are coming in the next build.');
  });
  root.querySelectorAll('.follow-btn:not([data-bound])').forEach(btn => {
    btn.dataset.bound='1';btn.onclick=()=>{btn.classList.toggle('following');btn.textContent=btn.classList.contains('following')?'Following':'Follow';};
  });
}
bindPostActions();

async function loadSharedPosts() {
  const since = Math.floor(Date.now()/1000) - TWO_DAYS;
  setStatus('Connecting to public Questlog relays…');
  try {
    const events = await pool.querySync(RELAYS, { kinds:[30023], '#t':[APP_TAG], since, limit:200 });
    events.sort((a,b)=>a.created_at-b.created_at).forEach(event => renderEvent(event, true));
    setStatus(`Shared chronicle online · ${events.length} recent community post${events.length===1?'':'s'} · 48-hour expiry`, 'live');
    const sub = pool.subscribeMany(RELAYS, [{ kinds:[30023], '#t':[APP_TAG], since }], {
      onevent: event => renderEvent(event, true),
      oneose: () => {}
    });
    window.addEventListener('beforeunload', () => sub.close());
  } catch (error) {
    console.error(error);
    setStatus('Public relays are unavailable right now. The built-in demo posts still work.', 'error');
  }
}

$('searchInput').addEventListener('input', e => {
  const q=e.target.value.toLowerCase().trim();
  document.querySelectorAll('#feed .post-card').forEach(post => post.style.display=!q || (post.dataset.search||post.textContent.toLowerCase()).includes(q)?'':'none');
});

setInterval(() => {
  document.querySelectorAll('[data-created-at]').forEach(el => {
    const created=Number(el.dataset.createdAt);
    if (created + TWO_DAYS <= Date.now()/1000) el.remove();
    else { const expiry=el.querySelector('.post-expiry'); if(expiry) expiry.textContent=`Expires ${expiryText(created)}`; }
  });
}, 60000);

updateAccountUI();
loadSharedPosts();
