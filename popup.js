document.addEventListener('DOMContentLoaded', function() {
  const noSelectionEl = document.getElementById('noSelection');
  const hasSelectionEl = document.getElementById('hasSelection');
  const selectedTextEl = document.getElementById('selectedText');
  const findPapersBtn = document.getElementById('findPapers');
  const searchEngineSelect = document.getElementById('searchEngine');
  const loadingIndicatorEl = document.getElementById('loadingIndicator');
  const resultsContainerEl = document.getElementById('resultsContainer');
  const papersListEl = document.getElementById('papersList');
  const errorMessageEl = document.getElementById('errorMessage');
  const viewMoreBtn = document.getElementById('viewMoreBtn');
  
  let currentQuery = '';
  let currentSearchUrl = '';
  
  chrome.storage.local.get(['selectedText'], function(result) {
    if (result && result.selectedText && typeof result.selectedText === 'string' && result.selectedText.trim() !== '') {
      hasSelectionEl.style.display = 'block';
      selectedTextEl.textContent = result.selectedText;
    } else {
      noSelectionEl.style.display = 'block';
    }
  });

  findPapersBtn.addEventListener('click', function() {
    searchForPapers();
  });
  
  viewMoreBtn.addEventListener('click', function() {
    if (currentSearchUrl) {
      chrome.tabs.create({ url: currentSearchUrl });
    }
  });

  function searchForPapers() {
    chrome.storage.local.get(['selectedText'], function(result) {
      const selectedText = result && result.selectedText && typeof result.selectedText === 'string' ? 
        result.selectedText.trim() : '';
      
      if (selectedText !== '') {
        currentQuery = selectedText;
        const searchEngine = searchEngineSelect.value;
        
        loadingIndicatorEl.style.display = 'block';
        errorMessageEl.style.display = 'none';
        resultsContainerEl.style.display = 'none';
        
        switch(searchEngine) {
          case 'semantic':
            currentSearchUrl = `https://www.semanticscholar.org/search?q=${encodeURIComponent(selectedText)}`;
            fetchSemanticScholarResults(selectedText);
            break;
          case 'arxiv':
            currentSearchUrl = `https://arxiv.org/search/?query=${encodeURIComponent(selectedText)}&searchtype=all`;
            fetchArxivResults(selectedText);
            break;
          case 'crossref':
            currentSearchUrl = `https://search.crossref.org/?q=${encodeURIComponent(selectedText)}`;
            fetchCrossrefResults(selectedText);
            break;
          default:
            showError('Please select a valid search engine.');
            break;
        }
      }
    });
  }
  
  function fetchSemanticScholarResults(query) {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=5&fields=title,authors,year,abstract,url,venue`;
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Semantic Scholar response:', data);
        
        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
          const results = data.data.map(paper => ({
            title: paper.title || 'Untitled',
            abstract: paper.abstract || '',
            authors: paper.authors ? paper.authors.map(author => author.name || '') : [],
            year: paper.year || '',
            url: paper.url || '',
            venue: paper.venue || 'Semantic Scholar'
          }));
          
          displayResults(results, 'Semantic Scholar');
        } else {
          showError('No research papers found. Try a different search query.');
        }
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        showError('Error searching for papers. Please try again.');
      })
      .finally(() => {
        loadingIndicatorEl.style.display = 'none';
      });
  }
  
  function fetchArxivResults(query) {
    const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=0&max_results=5`;
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    
    xhr.onload = function() {
      if (xhr.status === 200) {
        console.log('arXiv response:', xhr.responseText);
        
        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xhr.responseText, 'text/xml');
          const entries = xmlDoc.getElementsByTagName('entry');
          
          if (entries && entries.length > 0) {
            const results = Array.from(entries).map(entry => {
              let title = entry.getElementsByTagName('title')[0]?.textContent || 'Untitled';
              title = title.replace(/\s+/g, ' ').trim();
              
              let abstract = entry.getElementsByTagName('summary')[0]?.textContent || '';
              abstract = abstract.replace(/\s+/g, ' ').trim();
              
              const authors = Array.from(entry.getElementsByTagName('author')).map(
                author => {
                  let name = author.getElementsByTagName('name')[0]?.textContent || '';
                  return name.trim();
                }
              ).filter(name => name.length > 0);
              
              const published = entry.getElementsByTagName('published')[0]?.textContent || '';
              const year = published ? new Date(published).getFullYear() : '';
              
              let url = '';
              const links = entry.getElementsByTagName('link');
              for (let i = 0; i < links.length; i++) {
                const link = links[i];
                if (link.getAttribute('title') === 'pdf') {
                  url = link.getAttribute('href') || '';
                  break;
                }
              }
              if (!url) {
                url = entry.getElementsByTagName('id')[0]?.textContent || '';
              }
              
              return {
                title,
                abstract,
                authors,
                year,
                url,
                venue: 'arXiv'
              };
            });
            
            console.log('Processed arXiv results:', results);
            displayResults(results, 'arXiv');
          } else {
            showError('No research papers found on arXiv. Try a different search query.');
          }
        } catch (e) {
          console.error('Error parsing arXiv XML:', e);
          showError('Error processing arXiv response. Please try again.');
        }
      } else {
        showError(`Error searching arXiv (${xhr.status}). Please try again.`);
      }
      loadingIndicatorEl.style.display = 'none';
    };
    
    xhr.onerror = function() {
      console.error('Error fetching data from arXiv');
      showError('Error connecting to arXiv. Please try again.');
      loadingIndicatorEl.style.display = 'none';
    };
    
    xhr.send();
  }
  
  function fetchCrossrefResults(query) {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=5&sort=relevance`;
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('Crossref response:', data);
        
        if (data && data.message && data.message.items && Array.isArray(data.message.items) && data.message.items.length > 0) {
          const results = data.message.items.map(item => {
            let authors = [];
            if (item.author && Array.isArray(item.author)) {
              authors = item.author.map(a => {
                const given = a.given || '';
                const family = a.family || '';
                return (given + ' ' + family).trim();
              }).filter(name => name.length > 0);
            }
            
            let title = 'Untitled';
            if (item.title && Array.isArray(item.title) && item.title.length > 0) {
              title = item.title[0];
            }
            
            let year = '';
            if (item.published && item.published['date-parts'] && 
                Array.isArray(item.published['date-parts']) && 
                item.published['date-parts'].length > 0 &&
                Array.isArray(item.published['date-parts'][0]) && 
                item.published['date-parts'][0].length > 0) {
              year = item.published['date-parts'][0][0];
            }
            
            let url = '';
            if (item.URL) {
              url = item.URL;
            } else if (item.link && Array.isArray(item.link) && item.link.length > 0 && item.link[0].URL) {
              url = item.link[0].URL;
            }
            
            let venue = 'Crossref';
            if (item['container-title'] && Array.isArray(item['container-title']) && item['container-title'].length > 0) {
              venue = item['container-title'][0];
            }
            
            return {
              title,
              abstract: item.abstract || '',
              authors,
              year,
              url,
              venue
            };
          });
          
          console.log('Processed Crossref results:', results);
          displayResults(results, 'Crossref');
        } else {
          showError('No research papers found on Crossref. Try a different search query.');
        }
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        showError('Error searching for papers. Please try again.');
      })
      .finally(() => {
        loadingIndicatorEl.style.display = 'none';
      });
  }
  
  function displayResults(results, source) {
    console.log(`Displaying ${results.length} results from ${source}`);
    
    papersListEl.innerHTML = '';
    
    if (!Array.isArray(results) || results.length === 0) {
      showError(`No results found from ${source}.`);
      return;
    }
    
    results.forEach(paper => {
      try {
        const paperElement = document.createElement('div');
        paperElement.className = 'paper-item';
        const title = typeof paper.title === 'string' ? paper.title : 'Untitled';
        let authorsText = '';
        if (Array.isArray(paper.authors) && paper.authors.length > 0) {
          const validAuthors = paper.authors.filter(author => typeof author === 'string' && author.trim() !== '');
          if (validAuthors.length > 0) {
            authorsText = validAuthors.slice(0, 3).join(', ');
            if (validAuthors.length > 3) {
              authorsText += ' et al.';
            }
          }
        }
        
        const abstract = typeof paper.abstract === 'string' ? paper.abstract.trim() : '';
        const year = paper.year !== undefined && paper.year !== null ? paper.year : 'N/A';
        const url = typeof paper.url === 'string' ? paper.url : '';
        const venue = typeof paper.venue === 'string' && paper.venue.trim() !== '' ? paper.venue : source;
        const abstractHtml = abstract ? 
          `<div class="paper-abstract">${abstract}<span class="expand-abstract">[+]</span></div>` : 
          '';
        
        paperElement.innerHTML = `
          <div class="paper-title">${title}</div>
          <div class="paper-authors">${authorsText}</div>
          <div>
            <span class="paper-year">${year}</span>
            <span class="paper-source">${venue}</span>
          </div>
          ${abstractHtml}
          ${url ? `<div class="paper-link"><a href="${url}" target="_blank">View Paper</a></div>` : ''}
        `;
        
        const abstractEl = paperElement.querySelector('.paper-abstract');
        const expandEl = paperElement.querySelector('.expand-abstract');
        if (abstractEl && expandEl) {
          expandEl.addEventListener('click', function() {
            if (abstractEl.classList.contains('expanded')) {
              abstractEl.classList.remove('expanded');
              expandEl.textContent = '[+]';
            } else {
              abstractEl.classList.add('expanded');
              expandEl.textContent = '[-]';
            }
          });
        }
        
        papersListEl.appendChild(paperElement);
      } catch (error) {
        console.error('Error displaying paper:', error, paper);
      }
    });
    
    if (papersListEl.children.length > 0) {
      resultsContainerEl.style.display = 'block';
    } else {
      showError(`Error displaying results from ${source}.`);
    }
  }
  
  function showError(message) {
    errorMessageEl.textContent = message;
    errorMessageEl.style.display = 'block';
    loadingIndicatorEl.style.display = 'none';
  }
  
  papersListEl.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link) {
      e.preventDefault();
      chrome.tabs.create({ url: link.href });
    }
  });
});