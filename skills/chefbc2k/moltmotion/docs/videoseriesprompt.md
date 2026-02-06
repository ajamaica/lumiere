LTX-2 Video Prompting Guide
This guide covers best practices for prompting Lightricks LTX-2, the 19B parameter audio-video generation model.

Key Difference from Previous Models
Aspect Old (Mochi) New (LTX-2)
Format Keyword tags Flowing paragraph
Style "cinematic, 8k" Written like a mini-screenplay
Action Brief keywords Temporal sequence
Camera "dolly zoom" "camera slowly pushes forward 2m"
Length Short tags ~150-200 words
Audio Not supported Dialogue in quotes, ambient sounds
The LTX-2 Prompt Formula
Write prompts as a single flowing paragraph with these elements in order:

Shot Type – "Close-up shot of...", "Wide aerial view of..."
Scene Setting – Environment, lighting, atmosphere
Character Details – Age, clothing, distinguishing features
Action (present tense!) – What happens moment by moment
Camera Movement – Explicit direction and distance
Audio – Ambient sounds, dialogue in quotes, music
Example Prompt
Close-up medium shot inside a cozy writers room bathed in warm amber lamplight. Three anthropomorphic lobsters with expressive faces sit around a weathered oak table covered in scattered papers and fountain pens. The central lobster, wearing round spectacles and a tweed vest, gestures dramatically with one claw while explaining a story beat. The camera slowly pushes inward as the other lobsters lean forward with interest, their antennae twitching. Soft film grain adds texture. 'And then,' the lead lobster says with passion, 'the hero reveals the truth.' Background music is a gentle piano melody.

Best Practices
Do's ✅
Use present tense for all actions ("walks", "tilts", "flickers")
Be precise with distances ("push-in 2m" not "move closer")
Keep prompts under 200 words
Describe emotions through physical cues, not abstract labels
Put dialogue in quotes with speaker context
Specify camera movement relative to subject
Don'ts ❌
Avoid vague words ("nice", "good", "interesting")
Don't use multiple scene changes or camera cuts
Avoid high-frequency patterns (checkered, brick)
No text/logos (not reliably rendered)
Don't overload with multiple subjects/actions
Audio Prompting
LTX-2 generates synchronized audio. Include:

Ambient sounds: "rain falling on pavement, distant thunder"
Dialogue: "'Welcome to the studio,' she says warmly"
Music: "gentle orchestral score in the background"
Resolution Constraints
Width and height must be divisible by 32
Default: 1280×704 (16:9-ish)
Portrait: 704×1280
Square: 768×768
Troubleshooting
Issue Solution
Static video Add specific motion verbs, explicit camera moves
Morphing/distortion Simplify prompt, fewer subjects
Wrong style Move style cues to start of prompt
Unstable motion Replace "handheld chaotic" with "subtle handheld, micro jitter"
