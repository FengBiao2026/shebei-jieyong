/**
 * 数据层：自动适配两种模式
 * 1) server 模式：页面由 server.py 提供时使用，数据全局共享（所有手机登记都写入电脑）
 * 2) local 模式：部署到 Gitee Pages 等静态托管，数据存各自浏览器本机（无法跨手机共享）
 */

let DB_MODE = null; // 'server' | 'local'
const DB = {
  devices: [],   // {id, name, model, status:'available'|'borrowed', borrower, remark}
  records: [],   // {id, deviceId, type:'borrow'|'return', name, phone, dept, time}
  listeners: [],

  on(fn) { DB.listeners.push(fn); },
  emit() { DB.listeners.forEach(fn => { try { fn(); } catch (e) {} }); },

  async init() {
    DB_MODE = await probeServer();
    if (DB_MODE === 'server') {
      await DB.loadRemote();
    } else {
      DB.loadLocal();
    }
    return DB_MODE;
  },

  // ---------- 本地存储 ----------
  loadLocal() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        DB.devices = d.devices || [];
        DB.records = d.records || [];
        return;
      }
    } catch (e) {}
    DB.seed();
  },
  saveLocal() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ devices: DB.devices, records: DB.records }));
    } catch (e) {}
  },

  // ---------- 服务器模式 ----------
  async loadRemote() {
    try {
      const r = await fetch('api/data', { cache: 'no-store' });
      if (!r.ok) throw new Error('load fail');
      const d = await r.json();
      DB.devices = d.devices || [];
      DB.records = d.records || [];
    } catch (e) {
      DB.seed();
    }
  },
  async pushRemote() {
    try {
      await fetch('api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: DB.devices, records: DB.records })
      });
    } catch (e) {
      toast('网络异常，数据可能未保存到服务器', 'error');
    }
  },

  // ---------- 持久化统一入口 ----------
  save() {
    if (DB_MODE === 'server') DB.pushRemote();
    else DB.saveLocal();
    DB.emit();
  },

  // ---------- 内置示例设备（首次使用时生成） ----------
  seed() {
    if (DB.devices.length > 0) return;
    DB.devices = [
      { id: 'D001', name: '投影仪', model: '极米 H3S', status: 'available', borrower: null, remark: '会议室标配' },
      { id: 'D002', name: '激光笔', model: '罗技 R800', status: 'available', borrower: null, remark: '' },
      { id: 'D003', name: '相机', model: '索尼 A7M3', status: 'available', borrower: null, remark: '外出活动用' }
    ];
    DB.records = [];
  },

  // ---------- 设备操作 ----------
  nextDeviceId() {
    let max = 0;
    DB.devices.forEach(d => {
      const m = String(d.id).match(/^D(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'D' + String(max + 1).padStart(3, '0');
  },

  addDevice(dev) {
    const d = {
      id: dev.id || DB.nextDeviceId(),
      name: dev.name,
      model: dev.model || '',
      status: 'available',
      borrower: null,
      remark: dev.remark || ''
    };
    DB.devices.push(d);
    DB.save();
    return d;
  },

  updateDevice(id, patch) {
    const d = DB.devices.find(x => x.id === id);
    if (!d) return null;
    Object.assign(d, patch);
    DB.save();
    return d;
  },

  deleteDevice(id) {
    DB.devices = DB.devices.filter(x => x.id !== id);
    DB.save();
  },

  getDevice(id) { return DB.devices.find(x => x.id === id) || null; },

  // ---------- 借用 / 归还 ----------
  borrow(deviceId, user) {
    const d = DB.getDevice(deviceId);
    if (!d) return null;
    if (d.status !== 'available') return '该设备当前正在使用中';
    d.status = 'borrowed';
    d.borrower = { name: user.name, phone: user.phone, dept: user.dept, time: Date.now() };
    DB.records.unshift({
      id: Date.now() + '-' + Math.floor(Math.random() * 999),
      deviceId, name: user.name, phone: user.phone, dept: user.dept,
      type: 'borrow', time: Date.now()
    });
    DB.save();
    return null;
  },

  giveBack(deviceId, user) {
    const d = DB.getDevice(deviceId);
    if (!d) return null;
    if (d.status !== 'borrowed') return '该设备当前未被借用';
    d.status = 'available';
    d.borrower = null;
    DB.records.unshift({
      id: Date.now() + '-' + Math.floor(Math.random() * 999),
      deviceId, name: user.name, phone: user.phone, dept: user.dept,
      type: 'return', time: Date.now()
    });
    DB.save();
    return null;
  },

  // ---------- 导出 / 导入（用于备份与迁移） ----------
  exportJson() {
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), devices: DB.devices, records: DB.records }, null, 2);
  },

  importJson(text) {
    try {
      const d = JSON.parse(text);
      if (!Array.isArray(d.devices)) throw new Error('bad');
      DB.devices = d.devices || [];
      DB.records = d.records || [];
      DB.save();
      return true;
    } catch (e) { return false; }
  }
};

async function probeServer() {
  try {
    const r = await fetch('api/ping', { cache: 'no-store' });
    if (!r.ok) return false;
    const j = await r.json();
    if (j.ok) {
      // 服务器告知局域网访问地址（用于二维码生成，避免 localhost 导致手机无法访问）
      if (j.base) window.__SERVER_BASE__ = j.base;
      return true;
    }
    return false;
  } catch (e) { return false; }
}

function dbModeLabel() {
  return DB_MODE === 'server' ? '服务器模式（数据共享）' : '浏览器本机模式（数据仅存本机）';
}