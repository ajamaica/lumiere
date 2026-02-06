const { addNodes } = require('./draw')

// Minimalist Node (Stripped down to absolute basics)
function createMinimalNode(text, x, y) {
  return {
    type: 'composite_shape',
    composite_shape: { type: 'rect' },
    x: x,
    y: y,
    width: 100,
    height: 50,
    // Omit style and text details if possible, or use defaults
    text: { text: text },
  }
}

async function main() {
  const boardId = 'N3UOwBzjNhgPyIbgH7vcWznSnRc'
  const nodes = [createMinimalNode('Minimal Test', 2500, 8500)]
  try {
    await addNodes(boardId, nodes)
    console.log('Minimal Success')
  } catch (e) {
    console.error('Minimal Fail:', e.message)
  }
}
main()
