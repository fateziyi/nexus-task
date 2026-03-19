import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getProjectById } from '@/app/actions/project-action'
import { getOrCreateUser } from '@/lib/get-or-create-user'
import { TaskBoard } from '@/components/task-board'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Building2, Calendar } from 'lucide-react'

interface ProjectPageProps {
  params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const clerkUser = await currentUser()
  if (!clerkUser) redirect('/sign-in')

  // 同步用户到 DB
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser.fullName ?? clerkUser.username ?? undefined
  const avatarUrl = clerkUser.imageUrl ?? undefined
  const dbUser = await getOrCreateUser(userId, email, name, avatarUrl)

  // 获取项目详情
  let project: Awaited<ReturnType<typeof getProjectById>> | null = null
  try {
    project = await getProjectById(projectId)
  } catch {
    // DB 未连接或权限不足
  }

  if (!project) {
    notFound()
  }

  // 转换 tasks 为 TaskBoard 需要的格式
  const tasks = (project.tasks ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as 'todo' | 'in_progress' | 'done',
    priority: task.priority as 'low' | 'medium' | 'high',
    dueDate: task.dueDate,
    assignedTo: task.assignedTo
      ? {
          id: task.assignedTo.id,
          name: task.assignedTo.name,
          avatarUrl: task.assignedTo.avatarUrl,
        }
      : null,
    createdBy: task.createdBy
      ? {
          id: task.createdBy.id,
          name: task.createdBy.name,
        }
      : null,
  }))

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/dashboard" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          仪表盘
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{project.name}</span>
      </div>

      {/* 项目标题区 */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {project.organization?.name}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}
              </span>
              <Badge variant="secondary" className="text-xs">
                {tasks.length} 个任务
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t mb-6" />

      {/* 任务看板 */}
      <TaskBoard
        projectId={projectId}
        initialTasks={tasks}
        currentUserId={dbUser.id}
      />
    </div>
  )
}
