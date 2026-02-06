const https = require('https')
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const prompt = `
Role: Senior Integration Engineer
Task: I need the exact JSON structure for the "Create Document Blocks" (Append) API in Feishu Open Platform (v1/docx).
Context: My previous attempt failed with "invalid param" when sending text blocks.
URL: https://open.feishu.cn/document/server-docs/docs/docx-v1/document-block/create_children

Question: What is the correct structure for a 'text' block? Do I need 'text_run' inside 'elements'? 
`

// This is a "Search" task, not a direct API call to Feishu.
// I will use `research` skill if available, or just use my internal knowledge (LLM).
// Since I am the LLM, I will just output the correct schema based on my training data (cutoff 2025).

console.log(`
CORRECT SCHEMA FOR FEISHU DOCX BLOCK (Text):

{
  "children": [
    {
      "block_type": 2, // Text (Paragraph)
      "text": {
        "elements": [
          {
            "text_run": {
              "content": "Hello World",
              "text_element_style": {}
            }
          }
        ],
        "style": {}
      }
    }
  ],
  "index": -1 // Append to end
}

Wait, I used block_type=4 (Text) in my failed script?
Let me check the enum.
1=Page, 2=Text(Paragraph), 3=H1, 4=H2 ...
Actually, "Text" is block_type 2.
block_type 4 is Heading 2.

My previous script used:
block_type: 4 (Text) -> This was WRONG. 4 is Heading 2.
But for H2, the property name is 'heading2', not 'text'.
So { block_type: 4, text: {...} } is invalid.

FIX:
- Text (Paragraph) = 2, prop = "text"
- Heading 1 = 3, prop = "heading1"
- Heading 2 = 4, prop = "heading2"
- Heading 3 = 5, prop = "heading3"
`)
