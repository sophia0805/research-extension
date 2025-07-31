import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { content } = await req.json();
    
    const aiResponse = await fetch("https://ai.hackclub.com/chat/completions", {
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
            Return ONLY a JSON array of exactly 3 phrases, ordered by importance (most important first). Make sure the phrases are directly from the content and not generated.`
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

    let response = await aiResponse.json()
    response = response.choices[0]?.message?.content.replace(/<think>.*?<\/think>/gs, '').trim();
    let phrases;
    
    console.log(response);
    try {
      phrases = JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\[.*\]/);
      if (jsonMatch) {
        phrases = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }
    if (!Array.isArray(phrases)) {
      throw new Error("AI response is not an array");
    }

    const topPhrases = phrases.slice(0, 3).filter(phrase => 
      typeof phrase === 'string' && phrase.trim().length > 0
    );

    return NextResponse.json({ 
      phrases: topPhrases,
      count: topPhrases.length
    });

  } catch (error) {
    console.error('Error extracting phrases:', error);
    return NextResponse.json({ 
      error: "Failed to extract phrases",
      details: error.message 
    }, { status: 500 });
  }
} 