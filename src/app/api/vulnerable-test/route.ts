/**
 * ⚠️  CodeQL 安全漏洞测试文件
 *
 * 本文件故意包含多种 Web 安全漏洞，仅用于验证 CodeQL 工作流能否正确检测。
 * **切勿在生产代码中复制这些模式！**
 *
 * 关键：所有漏洞都写在 Next.js API Route Handler 中，
 * 这样 CodeQL 能追踪到从 HTTP Request Source → Dangerous Sink 的完整污点链。
 * 之前放在 __tests__/ 里没检测到，是因为：
 *   1. __tests__ 目录默认被 CodeQL 排除
 *   2. 独立函数接收普通 string 参数，CodeQL 无法证明来自不可信输入
 */

import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "drizzle-orm";
import { db } from "@/db";

// ============================================================
// 漏洞 1: SQL 注入 (CWE-89)
// 用户输入直接拼入 SQL 语句字符串，未参数化
// CodeQL 追踪链: request.searchParams → string concat → sql.raw() → db.execute()
// ============================================================
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const keyword = request.nextUrl.searchParams.get("keyword");

  // 🚨 漏洞: 用户输入通过字符串拼接构造 SQL，然后用 sql.raw() 执行
  // CodeQL 识别 sql.raw() 为 SQL 注入 sink
  const rawQuery =
    "SELECT * FROM users WHERE id = " +
    userId +
    " AND name LIKE '%" +
    keyword +
    "%'";
  const result = await db.execute(sql.raw(rawQuery));

  return NextResponse.json({ result });
}

// ============================================================
// 漏洞 2: 命令注入 (CWE-78)
// 用户输入直接拼入 shell 命令
// CodeQL 追踪链: request.searchParams → string concat → execSync()
// ============================================================
export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");
  const target = request.nextUrl.searchParams.get("target");

  // 🚨 漏洞: 用户输入直接传入 shell 命令
  // CodeQL 识别 execSync() 为命令注入 sink
  const output = execSync(`${action} ${target}`).toString();

  return NextResponse.json({ output });
}

// ============================================================
// 漏洞 3: 路径遍历 (CWE-22)
// 用户输入直接拼入文件路径
// CodeQL 追踪链: request.searchParams → path.join() → readFileSync()
// ============================================================
export async function PUT(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get("file");

  // 🚨 漏洞: 用户可输入 ../../etc/passwd 读取任意文件
  // CodeQL 识别 readFileSync() 路径参数为路径遍历 sink
  const filePath = join("/uploads", filename || "");
  const content = readFileSync(filePath, "utf-8");

  return NextResponse.json({ content });
}

// ============================================================
// 漏洞 4: SSRF — 服务端请求伪造 (CWE-918)
// 用户输入直接作为 fetch URL
// CodeQL 追踪链: request.searchParams → fetch()
// ============================================================
export async function DELETE(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  // 🚨 漏洞: 用户控制的 URL 直接传入 fetch()
  // CodeQL 识别 fetch() 为 SSRF sink
  const response = await fetch(url || "");

  return NextResponse.json({ data: await response.text() });
}

// ============================================================
// 漏洞 5: 不安全的重定向 / 开放重定向 (CWE-601)
// 用户输入直接用于重定向目标
// CodeQL 追踪链: request.searchParams → NextResponse.redirect()
// ============================================================
export async function PATCH(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get("redirect");

  // 🚨 漏洞: 未验证重定向目标，可被利用做钓鱼
  // CodeQL 识别 redirect/302 响应为开放重定向 sink
  return NextResponse.redirect(redirectTo || "/");
}

// ============================================================
// 漏洞 6: 硬编码凭证 (CWE-798)
// 敏感密钥直接写在源码中
// CodeQL 规则: js/hardcoded-credentials
// ============================================================
const DB_PASSWORD = "super_secret_password_123!"; // 🚨 漏洞: 硬编码数据库密码
const API_KEY = "sk-abc123def456ghi789"; // 🚨 漏洞: 硬编码 API 密钥

export async function OPTIONS() {
  // 🚨 漏洞: 使用硬编码凭证构造连接字符串
  const connStr = `postgresql://admin:${DB_PASSWORD}@db.example.com:5432/prod`;
  return NextResponse.json({ connStr });
}
