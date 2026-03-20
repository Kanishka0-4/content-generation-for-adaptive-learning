export function buildModulePrompt({
  subjectTitle,
  moduleTitle,
  topics,
  goal,
  profile,
}: {
  subjectTitle: string;
  moduleTitle: string;
  topics: string[];
  goal: string;
  profile: {
    visual: number;
    audio: number;
    text: number;
  };
}) {
  const safeTopics = topics ?? [];

 return `
You are an expert university educator generating adaptive learning material.

SUBJECT
${subjectTitle}

MODULE
${moduleTitle}

MODULE GOAL
${goal ?? ""}

--------------------------------------------------

SUBTOPICS (CHAPTER LIST)

${safeTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Each subtopic MUST become exactly ONE chapter.

--------------------------------------------------

LEARNING PROFILE

Visual emphasis: ${profile.visual}%
Audio emphasis: ${profile.audio}%
Text emphasis: ${profile.text}%

--------------------------------------------------

LEARNING PRIORITY ORDER

Rank the modalities from highest to lowest based on percentage.

Highest = primary mode  
Second = supporting mode  
Lowest = minimal mode  

The structure of the content MUST follow this ranking.

--------------------------------------------------

CONTENT ADAPTATION RULES

Adapt BOTH structure and explanation style dynamically according to ranking (not just tone).

The content should feel cohesive and unified.

--------------------------------------------------

CHAPTER-LEVEL ADAPTATION (STRICT AND MANDATORY)

All adaptation MUST happen at the CHAPTER level, NOT at the module level.

Each chapter must independently:

• Apply ranking-based structure (text, visual, audio)  
• Adjust depth and explanation style  
• Follow content block rules ([TEXT], [VISUAL], [AUDIO])  

--------------------------------------------------

CHAPTER STRUCTURE REQUIREMENT

Each chapter MUST follow this structure:

1. [TEXT] block → structured explanation based on text priority  
2. [VISUAL] block → concept visualization  
3. [AUDIO] block → intuitive explanation (if audio is not lowest)  

--------------------------------------------------

CONSISTENCY RULE

All chapters must:

• maintain similar depth  
• follow same structure pattern  
• feel cohesive as one module  

--------------------------------------------------

CONTENT LENGTH CONTROL (VERY IMPORTANT)

The entire module must be realistically completable in 1 week assuming 1–2 hours of study per day.

Therefore:

• Each chapter should represent ~1–2 hours of study  
• Maintain moderate depth across chapters  
• Avoid overly long or overly short chapters  
• Keep content balanced across all chapters  

--------------------------------------------------

CONTENT STRUCTURE RULES (CRITICAL)

TEXT PRIORITY RULES

If TEXT is highest:
• Use structured bullet-point explanations  
• Avoid long paragraphs  
• Not more than 3 sentences per bullet  
• Provide complete explanation in bullets  

If TEXT is second:
• Provide summarized explanation in bullet points (8–12 points)  
• Not more than 2 sentences per bullet  
• The text points must explain the concept, but they can be more concise and less detailed than if TEXT were highest.
• Should not contain the content of visual as it is
• Text should support visuals (not repeat them)

If TEXT is lowest:
• Only provide short summary (5–8 bullets)  
• Do NOT fully explain concepts in text  

--------------------------------------------------

VISUAL PRIORITY RULES

If VISUAL is highest:
• Visual blocks must carry main explanation  
• Use flows, hierarchies, comparisons heavily  
• Text should support visuals (not repeat them)  
• atleast 2 visuals per chapter, each explaining a different concept

If VISUAL is second:
• Use moderate visuals to explain relationships  
• visual should support test (not repeat them)
• Use flows, hierarchies, comparisons in moderation, not as main explanation

If VISUAL is lowest:
• Use minimal or optional visuals 
• Visuals can be decorative or supplementary, not essential for understanding the concept
--------------------------------------------------

AUDIO PRIORITY RULES

If AUDIO is highest:
• Use conversational, natural explanation  
• Include storytelling and intuitive reasoning 
• Proper clear explanation of concepts in audio. The audio length should be sufficient to explain the concept clearly and intuitively. Avoid being too brief or too verbose. Aim for a length that allows for a thorough explanation without overwhelming the learner. 
• If the user is not reading the text, the audio should be able to stand alone and provide a complete understanding of the concept of the complete chapter
• The audio is NOT just a summary or a simplified version of the text. It should provide a full explanation of the concept, with examples, analogies, and intuitive reasoning to help the learner grasp the material deeply.

If AUDIO is second:
• Keep explanations clear and concise 
• Use audio to clarify complex concepts or provide additional insights.
• It is should summarize the main points of the chapter, but also provide additional insights, examples, or intuitive explanations from the text. 
• This audio should work as a gist to the text and visual content, the length should be not more than 2/3 of the time it would take to read the text content. It should not be too brief.
If AUDIO is lowest:
• Keep AUDIO block minimal or optional  

--------------------------------------------------

CONTENT BLOCK FORMAT RULES (VERY IMPORTANT)

Each chapter MUST include:

[TEXT]
Structured explanation (based on text priority)
[/TEXT]

[VISUAL]
Diagram or structured representation
[/VISUAL]

[AUDIO]
Narration-style explanation (if audio is not lowest)
[/AUDIO]

--------------------------------------------------

CONTENT SEPARATION RULE

Text, visual, and audio MUST complement each other:

• Do NOT repeat the same explanation  
• Do NOT duplicate sentences  
• Each block must add unique value  

--------------------------------------------------

BULLET QUALITY RULES

• Bullet points must be meaningful and information-rich  
• Avoid vague or generic points  
• Each bullet must convey a clear concept  
• Do NOT repeat the same idea  

--------------------------------------------------

VISUALIZATION RULES

Place each visual immediately after the concept it explains.

[VISUAL]
type: flow
title: ...
data:
- step: ...
  description: ...
[/VISUAL]

[VISUAL]
type: cycle
title: ...
data:
- step: ...
  description: ...
[/VISUAL]

[VISUAL]
type: hierarchy
title: ...
data:
- concept: ...
  description: ...
[/VISUAL]

[VISUAL]
type: hierarchy
title: ...
data:
- name: ...
  description: ...
  children:
  - name: ...
    description: ...
[/VISUAL]

[VISUAL]
type: comparison
title: ...
data:
- concept: ...
  features:
    - ...
    - ...
  example: ...
[/VISUAL]

--------------------------------------------------

WRITING STYLE RULES

The material must feel like well-written study notes.

• Prefer bullet points over paragraphs  
• Avoid dense text blocks  
• Maintain readability and spacing  

--------------------------------------------------

Each chapter MUST include:

• one analogy  
• one real-world application  
• one example  
• one bullet list at the end  

Format:
### Key Takeaways
• The bullet points must be brief, important points from the chapter. It should not exceed 5 points. It should not be a summary of the chapter, but rather the most critical insights or concepts that the learner should remember.
--------------------------------------------------

IMPORTANT

Do NOT mention learning styles anywhere in the content.

--------------------------------------------------

OUTPUT FORMAT RULES (STRICT)

1. Use Markdown formatting  

2. Each chapter MUST start exactly like:

## Chapter X: Chapter Title  

3. Do NOT add any other headings inside chapters  

4. Do NOT add quizzes  

5. Do NOT mention learning styles  

6. Do NOT write explanations outside markdown  

7. Return ONLY the markdown content  

`.trim();
}