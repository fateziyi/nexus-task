// src/lib/get-or-create-user.ts
// 根据 Clerk userId 在 DB 中查找或创建本地用户，返回本地 UUID

import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

// codeflicker-fix: DATA-Issue-001/agek6tph1o7sjkmd3vvy
/**
 * 根据 Clerk userId 获取或创建本地 DB 用户
 *
 * 修复：
 * 1. email 为空时抛出明确错误，防止空字符串写入 notNull 的 email 字段
 * 2. 改用 clerkId 作为 onConflictDoUpdate 的目标（而非 email），
 *    避免多个无 email 用户因 email 冲突被合并到同一行
 *
 * @param clerkUserId - Clerk 用户 ID（如 user_xxx）
 * @param email - 用户邮箱（必须是有效的非空字符串）
 * @param name - 用户姓名（可选）
 * @param avatarUrl - 用户头像 URL（可选）
 * @returns 本地 DB 用户记录
 * @throws 若 email 为空或无效则抛出错误
 */
export async function getOrCreateUser(
  clerkUserId: string,
  email: string,
  name?: string | null,
  avatarUrl?: string | null,
) {
  // 校验 email 非空且包含 @ 符号（基本格式校验）
  if (!email || !email.includes('@')) {
    throw new Error(
      `getOrCreateUser: email is required and must be valid. Got: "${email}" for clerkId: ${clerkUserId}`,
    )
  }

  // 先尝试通过 clerkId 查找（主路径，避免不必要的 insert）
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1)

  if (existingUsers.length > 0) {
    return existingUsers[0]
  }

  // 用户不存在，创建新用户
  // 使用 clerkId 作为冲突目标（比 email 更稳定，对应"外部身份唯一"语义）
  const [newUser] = await db
    .insert(users)
    .values({
      clerkId: clerkUserId,
      email,
      name: name ?? null,
      avatarUrl: avatarUrl ?? null,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email,
        name: name ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
      },
    })
    .returning()

  return newUser
}
