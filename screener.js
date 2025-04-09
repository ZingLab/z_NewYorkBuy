
    // Google Sheets published data URL
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSx8aQ7JKVPFfgTdwwTImfgEzqGh74mUm8EaVts2WUqLbnfKSGZO8HLUpYp5OfzlJC05lqDN-8QyzFe/pub?output=csv'
    const SHEET_ID = '2PACX-1vSx8aQ7JKVPFfgTdwwTImfgEzqGh74mUm8EaVts2WUqLbnfKSGZO8HLUpYp5OfzlJC05lqDN-8QyzFe';
    const SHEET_NAME = 'Table1';
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSx8aQ7JKVPFfgTdwwTImfgEzqGh74mUm8EaVts2WUqLbnfKSGZO8HLUpYp5OfzlJC05lqDN-8QyzFe/pub?output=csv&gid=0';

    // Fetch data from Google Sheets published as CSV
    async function fetchGoogleSheetsData() {
        try {
            const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vSx8aQ7JKVPFfgTdwwTImfgEzqGh74mUm8EaVts2WUqLbnfKSGZO8HLUpYp5OfzlJC05lqDN-8QyzFe/pub?output=csv&gid=0');
            
            if (!response.ok) {
                console.error('Response status:', response.status);
                throw new Error(`Failed to fetch data from Google Sheets: ${response.status}`);
            }
            
            const csvText = await response.text();
            return parseCSV(csvText);
        } catch (error) {
            console.error('Error fetching data from Google Sheets:', error);
            throw error;
        }
    }

    // Global variables
    let allStocks = [];
    let filteredStocks = [];
    let currentSort = { column: null, direction: 'asc' };
    let currentPage = 1;
    const rowsPerPage = 10;
    
    // Load stock data when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        // Load the data from Google Sheets
        loadStockData();
        
        // Set up event listeners
        document.getElementById('apply-filters').addEventListener('click', applyFilters);
        document.getElementById('reset-filters').addEventListener('click', resetFilters);
        document.getElementById('search').addEventListener('input', quickSearch);
        
        // Set up sorting
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-sort');
                sortData(column);
            });
        });
    });
    
    // Load stock data from Google Sheets
    async function loadStockData() {
        showLoading(true);
        
        try {
            // Try to fetch data from Google Sheets
            try {
                allStocks = await fetchGoogleSheetsData();
                console.log('Successfully loaded data from Google Sheets');
            } catch (fetchError) {
                console.warn('Failed to fetch from Google Sheets, using backup data:', fetchError);
                
                // Fall back to sample data if fetch fails
                allStocks = [
                    { exchange: 'NYSE', ticker: 'XMPL', name: 'EXAMPLE TECHNOLOGIES INC CLASS C', price: 72.82, pe: 0, high52: 179.7, low52: 66.25, marketcap: 50816766843, ratio: 1.0992 }
                ];
            }
            
            // Format the data
            allStocks = allStocks.map(stock => ({
                ...stock,
                price: parseFloat(stock.price || 0),
                pe: parseFloat(stock.pe || 0),
                high52: parseFloat(stock.high52 || 0),
                low52: parseFloat(stock.low52 || 0),
                marketcap: parseFloat(stock.marketcap || 0),
                ratio: parseFloat(stock.ratio || 1)
            }));
            
            // Filter out stocks with missing essential data
            allStocks = allStocks.filter(stock => 
                stock.ticker && 
                stock.ticker.trim() !== '' && 
                stock.price > 0  // Only include stocks with a valid price
            );

            console.log(`After filtering, ${allStocks.length} stocks remain`);
            
            // Important: Make sure all form elements are reset to default values
            document.getElementById('exchange').value = 'all';
            document.getElementById('min-pe').value = '';
            document.getElementById('max-pe').value = '';
            document.getElementById('min-price').value = '';
            document.getElementById('max-price').value = '';
            document.getElementById('search').value = '';
            
            // Initialize filtered stocks with all stocks
            filteredStocks = [...allStocks];
            
            // Reset to first page
            currentPage = 1;

            // Update stats
            updateStats();
            
            // Display data
            renderTable();
            renderPagination();
        } catch (error) {
            console.error('Error loading stock data:', error);
            alert('Error loading stock data. Please try again later.');
        } finally {
            showLoading(false);
        }
    }
    
    // Render the stock table
    function renderTable() {
        const tbody = document.getElementById('stocks-data');
        tbody.innerHTML = '';
        
        // Calculate pagination
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const paginatedStocks = filteredStocks.slice(start, end);
        
        if (paginatedStocks.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="9" style="text-align: center;">No stocks found. Try adjusting your filters.</td>';
            tbody.appendChild(tr);
            return;
        }
        
        // Create table rows
        paginatedStocks.forEach(stock => {
            const tr = document.createElement('tr');
            
            // Format market cap
            let formattedMarketCap;
            if (stock.marketcap >= 1e12) {
                formattedMarketCap = `$${(stock.marketcap / 1e12).toFixed(2)}T`;
            } else if (stock.marketcap >= 1e9) {
                formattedMarketCap = `$${(stock.marketcap / 1e9).toFixed(2)}B`;
            } else if (stock.marketcap >= 1e6) {
                formattedMarketCap = `$${(stock.marketcap / 1e6).toFixed(2)}M`;
            } else {
                formattedMarketCap = `$${stock.marketcap.toLocaleString()}`;
            }
            
            // Determine ratio class
            const ratioClass = stock.ratio < 1.1 ? 'good' : '';
            
            tr.innerHTML = `
                <td><span class="exchange ${stock.exchange.toLowerCase()}">${stock.exchange}</span></td>
                <td class="ticker">${stock.ticker}</td>
                <td>${stock.name}</td>
                <td class="price">${stock.price.toFixed(2)}</td>
                <td class="pe">${stock.pe.toFixed(2)}</td>
                <td class="high">${stock.high52.toFixed(2)}</td>
                <td class="low">${stock.low52.toFixed(2)}</td>
                <td class="cap">${formattedMarketCap}</td>
                <td class="ratio ${ratioClass}">${(stock.ratio * 100).toFixed(2)}%</td>
            `;
            
            tbody.appendChild(tr);
        });
    }
    
    // Render pagination controls
    function renderPagination() {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';
        
        const pageCount = Math.ceil(filteredStocks.length / rowsPerPage);
        
        if (pageCount <= 1) {
            return;
        }
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
                renderPagination();
            }
        });
        pagination.appendChild(prevButton);
        
        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(pageCount, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.toggle('active', i === currentPage);
            pageButton.addEventListener('click', () => {
                currentPage = i;
                renderTable();
                renderPagination();
            });
            pagination.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = currentPage === pageCount;
        nextButton.addEventListener('click', () => {
            if (currentPage < pageCount) {
                currentPage++;
                renderTable();
                renderPagination();
            }
        });
        pagination.appendChild(nextButton);
    }
    
    // Apply filters to the stock data
    function applyFilters() {
        const exchange = document.getElementById('exchange').value;
        const minPE = parseFloat(document.getElementById('min-pe').value) || 0;
        const maxPE = parseFloat(document.getElementById('max-pe').value) || Infinity;
        const minPrice = parseFloat(document.getElementById('min-price').value) || 0;
        const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;
        const search = document.getElementById('search').value.toLowerCase();
        
        filteredStocks = allStocks.filter(stock => {
            // Exchange filter
            if (exchange !== 'all' && stock.exchange !== exchange) {
                return false;
            }
            
            // PE filter
            if (stock.pe < minPE || stock.pe > maxPE) {
                return false;
            }
            
            // Price filter
            if (stock.price < minPrice || stock.price > maxPrice) {
                return false;
            }
            
            // Search filter
            if (search && !stock.ticker.toLowerCase().includes(search) && !stock.name.toLowerCase().includes(search)) {
                return false;
            }
            
            return true;
        });
        
        // Reset to first page
        currentPage = 1;
        
        // Update stats
        updateStats();
        
        // Render table and pagination
        renderTable();
        renderPagination();
    }
    
    // Quick search (triggered on input)
    function quickSearch() {
        const search = document.getElementById('search').value.toLowerCase();
        
        if (search) {
            filteredStocks = allStocks.filter(stock => 
                stock.ticker.toLowerCase().includes(search) || 
                stock.name.toLowerCase().includes(search)
            );
        } else {
            // If search is empty, apply other filters
            applyFilters();
            return;
        }
        
        // Reset to first page
        currentPage = 1;
        
        // Update stats
        updateStats();
        
        // Render table and pagination
        renderTable();
        renderPagination();
    }
    
    // Reset all filters
    function resetFilters() {
        document.getElementById('exchange').value = 'all';
        document.getElementById('min-pe').value = '';
        document.getElementById('max-pe').value = '';
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        document.getElementById('search').value = '';
        
        // Reset filtered stocks to all stocks
        filteredStocks = [...allStocks];
        
        // Reset to first page
        currentPage = 1;
        
        // Update stats
        updateStats();
        
        // Render table and pagination
        renderTable();
        renderPagination();
    }
    
    // Sort data by column
    function sortData(column) {
        // Toggle sort direction if clicking the same column
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }
        
        // Update sort icons
        document.querySelectorAll('th[data-sort] i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });
        
        const sortIcon = document.querySelector(`th[data-sort="${column}"] i`);
        sortIcon.className = `fas fa-sort-${currentSort.direction === 'asc' ? 'up' : 'down'}`;
        
        // Sort the data
        filteredStocks.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];
            
            // Handle string comparisons
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            // Compare values
            if (aValue < bValue) {
                return currentSort.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return currentSort.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        // Render table
        renderTable();
    }
    
    // Update statistics
    function updateStats() {
        // Calculate statistics
        const totalStocks = filteredStocks.length;
        
        let totalPE = 0;
        let totalRatio = 0;
        let totalMarketCap = 0;
        
        filteredStocks.forEach(stock => {
            if (stock.pe > 0) {
                totalPE += stock.pe;
            }
            totalRatio += stock.ratio;
            totalMarketCap += stock.marketcap;
        });
        
        const avgPE = totalStocks > 0 ? totalPE / totalStocks : 0;
        const avgRatio = totalStocks > 0 ? totalRatio / totalStocks : 0;
        
        // Format market cap
        let formattedMarketCap;
        if (totalMarketCap >= 1e12) {
            formattedMarketCap = `${(totalMarketCap / 1e12).toFixed(2)}T`;
        } else if (totalMarketCap >= 1e9) {
            formattedMarketCap = `${(totalMarketCap / 1e9).toFixed(2)}B`;
        } else if (totalMarketCap >= 1e6) {
            formattedMarketCap = `${(totalMarketCap / 1e6).toFixed(2)}M`;
        } else {
            formattedMarketCap = `${totalMarketCap.toLocaleString()}`;
        }
        
        // Update DOM
        document.getElementById('totalStocks').textContent = totalStocks;
        document.getElementById('avgPE').textContent = avgPE.toFixed(2);
        document.getElementById('avgRatio').textContent = `${(avgRatio * 100).toFixed(2)}%`;
        document.getElementById('totalMarketCap').textContent = formattedMarketCap;
    }
    
    // Show/hide loading indicator
    function showLoading(show) {
        const loading = document.querySelector('.loading');
        if (show) {
            loading.classList.add('active');
        } else {
            loading.classList.remove('active');
        }
    }
    
    // Fetch data from Google Sheets published as CSV
    async function fetchGoogleSheetsData() {
        try {
            const response = await fetch(CSV_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch data from Google Sheets');
            }
            
            const csvText = await response.text();
            return parseCSV(csvText);
        } catch (error) {
            console.error('Error fetching data from Google Sheets:', error);
            throw error;
        }
    }
    
// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim().toLowerCase().replace(/"/g, ''));
    
    // Debug info
    console.log('CSV Headers:', headers);
    console.log('Total rows in CSV:', lines.length - 1);
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        // Skip empty lines
        if (!lines[i].trim()) continue;
        
        const line = lines[i].split(',');
        
        // Create stock object even if columns don't match exactly
        const stock = {};
        headers.forEach((header, index) => {
            // Handle case where line has fewer columns than headers
            if (index < line.length) {
                let value = line[index].replace(/"/g, '').trim();
                
                // Handle empty values 
                if (value === '') {
                    // For numeric fields, default to 0; for other fields, default to empty string
                    if (['price', 'pe', 'high52', 'low52', 'marketcap', 'ratio'].includes(header)) {
                        value = 0;
                    } else {
                        value = '';
                    }
                } else if (['price', 'pe', 'high52', 'low52', 'marketcap', 'ratio'].includes(header)) {
                    // Convert numeric values, with better error handling
                    const parsed = parseFloat(value);
                    value = isNaN(parsed) ? 0 : parsed;
                }
                
                stock[header] = value;
            } else {
                // If column is missing, set default value
                if (['price', 'pe', 'high52', 'low52', 'marketcap', 'ratio'].includes(header)) {
                    stock[header] = 0;
                } else {
                    stock[header] = '';
                }
            }
        });
        
        // Debug first few rows
        if (i < 5) {
            console.log(`Row ${i}:`, stock);
        }
        
        // Only add stocks that have at least a ticker
        if (stock.ticker && stock.ticker.trim() !== '') {
            data.push(stock);
        }
    }
    
    console.log(`Parsed ${data.length} valid stocks from CSV`);
    return data;
}
