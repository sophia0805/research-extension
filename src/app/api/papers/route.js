import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const maxResults = searchParams.get("maxResults") || 10;
  
  if (!query) {
    return NextResponse.json({ data: [] });
  }

  try {
    const allPapers = await scrapeMultipleSources(query, maxResults);
    
    return NextResponse.json({ data: allPapers });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ data: "Error scraping papers" });
  }
}

async function scrapeMultipleSources(query, maxResults) {
  const papers = [];
  
    const sources = [
    {
      name: 'arXiv',
      url: `https://arxiv.org/search/?query=${encodeURIComponent(query)}&searchtype=all&source=header`,
      parser: parseArxivResults
    },
    {
      name: 'PubMed',
      url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`,
      parser: parsePubMedResults
    }
  ];

  for (const source of sources) {
    try {
      console.log(`Scraping from ${source.name}...`);
      let response;
      if (source.isAPI) {
        response = await axios.get(source.url, {
          headers: {
            'X-ELS-APIKey': process.env.SCIENCEDIRECT_API_KEY,
            'Accept': 'application/json'
          },
          timeout: 10000
        });
      } else {
        response = await axios.get(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          timeout: 10000
        });
      }
      
      if (response.status === 200) {
        const sourcePapers = await source.parser(response.data, query, maxResults);
        papers.push(...sourcePapers);
        console.log(`Found ${sourcePapers.length} papers from ${source.name}`);
      }
    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);
      }
    }
  }

  return papers;
}

async function parseArxivResults(html, query, maxResults) {
  const papers = [];
  const $ = cheerio.load(html);
  
  try {
    $('.arxiv-result').each((index, element) => {
      if (index >= maxResults) return false;
      
      try {
        const $element = $(element);
        
        const title = $element.find('.title').text().trim() || 'No title';
        const authors = $element.find('.authors').text().trim() || 'No authors';
        const abstract = $element.find('.abstract-full').text().trim() || 'No abstract';
        
        const urlElement = $element.find('a[href*="/abs/"]').first();
        let url = '#';
        if (urlElement.length) {
          const href = urlElement.attr('href');
          url = href.startsWith('http') ? href : `https://arxiv.org${href}`;
        }
        papers.push({
          paperId: Math.random().toString(36).substr(2, 9),
          title,
          authors: [{ name: authors }],
          abstract,
          url,
          source: 'arXiv'
        });
      } catch (e) {
        console.error('Error parsing arXiv paper element:', e);
      }
    });
  } catch (error) {
    console.error('Error parsing arXiv results:', error);
  }
  return papers;
}

async function parsePubMedResults(html, query, maxResults) {
  const papers = [];
  const $ = cheerio.load(html);
  
  try {
    $('article, .result-item').each((index, element) => {
      if (index >= maxResults) return false;
      
      try {
        const $element = $(element);
        
        const title = $element.find('h1, .title, .result-title, .docsum-title, .title-link, a[href*="/pubmed/"]').text().trim() || 'No title';
        const authors = $element.find('.authors-list, .authors, .result-authors, .docsum-authors, .authors-short, .contributors').text().trim() || 'No authors';
        const abstract = $element.find('.abstract, .summary, .result-abstract, .docsum-snippet, .snippet').text().trim() || 'No abstract';
        
        let url = '#';
        const urlElement = $element.find('a[href*="/pubmed/"], a[href*="pubmed.ncbi.nlm.nih.gov"], .title-link a, .docsum-title a, a').first();

        const href = urlElement.attr('href');
        if (href && href !== '#') {
          url = href.startsWith('http') ? href : `https://pubmed.ncbi.nlm.nih.gov${href}`;
        } else {
          const pmidMatch = $element.html().match(/pubmed\/(\d+)/);
          if (pmidMatch) {
             url = `https://pubmed.ncbi.nlm.nih.gov/${pmidMatch[1]}/`;
          }
        }
        
        papers.push({
          paperId: Math.random().toString(36).substr(2, 9),
          title,
          authors: [{ name: authors }],
          abstract,
          url,
          source: 'PubMed'
        });
      } catch (e) {
        console.error('Error parsing PubMed article element:', e);
      }
    });
  } catch (error) {
    console.error('Error parsing PubMed results:', error);
  }
  
  return papers;
}