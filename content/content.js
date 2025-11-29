/**
 * Mobilism Enhancer - Content Script
 * Handles topic sorting by stats and filtering
 */

const STORAGE_KEYS = {
  MIN_VIEWS: 'minViews',
  MIN_REPLIES: 'minReplies',
  VISIBLE_COLUMNS: 'visibleColumns'
};

const DEFAULT_SETTINGS = {
  minViews: 0,
  minReplies: 0,
  visibleColumns: {
    topics: true,
    stats: true,
    lastPost: true
  }
};

// Load settings from storage
let settings = { ...DEFAULT_SETTINGS };
chrome.storage.local.get(Object.values(STORAGE_KEYS), (result) => {
  settings.minViews = result[STORAGE_KEYS.MIN_VIEWS] || DEFAULT_SETTINGS.minViews;
  settings.minReplies = result[STORAGE_KEYS.MIN_REPLIES] || DEFAULT_SETTINGS.minReplies;
  settings.visibleColumns = result[STORAGE_KEYS.VISIBLE_COLUMNS] || DEFAULT_SETTINGS.visibleColumns;
  initializeEnhancer();
});

function initializeEnhancer() {
  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceForumPage);
  } else {
    enhanceForumPage();
  }
}

function enhanceForumPage() {
  // Apply column visibility first
  applyColumnVisibility();

  // Find all topic tables
  const tables = document.querySelectorAll('table.footable.table.table-white.table-primary.table-hover');

  tables.forEach((table, index) => {
    // Skip if this is the services/announcements table (usually the first one)
    // But actually, we should enhance both for consistency
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Extract and sort topics
    const topicRows = Array.from(tbody.querySelectorAll('tr'));
    const topicData = topicRows.map((row, originalIndex) => ({
      row,
      originalIndex,
      stats: extractStats(row)
    }));

    // Sort by stats (views weighted more than replies)
    topicData.sort((a, b) => {
      const scoreA = calculateScore(a.stats);
      const scoreB = calculateScore(b.stats);
      return scoreB - scoreA; // Descending order
    });

    // Apply filter and update DOM
    topicData.forEach(({ row, stats }) => {
      const isVisible = stats.views >= settings.minViews && stats.replies >= settings.minReplies;

      if (isVisible) {
        row.classList.remove('enhancer-hidden');
        // Apply highlighting for hot topics
        applyHighlight(row, stats);
      } else {
        row.classList.add('enhancer-hidden');
      }

      // Re-append rows in sorted order (only visible ones)
      if (isVisible) {
        tbody.appendChild(row);
      }
    });

    // Add filter UI before the first table (announcements table)
    if (index === 0) { // Before announcements table
      addFilterControls(table);
    }
  });
}

function extractStats(row) {
  const statsCell = row.querySelector('td.stats-color');
  if (!statsCell) return { views: 0, replies: 0 };

  const subStats = statsCell.querySelectorAll('.sub-stats');
  let replies = 0;
  let views = 0;

  // Usually: replies first, then views
  if (subStats.length >= 2) {
    replies = parseInt(subStats[0].textContent) || 0;
    views = parseInt(subStats[1].textContent) || 0;
  }

  return { views, replies };
}

function calculateScore(stats) {
  // Weight views more than replies (70% views, 30% replies)
  return (stats.views * 0.7) + (stats.replies * 0.3);
}

function applyHighlight(row, stats) {
  // Remove any previous highlight classes
  row.classList.remove('enhancer-hot', 'enhancer-very-hot');

  const score = calculateScore(stats);

  // Define thresholds based on weighted score
  const veryHotThreshold = 3500; // ~5000 views or equivalent
  const hotThreshold = 700; // ~1000 views or equivalent

  if (score >= veryHotThreshold) {
    row.classList.add('enhancer-very-hot');
  } else if (score >= hotThreshold) {
    row.classList.add('enhancer-hot');
  }
}

function addFilterControls(table) {
  // Check if controls already exist
  if (document.getElementById('enhancer-filter-controls')) {
    return;
  }

  const container = document.createElement('div');
  container.id = 'enhancer-filter-controls';
  container.className = 'enhancer-filter-panel';

  const html = `
    <div class="enhancer-filter-content">
      <div class="enhancer-filters-section">
        <span class="enhancer-filter-label">Filter:</span>

        <div class="enhancer-filter-group">
          <label>
            <span class="enhancer-filter-text">Views:</span>
            <input type="number" id="enhancer-min-views" min="0" step="100" value="${settings.minViews}" class="enhancer-input">
          </label>
        </div>

        <div class="enhancer-filter-group">
          <label>
            <span class="enhancer-filter-text">Replies:</span>
            <input type="number" id="enhancer-min-replies" min="0" step="5" value="${settings.minReplies}" class="enhancer-input">
          </label>
        </div>

        <button id="enhancer-reset-filters" class="enhancer-btn enhancer-btn-secondary">Reset</button>
      </div>

      <span class="enhancer-filter-divider">|</span>

      <div class="enhancer-columns-section">
        <span class="enhancer-filter-label">Columns:</span>

        <div class="enhancer-filter-group">
          <label class="enhancer-checkbox-label">
            <input type="checkbox" id="enhancer-col-topics" ${settings.visibleColumns.topics ? 'checked' : ''} class="enhancer-checkbox">
            <span data-column="topics">Topics</span>
          </label>
        </div>

        <div class="enhancer-filter-group">
          <label class="enhancer-checkbox-label">
            <input type="checkbox" id="enhancer-col-stats" ${settings.visibleColumns.stats ? 'checked' : ''} class="enhancer-checkbox">
            <span data-column="stats">Stats</span>
          </label>
        </div>

        <div class="enhancer-filter-group">
          <label class="enhancer-checkbox-label">
            <input type="checkbox" id="enhancer-col-lastpost" ${settings.visibleColumns.lastPost ? 'checked' : ''} class="enhancer-checkbox">
            <span data-column="lastPost">Last Post</span>
          </label>
        </div>
      </div>

      <span id="enhancer-topic-count" class="enhancer-topic-count"></span>
    </div>
  `;

  container.innerHTML = html;
  table.parentElement.insertBefore(container, table);

  // Setup event listeners for filters
  document.getElementById('enhancer-min-views').addEventListener('change', (e) => {
    settings.minViews = parseInt(e.target.value) || 0;
    saveSettings();
    applyFilters();
  });

  document.getElementById('enhancer-min-replies').addEventListener('change', (e) => {
    settings.minReplies = parseInt(e.target.value) || 0;
    saveSettings();
    applyFilters();
  });

  // Setup event listeners for columns
  document.getElementById('enhancer-col-topics').addEventListener('change', (e) => {
    toggleColumn('topics', e.target.checked);
  });

  document.getElementById('enhancer-col-stats').addEventListener('change', (e) => {
    toggleColumn('stats', e.target.checked);
  });

  document.getElementById('enhancer-col-lastpost').addEventListener('change', (e) => {
    toggleColumn('lastPost', e.target.checked);
  });

  document.getElementById('enhancer-reset-filters').addEventListener('click', () => {
    settings.minViews = DEFAULT_SETTINGS.minViews;
    settings.minReplies = DEFAULT_SETTINGS.minReplies;
    saveSettings();
    document.getElementById('enhancer-min-views').value = '0';
    document.getElementById('enhancer-min-replies').value = '0';
    applyFilters();
  });

  // Update topic count and column text styles
  updateTopicCount();
  updateColumnTextStyle();
}

function applyFilters() {
  const tables = document.querySelectorAll('table.footable.table.table-white.table-primary.table-hover');

  tables.forEach((table) => {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row) => {
      const stats = extractStats(row);
      const isVisible = stats.views >= settings.minViews && stats.replies >= settings.minReplies;

      if (isVisible) {
        row.classList.remove('enhancer-hidden');
      } else {
        row.classList.add('enhancer-hidden');
      }
    });
  });

  updateTopicCount();
}

function updateTopicCount() {
  const countElement = document.getElementById('enhancer-topic-count');
  if (!countElement) return;

  const tables = document.querySelectorAll('table.footable.table.table-white.table-primary.table-hover');
  let totalTopics = 0;
  let visibleTopics = 0;

  tables.forEach((table) => {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row) => {
      totalTopics++;
      if (!row.classList.contains('enhancer-hidden')) {
        visibleTopics++;
      }
    });
  });

  countElement.textContent = `Showing ${visibleTopics} of ${totalTopics} topics`;
}

function saveSettings() {
  chrome.storage.local.set({
    [STORAGE_KEYS.MIN_VIEWS]: settings.minViews,
    [STORAGE_KEYS.MIN_REPLIES]: settings.minReplies,
    [STORAGE_KEYS.VISIBLE_COLUMNS]: settings.visibleColumns
  });
}

function applyColumnVisibility() {
  const tables = document.querySelectorAll('table.footable.table.table-white.table-primary.table-hover');

  tables.forEach((table) => {
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;

    // Hide/show headers (0=topics, 1=stats, 2=lastpost)
    const headers = thead.querySelectorAll('th');
    if (headers[0]) {
      headers[0].style.display = settings.visibleColumns.topics ? '' : 'none';
    }
    if (headers[1]) {
      headers[1].style.display = settings.visibleColumns.stats ? '' : 'none';
    }
    if (headers[2]) {
      headers[2].style.display = settings.visibleColumns.lastPost ? '' : 'none';
    }

    // Hide/show cells in each row
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells[0]) {
        cells[0].style.display = settings.visibleColumns.topics ? '' : 'none';
      }
      if (cells[1]) {
        cells[1].style.display = settings.visibleColumns.stats ? '' : 'none';
      }
      if (cells[2]) {
        cells[2].style.display = settings.visibleColumns.lastPost ? '' : 'none';
      }
    });
  });
}

function toggleColumn(column, visible) {
  // Prevent hiding all columns
  const visibleCount = Object.values(settings.visibleColumns).filter(v => v).length;

  if (!visible && visibleCount === 1) {
    // At least one column must be visible
    alert('At least one column must be visible');
    document.getElementById(`enhancer-col-${column === 'lastPost' ? 'lastpost' : column}`).checked = true;
    return;
  }

  settings.visibleColumns[column] = visible;
  saveSettings();
  applyColumnVisibility();
  updateColumnTextStyle();
}

function updateColumnTextStyle() {
  // Make visible columns bold, hidden columns normal
  const columnSpans = document.querySelectorAll('[data-column]');
  columnSpans.forEach((span) => {
    const column = span.getAttribute('data-column');
    if (settings.visibleColumns[column]) {
      span.classList.add('enhancer-column-visible');
      span.classList.remove('enhancer-column-hidden');
    } else {
      span.classList.add('enhancer-column-hidden');
      span.classList.remove('enhancer-column-visible');
    }
  });
}
