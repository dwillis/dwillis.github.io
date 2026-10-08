// Configuration - fixed paths to the source_files directory
const beatbookFile = 'source_files/talbot_beat_book.json';
const storiesFile = 'source_files/talbot_county_full.json';

let storiesData = [];
let currentArticleId = null;

function closeArticle() {
    document.getElementById('appContainer').classList.remove('split-view');
    currentArticleId = null;
}

// Close article panel with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeArticle();
    }
});

// Close article panel when clicking outside (on main panel)
document.addEventListener('click', (e) => {
    const appContainer = document.getElementById('appContainer');
    const articlePanel = document.getElementById('articlePanel');

    // Only if panel is open and click is outside the article panel
    if (appContainer.classList.contains('split-view') &&
        !articlePanel.contains(e.target) &&
        !e.target.classList.contains('sourced-content')) {
        closeArticle();
    }
});

// Hover preview functions
let previewTimeout = null;
const preview = document.getElementById('sourcePreview');

function showPreview(articleId, event) {
    const story = storiesData.find(s => s.article_id === articleId);
    if (!story) return;

    // Update preview content
    document.getElementById('previewTitle').textContent = story.title || 'Untitled';
    const authorName = formatAuthorName(story.author);
    document.getElementById('previewAuthor').textContent = authorName !== 'Unknown' ? `By ${authorName}` : '';
    document.getElementById('previewDate').textContent = story.date || '';

    // Get article content (after "Read News Document" marker) for preview
    const articleContent = extractArticleContent(story.content);
    const contentPreview = articleContent ?
        articleContent.replace(/\n/g, ' ').substring(0, 300) + '...' :
        'No content available.';
    document.getElementById('previewContent').textContent = contentPreview;

    // Position the preview anchored to the link element, using mouse X
    positionPreview(event);

    // Show with slight delay
    previewTimeout = setTimeout(() => {
        preview.classList.add('visible');
    }, 150);
}

function positionPreview(event) {
    const linkElement = event.target;
    const mouseX = event.clientX;
    const rect = linkElement.getBoundingClientRect();
    const previewWidth = 340;
    const previewHeight = 200; // Estimated height
    const gap = 8;
    const headerHeight = 52;

    // Remove previous position classes
    preview.classList.remove('above', 'below');

    // Calculate horizontal position - center on mouse X, but keep within viewport
    let left = mouseX - (previewWidth / 2);
    if (left < 10) left = 10;
    if (left + previewWidth > window.innerWidth - 10) {
        left = window.innerWidth - previewWidth - 10;
    }

    // Determine if preview should go above or below the link
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top - headerHeight;

    let top;
    if (spaceBelow >= previewHeight + gap || spaceBelow >= spaceAbove) {
        // Position below
        top = rect.bottom + gap;
        preview.classList.add('below');
    } else {
        // Position above
        top = rect.top - previewHeight - gap;
        preview.classList.add('above');
    }

    // Ensure not above header
    if (top < headerHeight + gap) {
        top = headerHeight + gap;
    }

    preview.style.left = left + 'px';
    preview.style.top = top + 'px';
}

function hidePreview() {
    clearTimeout(previewTimeout);
    preview.classList.remove('visible', 'above', 'below');
}

// movePreview no longer needed - preview is anchored to link

// Hide preview when scrolling to prevent positioning issues
document.addEventListener('DOMContentLoaded', () => {
    const mainPanel = document.querySelector('.main-panel');
    if (mainPanel) {
        mainPanel.addEventListener('scroll', hidePreview, { passive: true });
    }
});

setTimeout(() => {
    const mainPanel = document.querySelector('.main-panel');
    if (mainPanel) {
        mainPanel.addEventListener('scroll', hidePreview, { passive: true });
    }
}, 100);

// Helper function to format author name: remove emails and convert to title case
function formatAuthorName(author) {
    if (!author) return 'Unknown';

    // Remove email addresses (anything that looks like word@word.word)
    let cleaned = author.replace(/\s*[\w.-]+@[\w.-]+\.\w+\s*/g, ' ').trim();

    // Remove 'Capital News Service' (case insensitive)
    cleaned = cleaned.replace(/capital news service/gi, '').trim();

    // Remove 'University Of Maryland's Philip Merrill College Of Journalism' (case insensitive)
    cleaned = cleaned.replace(/university of maryland'?s? philip merrill college of journalism/gi, '').trim();

    // Handle multiple authors separated by semicolons
    const authors = cleaned.split(';').map(name => {
        // Trim and convert to title case
        return name.trim()
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());
    }).filter(name => {
        // Remove empty names and 'Capital News Service'
        return name.length > 0 && name.toLowerCase() !== 'capital news service';
    });

    return authors.join(', ') || 'Unknown';
}

// Helper function to extract article content after "Read News Document"
// and remove the copyright line at the bottom
function extractArticleContent(content) {
    if (!content) return '';

    let result = content;

    // Remove content before "Read News Document" marker
    const marker = 'Read News Document';
    const markerIndex = result.indexOf(marker);

    if (markerIndex !== -1) {
        // Return content after the marker, trimmed of leading whitespace/newlines
        result = result.substring(markerIndex + marker.length).trim();
    }

    // Remove copyright line at the bottom (starts with © Copyright)
    const copyrightIndex = result.indexOf('© Copyright');
    if (copyrightIndex !== -1) {
        result = result.substring(0, copyrightIndex).trim();
    }

    // Protect common abbreviations by temporarily replacing them
    const abbreviations = [
        ['U.S.', '<<US>>'],
        ['U.K.', '<<UK>>'],
        ['Ph.D.', '<<PHD>>'],
        ['M.D.', '<<MD>>'],
        ['Dr.', '<<DR>>'],
        ['Mr.', '<<MR>>'],
        ['Mrs.', '<<MRS>>'],
        ['Ms.', '<<MS>>'],
        ['Jr.', '<<JR>>'],
        ['Sr.', '<<SR>>']
    ];

    abbreviations.forEach(([abbr, placeholder]) => {
        result = result.replaceAll(abbr, placeholder);
    });

    // Fix missing line breaks: insert newline when a period is immediately followed by an uppercase letter
    // Only uppercase to avoid breaking URLs like "kent.k12.md.us" or abbreviations
    result = result.replace(/\.([A-Z])/g, '.\n$1');

    // Restore abbreviations
    abbreviations.forEach(([abbr, placeholder]) => {
        result = result.replaceAll(placeholder, abbr);
    });

    return result;
}

function openArticle(articleId) {
    // Hide any visible preview tooltip
    hidePreview();

    // If clicking the same article that's already open, toggle it closed
    const appContainer = document.getElementById('appContainer');
    if (currentArticleId === articleId && appContainer.classList.contains('split-view')) {
        closeArticle();
        return;
    }

    const story = storiesData.find(s => s.article_id === articleId);

    if (!story) {
        console.error('Story not found:', articleId);
        return;
    }

    // Set the title in the panel header
    document.getElementById('articlePanelTitle').textContent = story.title || 'Untitled';

    // Extract only the article content after "Read News Document"
    const articleContent = extractArticleContent(story.content);

    // Format author name and only show if known
    const authorName = formatAuthorName(story.author);
    const bylineHtml = authorName !== 'Unknown'
        ? `<span><strong>By:</strong> ${authorName}</span>`
        : '';

    // Build paragraphs with staggered animation delays
    const paragraphs = articleContent
        ? articleContent.split('\n')
            .filter(p => p.trim())
            .map((p, i) => `<p class="fade-in" style="animation-delay: ${0.15 + (i * 0.05)}s">${p.trim()}</p>`)
            .join('')
        : '<p class="fade-in" style="animation-delay: 0.15s">No content available.</p>';

    const articleHtml = `
        <div class="article-meta">
            <h1 class="fade-in" style="animation-delay: 0s">${story.title || 'Untitled'}</h1>
            <div class="meta-info fade-in" style="animation-delay: 0.05s">
                ${bylineHtml}
                <span><strong>Date:</strong> ${story.date || 'Unknown'}</span>
            </div>
        </div>
        <div class="article-content">
            ${paragraphs}
        </div>
    `;

    document.getElementById('articleContent').innerHTML = articleHtml;
    document.getElementById('articleContent').scrollTop = 0;
    document.getElementById('appContainer').classList.add('split-view');
    currentArticleId = articleId;
}

async function loadData() {
    try {
        // Load stories first
        try {
            const storiesResponse = await fetch(storiesFile);
            if (storiesResponse.ok) {
                storiesData = await storiesResponse.json();
            } else {
                console.warn('Failed to load stories file');
            }
        } catch (e) {
            console.warn('Error loading stories:', e);
        }

        const response = await fetch(beatbookFile);
        if (!response.ok) {
            throw new Error(`Failed to load ${beatbookFile}`);
        }
        const beatbookData = await response.json();

        // Reconstruct markdown from JSON entries, wrapping sourced content
        // Only link sources with similarity score >= threshold
        const SIMILARITY_THRESHOLD = 0.6;

        // Track previous source to only show underline for first in a series of duplicates
        let previousSource = null;

        const markdown = beatbookData.map((entry, index) => {
            // Check if source is a valid article ID (exists in our stories data)
            // AND has a similarity score >= threshold
            const hasSufficientSimilarity = entry.similarity !== undefined ? entry.similarity >= SIMILARITY_THRESHOLD : true;
            const isValidSource = entry.source && (storiesData.some(s => s.article_id === entry.source) || entry.source.startsWith('search-hits'));
            
            // Skip linking if the source article title contains "CALENDAR"
            const sourceStory = storiesData.find(s => s.article_id === entry.source);
            const isCalendar = sourceStory && sourceStory.title && sourceStory.title.includes('CALENDAR');

            if (isValidSource && hasSufficientSimilarity && !isCalendar) {
                // Only show underline for first sentence in a run of same-source sentences
                const isFirstInRun = entry.source !== previousSource;
                previousSource = entry.source;

                if (isFirstInRun) {
                    // Wrap content with a marker that we'll replace after markdown parsing
                    return `[[SOURCE:${index}]]${entry.content}[[/SOURCE:${index}]]`;
                }
            } else {
                // Reset previous source when we hit a non-sourced entry
                previousSource = null;
            }
            return entry.content;
        }).join('\n');

        // Parse markdown to HTML
        let html = marked.parse(markdown);

        // Replace source markers with styled spans
        beatbookData.forEach((entry, index) => {
            if (entry.source) {
                const startMarker = `[[SOURCE:${index}]]`;
                const endMarker = `[[/SOURCE:${index}]]`;

                // Find and replace the markers with styled content
                const regex = new RegExp(`\\[\\[SOURCE:${index}\\]\\](.*?)\\[\\[\\/SOURCE:${index}\\]\\]`, 'g');
                html = html.replace(regex, (match, content) => {
                    return `<span class="sourced-content" onclick="openArticle('${entry.source}')" onmouseenter="showPreview('${entry.source}', event)" onmouseleave="hidePreview()">${content}</span>`;
                });
            }
        });

        document.getElementById('content').innerHTML = html;

        // Apply staggered fade-in animation to all content elements
        const contentEl = document.getElementById('content');
        const elements = contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote, table, pre');
        elements.forEach((el, i) => {
            el.classList.add('fade-in');
            el.style.animationDelay = `${i * 0.03}s`;
        });

        // Initialize section navigation
        setTimeout(initSectionNavigation, 100); // Small delay to ensure layout
    } catch (error) {
        document.getElementById('content').innerHTML =
            `<p style="color: red;">Error loading beat book file: ${error.message}</p>
             <p>Make sure the file path is correct and the file exists.</p>
             <p>Expected files:</p>
             <ul>
                 <li>embeddings_format/output/beat_book.json</li>
                 <li>embeddings_format/output/source_stories.json</li>
             </ul>
             <p>Use md_to_beatbook_format.py to convert your markdown file to beat book JSON format.</p>`;
    }
}

// Initialize: load the data
loadData();

// Reading progress bar - optimized for smooth, instant updates
let ticking = false;

function updateReadingProgress() {
    const mainPanel = document.querySelector('.main-panel');
    const progressBar = document.getElementById('readingProgress');

    if (!mainPanel || !progressBar) return;

    const scrollTop = mainPanel.scrollTop;
    const scrollHeight = mainPanel.scrollHeight - mainPanel.clientHeight;

    if (scrollHeight > 0) {
        const progress = scrollTop / scrollHeight;
        progressBar.style.transform = `scaleX(${progress})`;
    }

    ticking = false;
}

function onScroll() {
    if (!ticking) {
        requestAnimationFrame(updateReadingProgress);
        ticking = true;
    }
}

// Attach scroll listener after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const mainPanel = document.querySelector('.main-panel');
    if (mainPanel) {
        mainPanel.addEventListener('scroll', onScroll, { passive: true });
    }
});

// Also attach after a short delay to ensure elements are ready
setTimeout(() => {
    const mainPanel = document.querySelector('.main-panel');
    if (mainPanel) {
        mainPanel.addEventListener('scroll', onScroll, { passive: true });
    }
}, 100);

// Section Navigation Logic
let sectionHeaders = [];
let isNavTicking = false;

function initSectionNavigation() {
    const content = document.getElementById('content');
    const headers = content.querySelectorAll('h2');
    const menu = document.getElementById('sectionMenu');
    sectionHeaders = [];
    menu.innerHTML = '';

    // Add "Introduction" as first item
    const firstItem = document.createElement('button');
    firstItem.className = 'section-menu-item active';
    firstItem.textContent = 'Introduction';
    firstItem.onclick = () => {
        document.querySelector('.main-panel').scrollTo({ top: 0, behavior: 'auto' });
        toggleSectionMenu();
    };
    menu.appendChild(firstItem);

    // Default current section
    document.getElementById('currentSectionText').textContent = 'Introduction';

    headers.forEach((header, index) => {
        // Ensure header has ID
        if (!header.id) {
            header.id = 'section-' + index;
        }

        // Truncate title at colon if present
        const fullTitle = header.textContent;
        const title = fullTitle.split(':')[0].trim();

        sectionHeaders.push({
            id: header.id,
            title: title,
            element: header
        });

        const item = document.createElement('button');
        item.className = 'section-menu-item';
        item.textContent = title;
        item.onclick = () => {
            // Scroll with offset for header
            const headerHeight = 52;
            const elementPosition = header.getBoundingClientRect().top;
            const offsetPosition = elementPosition + document.querySelector('.main-panel').scrollTop - headerHeight - 20;

            document.querySelector('.main-panel').scrollTo({
                top: offsetPosition,
                behavior: 'auto'
            });
            toggleSectionMenu();
        };
        menu.appendChild(item);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        const nav = document.getElementById('sectionNavigator');
        if (!nav.contains(e.target)) {
            nav.classList.remove('active');
        }
    });

    // Add scroll listener for spy
    const mainPanel = document.querySelector('.main-panel');
    if (mainPanel) {
        mainPanel.addEventListener('scroll', onNavScroll, { passive: true });
    }
}

function toggleSectionMenu() {
    document.getElementById('sectionNavigator').classList.toggle('active');
}

function onNavScroll() {
    if (!isNavTicking) {
        requestAnimationFrame(updateActiveSection);
        isNavTicking = true;
    }
}

function updateActiveSection() {
    const headerHeight = 52;
    const offset = 100; // Looking a bit down into the page

    let currentSection = 'Introduction';

    // Iterate to find the current section
    for (const section of sectionHeaders) {
        const rect = section.element.getBoundingClientRect();
        // Check if the top of the section is above the threshold
        if (rect.top <= headerHeight + offset) {
            currentSection = section.title;
        }
    }

    // Update Text if changed
    const currentText = document.getElementById('currentSectionText');
    if (currentText.textContent !== currentSection) {
        currentText.textContent = currentSection;

        // Update Menu Active State
        const items = document.querySelectorAll('.section-menu-item');
        items.forEach(item => {
            if (item.textContent === currentSection) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    isNavTicking = false;
}

// Check for resize events to disable animations
let resizeTimer;
window.addEventListener('resize', () => {
    document.body.classList.add('resize-animation-stopper');
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        document.body.classList.remove('resize-animation-stopper');
    }, 400);
});
