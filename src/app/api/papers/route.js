export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    if (!query) {
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=5&fields=title,authors,url`;
    const apiRes = await fetch(apiUrl);
    const data = await apiRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
}