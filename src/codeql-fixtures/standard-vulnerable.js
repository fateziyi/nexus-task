/**
 * ⚠️  CodeQL 安全漏洞测试夹具（Standard JavaScript/Node.js）
 *
 * 本文件故意包含多种 Web 安全漏洞，仅用于验证 GitHub CodeQL 能否正确检测。
 * **切勿在生产代码中复制这些模式！禁止从应用代码 import 本文件。**
 *
 * 漏洞清单:
 *   1. 命令注入 (CWE-78) — exec() 拼接用户输入
 *   2. SQL 注入 (CWE-89) — 字符串拼接构造 SQL
 *   3. 路径遍历 (CWE-22) — 未校验的文件路径
 *   4. 开放重定向 (CWE-601) — 未验证的重定向目标
 *
 * CodeQL 污点分析原理:
 *   Source（数据入口）→ 传播路径 → Sink（危险操作）
 *   本文件所有漏洞的 Source = req.query（HTTP 查询参数，不可信输入）
 */

import express from "express";
import { exec } from "child_process";
import { Client } from "pg";
import path from "path";

const app = express();
const db = new Client();

// ============================================================
// 漏洞 1: 命令注入 (Command Injection / CWE-78)
//
// 污点链: req.query.directory → 字符串拼接 → exec()
//
// 攻击示例: ?directory=; rm -rf /
// 攻击者通过分号注入额外 shell 命令，导致服务器被控制
// ============================================================
app.get("/codeql-fixture/command-injection", (req, res) => {
  // 🚨 Source: 从 HTTP 查询参数获取用户输入（不可信）
  const directory = req.query.directory;

  // 🚨 Sink: 用户输入直接拼入 shell 命令，exec() 会执行任意系统命令
  exec("ls " + directory, (error, stdout) => {
    if (error) {
      res.status(500).send(error.message);
      return;
    }

    res.type("text/plain").send(stdout);
  });
});

// ============================================================
// 漏洞 2: SQL 注入 (SQL Injection / CWE-89)
//
// 污点链: req.query.userId → 字符串拼接 → db.query()
//
// 攻击示例: ?userId=1 OR 1=1
// 攻击者通过拼接 SQL 片段绕过 WHERE 条件，泄露整张表数据
// 安全替代: 使用参数化查询 db.query('SELECT * FROM users WHERE id = $1', [userId])
// ============================================================
app.get("/codeql-fixture/sql-injection", async (req, res) => {
  // 🚨 Source: 从 HTTP 查询参数获取用户输入（不可信）
  const userId = req.query.userId;

  // 🚨 Sink: 用户输入直接拼入 SQL 语句字符串，未参数化
  const query = "SELECT * FROM users WHERE id = " + userId;
  const result = await db.query(query);

  res.json(result.rows);
});

// ============================================================
// 漏洞 3: 路径遍历 (Path Traversal / CWE-22)
//
// 污点链: req.query.filename → path.join() → res.sendFile()
//
// 攻击示例: ?filename=../../../etc/passwd
// 攻击者通过 ../ 跳出 uploads 目录，读取服务器任意文件
// 安全替代: 校验路径不含 .. 且使用白名单前缀
// ============================================================
app.get("/codeql-fixture/path-traversal", (req, res) => {
  // 🚨 Source: 从 HTTP 查询参数获取文件名（不可信）
  const filename = req.query.filename;

  // 🚨 Sink: 未校验的文件名直接拼入路径，攻击者可跳出目标目录
  const filePath = path.join(__dirname, "uploads", filename);

  // 🚨 Sink: 将未校验的路径文件发送给客户端
  res.sendFile(filePath);
});

// ============================================================
// 漏洞 4: 开放重定向 (Open Redirect / CWE-601)
//
// 污点链: req.query.next → res.redirect()
//
// 攻击示例: ?next=https://evil-phishing.com
// 攻击者构造恶意链接，用户点击后跳转到钓鱼网站
// 安全替代: 校验 URL 以 / 开头（仅允许相对路径）或白名单域名
// ============================================================
app.get("/codeql-fixture/open-redirect", (req, res) => {
  // 🚨 Source: 从 HTTP 查询参数获取重定向目标（不可信）
  const next = req.query.next;

  // 🚨 Sink: 未验证重定向目标，攻击者可利用信任关系做钓鱼
  res.redirect(next);
});

export default app;
