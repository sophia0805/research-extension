import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
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
            content: `Extract exactly 3 phrases from the given content. Return ONLY a JSON array like ["phrase1", "phrase2", "phrase3"].`
          },
          {
            role: "user",
            content: `Content: ${content}\n\nExtract 3 phrases and return as JSON array:`
          }
        ],
        temperature: 0.1,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }

    let initialResponse = await response.json()
    console.log(initialResponse);
    
    if (!initialResponse.choices || !initialResponse.choices[0]?.message?.content) {
      throw new Error('AI service returned unexpected response format');
    }
    
    const fixedResponse = initialResponse.choices[0].message.content.replace(/<think>.*?<\/think>/gs, '').trim();
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
    
    console.log(phrases);
    return NextResponse.json({ 
      phrases: topPhrases,
      count: topPhrases.length
    });

  } catch (error) {
    console.error('Error in extract-phrases API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract phrases' },
      { status: 500 }
    );
  }
}