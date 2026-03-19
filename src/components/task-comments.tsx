// components/task-comments.tsx (React 客户端组件)
'use client'

import React, { useEffect, useState, useRef, useTransition } from 'react'
import { pusherClient } from '@/lib/pusher-client'
// codeflicker-fix: LOGIC-Issue-006/agek6tph1o7sjkmd3vvy
// 使用 useOptionalAuth 替代 useAuth，确保在 ClerkProvider 未挂载时不崩溃
import { useOptionalAuth } from '@/lib/use-optional-auth'
import { addComment } from '@/app/actions/comment-action'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Comment {
  id: string
  content: string
  taskId: string
  userName: string
  userAvatar?: string | null
  createdAt: string | Date
}

interface TaskCommentsProps {
  taskId: string
  projectId: string
  initialComments: Comment[]
}

export function TaskComments({ taskId, projectId, initialComments }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()
  const { isSignedIn } = useOptionalAuth()
  const bottomRef = useRef<HTMLDivElement>(null)

  // 实时推送新评论
  useEffect(() => {
    if (!isSignedIn) return

    const channelName = `private-project-${projectId}`
    const channel = pusherClient.subscribe(channelName)

    channel.bind('new-comment', (data: Comment) => {
      if (data.taskId === taskId) {
        setComments((prev) => {
          // 避免重复添加
          const exists = prev.find((c) => c.id === data.id)
          if (exists) return prev
          return [...prev, data]
        })
      }
    })

    return () => {
      channel.unbind_all()
      pusherClient.unsubscribe(channelName)
    }
  }, [projectId, taskId, isSignedIn])

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !isSignedIn) return

    const trimmed = content.trim()
    setContent('')

    startTransition(async () => {
      await addComment({ taskId, content: trimmed, projectId })
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const formatTime = (date: string | Date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()

    if (diff < 60_000) return '刚刚'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* 评论列表 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-64">
        {comments.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            暂无评论，成为第一个评论的人吧！
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage src={comment.userAvatar ?? undefined} />
                <AvatarFallback className="text-xs">
                  {comment.userName?.charAt(0).toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium truncate">{comment.userName}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 mt-0.5 leading-relaxed break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* 评论输入区 */}
      <div className="mt-3 pt-3 border-t">
        {isSignedIn ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              placeholder="写下你的评论...（Ctrl+Enter 发送）"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none text-sm"
              disabled={isPending}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={!content.trim() || isPending}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {isPending ? '发送中...' : '发送'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            请登录后发表评论
          </p>
        )}
      </div>
    </div>
  )
}
