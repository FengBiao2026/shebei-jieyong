// ===== 状态 =====
let recFilter = 'all';
let currentRecord = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await DB.init();
  } catch (e) {}
  // 服务器模式首次启动时 db.json 为空，自动初始化示例设备
  if (DB.devices.length === 0) {
    DB.seed();
    DB.save();
  }
  updateModeBanner();
  DB.on(renderAll);
  renderAll();
});

function renderAll() {
  renderStats();
  renderDevices();
  renderRecords();
}

// ===== 模式横幅 =====
function updateModeBanner() {
  const m = document.getElementById('modeBanner');
  const cloud = getCloudUrl();
  if (cloud) {
    m.className = 'mode-banner server';
    m.innerHTML = `<span class="dot"></span><div><b>☁ 云端模式</b>：二维码指向云端地址 <b>${escapeHtml(cloud)}</b><br>任何网络下手机均可扫码，数据在各手机独立保存。<br><a href="javascript:void(0)" onclick="openCloudModal()" style="color:#2563EB;">点此修改云端地址</a></div>`;
    return;
  }
  if (DB_MODE === 'server') {
    m.className = 'mode-banner server';
    const sb = siteBaseUrl();
    const isLocal = sb.includes('localhost') || sb.includes('127.0.0.1') || sb === 'null';
    m.innerHTML = `<span class="dot"></span><div><b>服务器模式</b>：数据实时共享保存到电脑。<br>手机扫码地址：<b>${escapeHtml(sb)}</b>${isLocal ? '<br><span style="color:#DC2626;">⚠️ 地址含 localhost，手机扫码打不开！请按 Ctrl+Shift+R 强制刷新页面。</span>' : ' ✅'}<br><a href="javascript:void(0)" onclick="openCloudModal()" style="color:#2563EB;">点此配置云端地址（任何网络可访问）</a></div>`;
  } else {
    m.className = 'mode-banner';
    m.innerHTML = `<span class="dot"></span><div><b>浏览器本机模式</b>：数据保存在当前浏览器，更换设备/浏览器后不共享。<br>如需多手机共享数据，请运行 <b>server.py</b> 或 <a href="javascript:void(0)" onclick="openCloudModal()" style="color:#2563EB;">配置云端地址</a>。</div>`;
  }
}

// ===== 云端地址设置 =====
function openCloudModal() {
  const current = getCloudUrl();
  openModal('☁ 云端地址设置',
    `<div style="font-size:13px;line-height:1.8;color:var(--muted-fg);margin-bottom:14px;">
       配置 Gitee 云端地址后，二维码将指向云端页面，<b>任何网络</b>下的手机都能扫码借用/归还。<br>
       数据在各手机上独立保存（云端模式）。<br>
       留空则使用本地服务器地址（需同一 WiFi）。
     </div>
     <div class="field">
       <label class="field-label">Gitee 云端地址</label>
       <input class="field-input" id="fCloudUrl" value="${escapeHtml(current)}" placeholder="如：https://用户名.gitee.io/shebei-jieyong">
     </div>
     <div id="cloudHint" style="font-size:12px;margin-top:8px;line-height:1.6;"></div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     ${current ? '<button class="btn btn-danger" onclick="clearCloudUrl()">清除</button>' : ''}
     <button class="btn btn-primary" onclick="saveCloudUrl()">保存</button>`);
  const hint = document.getElementById('cloudHint');
  if (current) {
    hint.style.color = '#059669';
    hint.innerHTML = '✅ 当前已配置云端地址，二维码指向云端。';
  } else {
    hint.style.color = 'var(--muted-fg)';
    hint.innerHTML = '当前未配置，使用本地服务器地址。';
  }
}

function saveCloudUrl() {
  let url = document.getElementById('fCloudUrl').value.trim();
  if (url && !/^https?:\/\//.test(url)) {
    toast('地址需以 http:// 或 https:// 开头', 'error');
    return;
  }
  setCloudUrl(url);
  closeModal();
  toast(url ? '云端地址已保存，二维码已更新' : '已清除云端地址');
  updateModeBanner();
}

function clearCloudUrl() {
  setCloudUrl('');
  closeModal();
  toast('已清除云端地址，使用本地服务器');
  updateModeBanner();
}

function renderStats() {
  const d = DB.devices;
  document.getElementById('stTotal').textContent = d.length;
  document.getElementById('stAvail').textContent = d.filter(x => x.status === 'available').length;
  document.getElementById('stBorrowed').textContent = d.filter(x => x.status === 'borrowed').length;
  document.getElementById('stRecords').textContent = DB.records.length;
}

function renderDevices() {
  const kw = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const list = DB.devices.filter(x => {
    if (!kw) return true;
    return (x.name + ' ' + x.id + ' ' + (x.model || '')).toLowerCase().includes(kw);
  });
  const el = document.getElementById('deviceList');
  if (list.length === 0) {
    el.innerHTML = `<div class="empty" style="grid-column:1/-1"><span class="empty-icon">📦</span>暂无设备${kw ? '，换个关键词试试' : '，点击右上方“添加设备”开始'}</div>`;
    return;
  }
  el.innerHTML = list.map(dev => deviceCardHtml(dev)).join('');
}

function deviceCardHtml(d) {
  const badge = d.status === 'available'
    ? '<span class="badge badge-available">可借用</span>'
    : '<span class="badge badge-borrowed">使用中</span>';
  const b = d.borrower;
  const borrower = b
    ? `<div class="device-borrower">👤 借用人：${escapeHtml(b.name)}${b.dept ? '（' + escapeHtml(b.dept) + '）' : ''}<br>📅 ${fmtTime(b.time)}</div>`
    : '';
  return `
  <div class="device-card">
    <div class="device-head">
      <span class="device-id">${escapeHtml(d.id)}</span>
      ${badge}
    </div>
    <div class="device-name">${escapeHtml(d.name)}</div>
    <div class="device-model">${escapeHtml(d.model || '—')}</div>
    ${d.remark ? `<div class="device-remark">${escapeHtml(d.remark)}</div>` : ''}
    ${borrower}
    <div class="device-actions">
      <button class="btn btn-sm btn-ghost" onclick="openQrModal('${d.id}')">🔳 二维码</button>
      <button class="btn btn-sm btn-ghost" onclick="openDeviceModal('${d.id}')">✏ 编辑</button>
      <button class="btn btn-sm btn-danger" onclick="deleteDevice('${d.id}')">🗑</button>
    </div>
  </div>`;
}

// ===== 添加/编辑设备 =====
function openDeviceModal(id) {
  const d = id ? DB.getDevice(id) : null;
  openModal(
    d ? '编辑设备' : '添加设备',
    `
    <div class="field">
      <label class="field-label">设备名称 <span class="req">*</span></label>
      <input class="field-input" id="fName" value="${escapeHtml(d ? d.name : '')}" placeholder="如：投影仪">
    </div>
    <div class="field">
      <label class="field-label">编号</label>
      <input class="field-input" id="fId" value="${d ? escapeHtml(d.id) : ''}" placeholder="留空自动生成，如 D001">
    </div>
    <div class="field">
      <label class="field-label">型号 / 规格</label>
      <input class="field-input" id="fModel" value="${escapeHtml(d ? d.model : '')}" placeholder="如：极米 H3S">
    </div>
    <div class="field">
      <label class="field-label">备注</label>
      <input class="field-input" id="fRemark" value="${escapeHtml(d ? d.remark : '')}" placeholder="如：存放位置、使用注意等">
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-primary" onclick="submitDevice('${id || ''}')">保存</button>`
  );
  if (d && d.status === 'borrowed') {
    document.getElementById('fName').disabled = true;
    document.getElementById('fId').disabled = true;
    document.getElementById('fModel').disabled = true;
    setTimeout(() => toast('设备使用中，仅可修改备注', 'error'), 100);
  }
}

function submitDevice(id) {
  const name = document.getElementById('fName').value.trim();
  if (!name) { toast('请输入设备名称', 'error'); document.getElementById('fName').classList.add('invalid'); return; }
  const fid = document.getElementById('fId').value.trim();
  if (fid && DB.devices.some(x => x.id === fid && x.id !== id)) {
    toast('该编号已存在', 'error');
    return;
  }
  const data = {
    name,
    id: fid || undefined,
    model: document.getElementById('fModel').value.trim(),
    remark: document.getElementById('fRemark').value.trim()
  };
  if (id) {
    DB.updateDevice(id, { name: data.name, model: data.model, remark: data.remark });
  } else {
    DB.addDevice(data);
  }
  closeModal();
  toast(id ? '已保存，请重新生成二维码贴纸' : '已保存');
}

async function deleteDevice(id) {
  const d = DB.getDevice(id);
  if (!d) return;
  if (d.status === 'borrowed') { toast('设备使用中，请先归还后再删除', 'error'); return; }
  openModal('删除设备', `<div style="font-size:14px;line-height:1.8;">确定删除设备 <b>${escapeHtml(d.name)}（${escapeHtml(d.id)}）</b> 吗？<br>历史记录将保留。</div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-danger" onclick="confirmDelete('${id}')">删除</button>`);
}

function confirmDelete(id) {
  closeModal();
  DB.deleteDevice(id);
  toast('已删除');
}

// ===== 二维码 =====
function openQrModal(id) {
  const d = DB.getDevice(id);
  if (!d) return;
  const borrowUrl = deviceBorrowUrl(id, d);
  const returnUrl = deviceReturnUrl(id, d);
  openModal(`二维码 · ${escapeHtml(d.name)}`,
    `<div class="qr-box">
        <div style="background:#FFF3CD;border:1px solid #FFECB5;color:#856404;border-radius:8px;padding:8px 12px;font-size:12px;width:100%;text-align:left;line-height:1.6;">
          ✅ 二维码已嵌入设备名称/型号，手机扫码自动同步最新信息。<br>
          ⚠️ 若<b>修改了设备名称</b>，请重新打印二维码贴纸，旧二维码显示的是旧名称。
        </div>
       <div class="qr-canvas-box"><div id="qrBorrowBox"></div></div>
       <div style="font-weight:700;font-size:13px;">📤 借用二维码</div>
       <div class="qr-url">${escapeHtml(borrowUrl)}</div>
       <div style="font-size:12px;color:var(--muted-fg);margin-top:4px;">📱 手机测试：在手机浏览器输入上面这行地址</div>
       <div class="qr-actions">
         <button class="btn btn-ghost" onclick="downloadQr('qrBorrowBox','${id}_borrow')">⬇ 保存</button>
         <button class="btn btn-primary" onclick="printQr('${id}','borrow')">🖨 打印</button>
       </div>
       <hr style="border:none;border-top:1px dashed var(--border);width:100%;">
       <div class="qr-canvas-box"><div id="qrReturnBox"></div></div>
       <div style="font-weight:700;font-size:13px;">📥 归还二维码</div>
       <div class="qr-url">${escapeHtml(returnUrl)}</div>
       <div class="qr-actions">
         <button class="btn btn-ghost" onclick="downloadQr('qrReturnBox','${id}_return')">⬇ 保存</button>
         <button class="btn btn-primary" onclick="printQr('${id}','return')">🖨 打印</button>
       </div>
     </div>`);
  renderQR(document.getElementById('qrBorrowBox'), borrowUrl);
  renderQR(document.getElementById('qrReturnBox'), returnUrl);
}

function downloadQr(boxId, name) {
  const canvas = document.getElementById(boxId).querySelector('canvas');
  if (canvas) downloadDataURL(canvas, name + '.png');
}

function printQr(id, type) {
  const d = DB.getDevice(id);
  const url = type === 'borrow' ? deviceBorrowUrl(id, d) : deviceReturnUrl(id, d);
  const area = document.getElementById('printArea');
  area.innerHTML = `
    <div class="print-label">
      <div id="pq"></div>
      <div class="pl-name">${escapeHtml(d.name)}</div>
      <div class="pl-id">${escapeHtml(d.id)} · ${type === 'borrow' ? '借用' : '归还'}</div>
    </div>`;
  renderQR(document.getElementById('pq'), url, 200);
  setTimeout(() => window.print(), 300);
}

// 打印全部设备（借用 + 归还）二维码
function showPrintAll() {
  const area = document.getElementById('printArea');
  area.innerHTML = DB.devices.map(d => `
    <div class="print-label">
      <div class="pl-qr-borrow"></div>
      <div class="pl-name">${escapeHtml(d.name)} <span style="font-size:10px;color:#666;">借用</span></div>
      <div class="pl-id">${escapeHtml(d.id)}</div>
    </div>
    <div class="print-label">
      <div class="pl-qr-return"></div>
      <div class="pl-name">${escapeHtml(d.name)} <span style="font-size:10px;color:#666;">归还</span></div>
      <div class="pl-id">${escapeHtml(d.id)}</div>
    </div>`).join('');
  setTimeout(() => {
    area.querySelectorAll('.pl-qr-borrow').forEach((el, i) => renderQR(el, deviceBorrowUrl(DB.devices[i].id, DB.devices[i]), 170));
    area.querySelectorAll('.pl-qr-return').forEach((el, i) => renderQR(el, deviceReturnUrl(DB.devices[i].id, DB.devices[i]), 170));
    setTimeout(() => window.print(), 400);
  }, 200);
}

// ===== 记录 =====
function setRecFilter(f) {
  recFilter = f;
  document.querySelectorAll('#recFilterRow .chip').forEach(ch => ch.classList.toggle('active', ch.dataset.f === f));
  renderRecords();
}

function renderRecords() {
  const el = document.getElementById('recordList');
  let list = DB.records.filter(r => recFilter === 'all' || r.type === recFilter);
  list = list.slice(0, 100);
  if (list.length === 0) {
    el.innerHTML = `<div class="empty"><span class="empty-icon">🗂</span>暂无登记记录</div>`;
    return;
  }
  el.innerHTML = list.map(r => `
    <div class="record-item">
      <div class="record-icon ${r.type === 'borrow' ? 'borrow' : 'return'}">${r.type === 'borrow' ? '📤' : '📥'}</div>
      <div class="record-main">
        <div class="record-line1">${r.type === 'borrow' ? '借用' : '归还'}：<b>${escapeHtml(r.name)}</b></div>
        <div class="record-line2">设备 <b>${escapeHtml(r.deviceId)}</b>${r.phone ? ' · ' + escapeHtml(r.phone) : ''}${r.dept ? ' · ' + escapeHtml(r.dept) : ''}</div>
      </div>
      <div class="record-time">${fmtTime(r.time)}</div>
    </div>`).join('');
}

// ===== 导出 / 导入 =====
function exportData() {
  const blob = new Blob([DB.exportJson()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '设备登记备份_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('已导出备份文件');
}

function importData() {
  openModal('导入数据', `
    <p style="font-size:13px;color:var(--muted-fg);margin-bottom:12px;">选择之前“导出”的 JSON 备份文件，将<b>覆盖</b>当前本机的设备与记录数据。</p>
    <input type="file" id="importFile" accept=".json,application/json" style="width:100%;font-size:13px;">`,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-primary" onclick="doImport()">导入</button>`);
}

function doImport() {
  const f = document.getElementById('importFile').files[0];
  if (!f) { toast('请选择备份文件', 'error'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    if (DB.importJson(reader.result)) {
      closeModal();
      renderAll();
      toast('导入成功');
    } else {
      toast('文件格式不正确', 'error');
    }
  };
  reader.readAsText(f);
}