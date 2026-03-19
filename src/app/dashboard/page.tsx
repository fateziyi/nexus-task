import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserOrganizations } from '@/app/actions/project-action'
import { getOrCreateUser } from '@/lib/get-or-create-user'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreateOrgDialog, CreateProjectDialog } from '@/components/create-org-project-dialog'
import { Building2, FolderKanban, ChevronRight, CheckCircle2, Clock, Circle } from 'lucide-react'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const clerkUser = await currentUser()
  if (!clerkUser) redirect('/sign-in')

  // 同步用户到 DB
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser.fullName ?? clerkUser.username ?? undefined
  const avatarUrl = clerkUser.imageUrl ?? undefined
  await getOrCreateUser(userId, email, name, avatarUrl)

  // 获取用户的组织和项目
  let organizations: Awaited<ReturnType<typeof getUserOrganizations>> = []
  try {
    organizations = await getUserOrganizations()
  } catch {
    // DB 未连接时降级展示
  }

  const totalProjects = organizations.reduce((sum, org) => sum + (org.projects?.length ?? 0), 0)

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* 欢迎语 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          你好，{clerkUser.firstName ?? '用户'} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          欢迎回到 Nexus Task，这是你的工作空间总览。
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{organizations.length}</p>
                <p className="text-sm text-muted-foreground">个组织</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProjects}</p>
                <p className="text-sm text-muted-foreground">个项目</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">个任务完成</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 组织和项目列表 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">我的组织与项目</h2>
        <CreateOrgDialog />
      </div>

      {organizations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">还没有组织</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              创建一个组织来开始管理你的项目和团队
            </p>
            <CreateOrgDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {organizations.map((org) => (
            <div key={org.id}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{org.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] py-0">
                        {org.role === 'owner' ? '所有者' : org.role === 'admin' ? '管理员' : '成员'}
                      </Badge>
                    </p>
                  </div>
                </div>
                <CreateProjectDialog organizationId={org.id} organizationName={org.name} />
              </div>

              {/* 项目列表 */}
              {(org.projects?.length ?? 0) === 0 ? (
                <div className="border border-dashed rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground">该组织下暂无项目</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {org.projects?.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block"
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base group-hover:text-primary transition-colors">
                              {project.name}
                            </CardTitle>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
                          </div>
                          {project.description && (
                            <CardDescription className="line-clamp-2">
                              {project.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Circle className="h-3 w-3" />
                              创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
