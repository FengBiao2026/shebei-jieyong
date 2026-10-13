// ===== 通用工具 =====
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let toastTimer;
function toast(msg, type = '') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast'; el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2400);
}

// ===== 弹窗 =====
function openModal(title, bodyHtml, footHtml = '') {
  const mask = document.getElementById('modalMask');
  const box = document.getElementById('modalBox');
  box.innerHTML = `
    <div class="modal-head">
      <div class="modal-title">${title}</div>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
    ${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ''}`;
  mask.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalMask').classList.remove('show');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.getElementById('modalMask')?.addEventListener('click', e => { if (e.target.id === 'modalMask') closeModal(); });

// ===== 二维码 =====
// qrcodejs 用法：传入容器元素，库内部创建 canvas 并 append 到容器中
function renderQR(el, text, size = 220) {
  el.innerHTML = '';
  new QRCode(el, {
    text,
    width: size, height: size,
    colorDark: '#0F172A', colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.M
  });
}

function deviceBorrowUrl(id) { return siteBaseUrl().replace(/\/+$/, '') + '/borrow.html?d=' + encodeURIComponent(id); }

function deviceReturnUrl(id) { return siteBaseUrl().replace(/\/+$/, '') + '/return.html?d=' + encodeURIComponent(id); }

function downloadDataURL(canvas, filename) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}