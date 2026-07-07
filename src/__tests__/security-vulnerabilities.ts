/**
 * ⚠️  CodeQL 安全漏洞测试文件
 *
 * 本文件故意包含多种 Web 安全漏洞，仅用于验证 CodeQL 工作流能否正确检测。
 * **切勿在生产代码中复制这些模式！**
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// ============================================================
// 漏洞 1: SQL 注入 (SQL Injection)
// 用户输入直接拼接进 SQL 语句
// ============================================================
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  // 🚨 漏洞: 直接将用户输入拼接到 SQL 字符串
  const result = await db.execute(
    sql`SELECT * FROM users WHERE id = ${userId}` // drizzle 的 sql 模板本身是安全的，但这里演示原始拼接
  );

  // 🚨 更明显的漏洞: 原始字符串拼接
  const keyword = searchParams.get("keyword");
  const rawQuery = "SELECT * FROM tasks WHERE title LIKE '%" + keyword + "%'";
  await db.execute(sql.raw(rawQuery));

  return NextResponse.json({ result });
}

// ============================================================
// 漏洞 2: XSS — 不安全的 HTML 渲染
// 将用户输入直接作为 HTML 插入页面
// ============================================================
export function renderUserComment(comment: string): string {
  // 🚨 漏洞: 直接将用户输入拼进 HTML，未转义
  const html = `<div class="comment">${comment}</div>`;
  return html;
}

export function renderUserProfile(bio: string): string {
  // 🚨 漏洞: 使用 innerHTML 渲染用户输入
  const profileHtml = `<p class="bio">${bio}</p>`;
  return profileHtml;
}

// ============================================================
// 漏洞 3: 路径遍历 (Path Traversal)
// 用户输入直接用于文件路径
// ============================================================
import { readFileSync } from "fs";
import { join } from "path";

export function readUserFile(filename: string): string {
  // 🚨 漏洞: 用户可输入 ../../etc/passwd 读取任意文件
  const filePath = join("/uploads", filename);
  return readFileSync(filePath, "utf-8");
}

// ============================================================
// 漏洞 4: 命令注入 (Command Injection)
// 用户输入直接拼入 shell 命令
// ============================================================
import { execSync } from "child_process";

export function processUserInput(input: string): string {
  // 🚨 漏洞: 用户输入直接传入 shell 命令
  const result = execSync(`echo ${input}`).toString();
  return result;
}

export function gitOperation(repoName: string): string {
  // 🚨 漏洞: 未校验的仓库名拼入 git clone
  const output = execSync(`git clone ${repoName}`).toString();
  return output;
}

// ============================================================
// 漏洞 5: 硬编码密钥 (Hardcoded Credentials)
// 敏感信息直接写在源码中
// ============================================================
const DATABASE_PASSWORD = "super_secret_password_123!"; // 🚨 漏洞: 硬编码密码
const API_SECRET_KEY = "sk-abc123def456ghi789"; // 🚨 漏洞: 硬编码 API 密钥
const JWT_SECRET = "my-jwt-secret-key"; // 🚨 漏洞: 硬编码 JWT 密钥

export function connectToDatabase() {
  // 🚨 漏洞: 使用硬编码凭证连接数据库
  const connStr = `postgresql://admin:${DATABASE_PASSWORD}@db.example.com:5432/prod`;
  return connStr;
}

// ============================================================
// 漏洞 6: 不安全的随机数 (Insecure Randomness)
// 使用 Math.random() 生成安全相关 Token
// ============================================================
export function generateSessionToken(): string {
  // 🚨 漏洞: Math.random() 不具备密码学安全性
  const token = Math.random().toString(36).substring(2);
  return token;
}

export function generateResetCode(): string {
  // 🚨 漏洞: 同上，不应用于安全场景
  const code = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
  return code;
}

// ============================================================
// 漏洞 7: 不安全的反序列化 (Unsafe Deserialization)
// ============================================================
export function parseUserData(data: string): unknown {
  // 🚨 漏洞: eval 执行任意字符串
  const parsed = eval("(" + data + ")"); // eslint-disable-line no-eval
  return parsed;
}

// ============================================================
// 漏洞 8: SSRF — 服务端请求伪造
// 用户输入直接作为 URL 发起请求
// ============================================================
export async function fetchExternalResource(url: string) {
  // 🚨 漏洞: 用户可控制请求目标，访问内网服务
  const response = await fetch(url);
  return response.text();
}

export async function proxyRequest(targetUrl: string) {
  // 🚨 漏洞: 开放代理，攻击者可访问内网
  const data = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proxied: true }),
  });
  return data.json();
}

// ============================================================
// 漏洞 9: 正则表达式拒绝服务 (ReDoS)
// ============================================================
export function validateEmail(email: string): boolean {
  // 🚨 漏洞: 带有回溯爆炸的正则表达式
  const emailRegex = /^([a-zA-Z0-9])+([a-zA-Z0-9._%+-])*@([a-zA-Z0-9-])+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// ============================================================
// 漏洞 10: 不安全的重定向 (Open Redirect)
// ============================================================
export function handleRedirect(request: NextRequest): NextResponse {
  const redirectTo = request.nextUrl.searchParams.get("redirect");
  // 🚨 漏洞: 未验证重定向目标，可被利用做钓鱼
  return NextResponse.redirect(redirectTo || "/");
}
