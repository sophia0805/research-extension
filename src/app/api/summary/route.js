export async function POST(req) {
    const { title, abstract, url } = await req.json();
    const messages = [
        {
            role: 'system',
            content: 'You are a helpful assistant that summarizes papers.'
        },
        {
            role: 'user',
            content: `Summarize the following paper:\nTitle: ${title}\n${abstract ? `Abstract: ${abstract}\n` : ''}${url ? `URL: ${url}` : ''}. Don't include your thinking`
        }
    ];
    try {
        const response = await fetch('https://ai.hackclub.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: messages,
            }),
        });
        if (!response.ok) {
            throw new Error('AI API error');
        }
        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content || "No summary available.";
        return Response.json({ summary });
    } catch (err) {
        return Response.json({ summary: "Failed to generate summary." }, { status: 500 });
    }
}