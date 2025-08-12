import { NextResponse } from 'next/server';

export async function POST(req) {
  const { content } = await req.json();
  const response = await fetch("https://ai.hackclub.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert research assistant. Extract the 3 most important 4-6 word phrases from the given research content that would be most effective for finding relevant academic papers. Specific research topics or methodologies and terms that would appear in paper titles or abstracts
          Return ONLY a JSON array of exactly 3 phrases, ordered by importance (most important first). Make sure the phrases are directly from the content and not generated. If there are fewer than 4 words, that is acceptable too.`
        },
        {
          role: "user",
          content: `Extract the 3 most important research phrases from this content: ${content} Return only the JSON array of phrases.`
        }
      ],
      temperature: 0.1,
      max_tokens: 300
      })
    });

    let fixedResponse = await response.json()
    fixedResponse = fixedResponse.choices[0]?.message?.content
    .replace(/<think>[\s\S]*?<\/think>/g, '') // [\s\S] matches absolutely anything, including newlines
    .trim();
    let phrases;

    console.log(fixedResponse);
    try {
      phrases = JSON.parse(fixedResponse);
    } catch {
      const jsonMatch = fixedResponse.match(/\[.*\]/);
      if (jsonMatch) {
        phrases = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }
    const topPhrases = phrases.slice(0, 3).filter(phrase => 
      typeof phrase === 'string' && phrase.trim().length > 0
    );

    return NextResponse.json({ 
      phrases: topPhrases,
      count: topPhrases.length
    });

} 
