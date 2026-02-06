const { addNodes } = require('./draw')

// Minimal Node
function createNode(text, x, y) {
  return {
    type: 'composite_shape',
    composite_shape: { type: 'round_rect' },
    x: x,
    y: y,
    width: 180,
    height: 90,
    style: { fill_color: '#ffffff', fill_opacity: 100 }, // Default white
    text: { text: text },
  }
}

async function main() {
  const boardId = 'Qxqpwl88FhdtPtbitIjc015en7e'
  const nodes = []

  // Just draw the nodes first without connectors to isolate the error
  // Phase 1
  nodes.push(createNode('n1: Unbox', 0, 0))
  nodes.push(createNode('n2: App Auth', 300, 0))
  nodes.push(createNode('n3: Create Role', 600, 0))
  nodes.push(createNode('n4: Cloud Gen', 900, 0))

  // Phase 3
  nodes.push(createNode('n5: Badge WiFi', 300, 300))
  nodes.push(createNode('n6: Trust Code', 600, 300))
  nodes.push(createNode('n7: App Bind', 900, 300))

  // Phase 4
  nodes.push(createNode('n8: Upload', 1200, 150))
  nodes.push(createNode('n9: Loading', 1500, 150))
  nodes.push(createNode('n10: Idle', 1800, 150))
  nodes.push(createNode('n11: Touch', 2100, 150))

  try {
    console.log('Drawing Nodes Only...')
    await addNodes(boardId, nodes)
    console.log('Success!')
  } catch (e) {
    console.error('Fail:', e.message)
  }
}

main()
