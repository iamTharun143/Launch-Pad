// Mock data matching docs/api-contract.md exactly

export const mockCurrentUser = {
  id: 'usr_launchpad_01',
  githubId: '12345678',
  username: 'octocat',
  avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
  createdAt: '2026-01-15T10:00:00.000Z',
}

export const mockUsers = [
  mockCurrentUser,
  {
    id: 'usr_dev_02',
    githubId: '87654321',
    username: 'alex-developer',
    avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
    createdAt: '2026-01-16T12:00:00.000Z',
  },
  {
    id: 'usr_viewer_03',
    githubId: '11223344',
    username: 'sarah-reviewer',
    avatarUrl: 'https://avatars.githubusercontent.com/u/9920?v=4',
    createdAt: '2026-01-17T14:30:00.000Z',
  },
]

export const initialProjects = [
  {
    id: 'proj_docs_01',
    name: 'docs-site',
    repoUrl: 'https://github.com/octocat/docs-site',
    buildCommand: 'npm run build',
    outputDir: 'dist',
    activeDeploymentId: 'dep_01',
    createdAt: '2026-01-20T08:00:00.000Z',
    role: 'OWNER',
  },
  {
    id: 'proj_portfolio_02',
    name: 'portfolio-app',
    repoUrl: 'https://github.com/octocat/portfolio',
    buildCommand: 'npm run build',
    outputDir: 'dist',
    activeDeploymentId: 'dep_03',
    createdAt: '2026-01-22T09:15:00.000Z',
    role: 'DEVELOPER',
  },
  {
    id: 'proj_dashboard_03',
    name: 'analytics-dash',
    repoUrl: 'https://github.com/octocat/analytics-dashboard',
    buildCommand: 'npm run build',
    outputDir: 'build',
    activeDeploymentId: null,
    createdAt: '2026-02-01T11:45:00.000Z',
    role: 'VIEWER',
  },
]

export const initialMembers = [
  {
    id: 'mem_01',
    projectId: 'proj_docs_01',
    userId: 'usr_launchpad_01',
    role: 'OWNER',
    user: {
      id: 'usr_launchpad_01',
      username: 'octocat',
      avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
    },
  },
  {
    id: 'mem_02',
    projectId: 'proj_docs_01',
    userId: 'usr_dev_02',
    role: 'DEVELOPER',
    user: {
      id: 'usr_dev_02',
      username: 'alex-developer',
      avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
    },
  },
  {
    id: 'mem_03',
    projectId: 'proj_docs_01',
    userId: 'usr_viewer_03',
    role: 'VIEWER',
    user: {
      id: 'usr_viewer_03',
      username: 'sarah-reviewer',
      avatarUrl: 'https://avatars.githubusercontent.com/u/9920?v=4',
    },
  },
  {
    id: 'mem_04',
    projectId: 'proj_portfolio_02',
    userId: 'usr_dev_02',
    role: 'OWNER',
    user: {
      id: 'usr_dev_02',
      username: 'alex-developer',
      avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
    },
  },
  {
    id: 'mem_05',
    projectId: 'proj_portfolio_02',
    userId: 'usr_launchpad_01',
    role: 'DEVELOPER',
    user: {
      id: 'usr_launchpad_01',
      username: 'octocat',
      avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
    },
  },
  {
    id: 'mem_06',
    projectId: 'proj_dashboard_03',
    userId: 'usr_dev_02',
    role: 'OWNER',
    user: {
      id: 'usr_dev_02',
      username: 'alex-developer',
      avatarUrl: 'https://avatars.githubusercontent.com/u/9919?v=4',
    },
  },
  {
    id: 'mem_07',
    projectId: 'proj_dashboard_03',
    userId: 'usr_launchpad_01',
    role: 'VIEWER',
    user: {
      id: 'usr_launchpad_01',
      username: 'octocat',
      avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
    },
  },
]

export const initialDeployments = [
  {
    id: 'dep_01',
    projectId: 'proj_docs_01',
    status: 'READY',
    commitSha: '7a1b8c9',
    triggeredBy: 'octocat',
    createdAt: '2026-02-02T14:00:00.000Z',
    finishedAt: '2026-02-02T14:01:25.000Z',
  },
  {
    id: 'dep_02',
    projectId: 'proj_docs_01',
    status: 'FAILED',
    commitSha: '5c2e3d1',
    triggeredBy: 'octocat',
    createdAt: '2026-02-01T10:10:00.000Z',
    finishedAt: '2026-02-01T10:11:05.000Z',
  },
  {
    id: 'dep_03',
    projectId: 'proj_portfolio_02',
    status: 'READY',
    commitSha: '9e4f1a2',
    triggeredBy: 'alex-developer',
    createdAt: '2026-02-02T11:20:00.000Z',
    finishedAt: '2026-02-02T11:22:10.000Z',
  },
]

export const initialLogs = {
  dep_01: [
    { id: 1, deploymentId: 'dep_01', line: '[build] Cloning repository https://github.com/octocat/docs-site...', createdAt: '2026-02-02T14:00:05.000Z' },
    { id: 2, deploymentId: 'dep_01', line: '[build] Checked out commit 7a1b8c9', createdAt: '2026-02-02T14:00:08.000Z' },
    { id: 3, deploymentId: 'dep_01', line: '[build] Running build command: npm run build', createdAt: '2026-02-02T14:00:12.000Z' },
    { id: 4, deploymentId: 'dep_01', line: '[vite] transforming...', createdAt: '2026-02-02T14:00:35.000Z' },
    { id: 5, deploymentId: 'dep_01', line: '[vite] ✓ built in 1.25s', createdAt: '2026-02-02T14:00:45.000Z' },
    { id: 6, deploymentId: 'dep_01', line: '[deploy] Assets placed in dist/', createdAt: '2026-02-02T14:01:10.000Z' },
    { id: 7, deploymentId: 'dep_01', line: '[deploy] Site live at http://docs-site.localhost:8000', createdAt: '2026-02-02T14:01:25.000Z' },
  ],
  dep_02: [
    { id: 1, deploymentId: 'dep_02', line: '[build] Cloning repository https://github.com/octocat/docs-site...', createdAt: '2026-02-01T10:10:05.000Z' },
    { id: 2, deploymentId: 'dep_02', line: '[build] Checked out commit 5c2e3d1', createdAt: '2026-02-01T10:10:10.000Z' },
    { id: 3, deploymentId: 'dep_02', line: '[build] Running build command: npm run build', createdAt: '2026-02-01T10:10:15.000Z' },
    { id: 4, deploymentId: 'dep_02', line: '[error] src/components/Header.jsx: Unterminated string constant', createdAt: '2026-02-01T10:10:45.000Z' },
    { id: 5, deploymentId: 'dep_02', line: '[build] Process exited with status code 1', createdAt: '2026-02-01T10:11:05.000Z' },
  ],
  dep_03: [
    { id: 1, deploymentId: 'dep_03', line: '[build] Cloning repository https://github.com/octocat/portfolio...', createdAt: '2026-02-02T11:20:05.000Z' },
    { id: 2, deploymentId: 'dep_03', line: '[build] Checked out commit 9e4f1a2', createdAt: '2026-02-02T11:20:12.000Z' },
    { id: 3, deploymentId: 'dep_03', line: '[build] Running build command: npm run build', createdAt: '2026-02-02T11:20:30.000Z' },
    { id: 4, deploymentId: 'dep_03', line: '[deploy] Site live at http://portfolio-app.localhost:8000', createdAt: '2026-02-02T11:22:10.000Z' },
  ],
}

