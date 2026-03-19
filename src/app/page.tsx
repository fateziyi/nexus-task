import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap, Users, BarChart2, MessageSquare, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: BarChart2,
    title: '实时任务看板',
    description: '使用 Pusher 驱动的实时看板，即时同步团队任务状态变更。',
  },
  {
    icon: Users,
    title: '多人协作',
    description: '支持在线成员感知，实时查看谁在同一项目中工作。',
  },
  {
    icon: MessageSquare,
    title: '任务评论',
    description: '在任务下直接发起讨论，评论实时推送给所有订阅成员。',
  },
]

async function getAuthStatus(): Promise<{ userId: string | null }> {
  try {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = await auth()
    return { userId }
  } catch {
    return { userId: null }
  }
}

export default async function Home() {
  const { userId } = await getAuthStatus()

  // 已登录用户直接跳转到 dashboard
  if (userId) {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
          <Zap className="h-3.5 w-3.5" />
          实时协作任务管理平台
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 max-w-2xl">
          让团队协作
          <span className="text-primary"> 高效流畅</span>
        </h1>

        <p className="text-lg text-muted-foreground mb-8 max-w-lg">
          Nexus Task 是一个现代化 SaaS 协作平台，支持实时任务看板、多人在线感知和即时评论通知。
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/sign-up">
            <Button size="lg" className="w-full sm:w-auto">
              免费开始使用
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              已有账号？登录
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t py-16 px-4">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">核心功能</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="flex flex-col items-center text-center p-6 rounded-xl border bg-card"
                >
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-4 text-center text-sm text-muted-foreground">
        <p>© 2025 Nexus Task · 基于 Next.js + Drizzle ORM + Pusher 构建</p>
      </footer>
    </div>
  )
}
