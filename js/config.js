// ========== 站点配置 ==========
// 二维码地址自动识别，一般无需改动。
// 若您把系统部署到固定公网/Gitee 地址，可在此手动指定，例如：
//   const SITE_BASE = 'https://你的用户名.gitee.io/shebei-jieyong';
const SITE_BASE = '';

const APP_NAME = '设备借用登记助手';

const STORE_KEY = 'deviceDB_v1';

// 云端地址 localStorage 键名（管理端"云端设置"按钮配置）
const CLOUD_URL_KEY = 'cloudBaseUrl_v1';

// 读取 / 保存云端地址
function getCloudUrl() {
  return (localStorage.getItem(CLOUD_URL_KEY) || '').trim();
}
function setCloudUrl(url) {
  url = (url || '').trim();
  if (url) localStorage.setItem(CLOUD_URL_KEY, url);
  else localStorage.removeItem(CLOUD_URL_KEY);
}

// 生成二维码时使用的站点根地址
// 优先级: 界面配置的云端地址 > 手动配置 SITE_BASE > 服务器返回的局域网地址 > 当前页面地址
function siteBaseUrl() {
  const cloud = getCloudUrl();
  if (cloud) return cloud.replace(/\/+$/, '');
  if (SITE_BASE) return SITE_BASE.replace(/\/+$/, '');
  if (window.__SERVER_BASE__) return window.__SERVER_BASE__.replace(/\/+$/, '');
  const p = location.pathname;
  const dir = p.substring(0, p.lastIndexOf('/') + 1);
  return location.origin + dir;
}