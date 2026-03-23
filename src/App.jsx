import { useMemo, useState } from 'react'
import './App.css'

const frontendMaterials = [
  {
    type: 'hero',
    name: '横幅区块',
    defaults: {
      title: '夏季营销活动页',
      subtitle: '用组件拖拽搭建落地页、报名页和工作台页面。',
      badge: 'Campaign',
      buttonText: '立即报名',
    },
  },
  {
    type: 'feature',
    name: '卖点卡片',
    defaults: {
      title: '核心卖点',
      items: '快速上线\n拖拽配置\n实时预览',
    },
  },
  {
    type: 'form',
    name: '报名表单',
    defaults: {
      title: '活动报名表',
      fields: '姓名, 手机号, 公司, 职位',
      buttonText: '提交报名',
      helperText: '适合市场活动、线索收集、试用申请。',
    },
  },
]

const initialBackendResources = {
  models: [
    {
      id: 'order',
      name: '订单模型',
      fields: 'id|string|required\namount|number|required\nstatus|enum(created,paid,closed)|required\nbuyerId|string|required',
    },
    {
      id: 'ticket',
      name: '工单模型',
      fields: 'id|string|required\npriority|enum(P1,P2,P3)|required\nowner|string|optional\nstatus|enum(open,processing,done)|required',
    },
  ],
  connectors: [
    { id: 'mysql-main', name: 'MySQL 主库', kind: 'database' },
    { id: 'redis-cache', name: 'Redis 缓存', kind: 'cache' },
    { id: 'sms-service', name: '短信服务', kind: 'notification' },
    { id: 'erp-openapi', name: 'ERP OpenAPI', kind: 'integration' },
  ],
  workflow: {
    id: 'refund-process',
    name: '退款审批流程',
    nodes: [
      {
        id: 'start-1',
        type: 'trigger',
        title: '收到退款请求',
        detail: '事件触发: order.refund.requested',
      },
      {
        id: 'branch-1',
        type: 'branch',
        title: '判断退款金额',
        detail: 'amount > 1000 走财务复核',
      },
      {
        id: 'approve-1',
        type: 'approval',
        title: '客服初审',
        detail: '角色: customer_service',
      },
      {
        id: 'service-1',
        type: 'service',
        title: '调用支付网关退款',
        detail: 'connector: payment.refund',
      },
    ],
    actions: [
      { id: 'action-1', name: '写退款记录', type: 'db', config: 'table=refund_order' },
      { id: 'action-2', name: '发送短信通知', type: 'notify', config: 'template=refund_success' },
      { id: 'action-3', name: '同步 ERP', type: 'integration', config: 'endpoint=/refund/sync' },
    ],
  },
  apiFlow: {
    id: 'sync-order-api',
    name: '订单同步接口编排',
    steps: [
      { id: 'api-1', title: '接收 HTTP 请求', detail: 'POST /api/order/sync' },
      { id: 'api-2', title: '参数校验', detail: 'schema: orderSyncRequest' },
      { id: 'api-3', title: '查询库存服务', detail: 'service: inventory.check' },
      { id: 'api-4', title: '写入数据库', detail: 'model: order' },
      { id: 'api-5', title: '返回响应', detail: '200 OK + payload' },
    ],
  },
}

function createInitialFrontendState() {
  return {
    pageName: '活动着陆页',
    route: '/campaign/summer',
    selectedWidgetId: 'hero-1',
    widgets: [
      {
        id: 'hero-1',
        type: 'hero',
        title: '夏季增长训练营',
        subtitle: '一周搭出活动页、报名页和数据看板，不再等前端排期。',
        badge: 'Campaign',
        buttonText: '预约席位',
      },
      {
        id: 'feature-1',
        type: 'feature',
        title: '为什么用前端低代码',
        items: '拖拽搭建页面\n组件化复用\n无需手写页面结构',
      },
      {
        id: 'form-1',
        type: 'form',
        title: '训练营报名',
        fields: '姓名, 手机号, 公司, 职位',
        buttonText: '立即提交',
        helperText: '这是典型的前端低代码：页面、表单、组件和样式编排。',
      },
    ],
  }
}

function parseLines(raw) {
  return raw
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function createFrontendWidget(type) {
  const found = frontendMaterials.find((item) => item.type === type)
  return {
    id: `${type}-${crypto.randomUUID().slice(0, 8)}`,
    type,
    ...structuredClone(found.defaults),
  }
}

function moveItem(items, sourceId, targetIndex) {
  const next = [...items]
  const sourceIndex = next.findIndex((item) => item.id === sourceId)
  if (sourceIndex < 0) {
    return items
  }
  const normalizedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
  const [moved] = next.splice(sourceIndex, 1)
  next.splice(normalizedTarget, 0, moved)
  return next
}

function getBackendGeneratedResult(area, selectedModel, selectedWorkflowNode, selectedAction, selectedApiStep) {
  if (area === 'models') {
    return `CREATE TABLE ${selectedModel.id} (
  ${selectedModel.fields
    .split('\n')
    .map((line) => {
      const [field, type, rule] = line.split('|')
      return `${field} ${type} ${rule}`
    })
    .join(',\n  ')}
);`
  }

  if (area === 'workflow') {
    return `流程定义
节点: ${selectedWorkflowNode.title}
类型: ${selectedWorkflowNode.type}
说明: ${selectedWorkflowNode.detail}

执行效果:
1. 命中退款事件
2. 进入条件判断
3. 分配审批角色
4. 进入后续系统动作`
  }

  if (area === 'actions') {
    return `动作执行链
- ${selectedAction.name}
- 类型: ${selectedAction.type}
- 配置: ${selectedAction.config}

运行时效果:
调用连接器 -> 执行业务动作 -> 写审计日志`
  }

  return `接口编排结果
当前步骤: ${selectedApiStep.title}
说明: ${selectedApiStep.detail}

可生成:
- 接口请求链路
- 参数校验逻辑
- 调用服务编排
- 标准响应模板`
}

function App() {
  const [mode, setMode] = useState('frontend')
  const [frontend, setFrontend] = useState(createInitialFrontendState)
  const [backend, setBackend] = useState(initialBackendResources)
  const [selectedBackendArea, setSelectedBackendArea] = useState('workflow')
  const [selectedConnectorId, setSelectedConnectorId] = useState(initialBackendResources.connectors[0].id)
  const [selectedWorkflowNodeId, setSelectedWorkflowNodeId] = useState(initialBackendResources.workflow.nodes[0].id)
  const [selectedActionId, setSelectedActionId] = useState(initialBackendResources.workflow.actions[0].id)
  const [selectedApiStepId, setSelectedApiStepId] = useState(initialBackendResources.apiFlow.steps[0].id)
  const [dragging, setDragging] = useState(null)
  const [widgetDropIndex, setWidgetDropIndex] = useState(null)
  const [notice, setNotice] = useState('当前为前端低代码模式。')

  const selectedWidget = frontend.widgets.find((item) => item.id === frontend.selectedWidgetId) || null
  const selectedModel = backend.models[0]
  const selectedConnector = backend.connectors.find((item) => item.id === selectedConnectorId) || null
  const selectedWorkflowNode = backend.workflow.nodes.find((item) => item.id === selectedWorkflowNodeId) || null
  const selectedAction = backend.workflow.actions.find((item) => item.id === selectedActionId) || null
  const selectedApiStep = backend.apiFlow.steps.find((item) => item.id === selectedApiStepId) || null

  const frontendSchema = useMemo(
    () =>
      JSON.stringify(
        {
          pageName: frontend.pageName,
          route: frontend.route,
          widgets: frontend.widgets,
        },
        null,
        2,
      ),
    [frontend],
  )

  const backendSchema = useMemo(
    () =>
      JSON.stringify(
        {
          models: backend.models,
          connectors: backend.connectors,
          workflow: backend.workflow,
          apiFlow: backend.apiFlow,
        },
        null,
        2,
      ),
    [backend],
  )

  const backendGeneratedResult = useMemo(
    () =>
      getBackendGeneratedResult(
        selectedBackendArea,
        selectedModel,
        selectedWorkflowNode,
        selectedAction,
        selectedApiStep,
      ),
    [selectedAction, selectedApiStep, selectedBackendArea, selectedModel, selectedWorkflowNode],
  )

  function updateFrontendField(field, value) {
    setFrontend((current) => ({ ...current, [field]: value }))
  }

  function updateWidget(field, value) {
    setFrontend((current) => ({
      ...current,
      widgets: current.widgets.map((widget) =>
        widget.id === current.selectedWidgetId ? { ...widget, [field]: value } : widget,
      ),
    }))
  }

  function addWidget(type) {
    const next = createFrontendWidget(type)
    setFrontend((current) => ({
      ...current,
      widgets: [...current.widgets, next],
      selectedWidgetId: next.id,
    }))
    setNotice(`已新增前端组件: ${type}`)
  }

  function removeWidget() {
    if (!frontend.selectedWidgetId || frontend.widgets.length <= 1) {
      setNotice('前端页面至少保留一个组件。')
      return
    }

    const currentIndex = frontend.widgets.findIndex((widget) => widget.id === frontend.selectedWidgetId)
    const nextWidget = frontend.widgets[currentIndex + 1] || frontend.widgets[currentIndex - 1]

    setFrontend((current) => ({
      ...current,
      widgets: current.widgets.filter((widget) => widget.id !== current.selectedWidgetId),
      selectedWidgetId: nextWidget.id,
    }))
    setNotice('已删除当前前端组件。')
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setNotice(nextMode === 'frontend' ? '当前为前端低代码模式。' : '当前为后端低代码模式。')
  }

  function updateBackendModel(field, value) {
    setBackend((current) => ({
      ...current,
      models: current.models.map((model, index) => (index === 0 ? { ...model, [field]: value } : model)),
    }))
  }

  function updateBackendConnector(field, value) {
    setBackend((current) => ({
      ...current,
      connectors: current.connectors.map((connector) =>
        connector.id === selectedConnectorId ? { ...connector, [field]: value } : connector,
      ),
    }))
  }

  function updateBackendWorkflowNode(field, value) {
    setBackend((current) => ({
      ...current,
      workflow: {
        ...current.workflow,
        nodes: current.workflow.nodes.map((node) =>
          node.id === selectedWorkflowNodeId ? { ...node, [field]: value } : node,
        ),
      },
    }))
  }

  function updateBackendAction(field, value) {
    setBackend((current) => ({
      ...current,
      workflow: {
        ...current.workflow,
        actions: current.workflow.actions.map((action) =>
          action.id === selectedActionId ? { ...action, [field]: value } : action,
        ),
      },
    }))
  }

  function updateBackendApiStep(field, value) {
    setBackend((current) => ({
      ...current,
      apiFlow: {
        ...current.apiFlow,
        steps: current.apiFlow.steps.map((step) =>
          step.id === selectedApiStepId ? { ...step, [field]: value } : step,
        ),
      },
    }))
  }

  function renderFrontendCanvas() {
    return (
      <div className="canvas">
        {frontend.widgets.map((widget, index) => (
          <div key={widget.id}>
            <div
              className={widgetDropIndex === index ? 'drop-line is-active' : 'drop-line'}
              onDragOver={(event) => {
                event.preventDefault()
                setWidgetDropIndex(index)
              }}
              onDragLeave={() => setWidgetDropIndex(null)}
              onDrop={() => {
                if (dragging?.kind === 'canvas-widget') {
                  setFrontend((current) => ({
                    ...current,
                    widgets: moveItem(current.widgets, dragging.id, index),
                  }))
                  setNotice('已调整前端组件顺序。')
                }

                if (dragging?.kind === 'library-widget') {
                  const created = createFrontendWidget(dragging.type)
                  setFrontend((current) => {
                    const next = [...current.widgets]
                    next.splice(index, 0, created)
                    return {
                      ...current,
                      widgets: next,
                      selectedWidgetId: created.id,
                    }
                  })
                  setNotice(`已拖入前端组件: ${dragging.type}`)
                }

                setDragging(null)
                setWidgetDropIndex(null)
              }}
            >
              拖到这里
            </div>

            <button
              type="button"
              className={widget.id === frontend.selectedWidgetId ? 'canvas-block is-selected' : 'canvas-block'}
              onClick={() => setFrontend((current) => ({ ...current, selectedWidgetId: widget.id }))}
              draggable
              onDragStart={() => setDragging({ kind: 'canvas-widget', id: widget.id })}
            >
              {widget.type === 'hero' && (
                <div className="hero-widget">
                  <span>{widget.badge}</span>
                  <h2>{widget.title}</h2>
                  <p>{widget.subtitle}</p>
                  <strong>{widget.buttonText}</strong>
                </div>
              )}

              {widget.type === 'feature' && (
                <div className="feature-widget">
                  <h2>{widget.title}</h2>
                  <div className="feature-grid">
                    {parseLines(widget.items).map((item) => (
                      <article key={item} className="feature-card">
                        <strong>{item}</strong>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {widget.type === 'form' && (
                <div className="form-widget">
                  <h2>{widget.title}</h2>
                  <p>{widget.helperText}</p>
                  <div className="form-grid">
                    {widget.fields.split(',').map((field) => (
                      <label key={field.trim()}>
                        <span>{field.trim()}</span>
                        <input readOnly value="" placeholder={`请输入 ${field.trim()}`} />
                      </label>
                    ))}
                  </div>
                  <button type="button" className="primary-inline">
                    {widget.buttonText}
                  </button>
                </div>
              )}
            </button>
          </div>
        ))}

        <div
          className={widgetDropIndex === frontend.widgets.length ? 'drop-line is-active' : 'drop-line'}
          onDragOver={(event) => {
            event.preventDefault()
            setWidgetDropIndex(frontend.widgets.length)
          }}
          onDragLeave={() => setWidgetDropIndex(null)}
          onDrop={() => {
            if (dragging?.kind === 'canvas-widget') {
              setFrontend((current) => ({
                ...current,
                widgets: moveItem(current.widgets, dragging.id, current.widgets.length),
              }))
              setNotice('已调整前端组件顺序。')
            }

            if (dragging?.kind === 'library-widget') {
              addWidget(dragging.type)
            }

            setDragging(null)
            setWidgetDropIndex(null)
          }}
        >
          拖到末尾
        </div>
      </div>
    )
  }

  function renderBackendCanvas() {
    if (selectedBackendArea === 'workflow') {
      return (
        <div className="workflow-canvas">
          {backend.workflow.nodes.map((node, index) => (
            <div key={node.id} className="workflow-slot">
              <button
                type="button"
                className={node.id === selectedWorkflowNodeId ? 'workflow-node is-selected' : 'workflow-node'}
                onClick={() => setSelectedWorkflowNodeId(node.id)}
              >
                <div className="workflow-node-top">
                  <span>{node.type}</span>
                  <strong>{node.title}</strong>
                </div>
                <p>{node.detail}</p>
              </button>
              {index < backend.workflow.nodes.length - 1 && <div className="workflow-arrow" />}
            </div>
          ))}
        </div>
      )
    }

    if (selectedBackendArea === 'models') {
      return (
        <div className="backend-sheet">
          <div className="sheet-head">
            <h2>{selectedModel.name}</h2>
            <span>{selectedModel.id}</span>
          </div>
          <div className="model-table">
            <div className="model-row is-head">
              <span>字段</span>
              <span>类型</span>
              <span>规则</span>
            </div>
            {selectedModel.fields.split('\n').map((line) => {
              const [field, type, rule] = line.split('|')
              return (
                <div key={line} className="model-row">
                  <span>{field}</span>
                  <span>{type}</span>
                  <span>{rule}</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (selectedBackendArea === 'actions') {
      return (
        <div className="backend-sheet">
          <div className="sheet-head">
            <h2>动作编排</h2>
            <span>{backend.workflow.actions.length} 个动作</span>
          </div>
          <div className="action-list-large">
            {backend.workflow.actions.map((action, index) => (
              <button
                key={action.id}
                type="button"
                className={action.id === selectedActionId ? 'action-card-large is-selected' : 'action-card-large'}
                onClick={() => setSelectedActionId(action.id)}
              >
                <span>#{index + 1}</span>
                <strong>{action.name}</strong>
                <p>{action.type}</p>
                <code>{action.config}</code>
              </button>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="backend-sheet">
        <div className="sheet-head">
          <h2>{backend.apiFlow.name}</h2>
          <span>{backend.apiFlow.id}</span>
        </div>
        <div className="api-flow-list">
          {backend.apiFlow.steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={step.id === selectedApiStepId ? 'api-step-card is-selected' : 'api-step-card'}
              onClick={() => setSelectedApiStepId(step.id)}
            >
              <span>步骤 {index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-main">
          <div className="brand-mark">LC</div>
          <div>
            <p className="eyebrow">低代码产品展示</p>
            <h1>{mode === 'frontend' ? '前端低代码搭建器' : '后端低代码编排器'}</h1>
            <p className="topbar-subtitle">
              {mode === 'frontend'
                ? '面向活动页、报名页和运营页面的可视化搭建演示。'
                : '面向模型设计、流程配置、动作编排和接口处理的后端低代码演示。'}
            </p>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="mode-switch">
            <button type="button" className={mode === 'frontend' ? 'mode-btn is-active' : 'mode-btn'} onClick={() => switchMode('frontend')}>
              前端低代码
            </button>
            <button type="button" className={mode === 'backend' ? 'mode-btn is-active' : 'mode-btn'} onClick={() => switchMode('backend')}>
              后端低代码
            </button>
          </div>
        </div>
      </header>

      <div className="notice-bar">{notice}</div>

      {mode === 'frontend' ? (
        <main className="workspace">
          <aside className="left-rail">
            <section className="panel">
              <div className="panel-head">
                <h2>组件库</h2>
                <span>拖拽或点击加入页面</span>
              </div>
              <div className="library-list">
                {frontendMaterials.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className="library-card"
                    draggable
                    onDragStart={() => setDragging({ kind: 'library-widget', type: item.type })}
                    onClick={() => addWidget(item.type)}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.type}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>页面结构</h2>
                <span>{frontend.pageName}</span>
              </div>
              <div className="tree-list">
                {frontend.widgets.map((widget, index) => (
                  <button
                    key={widget.id}
                    type="button"
                    className={widget.id === frontend.selectedWidgetId ? 'tree-item is-selected' : 'tree-item'}
                    onClick={() => setFrontend((current) => ({ ...current, selectedWidgetId: widget.id }))}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{widget.title}</strong>
                    <small>{widget.type}</small>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="main-stage">
            <section className="panel stage-panel">
              <div className="panel-head">
                <h2>页面画布</h2>
                <span>{frontend.route}</span>
              </div>
              {renderFrontendCanvas()}
            </section>
          </section>

          <aside className="right-rail">
            <section className="panel">
              <div className="panel-head">
                <h2>属性配置</h2>
                <span>当前选中组件</span>
              </div>
              <div className="field-list">
                <label>
                  <span>页面名称</span>
                  <textarea rows={2} value={frontend.pageName} onChange={(event) => updateFrontendField('pageName', event.target.value)} />
                </label>
                <label>
                  <span>页面路由</span>
                  <textarea rows={2} value={frontend.route} onChange={(event) => updateFrontendField('route', event.target.value)} />
                </label>
                {selectedWidget && (
                  <>
                    <div className="section-title">当前组件</div>
                    <div className="inline-actions">
                      <button type="button" className="danger-btn" onClick={removeWidget}>
                        删除当前组件
                      </button>
                    </div>
                    {Object.entries(selectedWidget)
                      .filter(([key]) => !['id', 'type'].includes(key))
                      .map(([key, value]) => (
                        <label key={key}>
                          <span>{key}</span>
                          <textarea
                            rows={key === 'items' || key === 'fields' ? 6 : 2}
                            value={value}
                            onChange={(event) => updateWidget(key, event.target.value)}
                          />
                        </label>
                      ))}
                  </>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>前端低代码能力概览</h2>
              </div>
              <div className="explain-list">
                <p>支持页面布局、组件编排、表单配置与实时预览。</p>
                <p>适合活动页、运营页、工作台和数据录入场景的快速搭建。</p>
                <p>输出结果是一份可交付的页面 Schema，可继续接入运行时或代码生成链路。</p>
              </div>
              <textarea className="schema-editor" value={frontendSchema} readOnly />
            </section>
          </aside>
        </main>
      ) : (
        <main className="workspace">
          <aside className="left-rail">
            <section className="panel">
              <div className="panel-head">
                <h2>后端资源</h2>
                <span>选择一种后端低代码能力</span>
              </div>
              <div className="backend-mode-list">
                <button type="button" className={selectedBackendArea === 'models' ? 'tree-item is-selected' : 'tree-item'} onClick={() => setSelectedBackendArea('models')}>
                  <span>01</span>
                  <strong>数据模型设计</strong>
                  <small>定义表结构和字段规则</small>
                </button>
                <button type="button" className={selectedBackendArea === 'workflow' ? 'tree-item is-selected' : 'tree-item'} onClick={() => setSelectedBackendArea('workflow')}>
                  <span>02</span>
                  <strong>流程编排</strong>
                  <small>配置节点、角色和条件路由</small>
                </button>
                <button type="button" className={selectedBackendArea === 'actions' ? 'tree-item is-selected' : 'tree-item'} onClick={() => setSelectedBackendArea('actions')}>
                  <span>03</span>
                  <strong>动作链编排</strong>
                  <small>配置落库、通知、系统集成</small>
                </button>
                <button type="button" className={selectedBackendArea === 'api' ? 'tree-item is-selected' : 'tree-item'} onClick={() => setSelectedBackendArea('api')}>
                  <span>04</span>
                  <strong>接口编排</strong>
                  <small>配置接口处理步骤</small>
                </button>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>连接器</h2>
                <span>后端低代码常见组成</span>
              </div>
              <div className="tree-list compact">
                {backend.connectors.map((connector) => (
                  <button
                    key={connector.id}
                    type="button"
                    className={connector.id === selectedConnectorId ? 'tree-item is-selected' : 'tree-item'}
                    onClick={() => setSelectedConnectorId(connector.id)}
                  >
                    <span>{connector.kind}</span>
                    <strong>{connector.name}</strong>
                    <small>{connector.id}</small>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="main-stage">
            <section className="panel stage-panel">
              <div className="panel-head">
                <h2>
                  {selectedBackendArea === 'models'
                    ? '数据模型设计器'
                    : selectedBackendArea === 'workflow'
                      ? '审批流设计器'
                      : selectedBackendArea === 'actions'
                        ? '动作编排器'
                        : '接口编排器'}
                </h2>
                <span>这部分展示的是后端低代码，不是前端页面搭建</span>
              </div>

              <div className="backend-capability-bar">
                <article className="capability-card">
                  <span>数据模型</span>
                  <strong>{backend.models.length} 个</strong>
                  <p>配置字段、类型、约束和持久化结构。</p>
                </article>
                <article className="capability-card">
                  <span>流程引擎</span>
                  <strong>{backend.workflow.nodes.length} 个节点</strong>
                  <p>配置审批路由、角色分配和条件分支。</p>
                </article>
                <article className="capability-card">
                  <span>系统动作</span>
                  <strong>{backend.workflow.actions.length} 个动作</strong>
                  <p>配置落库、通知、外部系统同步。</p>
                </article>
              </div>

              {renderBackendCanvas()}
            </section>
          </section>

          <aside className="right-rail">
            <section className="panel">
              <div className="panel-head">
                <h2>资源说明</h2>
                <span>{selectedBackendArea === 'models' ? '当前模型' : selectedBackendArea === 'workflow' ? '当前节点' : selectedBackendArea === 'actions' ? '当前动作' : '当前步骤'}</span>
              </div>
              <div className="field-list">
                {selectedBackendArea === 'models' && selectedModel && (
                  <>
                    <label>
                      <span>模型 ID</span>
                      <textarea rows={2} value={selectedModel.id} onChange={(event) => updateBackendModel('id', event.target.value)} />
                    </label>
                    <label>
                      <span>模型名称</span>
                      <textarea rows={2} value={selectedModel.name} onChange={(event) => updateBackendModel('name', event.target.value)} />
                    </label>
                    <label>
                      <span>模型字段</span>
                      <textarea rows={10} value={selectedModel.fields} onChange={(event) => updateBackendModel('fields', event.target.value)} />
                    </label>
                  </>
                )}

                {selectedBackendArea === 'workflow' && selectedWorkflowNode && (
                  <>
                    <label>
                      <span>节点类型</span>
                      <textarea rows={2} value={selectedWorkflowNode.type} onChange={(event) => updateBackendWorkflowNode('type', event.target.value)} />
                    </label>
                    <label>
                      <span>节点标题</span>
                      <textarea rows={2} value={selectedWorkflowNode.title} onChange={(event) => updateBackendWorkflowNode('title', event.target.value)} />
                    </label>
                    <label>
                      <span>节点说明</span>
                      <textarea rows={4} value={selectedWorkflowNode.detail} onChange={(event) => updateBackendWorkflowNode('detail', event.target.value)} />
                    </label>
                  </>
                )}

                {selectedBackendArea === 'actions' && selectedAction && (
                  <>
                    <label>
                      <span>动作名称</span>
                      <textarea rows={2} value={selectedAction.name} onChange={(event) => updateBackendAction('name', event.target.value)} />
                    </label>
                    <label>
                      <span>动作类型</span>
                      <textarea rows={2} value={selectedAction.type} onChange={(event) => updateBackendAction('type', event.target.value)} />
                    </label>
                    <label>
                      <span>动作配置</span>
                      <textarea rows={4} value={selectedAction.config} onChange={(event) => updateBackendAction('config', event.target.value)} />
                    </label>
                  </>
                )}

                {selectedBackendArea === 'api' && selectedApiStep && (
                  <>
                    <label>
                      <span>步骤名称</span>
                      <textarea rows={2} value={selectedApiStep.title} onChange={(event) => updateBackendApiStep('title', event.target.value)} />
                    </label>
                    <label>
                      <span>步骤说明</span>
                      <textarea rows={4} value={selectedApiStep.detail} onChange={(event) => updateBackendApiStep('detail', event.target.value)} />
                    </label>
                  </>
                )}

                <label>
                  <span>当前连接器</span>
                  <textarea rows={2} value={`${selectedConnector.name} (${selectedConnector.kind})`} onChange={(event) => {
                    const raw = event.target.value
                    const matched = raw.match(/^(.*)\s+\((.*)\)$/)
                    if (matched) {
                      updateBackendConnector('name', matched[1])
                      updateBackendConnector('kind', matched[2])
                    } else {
                      updateBackendConnector('name', raw)
                    }
                  }} />
                </label>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>后端低代码能力概览</h2>
              </div>
              <div className="explain-list">
                <p>核心对象包括数据模型、流程节点、动作链、接口步骤和连接器。</p>
                <p>通过可视化配置替代重复性的后端控制逻辑编写。</p>
                <p>适合审批、工单、同步任务、集成编排等业务后台场景。</p>
              </div>
              <textarea className="schema-editor" value={backendSchema} readOnly />
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>生成结果预览</h2>
                <span>运行时产出</span>
              </div>
              <div className="explain-list">
                <p>
                  {selectedBackendArea === 'models' && '当前演示展示的是业务模型定义，可进一步生成表结构、校验规则或持久化配置。'}
                  {selectedBackendArea === 'workflow' && '当前演示展示的是流程引擎配置，可进一步生成审批流定义或任务路由规则。'}
                  {selectedBackendArea === 'actions' && '当前演示展示的是动作链配置，可进一步生成通知、落库和集成执行链。'}
                  {selectedBackendArea === 'api' && '当前演示展示的是接口编排配置，可进一步生成接口处理流程与调用顺序。'}
                </p>
              </div>
              <textarea className="schema-editor" value={backendGeneratedResult} readOnly />
            </section>
          </aside>
        </main>
      )}
    </div>
  )
}

export default App
