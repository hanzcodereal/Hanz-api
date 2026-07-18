document.addEventListener('DOMContentLoaded', init);
let globalConfig = null;
let toastTimeout;

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function init() {
    if (isMobileDevice()) {
        document.body.classList.add('is-mobile');
    }
    try {
        const response = await fetch('/config');
        globalConfig = await response.json();
        setUi(globalConfig);
        
        const data = globalConfig.tags || globalConfig.categories;
        if (data) {
            loadEnd(data);
        } else {
            console.error('No API data found in config');
        }
        
        startWIBClock();
        loadReminder();
        setSearch();
    } catch (e) {
        console.error('Init error:', e);
    }
}

function startWIBClock() {
    const timeEl = document.getElementById('server-time');
    const dateEl = document.getElementById('server-date');
    if(!timeEl) return;
    updateTime();
    setInterval(updateTime, 1000);
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const dateString = now.toLocaleDateString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: 'numeric', month: 'long', year: 'numeric'
        });
        if(timeEl) timeEl.innerText = timeString;
        if(dateEl) dateEl.innerText = dateString;
    }
}

async function loadReminder() {
    try {
        const req = await fetch('/src/reminder.json');
        const data = await req.json();
        const runningText = document.getElementById('running-text');
        if (data?.message) {
            runningText.innerText = data.message.toUpperCase();
        } else {
            runningText.innerText = 'SYSTEM ONLINE • NO REMINDER';
        }
        const bar = document.getElementById('reminder-bar');
        const textEl = document.getElementById('reminder-text');
        const closeBtn = document.getElementById('close-reminder');
        if (!bar || !textEl || !closeBtn) return;
        if (data?.barMessage) {
            const dismissed = localStorage.getItem('reminder-dismissed');
            if (dismissed === data.barMessage) {
                bar.classList.add('hidden');
                bar.classList.remove('show-bar');
                return;
            }
            textEl.innerText = data.barMessage;
            bar.classList.remove('hidden');
            bar.classList.add('show-bar');
            closeBtn.onclick = () => {
                bar.classList.remove('show-bar');
                bar.classList.add('hidden');
                localStorage.setItem('reminder-dismissed', data.barMessage);
            };
        } else {
            bar.classList.add('hidden');
            bar.classList.remove('show-bar');
        }
    } catch (e) {
        const bar = document.getElementById('reminder-bar');
        if (bar) {
            bar.classList.add('hidden');
            bar.classList.remove('show-bar');
        }
        const runningText = document.getElementById('running-text');
        if (runningText) runningText.innerText = 'SYSTEM ONLINE • FAILED TO LOAD REMINDER';
    }
}

function messeg(msg) {
    const toast = document.getElementById('custom-toast');
    const msgBox = document.getElementById('toast-message');
    if(!toast || !msgBox) return;
    msgBox.innerText = msg;
    toast.classList.remove('translate-y-32', 'opacity-0');
    toast.classList.add('animate-fade-in-up');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { 
        toast.classList.add('translate-y-32', 'opacity-0');
        toast.classList.remove('animate-fade-in-up');
    }, 3000);
}

function setUi(config) {
    const s = config.settings;
    if(document.getElementById('nav-title')) document.getElementById('nav-title').innerText = s.apiName || 'API';
    if(document.getElementById('stat-visitors')) {
        document.getElementById('stat-visitors').innerText = s.visitors || '1';
        animateCounter('stat-visitors', 0, parseInt(s.visitors) || 1, 2000);
    }
    if (s.favicon) {
        let link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.rel = 'icon'; link.href = s.favicon;
        document.head.appendChild(link);
    }
}

function animateCounter(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.innerText = value.toLocaleString('id-ID');
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function setSearch() {
    const input = document.getElementById('search-input');
    const noResults = document.getElementById('no-results');
    if(!input) return;
    input.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if (val === '') {
            document.querySelectorAll('.api-section').forEach(section => {
                section.classList.remove('hidden'); 
                section.querySelector('.api-section-grid').classList.add('hidden'); 
                section.querySelector('.cat-arrow').classList.remove('rotate-180'); 
                section.querySelectorAll('.api-card-wrapper').forEach(c => c.classList.remove('hidden')); 
            });
            if(noResults) noResults.classList.add('hidden');
            return;
        }
        let anyVisible = false;
        document.querySelectorAll('.api-section').forEach(section => {
            const grid = section.querySelector('.api-section-grid');
            const arrow = section.querySelector('.cat-arrow');
            let match = 0;
            section.querySelectorAll('.api-card-wrapper').forEach(card => {
                const txt = card.getAttribute('data-search').toLowerCase();
                if (txt.includes(val)) { 
                    card.classList.remove('hidden');
                    card.classList.add('animate-slide-in-right');
                    setTimeout(() => card.classList.remove('animate-slide-in-right'), 500);
                    match++; 
                } else { 
                    card.classList.add('hidden'); 
                }
            });
            if (match > 0) {
                section.classList.remove('hidden');
                grid.classList.remove('hidden'); 
                grid.classList.add('animate-fade-in-up');
                arrow.classList.add('rotate-180');
                anyVisible = true;
            } else {
                section.classList.add('hidden');
            }
        });
        if(noResults) {
            noResults.classList.toggle('hidden', anyVisible);
            noResults.classList.toggle('flex', !anyVisible);
            if(!anyVisible) noResults.classList.add('animate-fade-in-up');
        }
    });
}

function loadEnd(data) {
    const container = document.getElementById('api-container');
    if(!container) return;
    container.innerHTML = '';
    container.classList.remove('opacity-0', 'translate-y-4');

    if (!data || typeof data !== 'object') {
        container.innerHTML = '<div class="text-center py-10 text-slate-500">No endpoints available</div>';
        return;
    }

    const categories = Object.keys(data);
    if (categories.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-slate-500">No endpoints found</div>';
        return;
    }

    categories.forEach((cat, catIndex) => {
        const routes = data[cat];
        if (!Array.isArray(routes) || routes.length === 0) return;
        
        const catId = `cat-${cat.replace(/\s+/g, '-')}`;
        const section = document.createElement('div');
        section.className = "api-section w-full animate-fade-in-up";
        section.style.animationDelay = `${catIndex * 0.1}s`;
        
        section.innerHTML = `
            <button id="btn-${catId}" onclick="toggleCategory('${catId}')" class="category-btn w-full flex items-center justify-between bg-white text-slate-700 p-4 rounded-xl shadow-card border border-slate-200 hover:border-slate-300 transition-all duration-300 group mb-3">
                <div class="relative z-10 flex items-center gap-4 w-full">
                    <div class="w-10 h-10 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center text-lg group-hover:bg-fmn-blue group-hover:text-white transition-colors border border-slate-100 group-hover:border-transparent group-hover:scale-110 duration-300">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <h2 class="text-base font-semibold tracking-wide text-slate-800 flex-1 text-left">${cat}</h2>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded font-semibold transition-colors group-hover:bg-fmn-blue/10 group-hover:text-fmn-dark group-hover:border-fmn-blue/20">${routes.length} EPS</span>
                        <i id="arrow-${catId}" class="cat-arrow fa-solid fa-chevron-down transition-transform duration-300 text-slate-400 group-hover:text-fmn-blue"></i>
                    </div>
                </div>
            </button>
            <div id="grid-${catId}" class="api-section-grid grid grid-cols-1 gap-2 hidden mb-6 pl-1 w-full"></div>
        `;
        
        const grid = section.querySelector('.api-section-grid');
        
        routes.forEach((route, idx) => {
            const id = `${cat}-${idx}`.replace(/\s+/g, '-');
            const endpoint = route.endpoint || '';
            const method = route.method || 'GET';
            const name = route.name || 'Unknown';
            const params = route.params || [];
            
            const methodColor = method === 'GET' ? 'bg-sky-500 text-white border-sky-600' : method === 'POST' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-amber-500 text-white border-amber-600';
            
            let inputs = '';
            let copyUrl = endpoint;
            if (method === 'GET' && params.length > 0) {
                const paramsList = params.map(p => `${p.name}=`).join('&');
                copyUrl = `${endpoint}?${paramsList}`;
            }

            if (params.length > 0) {
                inputs = `<div class="bg-slate-50 p-4 border-y border-slate-100 grid gap-4 w-full animate-fade-in-up">` + 
                params.map(p => `
                <div class="min-w-0 group/input">
                    <label class="text-[11px] font-semibold text-slate-500 tracking-wide mb-1.5 block transition-colors group-focus-within/input:text-fmn-blue">${p.name} ${p.required?'<span class="text-red-400">*</span>':''}</label>
                    <input type="text" id="input-${id}-${p.name}" 
                        placeholder="${p.description || 'Enter value...'}" 
                        class="w-full min-w-0 border border-slate-200 p-2.5 text-sm rounded-lg focus:border-fmn-blue focus:ring-4 focus:ring-fmn-blue/10 focus:outline-none bg-white shadow-sm max-w-full transition-all">
                </div>`).join('') + `</div>`;
            }

            const card = document.createElement('div');
            card.className = 'api-card-wrapper w-full bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md';
            card.setAttribute('data-search', `${name} ${endpoint} ${cat}`);
            
            card.innerHTML = `
                <div class="p-3 cursor-pointer select-none hover:bg-slate-50/50 transition-colors group" onclick="toggle('${id}')">
                    <div class="flex justify-between items-center gap-3">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <span class="px-2 py-1 text-[10px] font-bold ${methodColor} rounded border shadow-sm font-mono tracking-wide w-14 text-center shrink-0 transition-transform group-hover:scale-105">${method}</span>
                            <div class="flex flex-col min-w-0">
                                <code class="font-semibold text-[13px] sm:text-sm truncate font-mono text-slate-700 transition-colors group-hover:text-fmn-dark">${endpoint}</code>
                                <span class="text-[11px] text-slate-500 mt-0.5 truncate">${name}</span>
                            </div>
                        </div>
                        <i id="icon-${id}" class="fa-solid fa-chevron-right text-[11px] text-slate-300 transition-transform duration-300 shrink-0 mr-1 group-hover:text-fmn-blue"></i>
                    </div>
                </div>
                
                <div id="body-${id}" class="hidden animate-slide-down w-full">
                    ${inputs}
                    <div class="p-4 flex gap-4 bg-white w-full items-center border-t border-slate-50">
                        <button id="btn-exec-${id}" onclick="testReq(this, '${endpoint}', '${method}', '${id}')" class="soft-btn variant-lavender flex-1 h-[42px] w-full">
                            <span class="soft-btn__wrapper">
                                <span class="soft-btn__content">
                                    <span class="soft-btn__inner text-[11px] font-bold tracking-wider">
                                        <i class="fa-solid fa-play text-xs"></i> EXECUTE
                                    </span>
                                </span>
                            </span>
                        </button>
                        <button onclick="copy('${copyUrl}')" class="w-[42px] h-[42px] flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-lg transition-all shadow-sm hover:text-fmn-dark hover:border-fmn-blue hover:scale-110" title="Copy URL">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </div>

                    <div id="res-area-${id}" class="response-area hidden mx-4 mb-4 rounded-xl overflow-hidden bg-term-bg border border-slate-700 shadow-inner relative max-w-[calc(100%-2rem)]">
                        <div class="bg-term-header px-4 py-2 flex items-center justify-between border-b border-slate-700/50">
                            <div class="flex gap-2">
                                <div class="w-2.5 h-2.5 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors"></div>
                                <div class="w-2.5 h-2.5 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors"></div>
                                <div class="w-2.5 h-2.5 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors"></div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div id="status-indicator-${id}" class="status-indicator status-waiting"></div>
                                <span id="status-${id}" class="text-[10px] font-mono font-bold text-slate-400">IDLE</span>
                                <span class="text-slate-600 text-[10px]">&bull;</span>
                                <span id="time-${id}" class="text-[10px] font-mono text-slate-400">0ms</span>
                            </div>
                            <div class="flex gap-3">
                                 <a id="dl-btn-${id}" class="hidden text-slate-400 hover:text-white cursor-pointer transition-transform hover:scale-125"><i class="fa-solid fa-download text-xs"></i></a>
                                 <button onclick="copyRes('${id}')" class="text-slate-400 hover:text-white transition-transform hover:scale-125"><i class="fa-regular fa-clone text-xs"></i></button>
                                 <button onclick="reset('${id}')" class="text-slate-400 hover:text-red-400 transition-transform hover:rotate-90"><i class="fa-solid fa-xmark text-sm"></i></button>
                            </div>
                        </div>
                        <div class="p-3 font-mono text-[12px] min-h-fit max-h-[200px] overflow-y-auto custom-scrollbar bg-term-bg break-all whitespace-pre-wrap">
                            <div class="flex items-center gap-2 mb-2 mt-0.5 text-slate-400 select-none border-b border-slate-800 pb-2 flex-wrap animate-slide-in-right">
                                <span class="text-green-400 font-bold">➜</span>
                                <span class="text-slate-500">curl -X ${method}</span>
                                <span class="text-sky-300 break-all">${endpoint}</span>
                            </div>
                            <div id="output-${id}" class="text-slate-300 break-all whitespace-pre-wrap leading-relaxed"></div>
                        </div>
                    </div>
                </div>`;
            grid.appendChild(card);
        });
        container.appendChild(section);
    });
    initSoftButtons();
}

function initSoftButtons() {
    const buttons = document.querySelectorAll('.soft-btn');
    buttons.forEach(btn => {
        const handlePointer = (e) => {
            if (e.type === 'pointerleave' || e.type === 'pointercancel' || e.type === 'pointerup') {
                btn.classList.remove('soft-btn--active', 'soft-btn--left', 'soft-btn--right', 'soft-btn--middle');
                try { btn.releasePointerCapture(e.pointerId); } catch(err){}
                return;
            }
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const w = rect.width;
            if(e.type === 'pointerdown') {
                btn.classList.add('soft-btn--active');
                try { btn.setPointerCapture(e.pointerId); } catch(err){}
            }
            btn.classList.remove('soft-btn--left', 'soft-btn--right', 'soft-btn--middle');
            if (x < w * 0.33) btn.classList.add('soft-btn--left');
            else if (x > w * 0.66) btn.classList.add('soft-btn--right');
            else btn.classList.add('soft-btn--middle');
        };
        btn.addEventListener('pointerdown', handlePointer);
        btn.addEventListener('pointermove', (e) => {
            if(btn.classList.contains('soft-btn--active')) handlePointer(e);
        });
        btn.addEventListener('pointerup', handlePointer);
        btn.addEventListener('pointerleave', handlePointer);
        btn.addEventListener('pointercancel', handlePointer);
    });
}

window.toggleCategory = (catId) => {
    const grid = document.getElementById(`grid-${catId}`);
    const arrow = document.getElementById(`arrow-${catId}`);
    const btn = document.getElementById(`btn-${catId}`);
    if(btn) {
        btn.classList.add('animating');
        setTimeout(() => btn.classList.remove('animating'), 500);
    }
    if(grid.classList.contains('hidden')) { 
        grid.classList.remove('hidden'); 
        grid.classList.add('animate-fade-in-up');
        arrow.classList.add('rotate-180');
    } else { 
        grid.classList.add('hidden'); 
        arrow.classList.remove('rotate-180');
    }
};

window.toggle = (id) => {
    const b = document.getElementById(`body-${id}`);
    const i = document.getElementById(`icon-${id}`);
    if (b.classList.contains('hidden')) { 
        b.classList.remove('hidden'); 
        b.classList.add('animate-slide-down');
        i.classList.add('rotate-90');
    } else { 
        b.classList.add('hidden'); 
        i.classList.remove('rotate-90');
    }
};

window.copy = (txt) => { 
    navigator.clipboard.writeText(window.location.origin + txt); 
    messeg("URL COPIED"); 
};

window.copyRes = (id) => { 
    const out = document.getElementById(`output-${id}`); 
    if (out.innerText) { 
        navigator.clipboard.writeText(out.innerText); 
        messeg("RESPONSE COPIED"); 
    }
};

window.reset = (id) => { 
    const resArea = document.getElementById(`res-area-${id}`);
    resArea.classList.remove('show', 'success', 'error', 'showing');
    resArea.classList.add('hidden');
    document.getElementById(`output-${id}`).innerHTML = ''; 
    document.getElementById(`status-indicator-${id}`).className = 'status-indicator status-waiting';
    document.getElementById(`time-${id}`).innerText = '0ms';
};

function startNpmLoading(element, id) {
    element.innerHTML = `
        <div class="py-1 flex items-center font-mono text-slate-400 text-xs tracking-wide select-none">
            <span id="loading-text-${id}"></span><span class="inline-block w-1.5 h-3.5 bg-slate-500 ml-1 animate-blink align-middle"></span>
        </div>
    `;
    const txt = "Loading...";
    let i = 0;
    const target = document.getElementById(`loading-text-${id}`);
    const interval = setInterval(() => {
        if (!target) return;
        target.textContent = txt.slice(0, i);
        i++;
        if (i > txt.length + 1) {
            i = 0; 
        }
    }, 250);
    return () => clearInterval(interval);
}

window.testReq = async (btn, url, method, id) => {
    if (btn.disabled) return;
    const out = document.getElementById(`output-${id}`);
    const status = document.getElementById(`status-${id}`);
    const time = document.getElementById(`time-${id}`);
    const dlBtn = document.getElementById(`dl-btn-${id}`);
    const resArea = document.getElementById(`res-area-${id}`);
    const statusIndicator = document.getElementById(`status-indicator-${id}`);
    const btnInner = btn.querySelector('.soft-btn__inner');
    const originalBtnText = btnInner.innerHTML;
    btn.disabled = true; 
    btnInner.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> PROCESSING';
    resArea.classList.remove('hidden', 'success', 'error');
    resArea.classList.add('show', 'showing');
    statusIndicator.className = 'status-indicator status-waiting';
    status.innerText = 'RUNNING...'; 
    status.className = 'text-[10px] font-mono font-bold text-amber-400';
    const stopLoading = startNpmLoading(out, id);
    const params = {};
    document.querySelectorAll(`[id^="input-${id}-"]`).forEach(i => { 
        if(i.value) {
            params[i.id.split(`input-${id}-`)[1]] = i.value;
            i.classList.add('border-emerald-400', 'bg-emerald-50/50');
            setTimeout(() => i.classList.remove('border-emerald-400', 'bg-emerald-50/50'), 1000);
        }
    });
    let fetchUrl = url + (method === 'GET' && Object.keys(params).length ? '?' + new URLSearchParams(params) : '');
    let opts = { 
        method, 
        ...(method !== 'GET' ? { headers: {'Content-Type': 'application/json'}, body: JSON.stringify(params) } : {}) 
    };
    let startTime = Date.now();
    let timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        time.innerText = `${elapsed}ms`;
    }, 30);
    try {
        const req = await fetch(fetchUrl, opts);
        clearInterval(timerInterval);
        stopLoading();
        const duration = Date.now() - startTime;
        animateCounter(`time-${id}`, duration - 50 > 0 ? duration - 50 : 0, duration, 200);
        if (req.ok) {
            statusIndicator.className = 'status-indicator status-success';
            status.innerText = `${req.status} ${req.statusText}`;
            status.className = 'text-[10px] font-mono font-bold text-emerald-400';
            resArea.classList.add('success');
        } else {
            statusIndicator.className = 'status-indicator status-error';
            status.innerText = `${req.status} ${req.statusText}`;
            status.className = 'text-[10px] font-mono font-bold text-red-400';
            resArea.classList.add('error');
        }
        const type = req.headers.get('content-type');
        if (type?.includes('json')) {
            const json = await req.json();
            out.innerHTML = syntaxHighlight(json);
            out.querySelectorAll('.json-key, .json-string, .json-number, .json-boolean, .json-null').forEach((el, idx) => {
                el.style.animationDelay = `${idx * 0.02}s`;
                el.classList.add('animate-slide-in-right');
            });
        } else if (type?.startsWith('image')) {
            const blob = await req.blob();
            const urlObj = URL.createObjectURL(blob);
            dlBtn.href = urlObj; 
            dlBtn.download = `img-${Date.now()}.jpg`; 
            dlBtn.classList.remove('hidden');
            out.innerHTML = `<div class="flex justify-center p-2 animate-fade-in-up">
                                <img src="${urlObj}" class="max-w-full rounded-lg border border-slate-700 max-h-[300px] transform transition-transform duration-500 hover:scale-105 shadow-xl">
                             </div>`;
        } else {
            const text = await req.text();
            typewriterEffect(`output-${id}`, text, 5);
        }
    } catch (err) {
        clearInterval(timerInterval);
        stopLoading();
        const duration = Date.now() - startTime;
        time.innerText = `${duration}ms`;
        statusIndicator.className = 'status-indicator status-error';
        status.innerText = 'ERROR'; 
        status.className = 'text-[10px] font-mono font-bold text-red-400';
        resArea.classList.add('error');
        out.innerHTML = `<span class="text-red-400 font-semibold">${err.message}</span>`;
    } finally {
        btn.disabled = false; 
        btnInner.innerHTML = originalBtnText;
    }
};

function typewriterEffect(elementId, text, speed = 10) {
    const element = document.getElementById(elementId);
    element.innerHTML = '';
    let i = 0;
    function typeWriter() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(typeWriter, speed);
        }
    }
    typeWriter();
}

function syntaxHighlight(json) {
    if (typeof json != 'string') json = JSON.stringify(json, undefined, 2);
    return json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) cls = 'json-key';
            else cls = 'json-string';
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
    });
}