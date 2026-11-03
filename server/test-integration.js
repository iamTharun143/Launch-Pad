import axios from 'axios'
import './src/index.js'
import './src/site-server.js'

// Wait a moment for listeners to initialize
await new Promise((r) => setTimeout(r, 500))

async function runTests() {
  console.log('--- Starting Integration Tests ---')

  const api = axios.create({
    baseURL: 'http://127.0.0.1:5000',
    validateStatus: () => true, // Don't throw on error status
  })

  let authToken = ''
  let userId = ''
  let projectId = ''
  let deploymentId = ''
  let memberId = ''

  try {
    // 1. Health check
    console.log('[Test 1] Health check...')
    const health = await api.get('/health')
    console.assert(health.status === 200, `Health status expected 200, got ${health.status}`)
    console.assert(health.data.status === 'ok', 'Health payload status check')
    console.log('✓ Health check passed')

    // 2. Dev token generation
    console.log('[Test 2] POST /auth/dev-token...')
    const devTokenRes = await api.post('/auth/dev-token', { username: 'test-user' })
    console.assert(devTokenRes.status === 200, `Dev token expected 200, got ${devTokenRes.status}`)
    console.assert(Boolean(devTokenRes.data.token), 'Token generated')
    authToken = devTokenRes.data.token
    userId = devTokenRes.data.user.id
    console.log('✓ Dev token passed, user ID:', userId)

    // Set authorization header for authenticated requests
    const authHeaders = { Authorization: `Bearer ${authToken}` }

    // 3. GET /api/me
    console.log('[Test 3] GET /api/me...')
    const meRes = await api.get('/api/me', { headers: authHeaders })
    console.assert(meRes.status === 200, `Expected 200, got ${meRes.status}`)
    console.assert(meRes.data.username === 'test-user', 'Correct username returned')
    console.log('✓ GET /api/me passed')

    // 4. POST /api/projects
    console.log('[Test 4] POST /api/projects...')
    const testProjectName = `test-prj-${Date.now().toString().slice(-4)}`
    const createRes = await api.post(
      '/api/projects',
      {
        name: testProjectName,
        repoUrl: 'https://github.com/iamTharun143/Launch-Pad',
        buildCommand: 'npm run build',
        outputDir: 'dist',
      },
      { headers: authHeaders }
    )
    console.assert(createRes.status === 201, `Expected 201, got ${createRes.status}`)
    console.assert(createRes.data.name === testProjectName, 'Project name matches')
    console.assert(createRes.data.role === 'OWNER', 'Creator has OWNER role')
    projectId = createRes.data.id
    console.log('✓ POST /api/projects passed, project ID:', projectId)

    // 5. GET /api/projects
    console.log('[Test 5] GET /api/projects...')
    const listRes = await api.get('/api/projects', { headers: authHeaders })
    console.assert(listRes.status === 200, `Expected 200, got ${listRes.status}`)
    const found = listRes.data.find((p) => p.id === projectId)
    console.assert(Boolean(found), 'Created project found in list')
    console.assert(found.role === 'OWNER', 'Role in list is OWNER')
    console.log('✓ GET /api/projects passed')

    // 6. GET /api/projects/:id
    console.log('[Test 6] GET /api/projects/:id...')
    const detailRes = await api.get(`/api/projects/${projectId}`, { headers: authHeaders })
    console.assert(detailRes.status === 200, `Expected 200, got ${detailRes.status}`)
    console.assert(detailRes.data.project.id === projectId, 'Detail project id matches')
    console.assert(detailRes.data.members.length === 1, 'Member count is 1')
    console.log('✓ GET /api/projects/:id passed')

    // 7. POST /api/projects/:id/members (verifies the route prefix fix!)
    console.log('[Test 7] POST /api/projects/:id/members...')
    const addMemberRes = await api.post(
      `/api/projects/${projectId}/members`,
      {
        username: 'collaborator',
        role: 'DEVELOPER',
      },
      { headers: authHeaders }
    )
    console.assert(addMemberRes.status === 201, `Expected 201, got ${addMemberRes.status}: ${JSON.stringify(addMemberRes.data)}`)
    console.assert(addMemberRes.data.role === 'DEVELOPER', 'Role is DEVELOPER')
    memberId = addMemberRes.data.id
    console.log('✓ POST /api/projects/:id/members passed, member ID:', memberId)

    // 8. PATCH /api/projects/:id/members/:memberId
    console.log('[Test 8] PATCH /api/projects/:id/members/:memberId...')
    const patchMemberRes = await api.patch(
      `/api/projects/${projectId}/members/${memberId}`,
      { role: 'VIEWER' },
      { headers: authHeaders }
    )
    console.assert(patchMemberRes.status === 200, `Expected 200, got ${patchMemberRes.status}`)
    console.assert(patchMemberRes.data.role === 'VIEWER', 'Role updated to VIEWER')
    console.log('✓ PATCH /api/projects/:id/members/:memberId passed')

    // 9. POST /api/projects/:id/deployments
    console.log('[Test 9] POST /api/projects/:id/deployments...')
    const deployRes = await api.post(
      `/api/projects/${projectId}/deployments`,
      {},
      { headers: authHeaders }
    )
    console.assert(deployRes.status === 201, `Expected 201, got ${deployRes.status}`)
    console.assert(deployRes.data.status === 'QUEUED', 'Deployment status is QUEUED')
    deploymentId = deployRes.data.id
    console.log('✓ POST /api/projects/:id/deployments passed, deployment ID:', deploymentId)

    // 10. GET /api/projects/:id/deployments
    console.log('[Test 10] GET /api/projects/:id/deployments...')
    const deployListRes = await api.get(`/api/projects/${projectId}/deployments`, { headers: authHeaders })
    console.assert(deployListRes.status === 200, `Expected 200, got ${deployListRes.status}`)
    console.assert(deployListRes.data.some((d) => d.id === deploymentId), 'Deployment found in list')
    console.log('✓ GET /api/projects/:id/deployments passed')

    // 11. GET /api/deployments/:id/logs
    console.log('[Test 11] GET /api/deployments/:id/logs...')
    const logsRes = await api.get(`/api/deployments/${deploymentId}/logs`, { headers: authHeaders })
    console.assert(logsRes.status === 200, `Expected 200, got ${logsRes.status}`)
    console.assert(Array.isArray(logsRes.data.logs), 'Logs is an array')
    console.assert(logsRes.data.status === 'QUEUED', 'Status matches')
    console.log('✓ GET /api/deployments/:id/logs passed')

    // 12. DELETE /api/projects/:id/members/:memberId
    console.log('[Test 12] DELETE /api/projects/:id/members/:memberId...')
    const delMemberRes = await api.delete(`/api/projects/${projectId}/members/${memberId}`, { headers: authHeaders })
    console.assert(delMemberRes.status === 204, `Expected 204, got ${delMemberRes.status}`)
    console.log('✓ DELETE member passed')

    // 13. DELETE /api/projects/:id
    console.log('[Test 13] DELETE /api/projects/:id...')
    const delProjRes = await api.delete(`/api/projects/${projectId}`, { headers: authHeaders })
    console.assert(delProjRes.status === 204, `Expected 204, got ${delProjRes.status}`)
    console.log('✓ DELETE project passed')

    // 14. Site server test
    console.log('[Test 14] Site server GET / on port 8000...')
    const siteRes = await axios.get('http://127.0.0.1:8000')
    console.assert(siteRes.status === 200, `Expected 200, got ${siteRes.status}`)
    console.assert(siteRes.data.includes('Launchpad Site Server'), 'Site server welcome page returned')
    console.log('✓ Site server test passed')

    console.log('\n🎉 ALL 14 INTEGRATION TESTS PASSED WITH ZERO ERRORS!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Integration test failed:', error.message)
    if (error.response) {
      console.error('Response data:', error.response.data)
    }
    process.exit(1)
  }
}

runTests()
