'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CalendarDays, MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteTask } from '@/app/actions/task-action'
import { cn } from '@/lib/utils'

export interface TaskCardProps {
  task: {
    id: string
    title: string
    description?: string | null
    status: 'todo' | 'in_progress' | 'done'
    priority: 'low' | 'medium' | 'high'
    dueDate?: Date | null
    assignedTo?: {
      id: string
      name?: string | null
      avatarUrl?: string | null
    } | null
    createdBy?: {
      id: string
      name?: string | null
    } | null
    _count?: {
      comments?: number
    }
  }
  projectId: string
  onClick?: () => void
  isOwner?: boolean
}

const priorityConfig = {
  low: { label: '低', variant: 'info' as const },
  medium: { label: '中', variant: 'warning' as const },
  high: { label: '高', variant: 'destructive' as const },
}

const statusConfig = {
  todo: { label: '待处理', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  done: { label: '已完成', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
}

export function TaskCard({ task, projectId, onClick, isOwner = false }: TaskCardProps) {
  const priority = priorityConfig[task.priority]

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确认删除此任务？')) return
    await deleteTask(task.id, projectId)
  }

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    : null

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'

  return (
    <div
      className="group bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* 优先级标识 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge variant={priority.variant} className="text-xs">
          {priority.label}优先级
        </Badge>
        {isOwner && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      {/* 任务标题 */}
      <h4 className={cn(
        "text-sm font-medium leading-snug mb-1",
        task.status === 'done' && 'line-through text-muted-foreground'
      )}>
        {task.title}
      </h4>

      {/* 任务描述 */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {/* 底部信息 */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {/* 截止日期 */}
          {formattedDueDate && (
            <span className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue ? 'text-red-500' : 'text-muted-foreground'
            )}>
              <CalendarDays className="h-3 w-3" />
              {formattedDueDate}
            </span>
          )}
          {/* 评论数 */}
          {(task._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {task._count?.comments}
            </span>
          )}
        </div>

        {/* 指派人头像 */}
        {task.assignedTo && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={task.assignedTo.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {task.assignedTo.name?.charAt(0).toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}
