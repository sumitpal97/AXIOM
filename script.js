// API KEYS
const GROQ_API_KEY = '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';
const TAVILY_API_KEY = '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';

// DOM ELEMENTS
const userInput = document.getElementById('userInput');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const voiceSearchBtn = document.getElementById('voiceSearchBtn');
const historyBtn = document.getElementById('historyBtn');
const overlay = document.getElementById('overlay');
const historySidebar = document.getElementById('historySidebar');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const resultsArea = document.getElementById('resultsArea');
const aiOutput = document.getElementById('aiOutput');
const sourcesContainer = document.getElementById('sourcesContainer');
const speakBtn = document.getElementById('speakBtn');
const copyBtn = document.getElementById('copyBtn');
const rateUsBtn = document.getElementById('rateUsBtn');
const feedbackModal = document.getElementById('feedbackModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const starRating = document.getElementById('starRating');

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // Event Listeners
    searchBtn.addEventListener('click', runSearch);
    userInput.addEventListener('keypress', (e) => e.key === 'Enter' && runSearch());
    userInput.addEventListener('input', toggleClearBtn);
    clearBtn.addEventListener('click', clearInput);
    voiceSearchBtn.addEventListener('click', startVoiceSearch);
    historyBtn.addEventListener('click', toggleHistory);
    overlay.addEventListener('click', toggleHistory);
    closeSidebarBtn.addEventListener('click', toggleHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
    speakBtn.addEventListener('click', speakAnswer);
    copyBtn.addEventListener('click', copyToClipboard);
    rateUsBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    document.getElementById('logoBtn').addEventListener('click', () => location.reload());

    // Quick Prompt Clicks
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => fillSearch(chip.getAttribute('data-query')));
    });

    // Star Rating
    starRating.querySelectorAll('span').forEach(star => {
        star.addEventListener('click', () => rate(star.getAttribute('data-value')));
    });
});

// SEARCH FUNCTIONS
async function runSearch() {
    const query = userInput.value.trim();
    if (!query) return;

    window.speechSynthesis.cancel();
    saveToHistory(query);

    document.getElementById('mainContainer').classList.add('active');
    document.getElementById('heroTitle').style.display = 'none';
    document.getElementById('heroSubtitle').style.display = 'none';
    document.getElementById('quickPrompts').style.display = 'none';
    resultsArea.style.display = 'block';
    resultsArea.style.opacity = '1';
    aiOutput.innerText = "Scanning the web...";
    sourcesContainer.innerHTML = "";

    try {
        const searchRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: TAVILY_API_KEY, query: query, max_results: 5 })
        });
        const searchData = await searchRes.json();

        let context = "";
        searchData.results.forEach(item => {
            context += `\n- [${item.title}]: ${item.content}`;
            const card = `<a href="${item.url}" target="_blank" class="source-card">
                            <div style="font-weight:600; color:#fff; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${item.title}</div>
                            <div style="font-size:0.75rem; opacity:0.7">${new URL(item.url).hostname}</div>
                          </a>`;
            sourcesContainer.innerHTML += card;
        });

        aiOutput.innerText = "Thinking...";
        const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: `Query: ${query}\nContext: ${context}\n\nSummarize the answer in markdown.` }]
            })
        });
        const aiData = await aiRes.json();

        const md = aiData.choices[0].message.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/- (.*?)\n/g, '<li>$1</li>')
            .replace(/\n/g, '<br>');

        aiOutput.innerHTML = md;
        aiOutput.style.opacity = 0;
        let op = 0;
        const t = setInterval(() => { if ((op += 0.1) >= 1) clearInterval(t); aiOutput.style.opacity = op; }, 30);

    } catch (e) {
        aiOutput.innerText = "Error: " + e.message;
    }
}

// UI HELPERS
function toggleClearBtn() {
    clearBtn.style.display = userInput.value.trim().length > 0 ? 'flex' : 'none';
}

function clearInput() {
    userInput.value = '';
    userInput.focus();
    toggleClearBtn();
}

function fillSearch(text) {
    userInput.value = text;
    toggleClearBtn();
    runSearch();
}

// VOICE & AUDIO
function startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window)) { alert("Use Chrome."); return; }
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();
    recognition.onresult = (e) => {
        userInput.value = e.results[0][0].transcript;
        toggleClearBtn();
        runSearch();
    };
}

function speakAnswer() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        speakBtn.classList.remove('speaking');
        speakBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Listen`;
        return;
    }

    const text = aiOutput.innerText;
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speakBtn.classList.add('speaking');
    speakBtn.innerHTML = `🟥 Stop`;

    utterance.onend = () => {
        speakBtn.classList.remove('speaking');
        speakBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Listen`;
    };

    window.speechSynthesis.speak(utterance);
}

// HISTORY LOGIC
function toggleHistory() {
    historySidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    loadHistory();
}

function saveToHistory(query) {
    let history = JSON.parse(localStorage.getItem('novaHistory')) || [];
    history = history.filter(item => item !== query);
    history.unshift(query);
    if (history.length > 10) history.pop();
    localStorage.setItem('novaHistory', JSON.stringify(history));
}

function loadHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = "";
    let history = JSON.parse(localStorage.getItem('novaHistory')) || [];
    if (history.length === 0) { list.innerHTML = "<div style='text-align:center; color:#555;'>No history</div>"; return; }
    history.forEach(query => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `🔍 ${query}`;
        item.onclick = () => {
            userInput.value = query;
            toggleClearBtn();
            toggleHistory();
            runSearch();
        };
        list.appendChild(item);
    });
}

function clearHistory() {
    localStorage.removeItem('novaHistory');
    loadHistory();
}

// UTILITIES
function copyToClipboard() {
    navigator.clipboard.writeText(aiOutput.innerText);
    alert("Copied to clipboard!");
}

function openModal() { feedbackModal.style.display = 'flex'; }
function closeModal() { feedbackModal.style.display = 'none'; }
function rate(n) {
    const stars = starRating.querySelectorAll('span');
    stars.forEach((s, i) => { s.style.color = i < n ? '#fbbf24' : '#444'; });
    document.getElementById('ratingMsg').innerText = "Thank you for the feedback!";
    setTimeout(closeModal, 1500);
}
