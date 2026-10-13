// ===== 手机扫码登记页共用逻辑 =====
// 通过 URL 参数 ?d=设备编号 识别设备
const PAGE_TYPE = location.pathname.includes('return.html') ? 'return' : 'borrow';
let DEVICE_ID = null;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  let did = params.get('d') || params.get('device');
  if (did) {
    DEVICE_ID = did.trim().toUpperCase();
  }
  try { await DB.init(); } catch (e) {}

  if (!DEVICE_ID) {
    // 无二维码参数：提供手动输入
    renderManualInput();
    return;
  }
  renderDevice();
});

function renderManualInput() {
  document.getElementById('formArea').innerHTML = `
    <div class="form-card">
      <div class="field">
        <label class="field-label">设备编号 <span class="req">*</span></label>
        <input class="field-input" id="fManualId" placeholder="扫描设备上的二维码，或输入编号 D001">
      </div>
      <button class="btn btn-primary btn-block btn-lg" onclick="goByManualId()">下一步</button>
    </div>`;
  const el = document.getElementById('alertBox');
  el.innerHTML = `<div class="borrower-info">⚠️ 未检测到设备编号。<br>请扫描设备上贴的二维码，或手动输入设备编号（在二维码下方可见，形如 <b>D001</b>）。</div>`;
}

function goByManualId() {
  const v = (document.getElementById('fManualId').value || '').trim().toUpperCase();
  if (!v) { toast('请输入设备编号', 'error'); return; }
  DEVICE_ID = v;
  renderDevice();
}

function renderDevice() {
  const el = document.getElementById('deviceInfo');
  const alert = document.getElementById('alertBox');
  let d = DB.getDevice(DEVICE_ID);
  if (!d) {
    el.innerHTML = '';
    alert.innerHTML = `<div class="borrower-info" style="background:var(--danger-soft);border-color:#FECACA;color:#991B1B;">❌ 未找到设备 <b>${escapeHtml(DEVICE_ID)}</b>。<br>请检查编号是否正确，或联系管理员添加设备。</div>`;
    return;
  }
  const badge = d.status === 'available'
    ? '<span class="badge badge-available">可借用</span>'
    : '<span class="badge badge-borrowed">使用中</span>';
  el.innerHTML = `
    <div class="device-hero">
      ${badge}
      <div class="dh-name">${escapeHtml(d.name)}</div>
      <div class="dh-id">编号 ${escapeHtml(d.id)}</div>
      ${d.model ? `<div class="dh-model">${escapeHtml(d.model)}</div>` : ''}
    </div>`;

  // 借用页如果设备已借出：提示
  if (PAGE_TYPE === 'borrow' && d.status === 'borrowed' && d.borrower) {
    alert.innerHTML = `<div class="borrower-info">⏳ 该设备当前已被借用：<br><b>${escapeHtml(d.borrower.name)}</b>${d.borrower.dept ? '（' + escapeHtml(d.borrower.dept) + '）' : ''} · ${fmtTime(d.borrower.time)} 借出<br>如需归还请使用 <b>归还二维码</b>。</div>`;
  }
  // 归还页如果设备未被借用：提示
  if (PAGE_TYPE === 'return' && d.status === 'available') {
    alert.innerHTML = `<div class="borrower-info">✅ 该设备当前为 <b>可借用</b> 状态，无需归还。<br>如需借用请使用 <b>借用二维码</b>。</div>`;
  }
}

function submitAction() {
  const name = (document.getElementById('fName').value || '').trim();
  const phone = (document.getElementById('fPhone').value || '').trim();
  const dept = (document.getElementById('fDept').value || '').trim();
  const err = validate(name, phone);
  if (err) { toast(err, 'error'); return; }

  const user = { name, phone, dept };
  let res;
  if (PAGE_TYPE === 'borrow') res = DB.borrow(DEVICE_ID, user);
  else res = DB.giveBack(DEVICE_ID, user);

  if (res) {
    // 设备状态冲突（多设备场景下数据不共享时常见）
    renderDevice();
    toast(typeof res === 'string' ? res : '操作失败，请重试', 'error');
    return;
  }

  showResult();
}

function validate(name, phone) {
  if (!name) return '请输入姓名';
  if (!/^1\d{10}$/.test(phone)) return '请输入正确的11位手机号';
  return '';
}

function showResult() {
  document.getElementById('formArea').style.display = 'none';
  const d = DB.getDevice(DEVICE_ID) || {};
  const okIcon = PAGE_TYPE === 'borrow' ? '📤' : '📥';
  const title = PAGE_TYPE === 'borrow' ? '借用登记成功' : '归还登记成功';
  const desc = PAGE_TYPE === 'borrow'
    ? '已登记，请按时归还设备'
    : '设备已归还，感谢配合';
  document.getElementById('resultArea').innerHTML = `
    <div class="success-block">
      <div class="success-icon ok">${okIcon}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
      <div class="result-card">
        设备 <b>${escapeHtml(d.name || DEVICE_ID)}</b><br>
        编号 <b>${escapeHtml(d.id || DEVICE_ID)}</b><br>
        登记人 <b>${escapeHtml(document.getElementById('fName').value.trim())}</b><br>
        时间 <b>${fmtTime(Date.now())}</b>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <a class="btn btn-primary btn-block btn-lg" href="${location.pathname}?d=${encodeURIComponent(DEVICE_ID)}">再扫一次 / 刷新</a>
        <a class="btn btn-ghost btn-block" href="index.html">管理端 →</a>
      </div>
    </div>`;
  document.getElementById('resultArea').style.display = 'block';
  document.getElementById('resultArea').scrollIntoView({ behavior: 'smooth' });
}