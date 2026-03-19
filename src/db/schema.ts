// src/db/schema.ts
import { pgTable, uuid, varchar, text, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 定义枚举类型
export const userRoles = pgEnum('user_role', ['owner', 'admin', 'member']);
export const taskStatus = pgEnum('task_status', ['todo', 'in_progress', 'done']);
export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high']);

// Users 表
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 256 }).unique(), // Clerk 用户 ID，用于关联认证
  email: varchar('email', { length: 256 }).unique().notNull(),
  name: varchar('name', { length: 256 }),
  avatarUrl: varchar('avatar_url', { length: 256 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Organizations 表
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 256 }).unique().notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Memberships (用户与组织的多对多关系)
export const memberships = pgTable('memberships', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: userRoles('role').default('member').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => {
  return {
    // 联合主键
    pk: uniqueIndex('memberships_pk').on(table.userId, table.organizationId),
  };
});

// Projects 表
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  // codeflicker-fix: DATA-Issue-002/agek6tph1o7sjkmd3vvy
  // 允许创建者被删除后项目仍保留（createdById 可置空），移除 notNull 以匹配 onDelete: 'set null'
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Tasks 表
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description'),
  status: taskStatus('status').default('todo').notNull(),
  priority: taskPriority('priority').default('medium').notNull(),
  dueDate: timestamp('due_date'),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  assignedToId: uuid('assigned_to_id').references(() => users.id, { onDelete: 'set null' }), // 任务指派人
  // codeflicker-fix: DATA-Issue-002/agek6tph1o7sjkmd3vvy
  // 移除 notNull 以匹配 onDelete: 'set null'，允许创建者被删除后任务仍保留
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Comments 表
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Files 表 (可以关联任务或评论)
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 256 }).notNull(),
  url: varchar('url', { length: 1024 }).notNull(), // S3或其他存储的URL
  mimeType: varchar('mime_type', { length: 256 }),
  size: varchar('size'), // 存储文件大小，例如 '1.2MB'
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'set null' }),
  uploadedById: uuid('uploaded_by_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// 定义表之间的关系，用于 join 查询
export const relationsConfig = relations(users, ({ many }) => ({
  organizations: many(organizations),
  projectsCreated: many(projects),
  tasksCreated: many(tasks),
  tasksAssigned: many(tasks),
  comments: many(comments),
  files: many(files),
  memberships: many(memberships),
}));

export const organizationRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  projects: many(projects),
  memberships: many(memberships),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
  }),
  comments: many(comments),
  files: many(files),
}));

export const commentRelations = relations(comments, ({ one, many }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  createdBy: one(users, {
    fields: [comments.createdById],
    references: [users.id],
  }),
  files: many(files),
}));

export const fileRelations = relations(files, ({ one }) => ({
  task: one(tasks, {
    fields: [files.taskId],
    references: [tasks.id],
  }),
  comment: one(comments, {
    fields: [files.commentId],
    references: [comments.id],
  }),
  uploadedBy: one(users, {
    fields: [files.uploadedById],
    references: [users.id],
  }),
}));

export const membershipRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
}));
