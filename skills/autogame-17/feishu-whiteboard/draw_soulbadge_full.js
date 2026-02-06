const { addNodes } = require('./draw')

function createNode(id, text, x, y, color) {
  return {
    id: id,
    type: 'composite_shape',
    composite_shape: { type: 'round_rect' },
    x: x,
    y: y,
    width: 180,
    height: 90,
    style: { fill_color: color, fill_opacity: 100 },
    text: { text: text, font_size: 14, horizontal_align: 'center' },
  }
}

function createArrow(startId, endId, text = '') {
  return {
    type: 'connector',
    connector: {
      start: { id: startId, side: 'right' },
      end: { id: endId, side: 'left' },
      arrow_style: 'triangle_arrow',
      caption: { content: text },
    },
  }
}

// Special downward arrow for parallel flows
function createDownArrow(startId, endId) {
  return {
    type: 'connector',
    connector: {
      start: { id: startId, side: 'bottom' },
      end: { id: endId, side: 'top' },
      arrow_style: 'triangle_arrow',
    },
  }
}

async function main() {
  const boardId = 'Qxqpwl88FhdtPtbitIjc015en7e'
  const nodes = []

  // Colors
  const C_USER = '#ffffff' // White
  const C_APP = '#bae7ff' // Blue
  const C_CLOUD = '#d9f7be' // Green
  const C_BADGE = '#efdbff' // Purple

  // --- Phase 1: Activation ---
  // (0,0)
  nodes.push(createNode('n1', '📦 用户: 撕开激活码\n下载 App', 0, 0, C_USER))
  nodes.push(createNode('n2', '📱 App: 输入激活码\n认证成功', 300, 0, C_APP))

  // --- Phase 2: Creation ---
  nodes.push(createNode('n3', '🎨 User: 创建角色\n(捏脸/设定)', 600, 0, C_USER))
  nodes.push(createNode('n4', '☁️ Cloud: 工作流生成\n(图/视/音)', 900, 0, C_CLOUD))

  // --- Phase 3: Binding (Hardware Branch) ---
  // Start a new row for Hardware parallel actions
  nodes.push(createNode('n5', '📛 Badge: 开机 & 配网\n(连接WiFi)', 300, 300, C_BADGE))
  nodes.push(createNode('n6', '📛 Badge: 生成信任码\n(Trust Code)', 600, 300, C_BADGE))

  // Back to App Flow
  nodes.push(createNode('n7', '📱 App: 输入信任码\n(需同WiFi)', 900, 300, C_APP))

  // --- Phase 4: Injection ---
  nodes.push(createNode('n8', '📤 App: 上传“灵魂包”\n(Inject Soul)', 1200, 150, C_APP)) // Merge point
  nodes.push(createNode('n9', '🔄 Badge: 转圈圈\n(接收/加载)', 1500, 150, C_BADGE))

  // --- Phase 5: Live ---
  nodes.push(createNode('n10', '✨ Badge: 待机展示\n(周期性动作)', 1800, 150, C_BADGE))
  nodes.push(createNode('n11', '👆 User: 触屏互动\n(激活反馈)', 2100, 150, C_USER))

  // --- Connectors ---
  // Flow 1
  nodes.push(createArrow('n1', 'n2'))
  nodes.push(createArrow('n2', 'n3'))
  nodes.push(createArrow('n3', 'n4'))

  // Flow 2 (Badge Setup)
  nodes.push(createArrow('n5', 'n6'))
  nodes.push(createArrow('n6', 'n7', '显示码'))

  // Merge
  nodes.push(createArrow('n4', 'n8', '资源就绪'))
  nodes.push(createArrow('n7', 'n8', '绑定成功'))

  // Final Flow
  nodes.push(createArrow('n8', 'n9'))
  nodes.push(createArrow('n9', 'n10'))
  nodes.push(createArrow('n10', 'n11'))

  try {
    console.log('Drawing Full User Story...')
    await addNodes(boardId, nodes)
    console.log('Success!')
  } catch (e) {
    console.error('Fail:', e.message)
  }
}

main()
