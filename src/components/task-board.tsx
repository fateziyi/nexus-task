// components/task-board.tsx (React 客户端组件)
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { pusherClient } from '@/lib/pusher-client'
// codeflicker-fix: LOGIC-Issue-006/agek6tph1o7sjkmd3vvy
// 使用 useOptionalAuth 替代 useAuth，确保在 ClerkProvider 未挂载时不崩溃
import { useOptionalAuth } from '@/lib/use-optional-auth'
import { TaskCard, type TaskCardProps } from '@/components/task-card'
import { CreateTaskDialog } from '@/components/create-task-dialog'
import { updateTaskStatus } from '@/app/actions/task-action'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

type Task = TaskCardProps['task']

interface RealtimeTaskUpdate {
  taskId: string
  status: 'todo' | 'in_progress' | 'done'
  updatedAt: string
}

interface RealtimeTaskCreated {
  task: Task
}

interface RealtimeTaskDeleted {
  taskId: string
}

interface PresenceMember {
  user_id: string
  user_info?: {
    name: string
    avatar?: string
  }
}

const columns = [
  { id: 'todo' as const, label: '待处理', color: 'bg-slate-100 dark:bg-slate-800/50' },
  { id: 'in_progress' as const, label: '进行中', color: 'bg-blue-50 dark:bg-blue-950/30' },
  { id: 'done' as const, label: '已完成', color: 'bg-green-50 dark:bg-green-950/30' },
]

interface TaskBoardProps {
  projectId: string
  initialTasks: Task[]
  currentUserId?: string
}

export function TaskBoard({ projectId, initialTasks, currentUserId }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [onlineMembers, setOnlineMembers] = useState<PresenceMember[]>([])
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const { isSignedIn } = useOptionalAuth()

  // 同步 initialTasks 变化
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    if (!isSignedIn) return

    const channelName = `presence-project-${projectId}`
    const channel = pusherClient.subscribe(channelName)

    // 任务状态更新
    channel.bind('task-updated', (data: RealtimeTaskUpdate) => {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === data.taskId
            ? { ...task, status: data.status }
            : task
        )
      )
    })

    // 新任务创建
    channel.bind('task-created', (data: RealtimeTaskCreated) => {
      setTasks((prev) => {
        const exists = prev.find((t) => t.id === data.task.id)
        if (exists) return prev
        return [data.task, ...prev]
      })
    })

    // 任务删除
    channel.bind('task-deleted', (data: RealtimeTaskDeleted) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.taskId))
    })

    // 在线成员管理
    channel.bind('pusher:subscription_succeeded', (members: { each: (cb: (m: PresenceMember) => void) => void }) => {
      const currentMembers: PresenceMember[] = []
      members.each((member: PresenceMember) => {
        currentMembers.push(member)
      })
      setOnlineMembers(currentMembers)
    })

    channel.bind('pusher:member_added', (member: PresenceMember) => {
      setOnlineMembers((prev) => [...prev, member])
    })

    channel.bind('pusher:member_removed', (member: PresenceMember) => {
      setOnlineMembers((prev) => prev.filter((m) => m.user_id !== member.user_id))
    })

    return () => {
      channel.unbind_all()
      pusherClient.unsubscribe(channelName)
    }
  }, [projectId, isSignedIn])

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
      // codeflicker-fix: LOGIC-Issue-008/agek6tph1o7sjkmd3vvy
      // 修复：回滚时只回滚单个 task 的旧状态，避免覆盖 Pusher 实时推送带来的其他任务更新

      // 在乐观更新前记录该 task 的当前状态
      const prevStatus = tasks.find((t) => t.id === taskId)?.status
      if (!prevStatus) return

      setUpdatingTaskId(taskId)
      // 乐观更新
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      )
      try {
        await updateTaskStatus({ taskId, status: newStatus, projectId })
      } catch {
        // 仅回滚该单个 task 的旧状态，不影响其他 task
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t))
        )
      } finally {
        setUpdatingTaskId(null)
      }
    },
    [projectId, tasks]
  )

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    done: tasks.filter((t) => t.status === 'done'),
  }

  return (
    <div className="space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* 在线成员 */}
          {onlineMembers.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <div className="flex -space-x-2">
                {onlineMembers.slice(0, 5).map((member) => (
                  <Avatar
                    key={member.user_id}
                    className="h-6 w-6 border-2 border-background"
                    title={member.user_info?.name ?? ''}
                  >
                    <AvatarImage src={member.user_info?.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {member.user_info?.name?.charAt(0).toUpperCase() ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs">{onlineMembers.length} 人在线</span>
            </div>
          )}
        </div>

        <CreateTaskDialog projectId={projectId} />
      </div>

      {/* 看板列 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <div key={col.id} className={`rounded-lg p-3 ${col.color}`}>
            {/* 列标题 */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {tasksByStatus[col.id].length}
              </Badge>
            </div>

            {/* 任务卡片列表 */}
            <div className="space-y-2 min-h-[120px]">
              {tasksByStatus[col.id].length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                  暂无任务
                </div>
              ) : (
                tasksByStatus[col.id].map((task) => (
                  <div key={task.id} className="relative">
                    {updatingTaskId === task.id && (
                      <div className="absolute inset-0 bg-background/50 rounded-lg z-10 flex items-center justify-center">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <TaskCard
                      task={task}
                      projectId={projectId}
                      isOwner={task.createdBy?.id === currentUserId}
                    />
                    {/* 快速状态切换按钮 */}
                    <div className="flex gap-1 mt-1">
                      {columns
                        .filter((c) => c.id !== col.id)
                        .map((targetCol) => (
                          <button
                            key={targetCol.id}
                            onClick={() => handleStatusChange(task.id, targetCol.id)}
                            className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded bg-background/60 hover:bg-background transition-colors"
                          >
                            → {targetCol.label}
                          </button>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
