import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const minSJR = searchParams.get("minSJR") || "Q1";
  const maxResults = searchParams.get("maxResults") || 10;
  
  if (!query) {
    return NextResponse.json({ data: [] });
  }

  try {
    const allPapers = await scrapeMultipleSources(query, maxResults);
    
    const filteredPapers = minSJR !== "all" ? 
      await filterBySJRQuality(allPapers, minSJR) : 
      allPapers;
    
    return NextResponse.json({ data: filteredPapers });
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
    },
    {
      name: 'ScienceDirect',
      url: `https://www.sciencedirect.com/search?query=${encodeURIComponent(query)}`,
      parser: parseScienceDirectResults
    },
    {
      name: 'IEEE Xplore',
      url: `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encodeURIComponent(query)}`,
      parser: parseIEEEResults
    }
  ];

  for (const source of sources) {
    try {
      console.log(`Scraping from ${source.name}...`);
      
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000
      });
      
      if (response.status === 200) {
        const sourcePapers = await source.parser(response.data, query, maxResults);
        papers.push(...sourcePapers);
        console.log(`Found ${sourcePapers.length} papers from ${source.name}`);
      }
    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error.message);
    }
  }

  return papers;
}

async function filterBySJRQuality(papers, minSJR) {
  const sjrData = await getSJRData();
  const filteredPapers = [];
  
  for (const paper of papers) {
    try {
      const issn = extractISSN(paper);
      
      if (issn && sjrData[issn]) {
        const sjrQuintile = sjrData[issn].quintile;
        const sjrScore = sjrData[issn].score;
        
        if (isQualityPaper(sjrQuintile, minSJR)) {
          paper.sjrData = {
            quintile: sjrQuintile,
            score: sjrScore,
            journal: sjrData[issn].journal
          };
          filteredPapers.push(paper);
        }
      } else {
        paper.sjrData = { quintile: 'Unknown', score: 0, journal: 'Unknown' };
        filteredPapers.push(paper);
      }
    } catch (error) {
      console.error('Error filtering paper:', error);
      filteredPapers.push(paper);
    }
  }
  
  return filteredPapers;
}

function extractISSN(paper) {
  const url = paper.url || '';
  const abstract = paper.abstract || '';
  const title = paper.title || '';
  
  const urlIssnMatch = url.match(/issn[=:]\s*(\d{4}-\d{3}[\dX])/i);
  if (urlIssnMatch) return urlIssnMatch[1];
  
  const textIssnMatch = (abstract + ' ' + title).match(/\b\d{4}-\d{3}[\dX]\b/);
  if (textIssnMatch) return textIssnMatch[1];
  
  return null;
}

function isQualityPaper(sjrQuintile, minSJR) {
  const quintileOrder = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4, 'Q5': 5 };
  const minQuintile = quintileOrder[minSJR] || 1;
  const paperQuintile = quintileOrder[sjrQuintile] || 5;
  
  return paperQuintile <= minQuintile;
}

async function getSJRData() {
  return {
    '0001-0782': { quintile: 'Q1', score: 2.5, journal: 'Communications of the ACM' },
    '0018-9162': { quintile: 'Q1', score: 3.2, journal: 'Computer' },
    '0163-6804': { quintile: 'Q2', score: 1.8, journal: 'IEEE Communications Magazine' },
    '1041-4347': { quintile: 'Q1', score: 2.9, journal: 'IEEE Transactions on Knowledge and Data Engineering' },
    '1558-2256': { quintile: 'Q1', score: 3.1, journal: 'IEEE Transactions on Pattern Analysis and Machine Intelligence' },
    '0360-0300': { quintile: 'Q1', score: 4.2, journal: 'ACM Computing Surveys' },
    '0004-5411': { quintile: 'Q1', score: 2.8, journal: 'Journal of the ACM' },
    '0010-4620': { quintile: 'Q2', score: 1.5, journal: 'The Computer Journal' },
    '0167-8191': { quintile: 'Q1', score: 2.3, journal: 'Parallel Computing' },
    '0743-7315': { quintile: 'Q2', score: 1.7, journal: 'Journal of Parallel and Distributed Computing' }
  };
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
        
        const title = $element.find('h1, .title, .result-title').text().trim() || 'No title';
        const authors = $element.find('.authors-list, .authors, .result-authors').text().trim() || 'No authors';
        const abstract = $element.find('.abstract, .summary, .result-abstract').text().trim() || 'No abstract';
        
        const urlElement = $element.find('a[href*="/pubmed/"]').first();
        let url = '#';
        if (urlElement.length) {
          const href = urlElement.attr('href');
          url = href.startsWith('http') ? href : `https://pubmed.ncbi.nlm.nih.gov${href}`;
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

async function parseScienceDirectResults(html, query, maxResults) {
  const papers = [];
  const $ = cheerio.load(html);
  
  try {
    $('.ResultItem, .search-result').each((index, element) => {
      if (index >= maxResults) return false;
      
      try {
        const $element = $(element);
        
        const title = $element.find('.title-text, .result-title').text().trim() || 'No title';
        const authors = $element.find('.author, .result-authors').text().trim() || 'No authors';
        const abstract = $element.find('.abstract-text, .result-abstract').text().trim() || 'No abstract';
        
        const urlElement = $element.find('a[href*="/science/article/"]').first();
        let url = '#';
        if (urlElement.length) {
          const href = urlElement.attr('href');
          url = href.startsWith('http') ? href : `https://www.sciencedirect.com${href}`;
        }
        
        papers.push({
          paperId: Math.random().toString(36).substr(2, 9),
          title,
          authors: [{ name: authors }],
          abstract,
          url,
          source: 'ScienceDirect'
        });
      } catch (e) {
        console.error('Error parsing ScienceDirect result element:', e);
      }
    });
  } catch (error) {
    console.error('Error parsing ScienceDirect results:', error);
  }
  
  return papers;
}

async function parseIEEEResults(html, query, maxResults) {
  const papers = [];
  const $ = cheerio.load(html);
  
  try {
    $('.List-results, .search-result, .result-item').each((index, element) => {
      if (index >= maxResults) return false;
      
      try {
        const $element = $(element);
        
        const title = $element.find('.title, .result-title').text().trim() || 'No title';
        const authors = $element.find('.authors, .result-authors').text().trim() || 'No authors';
        const abstract = $element.find('.description, .result-abstract').text().trim() || 'No abstract';
        
        const urlElement = $element.find('a[href*="/document/"]').first();
        let url = '#';
        if (urlElement.length) {
          const href = urlElement.attr('href');
          url = href.startsWith('http') ? href : `https://ieeexplore.ieee.org${href}`;
        }
        
        papers.push({
          paperId: Math.random().toString(36).substr(2, 9),
          title,
          authors: [{ name: authors }],
          abstract,
          url,
          source: 'IEEE Xplore'
        });
      } catch (e) {
        console.error('Error parsing IEEE result element:', e);
      }
    });
  } catch (error) {
    console.error('Error parsing IEEE results:', error);
  }
  
  return papers;
}