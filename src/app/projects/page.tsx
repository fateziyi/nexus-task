import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserOrganizations } from '@/app/actions/project-action'
import { getOrCreateUser } from '@/lib/get-or-create-user'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreateProjectDialog } from '@/components/create-org-project-dialog'
import { FolderKanban, Building2, ChevronRight, Circle, PlusCircle } from 'lucide-react'

export default async function ProjectsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const clerkUser = await currentUser()
  if (!clerkUser) redirect('/sign-in')

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name = clerkUser.fullName ?? clerkUser.username ?? undefined
  const avatarUrl = clerkUser.imageUrl ?? undefined
  await getOrCreateUser(userId, email, name, avatarUrl)

  let organizations: Awaited<ReturnType<typeof getUserOrganizations>> = []
  try {
    organizations = await getUserOrganizations()
  } catch {
    // DB 未连接时降级展示
  }

  // 将所有组织下的项目展平，附带组织信息
  const allProjects = organizations.flatMap((org) =>
    (org.projects ?? []).map((project) => ({
      ...project,
      orgName: org.name,
      orgId: org.id,
      orgRole: org.role,
    }))
  )

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* 页头 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6" />
            所有项目
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            共 {allProjects.length} 个项目，跨 {organizations.length} 个组织
          </p>
        </div>
      </div>

      {allProjects.length === 0 ? (
        /* 空状态 */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">还没有项目</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              先在仪表盘创建一个组织，再在组织下创建项目
            </p>
            <Link
              href="/dashboard"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <PlusCircle className="h-4 w-4" />
              前往仪表盘创建组织
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {organizations.map((org) => {
            const orgProjects = org.projects ?? []
            if (orgProjects.length === 0) return null
            return (
              <div key={org.id}>
                {/* 组织标题栏 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold">{org.name}</span>
                    <Badge variant="outline" className="text-[10px] py-0">
                      {org.role === 'owner' ? '所有者' : org.role === 'admin' ? '管理员' : '成员'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {orgProjects.length} 个项目
                    </span>
                  </div>
                  <CreateProjectDialog organizationId={org.id} organizationName={org.name} />
                </div>

                {/* 项目卡片网格 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orgProjects.map((project) => (
                    <Link key={project.id} href={`/projects/${project.id}`} className="block">
                      <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base group-hover:text-primary transition-colors">
                              {project.name}
                            </CardTitle>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-0.5 shrink-0" />
                          </div>
                          {project.description && (
                            <CardDescription className="line-clamp-2 text-sm">
                              {project.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Circle className="h-3 w-3" />
                            创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
