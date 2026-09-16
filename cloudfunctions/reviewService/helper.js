/**
 * 校园帮帮云函数公共工具（PostgreSQL 版）
 * 注意：SCF 按函数目录独立打包，部署前本文件会复制到每个云函数目录中。
 * 数据访问：CloudBase PG exec-pgsql HTTP API（service_role API Key 经环境变量注入）
 */

const ENV_ID = process.env.ENV_ID || process.env.TCB_ENV || process.env.SCF_NAMESPACE || '';
const API_KEY = process.env.CLOUDBASE_API_KEY || '';
const ENDPOINT = `https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/exec-pgsql`;

const INFO_FEE_RATE = 0.05;
const MIN_INFO_FEE = 0.1;

function success(data) {
  return { code: 0, message: 'success', data };
}
function fail(message) {
  return { code: -1, message: message || '服务异常', data: null };
}

function calcInfoFee(price) {
  const fee = Math.round(Number(price) * INFO_FEE_RATE * 100) / 100;
  return Math.max(MIN_INFO_FEE, fee);
}

function genId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function qIdent(ident) {
  return `"${String(ident).replace(/"/g, '""')}"`;
}

/**
 * 执行参数化 SQL。云函数以 cloudbase_postgres（表 owner）身份访问，
 * 业务表开启了 RLS 且无策略，小程序端无法直连。
 */
async function pg(sql, parameters = []) {
  if (!ENV_ID) throw new Error('环境变量 ENV_ID 未配置');
  if (!API_KEY) throw new Error('环境变量 CLOUDBASE_API_KEY 未配置');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ sql, parameters, role: 'cloudbase_postgres' })
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`PG 接口返回非 JSON：${text.slice(0, 200)}`);
  }

  if (!res.ok || (json && !Array.isArray(json) && json.code)) {
    const err = new Error(json.message || json.error || `PG 执行失败（${res.status}）`);
    err.pgCode = json.code;
    throw err;
  }
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  return [];
}

async function one(sql, parameters = []) {
  const rows = await pg(sql, parameters);
  return rows[0] || null;
}

function mapOrder(row) {
  if (!row) return row;
  return Object.assign({}, row, {
    price: Number(row.price),
    infoFee: Number(row.infoFee),
    infoFeeRate: Number(row.infoFeeRate)
  });
}

function mapOrders(rows) {
  return (rows || []).map(mapOrder);
}

/**
 * 获取调用方微信 openid。
 * 优先 wx-server-sdk（微信云网关注入），并兼容多种事件注入位置。
 */
function getOpenid(event, context) {
  try {
    const cloud = require('wx-server-sdk');
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
    const ctx = cloud.getWXContext();
    if (ctx && ctx.OPENID) return ctx.OPENID;
  } catch (e) {
    // 当前为腾讯云 CloudBase 环境，wx-server-sdk 不可用时走兜底
  }
  const headers = (event && event.headers) || {};
  return (
    (context && context.openid) ||
    (event && event.userInfo && event.userInfo.openId) ||
    (event && event.openid) ||
    headers['x-wx-openid'] ||
    headers['X-WX-OPENID'] ||
    ''
  );
}

module.exports = {
  INFO_FEE_RATE,
  success,
  fail,
  calcInfoFee,
  genId,
  qIdent,
  pg,
  one,
  mapOrder,
  mapOrders,
  getOpenid
};
