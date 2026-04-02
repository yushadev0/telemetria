window.currentYear = null;
window.currentRace = null;
window.currentSession = null;

window.isCompareMode = false; // Karşılaştırma modunda mıyız?
window.driver1Meta = null;    // 1. Pilotun verileri (Code ve Renk)
window.driver2Meta = null;    // 2. Pilotun verileri


window.globalLapsSummary = null; // Tur verilerini bellekte tutacağız
window.globalCurrentLapReq = 'fastest'; // O an ekranda hangi tur var?

window.f1LoadingInterval = null;
window.f1LoadingTimeouts = [];

window.acLastLapCount = -1;
window.acIsLapInvalid = false;

window.acImagePathBase = "https://hasup.net/assets/tracks/";
window.acTrackMapDict = {
    // Kunos (Orijinal) Pist Kodları -> Senin PNG Dosya İsimlerin
    "monza": "Monza_GP.png",
    "spa": "Spa_GP.png",
    "ks_silverstone": "Silverstone_GP.png",
    "ks_nurburgring": "Nurburgring_GP.png",
    "imola": "Imola_GP.png",
    "ks_barcelona": "Barcelona_GP.png",
    "ks_red_bull_ring": "Avusturya_GP.png",
    "ks_zandvoort": "Zandvoort_GP.png",
    
    // F1 Takvimi (Modlu Pist Kodları - Genelde böyle olur, duruma göre güncellersin)
    "bahrain": "Bahreyn_GP.png",
    "jeddah": "Cidde_GP.png",
    "albert_park": "Avustralya_GP.png",
    "baku": "Baku_GP.png",
    "miami": "Miami_GP.png",
    "monaco": "Monaco_GP.png",
    "montreal": "Kanada_GP.png",
    "red_bull_ring": "Avusturya_GP.png",
    "hungaroring": "Hungaroring_GP.png",
    "marina_bay": "Singapur_GP.png",
    "suzuka": "Japonya_GP.png",
    "cota": "COTA_GP.png",
    "mexico": "Meksika_GP.png",
    "interlagos": "Brezilya_GP.png",
    "yas_marina": "AbuDabi_GP.png",
    "las_vegas": "Vegas_GP.png",
    "losail": "Katar_GP.png",
    "istanbul": "Istanbul_GP.png",
    "shanghai": "Cin_GP.png",
    
    // Efsaneler (Senin İsteğin)
    "ks_nordschleife": "Nordschleife.png",
    "lemans": "Lemans_GP.png",
    "circuit_de_la_sarthe": "Lemans_GP.png"
};


window.showF1Loading = function() {
    if (!document.getElementById('f1LightsOverlay')) {
        const overlayHTML = `
            <div id="f1LightsOverlay" class="f1-lights-overlay hidden">
                <div class="gantry-container">
                    <div class="light-box"><div class="light-circle" id="l1"></div></div>
                    <div class="light-box"><div class="light-circle" id="l2"></div></div>
                    <div class="light-box"><div class="light-circle" id="l3"></div></div>
                    <div class="light-box"><div class="light-circle" id="l4"></div></div>
                    <div class="light-box"><div class="light-circle" id="l5"></div></div>
                </div>
                <div class="loading-text f1-font" data-i18n="loadingTelemetry">VERİLER YÜKLENİYOR...</div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHTML); 
    }
    
    const overlay = document.getElementById('f1LightsOverlay');
    overlay.classList.remove('hidden'); 
    overlay.classList.remove('green-lights');
    
    if (window.f1LoadingInterval) clearInterval(window.f1LoadingInterval);
    window.f1LoadingTimeouts.forEach(t => clearTimeout(t));
    window.f1LoadingTimeouts = [];

    function playLightSequence() {
        for (let i = 1; i <= 5; i++) {
            const light = document.getElementById(`l${i}`);
            if(light) light.classList.remove('red-on');
        }
        for (let i = 1; i <= 5; i++) {
            let tid = setTimeout(() => {
                const light = document.getElementById(`l${i}`);
                if (light && !overlay.classList.contains('hidden') && !overlay.classList.contains('green-lights')) {
                    light.classList.add('red-on');
                }
            }, i * 350); 
            window.f1LoadingTimeouts.push(tid);
        }
    }

    playLightSequence();
    window.f1LoadingInterval = setInterval(playLightSequence, 2200);
};

window.hideF1Loading = function() {
    // Veri geldiğinde çalışan arka plan döngülerini ACİLEN durdur!
    if (window.f1LoadingInterval) {
        clearInterval(window.f1LoadingInterval);
        window.f1LoadingInterval = null;
    }
    if (window.f1LoadingTimeouts) {
        window.f1LoadingTimeouts.forEach(t => clearTimeout(t));
        window.f1LoadingTimeouts = [];
    }

    const overlay = document.getElementById('f1LightsOverlay');
    if (!overlay) return;
    
    overlay.classList.add('green-lights'); // O efsanevi yeşil ışıklar yanar!
    
    setTimeout(() => {
        overlay.classList.add('hidden');
        // Ekran kaybolduktan sonra her şeyi bir sonraki yükleme için sıfırla
        setTimeout(() => {
            overlay.classList.remove('green-lights');
            for (let i = 1; i <= 5; i++) {
                const light = document.getElementById(`l${i}`);
                if(light) light.classList.remove('red-on');
            }
        }, 500);
    }, 800);
};

// Ribbon Çizici Fonksiyon (GÜNCELLENDİ)
window.updateLapsRibbon = function(lapsDataJSON, currentLapReq) {
    if (!lapsDataJSON || !lapsDataJSON.laps_data) return;
    window.globalLapsSummary = lapsDataJSON; // Belleğe al
    window.globalCurrentLapReq = currentLapReq;

    const laps = lapsDataJSON.laps_data;
    const headerContainer = document.getElementById('dynamicSectorHeader');
    const ribbonContainer = document.getElementById('timingRibbonContainer');
    if (!headerContainer || !ribbonContainer) return;

    let fastestLapTime = 999999;
    let fastestLapObj = null;
    laps.forEach(lap => {
        if (lap.lap_time && lap.lap_time < fastestLapTime) {
            fastestLapTime = lap.lap_time;
            fastestLapObj = lap;
        }
    });

    // O anki turu bul
    let activeLap = null;
    if (currentLapReq === 'fastest') activeLap = fastestLapObj;
    else activeLap = laps.find(l => l.lap_number == currentLapReq);

    // 1. DİNAMİK BAŞLIĞI OLUŞTUR
    if (activeLap) {
        const lang = document.documentElement.lang || 'tr';
        const s1 = activeLap.sector_1 ? activeLap.sector_1.toFixed(3) : 'N/A';
        const s2 = activeLap.sector_2 ? activeLap.sector_2.toFixed(3) : 'N/A';
        const s3 = activeLap.sector_3 ? activeLap.sector_3.toFixed(3) : 'N/A';
        const timeStr = activeLap.lap_time ? window.formatLapTime(activeLap.lap_time, lang) : 'PIT';
        const compound = activeLap.compound ? activeLap.compound.toLowerCase() : 'unknown';
        const tyreLife = activeLap.tyre_life ? `(${activeLap.tyre_life}. Tur)` : '';
        
        // Python'dan gelen renkleri (CSS class olarak) oku. Veri gelmezse default "yellow" yap.
        const s1Color = activeLap.s1_color || 'yellow';
        const s2Color = activeLap.s2_color || 'yellow';
        const s3Color = activeLap.s3_color || 'yellow';
        
        const compareBtnTxt = (window.i18n[lang] && window.i18n[lang].compareBtn) ? window.i18n[lang].compareBtn : (lang === 'en' ? 'VS COMPARE' : 'VS KIYASLA');
        const lapWord = lang === 'en' ? 'Lap' : 'Tur';
        const timeWord = lang === 'en' ? 'Time' : 'Derece';

        let headerHTML = `
            <div class="f1-font" style="font-size: 16px; display: flex; align-items: center;">
                <span style="color: var(--primary-color);">${lapWord}:</span> <span style="margin-left: 6px;">${activeLap.lap_number}</span> 
                <span style="margin: 0 12px; color: var(--tag-border);">|</span>
                <span style="color: var(--primary-color);">${timeWord}:</span> <span style="margin-left: 6px;">${timeStr}</span>
                
                <button class="vs-btn f1-font" onclick="window.startCompareMode()"><i class="fa-solid fa-bolt"></i> ${compareBtnTxt}</button>
            </div>
            <div class="sector-times f1-font">
                <div class="sector-badge ${s1Color}">S1: ${s1}</div>
                <div class="sector-badge ${s2Color}">S2: ${s2}</div>
                <div class="sector-badge ${s3Color}">S3: ${s3}</div>
            </div>
            <div class="tyre-info f1-font">
                <div class="tyre-dot ${compound}"></div> ${activeLap.compound} <span style="font-size:12px; opacity:0.7;">${tyreLife}</span>
            </div>
        `;
        headerContainer.innerHTML = headerHTML;
    }

    // 2. YATAY ŞERİDİ (RIBBON) OLUŞTUR
    let ribbonHTML = '';
    laps.forEach(lap => {
        if (!lap.lap_number) return;
        const isPB = (lap.lap_time === fastestLapTime);
        const isActive = (activeLap && activeLap.lap_number === lap.lap_number);
        const pbClass = isPB ? 'pb' : '';
        const activeClass = isActive ? 'active' : '';
        const timeStr = lap.lap_time ? window.formatLapTime(lap.lap_time, document.documentElement.lang || 'tr') : 'PIT';
        const compoundLower = lap.compound ? lap.compound.toLowerCase() : 'unknown';

        ribbonHTML += `
            <div class="lap-card ${pbClass} ${activeClass}" id="lapCard_${lap.lap_number}" onclick="window.requestSpecificLap(${lap.lap_number})">
                <div class="lap-tyre-line ${compoundLower}"></div>
                <div class="lap-num f1-font">L${lap.lap_number}</div>
                <div class="lap-time-text f1-font">${timeStr}</div>
            </div>
        `;
    });
    ribbonContainer.innerHTML = ribbonHTML;

    // Yatay kaydırma UX'i
    ribbonContainer.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
            e.preventDefault(); 
            ribbonContainer.scrollLeft += e.deltaY; 
        }
    });
};

window.requestSpecificLap = function(lapNumber) {
    if (window.globalCurrentLapReq == lapNumber) return; // Zaten o turdaysa işlem yapma
    window.showF1Loading(); // IŞIKLARI YAK!
    
    ajaxRequest(MainForm.MainHTML, 'LoadTelemetryEvent', [
        'year=' + window.currentYear,
        'race_name=' + window.currentRace,
        'session_type=' + window.currentSession,
        'driver_code=' + window.currentDriverMeta.code,
        'lap=' + lapNumber
    ]);
};



window.formatLapTime = function(lapTimeRaw, lang) {
    if (lapTimeRaw === null || lapTimeRaw === undefined || lapTimeRaw === '' || lapTimeRaw === 'null') {
        return window.i18n[lang].unknownWord;
    }
    // Eğer veri sayıysa (74.055 gibi) formata sok
    if (typeof lapTimeRaw === 'number' || !isNaN(parseFloat(lapTimeRaw))) {
        const totalSeconds = parseFloat(lapTimeRaw);
        const m = Math.floor(totalSeconds / 60);
        const s = Math.floor(totalSeconds % 60);
        const ms = Math.floor((totalSeconds % 1) * 1000);
        return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
    return lapTimeRaw; // Sayı değilse (zaten formatlıysa) direkt döndür
};

window.setLanguage = function(lang) {
    if (!window.i18n || !window.i18n[lang]) return;
    
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (window.i18n[lang][key]) {
            if(key === 'modeSelection_retro') {
                el.innerHTML = window.i18n[lang][key]; 
            } else {
                el.innerText = window.i18n[lang][key]; 
            }
        }
    });

    const sessionElements = document.querySelectorAll('[data-session-key]');
    sessionElements.forEach(el => {
        const sessionKey = el.getAttribute('data-session-key').trim();
        if (window.i18n[lang].sessions && window.i18n[lang].sessions[sessionKey]) {
            el.innerText = window.i18n[lang].sessions[sessionKey];
        } else {
            el.innerText = sessionKey;
        }
    });
    
    const eventElements = document.querySelectorAll('[data-event-key]');
    eventElements.forEach(el => {
        const eventKey = el.getAttribute('data-event-key').trim();
        if (window.i18n[lang].events && window.i18n[lang].events[eventKey]) {
            el.innerText = window.i18n[lang].events[eventKey];
        } else {
            el.innerText = eventKey;
        }
    });
    
    const locationElements = document.querySelectorAll('.race-location[data-country]');
    if(locationElements.length > 0) {
        locationElements.forEach(el => {
            const trackName = el.getAttribute('data-trackname') ? el.getAttribute('data-trackname').trim() : '';
            const countryKey = el.getAttribute('data-country').trim();
            const translatedCountry = (window.i18n[lang].countries && window.i18n[lang].countries[countryKey]) ? window.i18n[lang].countries[countryKey] : countryKey;
            
            if(trackName && trackName !== 'undefined' && trackName !== countryKey) {
                 el.innerText = `${trackName}, ${translatedCountry}`;
            } else {
                 el.innerText = `${translatedCountry}`;
            }
        });
    }

    const lapElements = document.querySelectorAll('[data-lap-key]');
    lapElements.forEach(el => {
        const lapKey = el.getAttribute('data-lap-key');
        const lapNum = el.getAttribute('data-lap-num'); 
        
        if (lapKey === 'fastest' || lapKey === 'first' || lapKey === 'last') {
            const translatedReq = (window.i18n[lang].laps && window.i18n[lang].laps[lapKey]) ? window.i18n[lang].laps[lapKey] : lapKey;
            el.innerText = `${translatedReq} (${lapNum})`; 
        } else {
            el.innerText = `${lapNum}`;
        }
    });

    const timeElements = document.querySelectorAll('[data-time-val]');
    timeElements.forEach(el => {
        const timeVal = el.getAttribute('data-time-val');
        el.innerText = window.formatLapTime(timeVal, lang); 
    });

    const modeTextImg = document.getElementById('retroModeText');
    if(modeTextImg && window.i18n[lang].modeTextImage) {
        modeTextImg.src = window.i18n[lang].modeTextImage;
    }
    
    const flagTr = document.getElementById('flag-tr');
    const flagEn = document.getElementById('flag-en');
    
    if(flagTr && flagEn) {
        if(lang === 'tr') {
            flagTr.classList.add('active');
            flagEn.classList.remove('active');
            document.documentElement.lang = 'tr';
        } else {
            flagEn.classList.add('active');
            flagTr.classList.remove('active');
            document.documentElement.lang = 'en';
        }
    }

    // --- GRAFİKLERİ ÇEVİR (HEM TEKLİ HEM İKİLİ MOD İÇİN) ---
    if (window.telemetryCharts) {
        if (!window.isCompareModeActive) {
            // TEKLİ MOD ÇEVİRİSİ (Eski Kod)
            const charts = { speed: 'speedChartTitle', tb: 'throttleBrakeChartTitle', gear: 'gearChartTitle', drs: 'drsChartTitle' };
            for (const [key, titleKey] of Object.entries(charts)) {
                if (window.telemetryCharts[key] && window.telemetryCharts[key].options.plugins.title) {
                    window.telemetryCharts[key].options.plugins.title.text = window.i18n[lang][titleKey] || titleKey;
                }
            }
            if (window.telemetryCharts.speed) {
                window.telemetryCharts.speed.data.datasets[0].label = lang === 'tr' ? 'Hız' : 'Speed';
                window.telemetryCharts.speed.data.datasets[1].label = lang === 'tr' ? 'Kritik' : 'Critical';
                window.telemetryCharts.speed.update('none');
            }
            if (window.telemetryCharts.tb) {
                window.telemetryCharts.tb.data.datasets[0].label = lang === 'tr' ? 'Gaz (%)' : 'Throttle (%)';
                window.telemetryCharts.tb.data.datasets[1].label = lang === 'tr' ? 'Fren' : 'Brake';
                window.telemetryCharts.tb.update('none');
            }
            if (window.telemetryCharts.gear) {
                window.telemetryCharts.gear.data.datasets[0].label = lang === 'tr' ? 'Vites' : 'Gear';
                window.telemetryCharts.gear.update('none');
            }
            if (window.telemetryCharts.drs) {
                window.telemetryCharts.drs.data.datasets[0].label = 'DRS';
                window.telemetryCharts.drs.update('none');
            }
        } else {
            // YENİ: İKİLİ (COMPARE) MOD ÇEVİRİSİ
            if (window.telemetryCharts.delta) {
                const diffTxt = lang === 'tr' ? 'Zaman Farkı (Saniye)' : 'Time Delta (Seconds)';
                const greenTxt = lang === 'tr' ? 'Yeşil Alan' : 'Green Area';
                const redTxt = lang === 'tr' ? 'Kırmızı Alan' : 'Red Area';
                const fastTxt = lang === 'tr' ? 'Hızlı' : 'Faster';
                window.telemetryCharts.delta.options.plugins.title.text = `${diffTxt}  |  🟢 ${greenTxt}: ${window.driver1Meta.code} ${fastTxt}  |  🔴 ${redTxt}: ${window.driver2Meta.code} ${fastTxt}`;
                window.telemetryCharts.delta.update('none');
            }
            if (window.telemetryCharts.speed) {
                window.telemetryCharts.speed.options.plugins.title.text = lang === 'tr' ? 'Hız (km/h) Karşılaştırması' : 'Speed (km/h) Comparison';
                window.telemetryCharts.speed.update('none');
            }
            if (window.telemetryCharts.tb) {
                window.telemetryCharts.tb.data.datasets[0].label = `${window.driver1Meta.code} ${lang === 'tr' ? 'Gaz (%)' : 'Throttle (%)'}`;
                window.telemetryCharts.tb.data.datasets[1].label = `${window.driver1Meta.code} ${lang === 'tr' ? 'Fren' : 'Brake'}`;
                window.telemetryCharts.tb.data.datasets[2].label = `${window.driver2Meta.code} ${lang === 'tr' ? 'Gaz (%)' : 'Throttle (%)'}`;
                window.telemetryCharts.tb.data.datasets[3].label = `${window.driver2Meta.code} ${lang === 'tr' ? 'Fren' : 'Brake'}`;
                window.telemetryCharts.tb.options.plugins.title.text = lang === 'tr' ? 'Gaz / Fren Kıyaslaması' : 'Throttle / Brake Comparison';
                window.telemetryCharts.tb.update('none');
            }
            if (window.telemetryCharts.gear) {
                window.telemetryCharts.gear.options.plugins.title.text = lang === 'tr' ? 'Vites Karşılaştırması' : 'Gear Comparison';
                window.telemetryCharts.gear.update('none');
            }
        }
    }


    // --- ASSETTO CORSA ÖZEL ÇEVİRİ MOTORU ---
    const acLang = window.i18n[lang];
    
    // 1. Dinamik Oda Yazısı
    const connTextEl = document.getElementById('acConnText');
    if (connTextEl && window.acSocket && window.acSocket.readyState === WebSocket.OPEN) {
        // Eğer bağlıysak "ROOM: [KOD]" formatını koru
        const currentCode = connTextEl.innerText.split(': ')[1] || "";
        if(currentCode && currentCode !== "WAITING...") {
            connTextEl.innerText = acLang.ac_room + ": " + currentCode;
        }
    }

    // 2. Dinamik Pist Yazısı
    const trackTitleEl = document.getElementById("acTrackNameDisplay");
    if (trackTitleEl && window.acLastTrackName) {
        trackTitleEl.innerText = acLang.ac_track + ": " + window.acLastTrackName.toUpperCase();
    }

    // 3. Geçersiz Tur / Ceza Yazısı
    const penEl = document.getElementById("acValPenalty");
    if (penEl && penEl.innerText !== "0") {
        if (window.acIsLapInvalid) penEl.innerText = acLang.ac_invalid_lap;
        else if (penEl.innerText.includes("PENALTY") || penEl.innerText.includes("CEZA")) {
            const val = parseInt(penEl.innerText);
            penEl.innerText = val + " " + acLang.ac_penalty;
        }
    }
};

window.setTheme = function(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    const toggle = document.getElementById('themeToggle');
    if(toggle) toggle.checked = (themeName === 'light');

    if (window.telemetryCharts) {
        const isLightMode = (themeName === 'light');
        const gridColor = isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
        const textColor = isLightMode ? '#1A202C' : '#E6EDF3';

        Object.values(window.telemetryCharts).forEach(chart => {
            if (chart) {
                chart.options.color = textColor;
                if (chart.options.scales.x) {
                    chart.options.scales.x.grid.color = gridColor;
                    chart.options.scales.x.ticks.color = textColor;
                }
                if (chart.options.scales.y) {
                    chart.options.scales.y.grid.color = gridColor;
                    chart.options.scales.y.ticks.color = textColor;
                }
                if (chart.options.plugins && chart.options.plugins.title) {
                    chart.options.plugins.title.color = textColor;
                }
                
                if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
                    chart.options.plugins.legend.labels.color = textColor;
                }
                chart.update('none'); 
            }
        });
    }
};

window.toggleTheme = function(checkboxElement) {
    if(checkboxElement.checked) {
        window.setTheme('light');
    } else {
        window.setTheme('dark');
    }
};

window.initTelemetriaCore = function() {
    window.setTheme('dark');
    window.setLanguage('tr');
};

window.backToHome = function() {
    const contentArea = document.getElementById('dynamicContentArea');
    const cards = contentArea.querySelectorAll('.year-card, .race-card, .session-card');
    
    if(cards.length > 0) {
        cards.forEach((card, index) => {
            card.style.transitionDelay = (index * 20) + 'ms'; 
            card.classList.remove('animate-in');
            card.classList.add('animate-out');
        });
        setTimeout(executeBackToHome, (cards.length * 20) + 500);
    } else {
        executeBackToHome();
    }

    function executeBackToHome() {
        document.getElementById('telemetryDashboard').classList.remove('active');
        document.getElementById('dynamicContentArea').style.display = 'flex';
        document.getElementById('navBreadcrumb').style.display = 'none';
        contentArea.style.display = 'none';
        contentArea.innerHTML = '';
        
        const homeWrapper = document.getElementById('homeScreenWrapper');
        homeWrapper.style.display = 'flex';
        setTimeout(() => {
            homeWrapper.style.transform = "translateX(0)";
            homeWrapper.style.opacity = "1";
        }, 50);
    }
};

window.backToYears = function() {
    const contentArea = document.getElementById('dynamicContentArea');
    const cards = contentArea.querySelectorAll('.race-card, .session-card');
    
    if(cards.length > 0) {
        cards.forEach((card, index) => {
            card.style.transitionDelay = (index * 20) + 'ms'; 
            card.classList.remove('animate-in');
            card.classList.add('animate-out');
        });
        setTimeout(executeBackToYears, (cards.length * 20) + 500);
    } else {
        executeBackToYears();
    }

    function executeBackToYears() {
        document.getElementById('telemetryDashboard').classList.remove('active');
        document.getElementById('dynamicContentArea').style.display = 'flex';
        const langStr = document.documentElement.lang || 'tr';
        const breadcrumb = document.getElementById('navBreadcrumb');
        
        breadcrumb.innerHTML = `<span onclick="window.backToHome()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">Formula 1</span> <span class="separator">/</span> <span class="active-crumb" data-i18n="selectYear">${window.i18n[langStr].selectYear}</span>`;
        
        contentArea.innerHTML = '';
        window.showF1Loading(); // SİHİR 1
        ajaxRequest(MainForm.MainHTML, 'LoadYearsEvent', ['mode=F1']);
    }
};

window.backToRaces = function(year) {
    const contentArea = document.getElementById('dynamicContentArea');
    const cards = contentArea.querySelectorAll('.session-card');
    
    if(cards.length > 0) {
        cards.forEach((card, index) => {
            card.style.transitionDelay = (index * 20) + 'ms'; 
            card.classList.remove('animate-in');
            card.classList.add('animate-out');
        });
        setTimeout(() => executeBackToRaces(year), (cards.length * 20) + 500);
    } else {
        executeBackToRaces(year);
    }

    function executeBackToRaces(yr) {
        document.getElementById('telemetryDashboard').classList.remove('active');
        document.getElementById('dynamicContentArea').style.display = 'flex';
        const langStr = document.documentElement.lang || 'tr';
        const breadcrumb = document.getElementById('navBreadcrumb');
        
        breadcrumb.innerHTML = `<span onclick="window.backToHome()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">Formula 1</span> <span class="separator">/</span> <span onclick="window.backToYears()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">${yr}</span> <span class="separator">/</span> <span class="active-crumb" data-i18n="selectRace">${window.i18n[langStr].selectRace}</span>`;
        
        contentArea.innerHTML = '';
        window.showF1Loading(); // SİHİR 2
        ajaxRequest(MainForm.MainHTML, 'LoadRacesEvent', ['year=' + yr]);
    }
};

window.backToSessions = function(year, raceName) {
    const contentArea = document.getElementById('dynamicContentArea');
    const cards = contentArea.querySelectorAll('.race-card'); 
    
    if(cards.length > 0) {
        cards.forEach((card, index) => {
            card.style.transitionDelay = (index * 20) + 'ms'; 
            card.classList.remove('animate-in');
            card.classList.add('animate-out');
        });
        setTimeout(() => executeBackToSessions(year, raceName), (cards.length * 20) + 500);
    } else {
        executeBackToSessions(year, raceName);
    }

    function executeBackToSessions(yr, rName) {
        document.getElementById('telemetryDashboard').classList.remove('active');
        document.getElementById('dynamicContentArea').style.display = 'flex';
        const langStr = document.documentElement.lang || 'tr';
        const breadcrumb = document.getElementById('navBreadcrumb');
        
        const translatedRaceName = (window.i18n[langStr].events && window.i18n[langStr].events[rName]) ? window.i18n[langStr].events[rName] : rName;
        
        breadcrumb.innerHTML = `<span onclick="window.backToHome()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">Formula 1</span> <span class="separator">/</span> <span onclick="window.backToYears()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">${yr}</span> <span class="separator">/</span> <span onclick="window.backToRaces(${yr})" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'" data-event-key="${rName}">${translatedRaceName}</span> <span class="separator">/</span> <span class="active-crumb" data-i18n="selectSession">${window.i18n[langStr].selectSession}</span>`;
        
        contentArea.innerHTML = '';
        window.showF1Loading(); // SİHİR 3
        ajaxRequest(MainForm.MainHTML, 'LoadSessionsEvent', ['year=' + yr, 'race_name=' + rName]);
    }
};

window.selectMode = function(modeName) {
    const homeWrapper = document.getElementById('homeScreenWrapper');
    homeWrapper.style.transform = "translateX(-100vw)";
    homeWrapper.style.opacity = "0";
    
    setTimeout(() => {
        homeWrapper.style.display = "none";
        
        // EĞER SEÇİLEN MOD ASSETTO CORSA İSE:
        if (modeName === 'AC') {
            const acScreen = document.getElementById('acRoomScreen');
            acScreen.style.display = "flex";
            // Ufak bir gecikme ile Fade-In yap
            setTimeout(() => { acScreen.classList.add('active'); }, 50);
            return; // F1 kodlarına geçmesini engelle
        }

        // EĞER F1 İSE (Eski kodlar aynen çalışmaya devam eder):
        const breadcrumb = document.getElementById('navBreadcrumb');
        breadcrumb.style.display = 'flex';
        const langStr = document.documentElement.lang || 'tr';
        breadcrumb.innerHTML = `<span onclick="window.backToHome()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">Formula 1</span> <span class="separator">/</span> <span class="active-crumb" data-i18n="selectYear">${window.i18n[langStr].selectYear}</span>`;

        const contentArea = document.getElementById('dynamicContentArea');
        contentArea.style.display = 'flex';
        contentArea.innerHTML = '';
        window.showF1Loading(); 
        ajaxRequest(MainForm.MainHTML, 'LoadYearsEvent', ['mode=' + modeName]);
    }, 600); 
};

window.renderYears = function(yearsArray) {
    window.hideF1Loading(); // VERİ GELDİ, YEŞİL IŞIK!
    const contentArea = document.getElementById('dynamicContentArea');
    if(!yearsArray || yearsArray.length === 0) {
        const langStr = document.documentElement.lang || 'tr';
        contentArea.innerHTML = `<div style="color: var(--warning-color); width: 100%; text-align: center; margin-top: 50px;">${langStr === 'tr' ? 'Yıl verisi bulunamadı.' : 'No year data found.'}</div>`;
        return;
    }
    
    const sortedYears = yearsArray.sort((a, b) => b - a);
    let cardsHTML = '';
    
    sortedYears.forEach((year, index) => {
        cardsHTML += `
            <div class="year-card" onclick="window.selectYear(${year})">
                <div class="year-text f1-font">${year}</div>
            </div>
        `;
    });
    
    contentArea.innerHTML = cardsHTML;

    setTimeout(() => {
        const cards = contentArea.querySelectorAll('.year-card');
        cards.forEach((card, index) => {
            const delay = index * 40;
            card.style.transitionDelay = delay + 'ms';
            card.classList.add('animate-in');
            setTimeout(() => { card.style.transitionDelay = ''; }, delay + 600); 
        });
    }, 50);
};

window.selectYear = function(year) {
    window.currentYear = year; 
    const contentArea = document.getElementById('dynamicContentArea');
    const cards = contentArea.querySelectorAll('.year-card');
    
    cards.forEach((card, index) => {
        card.style.transitionDelay = (index * 40) + 'ms'; 
        card.classList.remove('animate-in');
        card.classList.add('animate-out');
    });

    const totalWaitTime = (cards.length * 40) + 500;

    setTimeout(() => {
        const breadcrumb = document.getElementById('navBreadcrumb');
        const langStr = document.documentElement.lang || 'tr';
        
        breadcrumb.innerHTML = `<span onclick="window.backToHome()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">Formula 1</span> <span class="separator">/</span> <span onclick="window.backToYears()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">${year}</span> <span class="separator">/</span> <span class="active-crumb" data-i18n="selectRace">${window.i18n[langStr].selectRace}</span>`;
        
        contentArea.innerHTML = '';
        window.showF1Loading(); // SİHİR 5
        ajaxRequest(MainForm.MainHTML, 'LoadRacesEvent', ['year=' + year]);
    }, totalWaitTime);
};

window.formatDate = function(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateString;
};

window.renderRaces = function(racesArray) {
    window.hideF1Loading(); // VERİ GELDİ, YEŞİL IŞIK!
    const contentArea = document.getElementById('dynamicContentArea');
    const langStr = document.documentElement.lang || 'tr';
    
    if(!racesArray || racesArray.length === 0) {
        contentArea.innerHTML = `<div style="color: var(--warning-color); width: 100%; text-align: center; margin-top: 50px;">${langStr === 'tr' ? 'Yarış verisi bulunamadı.' : 'No race data found.'}</div>`;
        return;
    }
    
    let cardsHTML = '';
    
    racesArray.forEach((race, index) => {
        const cleanEventName = race.event_name ? race.event_name.trim() : '';
        const cleanCountry = race.country ? race.country.trim() : '';
        const cleanTrackName = race.track_name ? race.track_name.trim() : '';
        const cleanLocation = race.location ? race.location.trim() : '';

        const translatedCountry = (window.i18n[langStr].countries && window.i18n[langStr].countries[cleanCountry]) ? window.i18n[langStr].countries[cleanCountry] : cleanCountry;
        const translatedEvent = (window.i18n[langStr].events && window.i18n[langStr].events[cleanEventName]) ? window.i18n[langStr].events[cleanEventName] : cleanEventName;
        
        const displayLocation = (cleanTrackName && cleanTrackName !== cleanLocation) 
                                ? `${cleanTrackName}, ${translatedCountry}` 
                                : `${cleanLocation}, ${translatedCountry}`;

        cardsHTML += `
            <div class="race-card" onclick="window.selectRace('${cleanEventName}')">
                <div class="race-round f1-font">R${race.round_number}</div>
                <div class="race-title f1-font" data-event-key="${cleanEventName}">${translatedEvent}</div>
                <img class="race-track-silhouette" src="${race.track_image || 'https://hasup.net/assets/track_placeholder.png'}" onerror="this.src='https://hasup.net/assets/track_placeholder.png'" alt="Track">
                <div class="race-details">
                    <div class="race-location" data-country="${cleanCountry}" data-trackname="${cleanTrackName || cleanLocation}">${displayLocation}</div>
                    <div class="race-date">${window.formatDate(race.event_date)}</div>
                </div>
            </div>
        `;
    });
    
    contentArea.innerHTML = cardsHTML;

    setTimeout(() => {
        const cards = contentArea.querySelectorAll('.race-card');
        cards.forEach((card, index) => {
            const delay = index * 40;
            card.style.transitionDelay = delay + 'ms';
            card.classList.add('animate-in');
            setTimeout(() => { card.style.transitionDelay = ''; }, delay + 600);
        });
    }, 50);
};

window.selectRace = function(raceName) {
    window.currentRace = raceName;
    const contentArea = document.getElementById('dynamicContentArea');
    const cards = contentArea.querySelectorAll('.race-card');
    const cleanRaceName = raceName.trim();
    
    cards.forEach((card, index) => {
        card.style.transitionDelay = (index * 20) + 'ms'; 
        card.classList.remove('animate-in');
        card.classList.add('animate-out');
    });

    const totalWaitTime = (cards.length * 20) + 500;

    setTimeout(() => {
        const breadcrumb = document.getElementById('navBreadcrumb');
        const langStr = document.documentElement.lang || 'tr';
        
        const translatedRaceName = (window.i18n[langStr].events && window.i18n[langStr].events[cleanRaceName]) ? window.i18n[langStr].events[cleanRaceName] : cleanRaceName;
        
        breadcrumb.innerHTML = `<span onclick="window.backToHome()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">Formula 1</span> <span class="separator">/</span> <span onclick="window.backToYears()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">${window.currentYear}</span> <span class="separator">/</span> <span onclick="window.backToRaces(${window.currentYear})" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'" data-event-key="${cleanRaceName}">${translatedRaceName}</span> <span class="separator">/</span> <span class="active-crumb" data-i18n="selectSession">${window.i18n[langStr].selectSession}</span>`;
        
        contentArea.innerHTML = '';
        window.showF1Loading(); // SİHİR 6
        ajaxRequest(MainForm.MainHTML, 'LoadSessionsEvent', ['year=' + window.currentYear, 'race_name=' + cleanRaceName]);
    }, totalWaitTime);
};

window.selectSession = function(sessionName) {
    window.currentSession = sessionName;
    const contentArea = document.getElementById('dynamicContentArea');
    const cards = contentArea.querySelectorAll('.session-card');
    
    cards.forEach((card, index) => {
        card.style.transitionDelay = (index * 20) + 'ms'; 
        card.classList.remove('animate-in');
        card.classList.add('animate-out');
    });

    const totalWaitTime = (cards.length * 20) + 500;

    setTimeout(() => {
        const breadcrumb = document.getElementById('navBreadcrumb');
        const langStr = document.documentElement.lang || 'tr';
        
        const translatedRaceName = (window.i18n[langStr].events && window.i18n[langStr].events[window.currentRace]) ? window.i18n[langStr].events[window.currentRace] : window.currentRace;
        const translatedSessionName = (window.i18n[langStr].sessions && window.i18n[langStr].sessions[sessionName]) ? window.i18n[langStr].sessions[sessionName] : sessionName;
        
        breadcrumb.innerHTML = `
            <span onclick="window.backToHome()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">Formula 1</span> <span class="separator">/</span> 
            <span onclick="window.backToYears()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">${window.currentYear}</span> <span class="separator">/</span> 
            <span onclick="window.backToRaces(${window.currentYear})" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'" data-event-key="${window.currentRace}">${translatedRaceName}</span> <span class="separator">/</span> 
            <span onclick="window.backToSessions(${window.currentYear}, '${window.currentRace}')" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'" data-session-key="${sessionName}">${translatedSessionName}</span> <span class="separator">/</span> 
            <span class="active-crumb" data-i18n="selectDriver">${window.i18n[langStr].selectDriver}</span>`;
        
        contentArea.innerHTML = '';
        window.showF1Loading(); // SİHİR 7
        ajaxRequest(MainForm.MainHTML, 'LoadDriversEvent', ['year=' + window.currentYear, 'race_name=' + window.currentRace, 'session_type=' + sessionName]);
    }, totalWaitTime);
};

window.renderDrivers = function(driversArray) {
    window.hideF1Loading(); // VERİ GELDİ, YEŞİL IŞIK!
    const contentArea = document.getElementById('dynamicContentArea');
    const langStr = document.documentElement.lang || 'tr';
    
    if(!driversArray || driversArray.length === 0) {
        contentArea.innerHTML = `<div style="color: var(--warning-color); width: 100%; text-align: center; margin-top: 50px;">${langStr === 'tr' ? 'Sürücü verisi bulunamadı.' : 'No driver data found.'}</div>`;
        return;
    }
    
    let cardsHTML = '';
    driversArray.forEach((driver, index) => {
        
        let isDisabled = false;
        if (window.isCompareMode && window.driver1Meta && window.driver1Meta.code === driver.driver_code) {
            isDisabled = true;
        }

        const disabledClass = isDisabled ? 'disabled' : '';
        const onClickAction = isDisabled ? '' : `onclick="window.selectDriver('${driver.driver_code}', '${driver.team_color}')"`;
        
        cardsHTML += `
            <div class="race-card ${disabledClass}" style="justify-content: flex-start;" ${onClickAction}>
                <div class="driver-tag">
                    <div class="driver-color-bar" style="background-color: #${driver.team_color}"></div>
                    <div class="driver-code-text f1-font">${driver.driver_code}</div>
                </div>
                <img class="driver-image" src="https://hasup.net/assets/drivers/${driver.driver_code}.png" onerror="this.src='https://hasup.net/assets/driver_placeholder.png'" alt="${driver.broadcast_name}">
                <div class="race-details" style="margin-top: 15px;">
                    <div class="driver-name">${driver.broadcast_name}</div>
                    <div class="race-date" style="color: #${driver.team_color}; font-size: 14px;">${driver.team_name}</div>
                </div>
                ${isDisabled ? '<div style="position:absolute; top:50%; background:rgba(0,0,0,0.8); color:var(--primary-color); padding:5px 15px; border-radius:5px; font-weight:bold; font-size:14px; transform:translateY(-50%);">SEÇİLİ PİLOT</div>' : ''}
            </div>
        `;
    });
    contentArea.innerHTML = cardsHTML;

    setTimeout(() => {
        const cards = contentArea.querySelectorAll('.race-card');
        cards.forEach((card, index) => {
            const delay = index * 30; 
            card.style.transitionDelay = delay + 'ms';
            card.classList.add('animate-in');
            setTimeout(() => { card.style.transitionDelay = ''; }, delay + 600);
        });
    }, 50);
};

window.renderSessions = function(sessionsArray) {
    window.hideF1Loading(); // VERİ GELDİ, YEŞİL IŞIK!
    const contentArea = document.getElementById('dynamicContentArea');
    const langStr = document.documentElement.lang || 'tr';
    const sessionDict = window.i18n[langStr].sessions || {}; 
    
    if(!sessionsArray || sessionsArray.length === 0) {
        contentArea.innerHTML = `<div style="color: var(--warning-color); width: 100%; text-align: center; margin-top: 50px;">${langStr === 'tr' ? 'Seans verisi bulunamadı.' : 'No session data found.'}</div>`;
        return;
    }

    const mainEvents = sessionsArray.filter(s => s.session_name.toLowerCase().match(/race|qualifying|sprint/));
    const subEvents = sessionsArray.filter(s => s.session_name.toLowerCase().match(/practice/));
    const sortedSessions = [...mainEvents, ...subEvents];

    let cardsHTML = '<div class="session-bento">';
    sortedSessions.forEach((session, index) => {
        const cleanSessionName = session.session_name.trim();
        const isMainEvent = cleanSessionName.toLowerCase().match(/race|qualifying|sprint/);
        const cardClass = isMainEvent ? 'main-event' : 'sub-event';
        const icon = isMainEvent ? '<i class="fa-solid fa-flag-checkered"></i>' : '<i class="fa-solid fa-stopwatch"></i>';
        const translatedName = sessionDict[cleanSessionName] || cleanSessionName;
        
        cardsHTML += `
            <div class="session-card ${cardClass}" onclick="window.selectSession('${cleanSessionName}')">
                <div style="font-size: ${isMainEvent ? '32px' : '24px'}; color: var(--primary-color); margin-bottom: 15px;">${icon}</div>
                <div class="session-name f1-font" data-session-key="${cleanSessionName}">${translatedName}</div>
                <div class="session-date">${window.formatDate(session.session_date.split(' ')[0])}</div>
            </div>
        `;
    });
    cardsHTML += '</div>';
    contentArea.innerHTML = cardsHTML;

    setTimeout(() => {
        const cards = contentArea.querySelectorAll('.session-card');
        cards.forEach((card, index) => {
            const delay = index * 50;
            card.style.transitionDelay = delay + 'ms';
            card.classList.add('animate-in');
            setTimeout(() => { card.style.transitionDelay = ''; }, delay + 600);
        });
    }, 50);
};

window.selectDriver = function(driverCode, teamColor) {
    window.currentTeamColor = teamColor;
    const contentArea = document.getElementById('dynamicContentArea');
    const dashboard = document.getElementById('telemetryDashboard');
    
    contentArea.classList.add('animate-pan-zoom-out');

    setTimeout(() => {
        contentArea.classList.remove('animate-pan-zoom-out');
        contentArea.style.display = 'none'; 
        
        const breadcrumb = document.getElementById('navBreadcrumb');
        const langStr = document.documentElement.lang || 'tr';
        
        const translatedRaceName = (window.i18n[langStr].events && window.i18n[langStr].events[window.currentRace]) ? window.i18n[langStr].events[window.currentRace] : window.currentRace;
        const translatedSessionName = (window.i18n[langStr].sessions && window.i18n[langStr].sessions[window.currentSession]) ? window.i18n[langStr].sessions[window.currentSession] : window.currentSession;
        
        // --- YENİ: AKILLI BREADCRUMB ETİKETİ (TAG) ---
        let miniDriverTag = '';

        if (window.isCompareMode && window.driver1Meta) {
            // İkili Karşılaştırma Etiketi (VS)
            miniDriverTag = `<span class="driver-tag-crumb" onclick="window.backToDrivers()" style="display: inline-flex; border: 1px solid var(--tag-border); border-radius: 6px; overflow: hidden; height: 32px; align-items: center; vertical-align: middle; box-shadow: 0 4px 8px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.3)';">` +
                `<span style="width: 12px; height: 100%; background-color: #${window.driver1Meta.color};"></span>` +
                `<span class="f1-font" style="background: var(--tag-bg); color: var(--tag-text); padding: 0 10px; font-size: 18px; font-weight: 900; line-height: 32px; letter-spacing: 1px;">${window.driver1Meta.code}</span>` +
                `<span class="f1-font" style="background: var(--tag-bg); color: var(--text-color); opacity: 0.5; padding: 0 5px; font-size: 14px; line-height: 32px; font-style: italic;">VS</span>` +
                `<span class="f1-font" style="background: var(--tag-bg); color: var(--tag-text); padding: 0 10px; font-size: 18px; font-weight: 900; line-height: 32px; letter-spacing: 1px;">${driverCode}</span>` +
                `<span style="width: 12px; height: 100%; background-color: #${teamColor};"></span>` +
            `</span>`;
        } else {
            // Normal Tekli Etiket
            miniDriverTag = `<span class="driver-tag-crumb" onclick="window.backToDrivers()" style="display: inline-flex; border: 1px solid var(--tag-border); border-radius: 6px; overflow: hidden; height: 32px; align-items: center; vertical-align: middle; box-shadow: 0 4px 8px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.3)';">` +
                `<span style="width: 12px; height: 100%; background-color: #${teamColor};"></span>` +
                `<span class="f1-font" style="background: var(--tag-bg); color: var(--tag-text); padding: 0 12px; font-size: 18px; font-weight: 900; line-height: 32px; letter-spacing: 1px;">${driverCode}</span>` +
            `</span>`;
        }

        breadcrumb.innerHTML = `
            <span onclick="window.backToHome()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">Formula 1</span> <span class="separator">/</span> 
            <span onclick="window.backToYears()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">${window.currentYear}</span> <span class="separator">/</span> 
            <span onclick="window.backToRaces(${window.currentYear})" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'" data-event-key="${window.currentRace}">${translatedRaceName}</span> <span class="separator">/</span> 
            <span onclick="window.backToSessions(${window.currentYear}, '${window.currentRace}')" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'" data-session-key="${window.currentSession}">${translatedSessionName}</span> <span class="separator">/</span> 
            ${miniDriverTag}`;

        dashboard.innerHTML = '';
        dashboard.classList.add('active');
        window.showF1Loading(); // SİHİR 8

        
        // --- AKILLI YÖNLENDİRİCİ ---
        if (window.isCompareMode && window.driver1Meta) {
            // İkili Karşılaştırma İsteği Fırlat (Yeni Delphi Eventi!)
            window.driver2Meta = { code: driverCode, color: teamColor };
            
            ajaxRequest(MainForm.MainHTML, 'LoadCompareEvent', [
                'year=' + window.currentYear,
                'race_name=' + window.currentRace,
                'session_type=' + window.currentSession,
                'driver1=' + window.driver1Meta.code,
                'driver2=' + driverCode,
                'lap=fastest'
            ]);
            
            // İsteği attıktan sonra modu sıfırla ki geri gelirse normal çalışsın
            window.isCompareMode = false; 

        } else {
            // Normal Tekli Telemetri İsteği (Eski Kod)
            ajaxRequest(MainForm.MainHTML, 'LoadTelemetryEvent', [
                'year=' + window.currentYear,
                'race_name=' + window.currentRace,
                'session_type=' + window.currentSession,
                'driver_code=' + driverCode,
                'lap=fastest'
            ]);
        }

    }, 800);
};

window.renderTelemetry = function(telemetryData) {
    window.isCompareModeActive = false;
    
    const dashboard = document.getElementById('telemetryDashboard');
    const langStr = document.documentElement.lang || 'tr';

    if(!telemetryData || telemetryData.status === 'error') {
        dashboard.innerHTML = `<div data-i18n="telemetryError" style="color: var(--warning-color); width: 100%; text-align: center; margin-top: 50px;">${window.i18n[langStr].telemetryError}</div>`;
        return;
    }

    const lapNumActual = telemetryData.lap_number || (telemetryData.telemetry_data && telemetryData.telemetry_data.lap_number) || '?';
    const lapTimeRaw = telemetryData.lap_time || (telemetryData.telemetry_data && telemetryData.telemetry_data.lap_time);
    const lapReq = telemetryData.lap_requested || 'fastest'; 
    const driverCode = telemetryData.driver_code || 'N/A';
    
    let lapText = '';
    if (lapReq === 'fastest' || lapReq === 'first' || lapReq === 'last') {
        const translatedReq = (window.i18n[langStr].laps && window.i18n[langStr].laps[lapReq]) ? window.i18n[langStr].laps[lapReq] : lapReq;
        lapText = `${translatedReq} (${lapNumActual})`;
    } else {
        lapText = `${lapNumActual}`;
    }

    const lapTime = window.formatLapTime(lapTimeRaw, langStr);
    
    window.currentTelemetryData = telemetryData.telemetry_data;
    window.currentDriverMeta = { code: driverCode, color: window.currentTeamColor };

    dashboard.innerHTML = `
        <div class="telemetry-layout">
            
            <div class="telemetry-panel-left" id="panelLeft">
                <div class="track-map-container" id="trackMapContainer">
                    <canvas id="trackCanvas" width="450" height="450"></canvas>
                    <div class="floating-driver-tag" id="floatingTag" style="display: none;">
                        <div class="floating-color-bar" style="background-color: #${window.currentTeamColor};"></div>
                        <div class="floating-code-text f1-font">${driverCode}</div>
                    </div>
                </div>
                <div class="sim-controls-horizontal">
                    <div class="sim-buttons">
                        <button class="icon-btn" onclick="window.stepSimulation(-1)" title="Geri"><i class="fa-solid fa-step-backward"></i></button>
                        <button class="icon-btn" id="simPlayPauseBtn" onclick="window.toggleSimulation()"><i class="fa-solid fa-pause"></i></button>
                        <button class="icon-btn" onclick="window.stepSimulation(1)" title="İleri"><i class="fa-solid fa-step-forward"></i></button>
                    </div>
                    <div class="sim-timer f1-font" id="simTimerDisplay" style="width: 80px; text-align: center;">0:00.000</div>
                    <div class="sim-legend-horizontal">
                        <span class="f1-font" style="font-size:14px; color: var(--text-color);">Min: <span id="legendMinSpeed">0</span></span>
                        <span style="margin: 0 10px; color: var(--tag-border);">|</span>
                        <span class="f1-font" style="font-size:14px; color: var(--text-color);">Max: <span id="legendMaxSpeed" style="font-weight:bold; color: var(--primary-color);">0 km/h</span></span>
                    </div>
                </div>
            </div>
            
            <div class="telemetry-panel-right charts-container" id="panelRight">
                
                <div id="dynamicSectorHeader" class="dynamic-sector-header"></div>

                <div id="timingRibbonContainer" class="timing-ribbon-container"></div>

                <div style="background: var(--secondary-bg); border: 1px solid var(--tag-border); border-radius: 12px; padding: 15px; height: 300px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                    <div style="position: relative; width: 100%; height: 100%;"><canvas id="speedChart"></canvas></div>
                </div>

                <div style="background: var(--secondary-bg); border: 1px solid var(--tag-border); border-radius: 12px; padding: 15px; height: 200px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                    <div style="position: relative; width: 100%; height: 100%;"><canvas id="tbChart"></canvas></div>
                </div>

                <div style="background: var(--secondary-bg); border: 1px solid var(--tag-border); border-radius: 12px; padding: 15px; height: 160px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                    <div style="position: relative; width: 100%; height: 100%;"><canvas id="gearChart"></canvas></div>
                </div>

                <div style="background: var(--secondary-bg); border: 1px solid var(--tag-border); border-radius: 12px; padding: 15px; height: 140px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                    <div style="position: relative; width: 100%; height: 100%;"><canvas id="drsChart"></canvas></div>
                </div>

            </div>
        </div>
    `;

    setTimeout(() => {
        document.getElementById('panelLeft').classList.add('animate-in');
        setTimeout(() => {
            document.getElementById('panelRight').classList.add('animate-in');
            window.renderCharts(); 
        }, 150);

        window.pausedElapsedTime = 0;
        window.isSimulating = true;
        document.getElementById('floatingTag').style.display = 'flex';
        window.simStartTime = performance.now();
        window.startAnimationLoop();
        
        // YENİ: Işıkları Söndür (Yeşil Yanar ve Kaybolur)
        window.hideF1Loading();
        window.setLanguage(langStr);

        // YENİ: Arka planda tur listesini çek VEYA zaten varsa direkt çiz
        if (!window.globalLapsSummary || window.globalLapsSummary.driver_code !== driverCode) {
            // İlk kez açılıyorsa Delphi'den tur listesini iste
            ajaxRequest(MainForm.MainHTML, 'LoadLapsSummaryEvent', [
                'year=' + window.currentYear,
                'race_name=' + window.currentRace,
                'session_type=' + window.currentSession,
                'driver_code=' + driverCode
            ]);
        } else {
            // Başka bir tura geçildiyse (zaten veri bellekte var), beklemeden şeridi güncelle!
            window.updateLapsRibbon(window.globalLapsSummary, lapReq);
        }
        
    }, 100);
};

window.backToDrivers = function() {
    const dashboard = document.getElementById('telemetryDashboard');
    const contentArea = document.getElementById('dynamicContentArea');

    dashboard.classList.remove('active');
    contentArea.style.display = 'flex';

    const langStr = document.documentElement.lang || 'tr';
    const breadcrumb = document.getElementById('navBreadcrumb');
    
    const translatedRaceName = (window.i18n[langStr].events && window.i18n[langStr].events[window.currentRace]) ? window.i18n[langStr].events[window.currentRace] : window.currentRace;
    const translatedSessionName = (window.i18n[langStr].sessions && window.i18n[langStr].sessions[window.currentSession]) ? window.i18n[langStr].sessions[window.currentSession] : window.currentSession;
    
    breadcrumb.innerHTML = `
        <span onclick="window.backToHome()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">Formula 1</span> <span class="separator">/</span> 
        <span onclick="window.backToYears()" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'">${window.currentYear}</span> <span class="separator">/</span> 
        <span onclick="window.backToRaces(${window.currentYear})" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'" data-event-key="${window.currentRace}">${translatedRaceName}</span> <span class="separator">/</span> 
        <span onclick="window.backToSessions(${window.currentYear}, '${window.currentRace}')" style="cursor: pointer; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-color)'" data-session-key="${window.currentSession}">${translatedSessionName}</span> <span class="separator">/</span> 
        <span class="active-crumb" data-i18n="selectDriver">${window.i18n[langStr].selectDriver}</span>`;
    
    contentArea.innerHTML = '';
    window.showF1Loading(); // SİHİR 9
    
    ajaxRequest(MainForm.MainHTML, 'LoadDriversEvent', [
        'year=' + window.currentYear,
        'race_name=' + window.currentRace,
        'session_type=' + window.currentSession
    ]);
};

window.drawTrackMap = function() {
    const canvas = document.getElementById('trackCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = window.currentTelemetryData;
    if (!data || !data.x) return;

    const padding = 30; 
    const minX = Math.min(...data.x); const maxX = Math.max(...data.x);
    const minY = Math.min(...data.y); const maxY = Math.max(...data.y);
    const rangeX = maxX - minX; const rangeY = maxY - minY;
    
    const scaleX = (canvas.width - padding * 2) / rangeX;
    const scaleY = (canvas.height - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (canvas.width - (rangeX * scale)) / 2;
    const offsetY = (canvas.height - (rangeY * scale)) / 2; 

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    ctx.strokeStyle = isLightMode ? '#1A202C' : '#E6EDF3'; 
    ctx.lineWidth = 3.5; 
    
    ctx.beginPath();
    for (let i = 0; i < data.x.length; i++) {
        const px = (data.x[i] - minX) * scale + offsetX;
        const py = canvas.height - ((data.y[i] - minY) * scale + offsetY);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    const minSpeed = Math.min(...data.speed);
    const maxSpeed = Math.max(...data.speed);
    const minLabel = document.getElementById('legendMinSpeed');
    const maxLabel = document.getElementById('legendMaxSpeed');
    if(minLabel) minLabel.innerText = Math.round(minSpeed);
    if(maxLabel) maxLabel.innerText = Math.round(maxSpeed) + ' km/h';
};

window.isSimulating = false;
window.simAnimationId = null;
window.simStartTime = 0; 
window.pausedElapsedTime = 0; 

window.toggleSimulation = function() {
    const btn = document.getElementById('simPlayPauseBtn');
    if (window.isSimulating) {
        window.isSimulating = false;
        cancelAnimationFrame(window.simAnimationId);
        window.pausedElapsedTime = performance.now() - window.simStartTime;
        if(btn) btn.innerHTML = `<i class="fa-solid fa-play"></i>`;
    } else {
        window.isSimulating = true;
        if(btn) btn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
        window.simStartTime = performance.now() - window.pausedElapsedTime;
        
        // Hangi moddaysak onun motorunu ateşle!
        if (window.isCompareModeActive) {
            if (window.startCompareAnimationLoop) window.startCompareAnimationLoop();
        } else {
            if (window.startAnimationLoop) window.startAnimationLoop();
        }
    }
};

window.startAnimationLoop = function() {
    const data = window.currentTelemetryData;
    const meta = window.currentDriverMeta;
    if (!data || !data.time) return;

    const canvas = document.getElementById('trackCanvas');
    const ctx = canvas.getContext('2d');
    
    const padding = 30; 
    const minX = Math.min(...data.x); const maxX = Math.max(...data.x);
    const minY = Math.min(...data.y); const maxY = Math.max(...data.y);
    const rangeX = maxX - minX; const rangeY = maxY - minY;
    
    const scaleX = (canvas.width - padding * 2) / rangeX;
    const scaleY = (canvas.height - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvas.width - (rangeX * scale)) / 2;
    const offsetY = (canvas.height - (rangeY * scale)) / 2; 

    const actualLapDurationSeconds = data.time[data.time.length - 1]; 
    const simulationSpeedMultiplier = 4; 
    const targetSimulationDurationSeconds = actualLapDurationSeconds / simulationSpeedMultiplier; 

    function lerp(start, end, t) { return start * (1 - t) + end * t; }

    window.renderSimulationFrame = function(elapsedRealTimeSeconds) {
        if (elapsedRealTimeSeconds >= targetSimulationDurationSeconds) {
            elapsedRealTimeSeconds = 0;
            window.simStartTime = performance.now();
            window.pausedElapsedTime = 0;
        }

        const simClockTimeSeconds = elapsedRealTimeSeconds * simulationSpeedMultiplier; 
        
        const timerDisplay = document.getElementById('simTimerDisplay');
        if(timerDisplay) {
            const m = Math.floor(simClockTimeSeconds / 60);
            const s = Math.floor(simClockTimeSeconds % 60);
            const ms = Math.floor((simClockTimeSeconds % 1) * 1000);
            timerDisplay.innerText = `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
        }
        
        let currentDataIndex = 0;
        while (currentDataIndex < data.time.length - 1 && data.time[currentDataIndex+1] < simClockTimeSeconds) {
            currentDataIndex++;
        }
        if(currentDataIndex >= data.time.length - 1) currentDataIndex = data.time.length - 2; 

        const i = currentDataIndex;
        const deltaTime = data.time[i+1] - data.time[i];
        const t = deltaTime > 0 ? (simClockTimeSeconds - data.time[i]) / deltaTime : 0; 

        const smoothX = lerp(data.x[i], data.x[i+1], t);
        const smoothY = lerp(data.y[i], data.y[i+1], t);
        
        const canvasX = (smoothX - minX) * scale + offsetX;
        const canvasY = canvas.height - ((smoothY - minY) * scale + offsetY); 
        
        const fractionalIndex = i + t;
        if (window.telemetryCharts) {
            Object.values(window.telemetryCharts).forEach(chart => {
                if (chart && chart.options.plugins.syncCursor) {
                    chart.options.plugins.syncCursor.index = fractionalIndex; // distance değil, index!
                    chart.draw();
                }
            });
        }

        window.drawTrackMap(); 

        const minSpeed = Math.min(...data.speed);
        const maxSpeed = Math.max(...data.speed);
        
        ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        
        for (let j = 0; j < i; j++) {
            const startX = (data.x[j] - minX) * scale + offsetX;
            const startY = canvas.height - ((data.y[j] - minY) * scale + offsetY);
            const endX = (data.x[j+1] - minX) * scale + offsetX;
            const endY = canvas.height - ((data.y[j+1] - minY) * scale + offsetY);
            
            const speedRatio = (data.speed[j] - minSpeed) / (maxSpeed - minSpeed);
            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY);
            ctx.strokeStyle = `hsl(${speedRatio * 120}, 100%, 50%)`; ctx.stroke();
        }
        
        const lastPointX = (data.x[i] - minX) * scale + offsetX;
        const lastPointY = canvas.height - ((data.y[i] - minY) * scale + offsetY);
        const speedRatioLast = (data.speed[i] - minSpeed) / (maxSpeed - minSpeed);
        
        ctx.beginPath(); ctx.moveTo(lastPointX, lastPointY); ctx.lineTo(canvasX, canvasY);
        ctx.strokeStyle = `hsl(${speedRatioLast * 120}, 100%, 50%)`; ctx.stroke();

        ctx.beginPath(); ctx.arc(canvasX, canvasY, 12, 0, 2 * Math.PI); 
        ctx.fillStyle = `#${meta.color}`;
        ctx.shadowBlur = 18; ctx.shadowColor = `#${meta.color}`; ctx.fill(); ctx.shadowBlur = 0; 

        const lineOffsetX = 35; const lineOffsetY = -35; 
        const targetCanvasX = canvasX + lineOffsetX; const targetCanvasY = canvasY + lineOffsetY;

        ctx.beginPath(); ctx.moveTo(canvasX, canvasY); ctx.lineTo(targetCanvasX, targetCanvasY); 
        ctx.strokeStyle = `#${meta.color}`; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); 

        const container = document.getElementById('trackMapContainer');
        const tag = document.getElementById('floatingTag');
        if (container && tag) {
            const canvasLeftGap = (container.offsetWidth - canvas.width) / 2;
            const canvasTopGap = (container.offsetHeight - canvas.height) / 2;
            tag.style.left = `${targetCanvasX + canvasLeftGap}px`;
            tag.style.top = `${targetCanvasY + canvasTopGap}px`;
        }
    };

    function animate() {
        if (!window.isSimulating) return;
        const now = performance.now();
        const elapsedRealTimeSeconds = (now - window.simStartTime) / 1000; 
        window.renderSimulationFrame(elapsedRealTimeSeconds);
        window.simAnimationId = requestAnimationFrame(animate);
    }
    window.simAnimationId = requestAnimationFrame(animate);
};

window.stepSimulation = function(direction) {
    if (window.isSimulating) window.toggleSimulation(); 
    
    window.pausedElapsedTime += (100 * direction); 
    if (window.pausedElapsedTime < 0) window.pausedElapsedTime = 0;

    // COMPARE MODU İÇİN İLERİ/GERİ
    if (window.isCompareModeActive) {
        const targetSimSecs = window.compareTargetSimSecs || 20;
        if (window.pausedElapsedTime / 1000 >= targetSimSecs) window.pausedElapsedTime = targetSimSecs * 1000;
        
        const oldSimState = window.isSimulating;
        window.isSimulating = true;
        if (window.renderCompareSimulationFrame) window.renderCompareSimulationFrame(window.pausedElapsedTime / 1000);
        window.isSimulating = oldSimState;
    } 
    // TEKLİ MOD İÇİN İLERİ/GERİ
    else {
        const data = window.currentTelemetryData;
        if (data && data.time) {
            const actualLapDurationSeconds = data.time[data.time.length - 1]; 
            const targetSimSecs = actualLapDurationSeconds / 4;
            
            if (window.pausedElapsedTime / 1000 >= targetSimSecs) window.pausedElapsedTime = targetSimSecs * 1000;
            
            const oldSimState = window.isSimulating;
            window.isSimulating = true;
            if (window.renderSimulationFrame) window.renderSimulationFrame(window.pausedElapsedTime / 1000);
            window.isSimulating = oldSimState;
        }
    }
};

// --- YENİ, DİNAMİK VE %100 AKILLI: SYNC CURSOR PLUGİNİ ---
const syncCursorPlugin = {
    id: 'syncCursor',
    afterDatasetsDraw(chart, args, options) {
        if (chart.options.plugins.syncCursor && chart.options.plugins.syncCursor.index !== null && chart.options.plugins.syncCursor.index !== undefined) {
            const idx = chart.options.plugins.syncCursor.index;
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;

            const maxIdx = chart.data.labels.length - 1;

            if (idx >= 0 && idx <= maxIdx) {
                const xPixel = xAxis.getPixelForValue(idx);

                ctx.save();
                
                // 1. ZARİF ÇİZGİ TASARIMI (Soft ve Kalıcı, Gayet İyi)
                ctx.beginPath();
                ctx.moveTo(xPixel, yAxis.top);
                ctx.lineTo(xPixel, yAxis.bottom);
                ctx.lineWidth = 1.5; 
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; // Şeffaf beyaz/buz grisi
                ctx.setLineDash([4, 4]); 
                ctx.stroke();

                // 2. --- YENİ VE DİNAMİK NOKTA TASARIMI ---
                const dataset = chart.data.datasets[0]; // İlk verisetini al
                
                // --- GÜNCELLEME 1: DİNAMİK YÜKSEKLİK (Interpolated Data Value) ---
                // İndeks küsuratlı (Örn: 145.5), o yüzden veri değerini interpolate edip tam noktayı bulmalıyız
                const idxFloor = Math.floor(idx);
                const idxCeil = Math.min(maxIdx, Math.ceil(idx));
                const t = idx - idxFloor;

                const valFloor = dataset.data[idxFloor];
                const valCeil = dataset.data[idxCeil];
                
                // Eğer veri sayı ise interpolasyon yap
                let smoothValue;
                if (typeof valFloor === 'number' && typeof valCeil === 'number') {
                    smoothValue = valFloor + (valCeil - valFloor) * t; 
                } else {
                    // Sayı değilse (zaten formatlanmış DRS stringi falan ise) interpolate edemeyiz, taban değeri al
                    smoothValue = valFloor;
                }

                // Değeri y-ekseni piksel koordinatına çevir (Jilet gibi grafiğe yapışır!)
                const yPixel = yAxis.getPixelForValue(smoothValue);

                // --- GÜNCELLEME 2: DİNAMİK RENK (Matching dataset's borderColor) ---
                const chartColor = dataset.borderColor;

                // Noktayı çiz (Biraz daha büyük, 3.5'tan 5'e)
                ctx.beginPath();
                ctx.arc(xPixel, yPixel, 5, 0, 2 * Math.PI); 
                
                // Rengi grafiğin rengi yaptık!
                ctx.fillStyle = chartColor; 
                
                // Biraz parlama ve kenarlık verelim ki koyu renklerde kaybolmasın
                ctx.shadowBlur = 10;
                ctx.shadowColor = chartColor; 
                ctx.fill();
                
                // Beyaz bir kenarlık (Zariflik ve görünürlük için)
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#FFFFFF'; 
                ctx.lineWidth = 1;
                ctx.stroke();
                
                ctx.restore();
            }
        }
    }
};

// --- YENİ: ZAMANI BÜKEN INTERAKTİF KAYDIRMA (SCRUBBER) MOTORU ---
window.isScrubbing = false;

window.bindScrubberEvents = function(chartInstance) {
    if (!chartInstance) return;
    const canvas = chartInstance.canvas;

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const xPixel = e.clientX - rect.left;
        const xAxis = chartInstance.scales.x;
        
        // --- UX MÜHENDİSLİĞİ: Akıllı İmleç (Cursor) Yönetimi ---
        if (window.isScrubbing) {
            canvas.style.cursor = 'grabbing'; // Sürüklerken "sıkıca tutan el" ikonu
        } else {
            // İmlecin (bizim çizdiğimiz o soft çizginin) anlık piksel konumunu bul
            let cursorPixelX = -1000; 
            if (chartInstance.options.plugins.syncCursor && chartInstance.options.plugins.syncCursor.index !== null) {
                const idx = chartInstance.options.plugins.syncCursor.index;
                // İndeksi, kanvas üzerindeki gerçek X pikseline çeviriyoruz
                cursorPixelX = xAxis.getPixelForValue(idx);
            }

            // Fare, o anki çizgiye 15 piksel (sağdan/soldan) yakın mı? (Hit Detection)
            if (Math.abs(xPixel - cursorPixelX) < 15) {
                canvas.style.cursor = 'grab'; // Çizginin üstündeyken "tutabilirsin (açık el)" ikonu
            } else {
                canvas.style.cursor = 'pointer'; // Boşluklardayken "buraya atlayabilirsin (işaret parmağı)" ikonu
            }
        }

        // Eğer basılı tutuluyorsa kaydırma işlemini yap
        if (window.isScrubbing) {
            updateScrubber(e, chartInstance);
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        window.isScrubbing = true;
        canvas.style.cursor = 'grabbing'; // Tıklar tıklamaz eli kapat
        updateScrubber(e, chartInstance);
    });

    // Farenin tuşunu bıraktığında (Tüm tarayıcı ekranında dinler ki grafik dışına taşarsa takılı kalmasın)
    if (!window.scrubberMouseUpBound) {
        window.addEventListener('mouseup', () => {
            window.isScrubbing = false;
            // Fare tuşu bırakıldığında (mouse serbest), bir sonraki mousemove doğru imleci atayacaktır
        });
        window.scrubberMouseUpBound = true;
    }
};

function updateScrubber(e, chart) {
    const rect = chart.canvas.getBoundingClientRect();
    const xPixel = e.clientX - rect.left;
    const xAxis = chart.scales.x;
    
    const xClamped = Math.max(xAxis.left, Math.min(xPixel, xAxis.right));
    const tRatio = (xClamped - xAxis.left) / (xAxis.right - xAxis.left);
    const maxIdx = chart.data.labels.length - 1;
    const idx = tRatio * maxIdx; 

    // --- İKİLİ KARŞILAŞTIRMA (COMPARE) MODU İÇİN SCRUBBER ---
    if (window.isCompareModeActive) {
        const distances = chart.data.labels;
        const idxFloor = Math.floor(idx);
        const idxCeil = Math.min(maxIdx, Math.ceil(idx));
        const t = idxCeil === idxFloor ? 0 : (idx - idxFloor);
        
        const targetDistance = distances[idxFloor] + (distances[idxCeil] - distances[idxFloor]) * t;
        const distanceRatio = targetDistance / distances[distances.length - 1];
        
        // Mesafeyi kronometre zamanına çevir ki sayaç da güncellensin!
        window.pausedElapsedTime = (distanceRatio * window.compareTargetSimSecs) * 1000;

        if (window.isSimulating) {
            window.simStartTime = performance.now() - window.pausedElapsedTime;
        } else if (window.renderCompareSimulationFrame) {
            window.renderCompareSimulationFrame(window.pausedElapsedTime / 1000);
        }
        return; 
    }

    // --- TEKLİ MOD (Eski Kod) ---
    const data = window.currentTelemetryData;
    if (!data || !data.time) return;

    const idxFloor = Math.floor(idx);
    const idxCeil = Math.min(maxIdx, Math.ceil(idx));
    const t = idxCeil === idxFloor ? 0 : (idx - idxFloor);

    const targetSimTime = data.time[idxFloor] + (data.time[idxCeil] - data.time[idxFloor]) * t;
    window.pausedElapsedTime = (targetSimTime / 4) * 1000;

    if (window.isSimulating) {
        window.simStartTime = performance.now() - window.pausedElapsedTime;
    } else if (window.renderSimulationFrame) {
        window.renderSimulationFrame(window.pausedElapsedTime / 1000);
    }
}

window.telemetryCharts = { speed: null, tb: null, gear: null, drs: null };

window.renderCharts = function() {
    const data = window.currentTelemetryData;
    const meta = window.currentDriverMeta;
    
    if (!data || !data.distance) return;

    const langStr = document.documentElement.lang || 'tr';
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    const textColor = isLightMode ? '#1A202C' : '#E6EDF3';
    
    Object.keys(window.telemetryCharts).forEach(key => {
        if (window.telemetryCharts[key]) window.telemetryCharts[key].destroy();
    });

    const hexToRgb = (hex) => {
        const bigint = parseInt(hex, 16);
        return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
    };
    const teamColorRgb = hexToRgb(meta.color);

    const distanceLabels = data.distance.map(d => Math.round(d));

    const commonAnimation = {
        x: {
            type: 'number', easing: 'linear', duration: 1000, from: NaN, 
            delay(ctx) {
                if (ctx.type !== 'data' || ctx.xStarted) return 0;
                ctx.xStarted = true; return ctx.index * 3; 
            }
        },
        y: { type: 'number', easing: 'easeOutQuart', duration: 1000, from: (ctx) => ctx.chart.scales.y.getPixelForValue(0) }
    };

    const commonTitle = (text) => ({
        display: true, text: text, color: textColor,
        font: { family: 'Titillium Web', size: 14, weight: 'bold' },
        padding: { top: 0, bottom: 10 }
    });

    const commonXScale = {
        grid: { color: gridColor, drawTicks: false },
        ticks: { color: textColor, maxTicksLimit: 10, font: { family: 'Titillium Web', weight: '600' } }
    };

    // 1. HIZ GRAFİĞİ
    const speedCtx = document.getElementById('speedChart');
    if (speedCtx && data.speed) {
        const maxSpeed = Math.max(...data.speed);
        const maxIndex = data.speed.indexOf(maxSpeed);
        const minSpeed = Math.min(...data.speed);
        const minIndex = data.speed.indexOf(minSpeed);

        window.telemetryCharts.speed = new Chart(speedCtx, {
            type: 'line',
            data: {
                labels: distanceLabels,
                datasets: [
                    {
                        label: langStr === 'tr' ? 'Hız' : 'Speed', data: data.speed,
                        borderColor: `#${meta.color}`, backgroundColor: `rgba(${teamColorRgb}, 0.1)`,
                        borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 6, fill: true, tension: 0.2, order: 2
                    },
                    {
                        label: langStr === 'tr' ? 'Kritik' : 'Critical', data: data.speed.map((s, i) => (i === maxIndex || i === minIndex) ? s : null),
                        borderColor: '#FFFFFF', borderWidth: 2, pointRadius: 8, pointHoverRadius: 12,
                        pointStyle: 'rectRounded', pointBackgroundColor: (ctx) => ctx.parsed.y === maxSpeed ? '#00FF00' : '#FF0000',
                        showLine: false, order: 1
                    }
                ]
            },
            plugins: [syncCursorPlugin],
            options: {
                responsive: true, maintainAspectRatio: false, animation: commonAnimation,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    title: commonTitle(window.i18n[langStr].speedChartTitle),
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.85)', titleFont: { family: 'Titillium Web', size: 14 },
                        callbacks: {
                            label: (context) => {
                                let label = ` ${context.dataset.label}: ${context.parsed.y} km/h`;
                                if (context.parsed.y === maxSpeed) label += ' (MAX)';
                                if (context.parsed.y === minSpeed) label += ' (MIN)';
                                return label;
                            }
                        }
                    },
                    syncCursor: { index: null }
                },
                scales: { x: commonXScale, y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Titillium Web' } }, suggestedMin: 0, suggestedMax: 350 } }
            }
        });
        // YENİ: SCRUBBER'I BAĞLA!
        window.bindScrubberEvents(window.telemetryCharts.speed);
    }

    // 2. GAZ & FREN GRAFİĞİ
    const tbCtx = document.getElementById('tbChart');
    if (tbCtx && data.throttle && data.brake) {
        window.telemetryCharts.tb = new Chart(tbCtx, {
            type: 'line',
            data: {
                labels: distanceLabels,
                datasets: [
                    {
                        label: langStr === 'tr' ? 'Gaz (%)' : 'Throttle (%)', data: data.throttle,
                        borderColor: '#00E676', backgroundColor: 'rgba(0, 230, 118, 0.1)',
                        borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, fill: true, tension: 0.2
                    },
                    {
                        label: langStr === 'tr' ? 'Fren' : 'Brake', data: data.brake.map(b => b ? 100 : 0),
                        borderColor: '#FF1744', backgroundColor: 'rgba(255, 23, 68, 0.2)',
                        borderWidth: 2, pointRadius: 0, pointHoverRadius: 0, fill: true, stepped: true
                    }
                ]
            },
            plugins: [syncCursorPlugin], 
            options: {
                responsive: true, maintainAspectRatio: false, animation: commonAnimation,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    title: commonTitle(window.i18n[langStr].throttleBrakeChartTitle),
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.85)' },
                    syncCursor: { index: null } 
                },
                scales: { x: commonXScale, y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Titillium Web' } }, min: 0, max: 105 } }
            }
        });
        // YENİ: SCRUBBER'I BAĞLA!
        window.bindScrubberEvents(window.telemetryCharts.tb);
    }

    // 3. VİTES GRAFİĞİ
    const gearCtx = document.getElementById('gearChart');
    if (gearCtx && data.n_gear) {
        window.telemetryCharts.gear = new Chart(gearCtx, {
            type: 'line',
            data: {
                labels: distanceLabels,
                datasets: [{
                    label: langStr === 'tr' ? 'Vites' : 'Gear', data: data.n_gear,
                    borderColor: '#FFEA00', backgroundColor: 'rgba(255, 234, 0, 0.1)',
                    borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, fill: true, stepped: true
                }]
            },
            plugins: [syncCursorPlugin], 
            options: {
                responsive: true, maintainAspectRatio: false, animation: commonAnimation,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    title: commonTitle(window.i18n[langStr].gearChartTitle),
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.85)' },
                    syncCursor: { index: null } 
                },
                scales: { x: commonXScale, y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1, font: { family: 'Titillium Web' } }, min: 0, max: 9 } }
            }
        });
        // YENİ: SCRUBBER'I BAĞLA!
        window.bindScrubberEvents(window.telemetryCharts.gear);
    }

    // 4. DRS GRAFİĞİ
    const drsCtx = document.getElementById('drsChart');
    if (drsCtx && data.drs) {
        const drsData = data.drs.map(d => d >= 10 ? 1 : 0);
        window.telemetryCharts.drs = new Chart(drsCtx, {
            type: 'line',
            data: {
                labels: distanceLabels,
                datasets: [{
                    label: 'DRS', data: drsData,
                    borderColor: '#2979FF', backgroundColor: 'rgba(41, 121, 255, 0.2)',
                    borderWidth: 2, pointRadius: 0, pointHoverRadius: 0, fill: true, stepped: true
                }]
            },
            plugins: [syncCursorPlugin], 
            options: {
                responsive: true, maintainAspectRatio: false, animation: commonAnimation,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    title: commonTitle(window.i18n[langStr].drsChartTitle),
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        callbacks: { 
                            label: (ctx) => {
                                const currLang = document.documentElement.lang || 'tr';
                                return ` DRS: ${ctx.parsed.y === 1 ? window.i18n[currLang].drsOpen : window.i18n[currLang].drsClosed}`;
                            } 
                        }
                    },
                    syncCursor: { index: null } 
                },
                scales: {
                    x: commonXScale,
                    y: {
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor, stepSize: 1, font: { family: 'Titillium Web' },
                            callback: function(val) {
                                const currLang = document.documentElement.lang || 'tr';
                                if(val === 1) return window.i18n[currLang].drsOpen;
                                if(val === 0) return window.i18n[currLang].drsClosed;
                                return '';
                            }
                        },
                        min: -0.2, max: 1.2 
                    }
                }
            }
        });
        // YENİ: SCRUBBER'I BAĞLA!
        window.bindScrubberEvents(window.telemetryCharts.drs);
    }
};

window.startCompareMode = function() {
    window.isCompareMode = true;
    window.driver1Meta = window.currentDriverMeta; // Mevcut pilotu 1. Pilot olarak kaydet
    
    // Pilot seçme ekranına geri dön (Senin harika fikrin!)
    window.backToDrivers();
};

// ==========================================================================
// YENİ: İKİLİ PİLOT KARŞILAŞTIRMA (COMPARE) MOTORU (FİNAL VERSİYON)
// ==========================================================================
window.renderCompare = function(compareResponse) {
    const dashboard = document.getElementById('telemetryDashboard');
    const langStr = document.documentElement.lang || 'tr';

    if(!compareResponse || compareResponse.status === 'error' || !compareResponse.comparison_data) {
        window.hideF1Loading();
        dashboard.innerHTML = `<div style="color: var(--warning-color); width: 100%; text-align: center; margin-top: 50px;">Karşılaştırma verisi alınamadı.</div>`;
        return;
    }

    const data = compareResponse.comparison_data;
    const d1 = data.driver1;
    const d2 = data.driver2;
    // Artık x eksenimiz ve simülasyon motorumuzun temeli bu sabit mesafe!
    const distances = data.fixed_distance;
    const delta = data.delta_time;
    
    window.isCompareModeActive = true; 
    window.compareCurrentDistance = 0;

    // ÖNEMLİ: Eski simülasyon motorlarını durdur (Çakışmayı önle)
    window.isSimulating = false;
    cancelAnimationFrame(window.simAnimationId);
    if (window.f1LoadingInterval) clearInterval(window.f1LoadingInterval);
    window.f1LoadingTimeouts.forEach(t => clearTimeout(t));

    // ======================================================================
    // UI BÖLÜMÜ: HTML KAPSAYICIYI OLUŞTUR
    // ======================================================================
    const overview = data.laps_overview; // Python'dan gelen o devasa ikili liste!

    // --- BAŞLIK İÇİN ÇİFTLİ LASTİK BİLGİSİ ---
    const c1 = d1.compound ? d1.compound.toLowerCase() : 'unknown';
    const c2 = d2.compound ? d2.compound.toLowerCase() : 'unknown';
    const tl1 = d1.tyre_life ? `(${d1.tyre_life}. Tur)` : '';
    const tl2 = d2.tyre_life ? `(${d2.tyre_life}. Tur)` : '';

    const tyreInfoHTML = `
        <div class="tyre-dot ${c1}"></div> ${d1.code}: ${d1.compound} <span style="font-size:12px; opacity:0.7;">${tl1}</span>
        <span style="margin: 0 10px; color: var(--tag-border);">|</span>
        <div class="tyre-dot ${c2}"></div> ${d2.code}: ${d2.compound} <span style="font-size:12px; opacity:0.7;">${tl2}</span>
    `;
    
    const d1TimeFormatted = window.formatLapTime(d1.lap_time, langStr);
    const d2TimeFormatted = window.formatLapTime(d2.lap_time, langStr);
    const lapDelta = d1.lap_time - d2.lap_time;
    const lapDeltaFormatted = (lapDelta > 0 ? '+' : '') + lapDelta.toFixed(3);
    const lapDeltaColor = lapDelta > 0 ? '#FF1744' : '#00E676';


    dashboard.innerHTML = `
        <div class="telemetry-layout">
            <div class="telemetry-panel-left" id="panelLeft">
                <div class="track-map-container" id="trackMapContainer" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <canvas id="compTrackCanvas"></canvas>
                    
                    <div class="floating-driver-tag" id="compFloatingTag1" style="display: flex;">
                        <div class="floating-color-bar" style="background-color: #${window.driver1Meta.color};"></div>
                        <div class="floating-code-text f1-font">${d1.code}</div>
                    </div>
                    <div class="floating-driver-tag" id="compFloatingTag2" style="display: flex;">
                        <div class="floating-color-bar" style="background-color: #${window.driver2Meta.color};"></div>
                        <div class="floating-code-text f1-font">${d2.code}</div>
                    </div>
                </div>
                
                <div class="sim-controls-horizontal" style="margin-top: 15px;">
                    <div class="sim-buttons">
                        <button class="icon-btn" onclick="window.stepSimulation(-1)" title="Geri"><i class="fa-solid fa-step-backward"></i></button>
                        <button class="icon-btn" id="simPlayPauseBtn" onclick="window.toggleSimulation()"><i class="fa-solid fa-pause"></i></button>
                        <button class="icon-btn" onclick="window.stepSimulation(1)" title="İleri"><i class="fa-solid fa-step-forward"></i></button>
                    </div>
                    <div class="sim-timer f1-font" id="simTimerDisplay" style="width: 80px; text-align: center;">0:00.000</div>
                    <div class="sim-legend-horizontal">
                        <span class="f1-font" style="color:#${window.driver1Meta.color}; font-size:14px; font-weight:bold;">${d1.code}</span>
                        <span class="f1-font" style="color: var(--text-color); opacity: 0.5; margin: 0 6px;">VS</span>
                        <span class="f1-font" style="color:#${window.driver2Meta.color}; font-size:14px; font-weight:bold;">${d2.code}</span>
                    </div>
                </div>

            </div>
            
            <div class="telemetry-panel-right charts-container" id="panelRight">
                
                <div class="dynamic-sector-header" style="justify-content: center; height: 35px; flex-shrink:0;">
                    <span class="f1-font" style="color:#${window.driver1Meta.color}; font-size: 20px;">${d1.code} (${d1TimeFormatted})</span>
                    <span class="f1-font" style="color: var(--text-color); margin: 0 10px; opacity: 0.5;">VS</span>
                    <span class="f1-font" style="color:#${window.driver2Meta.color}; font-size: 20px;">${d2.code} (${d2TimeFormatted})</span>
                    <span class="f1-font" style="margin-left: 20px; font-weight: 800; font-size: 20px; color:${lapDeltaColor}">${lapDeltaFormatted} s</span>
                </div>

                <div id="timingRibbonContainer" class="timing-ribbon-container" style="flex-shrink:0;"></div>

                <div style="background: var(--secondary-bg); border: 1px solid var(--tag-border); border-radius: 12px; padding: 15px; height: 180px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                    <div style="position: relative; width: 100%; height: 100%;"><canvas id="deltaChart"></canvas></div>
                </div>

                <div style="background: var(--secondary-bg); border: 1px solid var(--tag-border); border-radius: 12px; padding: 15px; height: 300px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                    <div style="position: relative; width: 100%; height: 100%;"><canvas id="compSpeedChart"></canvas></div>
                </div>

                <div style="background: var(--secondary-bg); border: 1px solid var(--tag-border); border-radius: 12px; padding: 15px; height: 200px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                    <div style="position: relative; width: 100%; height: 100%;"><canvas id="compTbChart"></canvas></div>
                </div>

                <div style="background: var(--secondary-bg); border: 1px solid var(--tag-border); border-radius: 12px; padding: 15px; height: 160px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                    <div style="position: relative; width: 100%; height: 100%;"><canvas id="compGearChart"></canvas></div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        document.getElementById('panelLeft').classList.add('animate-in');
        document.getElementById('panelRight').classList.add('animate-in');

        // YENİ: İKİLİ ŞERİT (RIBBON) DOĞRU YERİNDE!
        const ribbonContainer = document.getElementById('timingRibbonContainer');
        if (overview && ribbonContainer) {
            let fastestLapTime = 999999;
            overview.forEach(lap => { 
                if (lap.d1_lap_time && lap.d1_lap_time < fastestLapTime) fastestLapTime = lap.d1_lap_time; 
                if (lap.d2_lap_time && lap.d2_lap_time < fastestLapTime) fastestLapTime = lap.d2_lap_time; 
            });

            let ribbonHTML = '';
            overview.forEach(lap => {
                const isPB = (lap.d1_lap_time === fastestLapTime || lap.d2_lap_time === fastestLapTime);
                const isActive = (Math.abs(d1.lap_time - lap.d1_lap_time) < 0.001 || Math.abs(d2.lap_time - lap.d2_lap_time) < 0.001); 
                
                const pbClass = isPB ? 'pb' : '';
                const activeClass = isActive ? 'active' : '';
                
                let timeStr = 'PIT';
                let timeColorStyle = '';

                if (lap.d1_lap_time && lap.d2_lap_time) {
                    const diff = lap.d1_lap_time - lap.d2_lap_time;
                    timeStr = Math.abs(diff).toFixed(3); 
                    
                    if (diff < 0) { 
                        // YENİ: -webkit-text-stroke eklendi (Açık temada jilet gibi görünür)
                        timeColorStyle = `color: #${window.driver1Meta.color}; font-weight: 900; -webkit-text-stroke: 0.5px #000; text-shadow: 0 2px 4px rgba(0,0,0,0.8);`;
                    } else if (diff > 0) { 
                        timeColorStyle = `color: #${window.driver2Meta.color}; font-weight: 900; -webkit-text-stroke: 0.5px #000; text-shadow: 0 2px 4px rgba(0,0,0,0.8);`;
                    } else {
                        timeStr = '0.000';
                        timeColorStyle = `color: var(--text-color); opacity: 0.5;`;
                    }
                } else {
                    timeColorStyle = `color: var(--warning-color); font-size: 13px; font-weight: bold;`;
                }

                const c1Lower = lap.d1_compound ? lap.d1_compound.toLowerCase() : 'unknown';
                const c2Lower = lap.d2_compound ? lap.d2_compound.toLowerCase() : 'unknown';

                ribbonHTML += `
                    <div class="lap-card ${pbClass} ${activeClass}" onclick="window.requestSpecificLapCompare(${lap.lap_number})">
                        <div class="lap-tyre-line-split">
                            <div class="tyre-half top ${c1Lower}"></div>
                            <div class="tyre-half ${c2Lower}"></div>
                        </div>
                        <div class="lap-num f1-font">L${lap.lap_number}</div>
                        <div class="lap-time-text f1-font" style="${timeColorStyle}">${timeStr}</div>
                    </div>
                `;
            });
            ribbonContainer.innerHTML = ribbonHTML;
            ribbonContainer.addEventListener('wheel', (e) => { if (e.deltaY !== 0) { e.preventDefault(); ribbonContainer.scrollLeft += e.deltaY; } });
        }

        // ======================================================================
        // BÖLÜM 2: DİĞER TÜM GRAFİKLERİN ÇİZİLMESİ (CHART.JS)
        // ======================================================================
        
        // Eski grafikleri temizle
        Object.keys(window.telemetryCharts).forEach(key => {
            if (window.telemetryCharts[key]) window.telemetryCharts[key].destroy();
        });

        const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
        const gridColor = isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
        const textColor = isLightMode ? '#1A202C' : '#E6EDF3';


        // 1. DELTA GRAFİĞİ (Sıfırın üstü Pilot 1 yavaş, altı Pilot 1 hızlı demektir)
        const deltaCtx = document.getElementById('deltaChart');
        window.telemetryCharts.delta = new Chart(deltaCtx, {
            type: 'line',
            data: {
                labels: distances,
                datasets: [{
                    label: `Delta (${d1.code} - ${d2.code})`,
                    data: delta,
                    segment: {
                        borderColor: (ctx) => ctx.p0.parsed.y > 0 ? '#FF1744' : '#00E676'
                    },
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: {
                        target: 'origin',
                        above: 'rgba(255, 23, 68, 0.3)', // Kırmızı Dolgu
                        below: 'rgba(0, 230, 118, 0.3)'  // Yeşil Dolgu
                    },
                    tension: 0.1
                }]
            },
            plugins: [syncCursorPlugin],
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: `Zaman Farkı (Saniye)  |  🟢 Yeşil Alan: ${d1.code} Hızlı  |  🔴 Kırmızı Alan: ${d2.code} Hızlı`, color: textColor, font: { family: 'Titillium Web', size: 14 } },
                    syncCursor: { index: null }
                },
                scales: { 
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor } }
                }
            }
        });

        // 2. ÇİFTLİ HIZ GRAFİĞİ
        const speedCtx = document.getElementById('compSpeedChart');
        window.telemetryCharts.speed = new Chart(speedCtx, {
            type: 'line',
            data: {
                labels: distances,
                datasets: [
                    { label: d1.code, data: d1.speed, borderColor: `#${window.driver1Meta.color}`, borderWidth: 2, pointRadius: 0, tension: 0.1 },
                    { label: d2.code, data: d2.speed, borderColor: `#${window.driver2Meta.color}`, borderWidth: 2, pointRadius: 0, tension: 0.1, borderDash: [5, 5] } // 2. Pilot kesik çizgili
                ]
            },
            plugins: [syncCursorPlugin],
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: true, labels: { color: textColor } },
                    title: { display: true, text: 'Hız (km/h) Karşılaştırması', color: textColor, font: { family: 'Titillium Web', size: 14 } },
                    syncCursor: { index: null }
                },
                scales: { x: { grid: { color: gridColor }, ticks: { color: textColor } }, y: { grid: { color: gridColor }, ticks: { color: textColor } } }
            }
        }); 

        // SCRUBBER'LARI BAĞLA
        window.bindScrubberEvents(window.telemetryCharts.delta);
        window.bindScrubberEvents(window.telemetryCharts.speed);


        // --- YENİ BÖLÜM: ÇİFTLİ GAZ & FREN GRAFİĞİ (Throttle & Brake) ---
        const compTbCtx = document.getElementById('compTbChart');
        window.telemetryCharts.tb = new Chart(compTbCtx, {
            type: 'line',
            data: {
                labels: distances,
                datasets: [
                    // Pilot 1 Gaz & Fren
                    { label: `${d1.code} Gaz (%)`, data: d1.throttle, borderColor: '#00E676', backgroundColor: 'rgba(0, 230, 118, 0.1)', borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0.2 },
                    { label: `${d1.code} Fren`, data: d1.brake.map(b => b ? 100 : 0), borderColor: '#FF1744', backgroundColor: 'rgba(255, 23, 68, 0.2)', borderWidth: 1.5, pointRadius: 0, fill: true, stepped: true },
                    // Pilot 2 Gaz & Fren (Kesik çizgili)
                    { label: `${d2.code} Gaz (%)`, data: d2.throttle, borderColor: '#00E676', borderWidth: 1.5, pointRadius: 0, tension: 0.2, borderDash: [5, 5] },
                    { label: `${d2.code} Fren`, data: d2.brake.map(b => b ? 100 : 0), borderColor: '#FF1744', borderWidth: 1.5, pointRadius: 0, stepped: true, borderDash: [5, 5] }
                ]
            },
            plugins: [syncCursorPlugin],
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false }, // Çok kalabalık olur, gizleyelim
                    title: { display: true, text: 'Gaz / Fren Kıyaslaması', color: textColor, font: { family: 'Titillium Web', size: 14 } },
                    syncCursor: { index: null }
                },
                scales: { 
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor }, min: -5, max: 105 } 
                }
            }
        });
        window.bindScrubberEvents(window.telemetryCharts.tb);


        // --- YENİ BÖLÜM: ÇİFTLİ VİTES GRAFİĞİ (Gear) ---
        const compGearCtx = document.getElementById('compGearChart');
        window.telemetryCharts.gear = new Chart(compGearCtx, {
            type: 'line',
            data: {
                labels: distances,
                datasets: [
                    { label: d1.code, data: d1.n_gear, borderColor: `#${window.driver1Meta.color}`, borderWidth: 1.5, pointRadius: 0, fill: false, stepped: true },
                    { label: d2.code, data: d2.n_gear, borderColor: `#${window.driver2Meta.color}`, borderWidth: 1.5, pointRadius: 0, fill: false, stepped: true, borderDash: [5, 5] }
                ]
            },
            plugins: [syncCursorPlugin],
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Vites Karşılaştırması', color: textColor, font: { family: 'Titillium Web', size: 14 } },
                    syncCursor: { index: null }
                },
                scales: { 
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 }, min: 0, max: 9 } 
                }
            }
        });
        window.bindScrubberEvents(window.telemetryCharts.gear);

        // ======================================================================
        // BÖLÜM 3: TUR SEÇİMİ (Ribbon) VE İKİ ARABALI NÜKLEER SİMÜLASYON
        // ======================================================================
        
        // YENİ: Compare modunda spesifik tur isteği atan fonksiyon (Delphi'deki LoadCompareEvent'e gönderir!)
        window.requestSpecificLapCompare = function(lapNumber) {
            window.showF1Loading(); // Işıkları yak
            ajaxRequest(MainForm.MainHTML, 'LoadCompareEvent', [
                'year=' + window.currentYear, 'race_name=' + window.currentRace, 'session_type=' + window.currentSession,
                'driver1=' + window.driver1Meta.code, 'driver2=' + window.driver2Meta.code, // Kayıtlı global pilotları kullan
                'lap=' + lapNumber
            ]);
        };


        // --- NİHAİ ŞOV: İKİ ARABALI NÜKLEER HARİTA SİMÜLASYONU ---
        // (Zamanı ve mesafeyi aynı anda büküp koşturuyoruz!)
        
        const canvas = document.getElementById('compTrackCanvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('trackMapContainer');
        const width = container.clientWidth;
        const height = container.clientHeight;
        canvas.width = width;
        canvas.height = height;

        // Python'dan gelen X ve Y koordinatları (Interpole edilmiş)
        const d1X = d1.x; const d1Y = d1.y;
        const d2X = d2.x; const d2Y = d2.y;

        // Haritayı ölçekle (Aynı tekli haritadaki gibi)
        const allX = [...d1X, ...d2X]; const allY = [...d1Y, ...d2Y];
        const minX = Math.min(...allX); const maxX = Math.max(...allX);
        const minY = Math.min(...allY); const maxY = Math.max(...allY);
        const mapWidth = maxX - minX; const mapHeight = maxY - minY;
        const scale = Math.min((width - 60) / mapWidth, (height - 60) / mapHeight);
        const offsetX = (width / 2) - (minX + (mapWidth / 2)) * scale;
        const offsetY = (height / 2) - (minY + (mapHeight / 2)) * scale;

        // --- NİHAİ ŞOV: İKİ ARABALI ZAMAN-BÜKÜCÜ HARİTA SİMÜLASYONU ---
        window.compareCurrentDistance = 0;
        const maxDist = distances[distances.length - 1];
        
        // YENİ: Animasyon süresi! İki pilotun yavaş olanını baz alıp 1/4'üne (yaklaşık 20 sn) bölüyoruz.
        const actualLapDurationSeconds = Math.max(d1.lap_time || 80, d2.lap_time || 80);
        window.compareTargetSimSecs = actualLapDurationSeconds / 4; 

        window.renderCompareSimulationFrame = function(elapsedRealTimeSeconds) {
            // Eğer süre dolduysa başa sar
            if (elapsedRealTimeSeconds >= window.compareTargetSimSecs) {
                elapsedRealTimeSeconds = 0;
                window.simStartTime = performance.now();
                window.pausedElapsedTime = 0;
            }

            // Kronometreyi Güncelle (Simülasyon 4 kat hızlı olduğu için * 4)
            const simClockTimeSeconds = elapsedRealTimeSeconds * 4; 
            const timerDisplay = document.getElementById('simTimerDisplay');
            if(timerDisplay) {
                const m = Math.floor(simClockTimeSeconds / 60);
                const s = Math.floor(simClockTimeSeconds % 60);
                const ms = Math.floor((simClockTimeSeconds % 1) * 1000);
                timerDisplay.innerText = `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
            }

            // ZAMANI MESAFEYE ÇEVİR: Artık sabit hızda rokete bağlamıyoruz, 20 saniyeye yayıyoruz!
            window.compareCurrentDistance = (elapsedRealTimeSeconds / window.compareTargetSimSecs) * maxDist;

            let i = 0;
            while(i < distances.length - 2 && distances[i+1] < window.compareCurrentDistance) { i++; }
            
            let t = 0;
            if (distances[i+1] !== distances[i]) {
                 t = (window.compareCurrentDistance - distances[i]) / (distances[i+1] - distances[i]);
            }

            const interpD1X = d1X[i] + (d1X[i+1] - d1X[i]) * t;
            const interpD1Y = d1Y[i] + (d1Y[i+1] - d1Y[i]) * t;
            const interpD2X = d2X[i] + (d2X[i+1] - d2X[i]) * t;
            const interpD2Y = d2Y[i] + (d2Y[i+1] - d2Y[i]) * t;

            const d1PxlX = interpD1X * scale + offsetX; const d1PxlY = -(interpD1Y * scale) + (height - offsetY);
            const d2PxlX = interpD2X * scale + offsetX; const d2PxlY = -(interpD2Y * scale) + (height - offsetY);

            ctx.clearRect(0, 0, width, height);
            
            ctx.beginPath();
            ctx.strokeStyle = (document.documentElement.getAttribute('data-theme') === 'light') ? '#000000' : '#444444';
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            for (let j = 0; j < d1X.length; j++) {
                const px = d1X[j] * scale + offsetX; const py = -(d1Y[j] * scale) + (height - offsetY);
                if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(d1PxlX, d1PxlY, 12, 0, 2 * Math.PI); 
            ctx.fillStyle = `#${window.driver1Meta.color}`;
            ctx.shadowBlur = 15; ctx.shadowColor = `#${window.driver1Meta.color}`; ctx.fill();
            ctx.shadowBlur = 0; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();

            ctx.beginPath();
            ctx.arc(d2PxlX, d2PxlY, 12, 0, 2 * Math.PI); 
            ctx.fillStyle = `#${window.driver2Meta.color}`;
            ctx.shadowBlur = 15; ctx.shadowColor = `#${window.driver2Meta.color}`; ctx.fill();
            ctx.shadowBlur = 0; ctx.strokeStyle = '#FFFFFF'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);

            // YENİ: EFSANEVİ ETİKET (TAG) HAREKETLERİ VE ÇİZGİLER
            const tag1 = document.getElementById('compFloatingTag1');
            const tag2 = document.getElementById('compFloatingTag2');
            if (container && tag1 && tag2) {
                const canvasLeftGap = (container.offsetWidth - canvas.width) / 2;
                const canvasTopGap = (container.offsetHeight - canvas.height) / 2;
                
                const lineOffsetX1 = 35; const lineOffsetY1 = -35; 
                const lineOffsetX2 = -35; const lineOffsetY2 = 35; // 2. Pilot çapraz alt tarafa bakar (Çakışmamaları için)
                
                ctx.beginPath(); ctx.moveTo(d1PxlX, d1PxlY); ctx.lineTo(d1PxlX + lineOffsetX1, d1PxlY + lineOffsetY1); 
                ctx.strokeStyle = `#${window.driver1Meta.color}`; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                
                ctx.beginPath(); ctx.moveTo(d2PxlX, d2PxlY); ctx.lineTo(d2PxlX + lineOffsetX2, d2PxlY + lineOffsetY2); 
                ctx.strokeStyle = `#${window.driver2Meta.color}`; ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                
                tag1.style.left = `${d1PxlX + lineOffsetX1 + canvasLeftGap}px`;
                tag1.style.top = `${d1PxlY + lineOffsetY1 + canvasTopGap}px`;
                
                // 2. Etiketi sola çektiğimiz için genişliği kadar (offsetWidth) eksiye çekmeliyiz ki tam çizginin ucuna otursun
                tag2.style.left = `${d2PxlX + lineOffsetX2 + canvasLeftGap - tag2.offsetWidth}px`;
                tag2.style.top = `${d2PxlY + lineOffsetY2 + canvasTopGap}px`;
            }


            Object.keys(window.telemetryCharts).forEach(key => {
                if(window.telemetryCharts[key]) {
                    window.telemetryCharts[key].options.plugins.syncCursor.index = i + t; 
                    window.telemetryCharts[key].draw(); 
                }
            });
        };

        window.startCompareAnimationLoop = function() {
            if (!window.isSimulating) return;
            const now = performance.now();
            const elapsedRealTimeSeconds = (now - window.simStartTime) / 1000;
            
            window.renderCompareSimulationFrame(elapsedRealTimeSeconds);
            window.simAnimationId = requestAnimationFrame(window.startCompareAnimationLoop);
        };

        // YENİ: Simülasyonu zaman damgasıyla başlat!
        window.simStartTime = performance.now();
        window.pausedElapsedTime = 0;
        window.isSimulating = true;
        window.startCompareAnimationLoop();

        // Şov başlasın!
        window.hideF1Loading();

        window.setLanguage(langStr);
        window.setTheme(document.documentElement.getAttribute('data-theme') || 'dark');

    }, 100);
};


// ==========================================================================
// ASSETTO CORSA CANLI SİMÜLASYON MOTORU
// ==========================================================================
window.acSocket = null;
window.acMaxFuel = 0;
window.acInitialFuelSet = false;

window.acBackToHome = function() {
    const acScreen = document.getElementById('acRoomScreen');
    acScreen.classList.remove('active');
    
    setTimeout(() => {
        acScreen.style.display = "none";
        const homeWrapper = document.getElementById('homeScreenWrapper');
        homeWrapper.style.display = 'flex';
        setTimeout(() => {
            homeWrapper.style.transform = "translateX(0)";
            homeWrapper.style.opacity = "1";
        }, 50);
    }, 500);
};


window.acConnectionEstablished = function(roomInput) {
    const statusDiv = document.getElementById('acConnStatus');
    const langStr = document.documentElement.lang || 'tr';
    
    statusDiv.innerText = langStr === 'tr' ? "BAĞLANTI KURULDU!" : "CONNECTED!";
    statusDiv.style.color = "#00E676";

    document.getElementById('acConnText').innerText = (langStr === 'tr' ? "ODA: " : "ROOM: ") + roomInput;
    const acLang = window.i18n[langStr]; 
    
    setTimeout(() => {
        document.getElementById('acRoomScreen').classList.remove('active');
        
        setTimeout(() => {
            document.getElementById('acRoomScreen').style.display = "none";
            const dash = document.getElementById('acDashboardScreen');
            dash.style.display = "flex";
            
            window.acIsGarageMode = true;
            const mainGrid = document.getElementById("acContentWrapper");
            const garageOverlay = document.getElementById("acGarageOverlay");
            
            if (mainGrid) mainGrid.classList.add("garage-blur");
            if (garageOverlay) {
                garageOverlay.classList.add("active");
                const overlayTitles = garageOverlay.querySelectorAll('.f1-font');
                if(overlayTitles[0]) overlayTitles[0].innerText = acLang.ac_garage_mode;
                if(overlayTitles[1]) overlayTitles[1].innerText = acLang.ac_waiting_telemetry;
            }
            
            setTimeout(() => { dash.classList.add('active'); }, 50);
        }, 500);
    }, 800);
};



// --- 🗺️ HARİTA VE BELLEK SIFIRLAMA (KESİN ÇÖZÜM) ---
window.resetAcMap = function(forceClearCache = false) {
    // 1. Canlı İzleri Sil
    window.acMapPaths = {}; 
    window.acMapPath = []; // Eski array yapısını da temizle
    
    // 2. Eğer Butondan Gelindiyse Hafızayı (Cache) Kazı
    if (forceClearCache && window.acLastTrackName) {
        localStorage.removeItem('ac_track_cache_' + window.acLastTrackName);
        window.acCachedTrack = null;
        console.log("[TELEMETRIA] 🗑️ " + window.acLastTrackName + " için Cache silindi. Yeniden öğreniliyor...");
    }

    // 3. EKRANI ANINDA TEMİZLE (Kullanıcı bastığını anlasın)
    const canvas = document.getElementById("acLiveMapCanvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // "Öğreniliyor" yazısını anında geri getir
        const currLang = document.documentElement.lang || 'tr';
        const hudLang = window.i18n[currLang];
        const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
        
        ctx.font = "bold 11px 'Titillium Web', sans-serif";
        ctx.fillStyle = isLightMode ? "#D20000" : "#FFEA00";
        ctx.textAlign = "left";
        ctx.fillText(hudLang.ac_map_learning, 25, 45); 
    }
};

// ==========================================================================
// 🏁 DELPHI'DEN GELEN CANLI TELEMETRİ GÜNCELLEME MOTORU (FULL VERSİYON)
// ==========================================================================
window.updateACTelemetry = function(jsonDataRaw) {
    try {
        const t = typeof jsonDataRaw === "string" ? JSON.parse(jsonDataRaw) : jsonDataRaw;
        const currLang = document.documentElement.lang || 'tr';
        const acLang = window.i18n[currLang];

        // --- 🧠 1. AKILLI WATCHDOG (SİNYAL KESİCİ) VE MENÜ DEDEKTÖRÜ ---
        if (window.acWatchdogTimer) clearTimeout(window.acWatchdogTimer);
        
        window.acWatchdogTimer = setTimeout(() => {
            if (!window.acIsGarageMode) {
                window.acIsGarageMode = true;
                const mainGrid = document.getElementById("acContentWrapper");
                const garageOverlay = document.getElementById("acGarageOverlay");
                if (mainGrid) mainGrid.classList.add("garage-blur");
                if (garageOverlay) {
                    garageOverlay.classList.add("active");
                    const overlayTitles = garageOverlay.querySelectorAll('.f1-font');
                    if(overlayTitles[0]) overlayTitles[0].innerText = acLang.ac_garage_mode;
                    if(overlayTitles[1]) overlayTitles[1].innerText = acLang.ac_no_signal;
                }
                document.querySelectorAll('.ac-panel-dense').forEach(p => p.classList.remove('cascade-animate'));
            }
        }, 2000);

        const isMenuMode = (t.speed === 0 && t.rpm === 0 && t.gear === 0);
        const mainGrid = document.getElementById("acContentWrapper");
        const garageOverlay = document.getElementById("acGarageOverlay");
        
        if (isMenuMode && !window.acIsGarageMode) {
            window.acIsGarageMode = true;
            if (mainGrid) mainGrid.classList.add("garage-blur");
            if (garageOverlay) {
                garageOverlay.classList.add("active");
                const overlayTitles = garageOverlay.querySelectorAll('.f1-font');
                if(overlayTitles[0]) overlayTitles[0].innerText = acLang.ac_garage_mode;
                if(overlayTitles[1]) overlayTitles[1].innerText = acLang.ac_menu_mode;
            }
            document.querySelectorAll('.ac-panel-dense').forEach(p => p.classList.remove('cascade-animate'));
        } else if (!isMenuMode && window.acIsGarageMode) {
            window.acIsGarageMode = false;
            if (mainGrid) mainGrid.classList.remove("garage-blur");
            if (garageOverlay) garageOverlay.classList.remove("active");
            if(window.resetAcMap) window.resetAcMap(false); 
            
            const panels = document.querySelectorAll('.ac-panel-dense');
            panels.forEach((p, index) => {
                p.style.animationDelay = (index * 0.15) + "s";
                void p.offsetWidth; 
                p.classList.add('cascade-animate');
            });
        }

        // --- 🏎️ 2. PİLOT VE ZAMAN BİLGİLERİ (SOL ALT PANO) ---
        let dName = t.driver_name && t.driver_name.trim() !== "" ? t.driver_name : t.driver_nick;
        if (!dName || dName.trim() === "") dName = "UNKNOWN";
        
        document.getElementById("acValDriver").innerText = dName;
        document.getElementById("acValCar").innerText = t.car_model ? t.car_model : "UNKNOWN";
        
        const tyreComp = document.getElementById("acValTyreComp");
        if(tyreComp) {
            tyreComp.innerText = t.tyre_comp ? t.tyre_comp : "UNKNOWN";
            let cLow = t.tyre_comp ? t.tyre_comp.toLowerCase() : "";
            if (cLow.includes("soft")) tyreComp.style.color = "#FF1744";
            else if (cLow.includes("medium")) tyreComp.style.color = "#FFEA00";
            else if (cLow.includes("hard")) tyreComp.style.color = "#E6EDF3";
            else tyreComp.style.color = "var(--text-color)";
        }
        
        document.getElementById("acValCurTime").innerText = t.cur_time || "0:00.000";
        document.getElementById("acValLastTime").innerText = t.last_time || "0:00.000";
        
        const bestTimeEl = document.getElementById("acValBestTime");
        bestTimeEl.innerText = t.best_time || "0:00.000";

        // PB (Yeşil) ve SB (Mor) Renk Kontrolü
        if (t.lb_data && t.lb_data.leaderboard) {
            const playerRow = t.lb_data.leaderboard.find(r => r.is_player);
            if (playerRow) {
                if (playerRow.is_fastest) {
                    bestTimeEl.style.color = "#D500F9";
                    bestTimeEl.style.textShadow = "0 0 8px rgba(213,0,249,0.5)";
                    bestTimeEl.style.opacity = "1";
                } else if (t.best_time && t.best_time !== "0:00.000" && t.best_time !== "0") {
                    bestTimeEl.style.color = "#00E676";
                    bestTimeEl.style.textShadow = "0 0 8px rgba(0,230,118,0.5)";
                    bestTimeEl.style.opacity = "1";
                } else {
                    bestTimeEl.style.color = "var(--text-color)";
                    bestTimeEl.style.textShadow = "none";
                    bestTimeEl.style.opacity = "0.5";
                }
            }
        }

        document.getElementById("acValSector").innerText = (t.sector !== undefined ? t.sector + 1 : 1);

        // --- 🛑 3. AKILLI CUT DEDEKTÖRÜ VE CEZALAR ---
        let isTeleported = false;
        if (typeof window.acLastSpline !== "undefined") {
            let splineDiff = Math.abs(t.norm_pos - window.acLastSpline);
            if (window.acLastLapCount === t.lap && splineDiff > 0.2 && splineDiff < 0.8 && t.speed < 10) {
                isTeleported = true;
            }
        }
        window.acLastSpline = t.norm_pos;

        // 1. TEMİZ SAYFA KONTROLÜ: 
        // Yeni tur, pit alanı, ışınlanma veya GARAJ (Menü) modundaysak cezaları tertemiz yap!
        if (window.acLastLapCount !== t.lap || t.in_pit === 1 || isTeleported || isMenuMode) {
            window.acLastLapCount = t.lap;
            window.acIsLapInvalid = false; 
        }

        // 2. ACIMASIZ CEZA KESİCİ: 
        // HIZ SINIRI 20 YAPILDI! (Araba havadan asfalta düşerken tekerlek hızının anlık fırlamasını görmezden gelir)
        if (t.tyres_out >= 3 && t.in_pit === 0 && t.speed > 20) {
            window.acIsLapInvalid = true; 
        }

        // 3. Ekranı Güncelle
        const penEl = document.getElementById("acValPenalty");
        const curTimeEl = document.getElementById("acValCurTime");
        
        if (window.acIsLapInvalid) {
            // TUR İPTAL!
            if(penEl) {
                penEl.innerText = acLang.ac_invalid_lap;
                penEl.style.color = "#FF1744"; 
                penEl.style.textShadow = "0 0 10px rgba(255,23,68,0.6)"; 
            }
            if(curTimeEl) {
                curTimeEl.style.color = "#FF1744"; 
                curTimeEl.style.textDecoration = "line-through"; 
            }
        } 
        else if (t.penalty > 0) {
            // RESMİ OYUN CEZASI
            if(penEl) {
                penEl.innerText = t.penalty + " " + acLang.ac_penalty;
                penEl.style.color = "#FFD800"; 
                penEl.style.textShadow = "0 0 10px rgba(255,216,0,0.6)"; 
            }
            if(curTimeEl) {
                curTimeEl.style.color = "var(--text-color)"; 
                curTimeEl.style.textDecoration = "none"; 
            }
        } 
        else {
            // TEMİZ SÜRÜŞ
            if(penEl) {
                penEl.innerText = "0";
                penEl.style.color = "var(--text-color)"; 
                penEl.style.textShadow = "none"; 
            }
            if(curTimeEl) {
                curTimeEl.style.color = "var(--text-color)"; 
                curTimeEl.style.textDecoration = "none"; 
            }
        }

        // --- 📊 4. CANLI LİDERLİK TABLOSU ---
        if (t.lb_data && t.lb_data.leaderboard) {
            const lbContainer = document.getElementById("acLeaderboardList");
            if (lbContainer) {
                let lbHTML = "";
                let playerPos = t.lb_data.player_pos || 1;
                
                t.lb_data.leaderboard.forEach(row => {
                    let p = row.pos;
                    if (p <= 3 || p === playerPos - 1 || p === playerPos || p === playerPos + 1) {
                        let isPlayer = row.is_player ? "is-player" : ""; 
                        let fastClass = row.is_fastest ? "fastest" : ""; 
                        lbHTML += `
                            <div class="ac-lb-row ${isPlayer}">
                                <div class="ac-lb-pos">${row.pos}</div>
                                <div class="ac-lb-name">${row.name}</div>
                                <div class="ac-lb-delta">${row.delta}</div>
                                <div class="ac-lb-time ${fastClass}">${row.time}</div>
                            </div>
                        `;
                    }
                });
                lbContainer.innerHTML = lbHTML;
            }
        }

        // --- 🏁 5. ÜST BAR VERİLERİ (Tur, Pozisyon, Bayraklar) ---
        document.getElementById("acValLap").innerText = t.lap;
        document.getElementById("acValPos").innerText = "P" + t.pos;
        const flagEl = document.getElementById("acValFlag");
        
        if (flagEl) {
            let fClass = "none", fText = acLang.ac_no_flag;
            if (t.lb_data && t.lb_data.yellow_flag === true) {
                fClass = "yellow"; fText = currLang === 'tr' ? "SARI BAYRAK" : "YELLOW FLAG";
            } else if (t.flag !== undefined) {
                let fVal = t.flag.toString().toUpperCase().replace("AC_", "").replace("_FLAG", "");
                if (fVal === "1" || fVal === "BLUE") { fClass = "blue"; fText = currLang === 'tr' ? "MAVİ BAYRAK" : "BLUE FLAG"; }
                else if (fVal === "2" || fVal === "YELLOW") { fClass = "yellow"; fText = currLang === 'tr' ? "SARI BAYRAK" : "YELLOW FLAG"; }
                else if (fVal === "3" || fVal === "BLACK") { fClass = "black"; fText = currLang === 'tr' ? "SİYAH BAYRAK" : "BLACK FLAG"; }
                else if (fVal === "4" || fVal === "WHITE") { fClass = "white"; fText = currLang === 'tr' ? "BEYAZ BAYRAK" : "WHITE FLAG"; }
                else if (fVal === "5" || fVal === "CHECKERED") { fClass = "checkered"; fText = currLang === 'tr' ? "DAMALI" : "FINISH"; }
                else if (fVal === "6" || fVal === "PENALTY") { fClass = "black"; fText = acLang.ac_penalty; }
            }
            flagEl.className = "flag-ind " + fClass;
            flagEl.innerText = fText;
        }

        // --- 🚀 6. MERKEZ SÜRÜŞ BİLGİLERİ (Pedallar, Direksiyon, Vites) ---
        document.getElementById("acValSpeed").innerText = t.speed;
        document.getElementById("acValGear").innerText = t.gear === -1 ? "R" : (t.gear === 0 ? "N" : t.gear);
        document.getElementById("acValRpmNum").innerText = t.rpm + " RPM"; 

        document.getElementById("acBarGas").style.width = Math.round(t.gas * 100) + "%";
        document.getElementById("acBarBrake").style.width = Math.round(t.brake * 100) + "%";

        if (typeof t.steer !== "undefined") {
            let steerDeg = t.steer * 180;
            let roundedAngle = Math.round(steerDeg);
            const steerEl = document.getElementById("acSteerVal");
            const steerSvg = document.getElementById("acSteeringSvg");
            
            if (steerEl) steerEl.innerText = roundedAngle + "°";
            if (steerSvg) steerSvg.style.transform = "rotate(" + steerDeg + "deg)";
            
            if (steerEl) {
                if (roundedAngle === 0) {
                    steerEl.style.color = "#FF1744"; 
                    steerEl.style.textShadow = "0 0 10px rgba(255, 23, 68, 0.7)";
                } else {
                    steerEl.style.color = "var(--primary-color)"; 
                    steerEl.style.textShadow = "0 0 5px rgba(225, 6, 0, 0.4)";
                }
            }
        }
        
        // --- 🎯 7. G-FORCE ÇEMBERİ ---
        const gLimit = 3.0;
        let gX = (t.g_lat / gLimit) * 50; 
        let gY = (t.g_lon / gLimit) * 50; 
        document.getElementById("acGforceDot").style.left = `calc(50% + ${gX}px)`;
        document.getElementById("acGforceDot").style.top = `calc(50% - ${gY}px)`; 
        document.getElementById("gLatVal").innerText = Math.abs(t.g_lat).toFixed(2) + "G";
        document.getElementById("gLonVal").innerText = Math.abs(t.g_lon).toFixed(2) + "G";

        // --- ⛽ 8. YAKIT (DİNAMİK PROGRESS BAR) ---
        if (!window.acInitialFuelSet && t.fuel > 0) { window.acMaxFuel = t.fuel; window.acInitialFuelSet = true; }
        if (t.fuel > window.acMaxFuel) window.acMaxFuel = t.fuel; 
        
        const fuelBar = document.getElementById("acBarFuel");
        if(fuelBar) {
            document.getElementById("acValFuel").innerText = t.fuel.toFixed(1) + " L";
            const fuelPct = window.acMaxFuel > 0 ? Math.max(0, Math.min((t.fuel / window.acMaxFuel) * 100, 100)) : 0;
            fuelBar.style.width = fuelPct + "%";
            if (fuelPct < 10) fuelBar.style.background = "#FF1744"; 
            else if (fuelPct < 25) fuelBar.style.background = "#FFEA00"; 
            else fuelBar.style.background = "#2979FF"; 
        }

        // --- 🌡️ 9. LASTİKLER, HASAR, SİSTEM IŞIKLARI & RPM LED ---
        document.getElementById("t_fl_t").innerText = t.tyre_fl_t + "°C"; document.getElementById("t_fl_p").innerText = t.tyre_fl_p + " psi";
        document.getElementById("t_fr_t").innerText = t.tyre_fr_t + "°C"; document.getElementById("t_fr_p").innerText = t.tyre_fr_p + " psi";
        document.getElementById("t_rl_t").innerText = t.tyre_rl_t + "°C"; document.getElementById("t_rl_p").innerText = t.tyre_rl_p + " psi";
        document.getElementById("t_rr_t").innerText = t.tyre_rr_t + "°C"; document.getElementById("t_rr_p").innerText = t.tyre_rr_p + " psi";

        document.getElementById("acValDamage").innerText = t.damage + "%";
        document.getElementById("acBarDamage").style.width = Math.min(t.damage, 100) + "%";

        const toggleLight = (id, condition) => {
            const el = document.getElementById(id);
            if(el) { if(condition) el.classList.add('active'); else el.classList.remove('active'); }
        };
        toggleLight('acLightDRS', t.drs === 1);
        toggleLight('acLightTC', t.tc_action > 0);
        toggleLight('acLightABS', t.abs_action > 0);
        toggleLight('acLightPIT', t.pit_limiter === 1);

        const maxRpm = 8500;
        const percentage = Math.min(t.rpm / maxRpm, 1);
        const activeCount = Math.floor(percentage * 15);
        for(let i=1; i<=15; i++) {
            const led = document.getElementById('led-' + i);
            if(led) {
                if(i <= activeCount) led.classList.add('active');
                else led.classList.remove('active');
            }
        }

        // --- 🗺️ 10. EFSANEVİ RADAR: KENDİNİ ÖĞRENEN CANLI PİST ---
        const trackNameEl = document.getElementById("acTrackNameDisplay");
        if (t.track_name && trackNameEl) {
            trackNameEl.innerText = acLang.ac_track + ": " + t.track_name.toUpperCase();
        }

        if (t.track_name) {
            const trackCode = t.track_name.toLowerCase();
            window.acMapPaths = window.acMapPaths || {};
            window.acLastTrackName = window.acLastTrackName || "";
            
            if (window.acLastTrackName !== trackCode) {
                if (window.resetAcMap) window.resetAcMap(false);
                window.acLastTrackName = trackCode;
                const cachedData = localStorage.getItem('ac_track_cache_' + trackCode);
                window.acCachedTrack = cachedData ? JSON.parse(cachedData) : null;
            }
        }

        if (t.map_data && t.map_data.map && t.map_data.map.length > 0) {
            const canvas = document.getElementById("acLiveMapCanvas");
            if (canvas) {
                const parent = canvas.parentElement;
                if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
                    canvas.width = parent.clientWidth; canvas.height = parent.clientHeight;
                    canvas.style.position = "absolute"; canvas.style.top = "0"; canvas.style.left = "0"; canvas.style.zIndex = "5"; 
                }
                const ctx = canvas.getContext("2d");
                const mapData = t.map_data.map; 
                let cachedTriggered = false;

                mapData.forEach(car => {
                    let id = car[0]; 
                    let pX = -car[1]; // TERSYÜZ 
                    let pZ = car[2]; 
                    
                    if (!window.acMapPaths[id]) window.acMapPaths[id] = [];
                    let path = window.acMapPaths[id];
                    let lastP = path.length > 0 ? path[path.length - 1] : null;
                    
                    if (!lastP || Math.hypot(pX - lastP.x, pZ - lastP.z) > 10) {
                        path.push({x: pX, z: pZ});
                        if (path.length > 2500) path.shift(); 
                    }

                    if (!window.acCachedTrack && !cachedTriggered) {
                        if (path.length > 250) {
                            let startNode = path[0];
                            if (Math.hypot(pX - startNode.x, pZ - startNode.z) < 40) {
                                window.acCachedTrack = [...path]; 
                                localStorage.setItem('ac_track_cache_' + window.acLastTrackName, JSON.stringify(window.acCachedTrack));
                                cachedTriggered = true;
                            }
                        }
                    }
                });
                
                let minX = 999999, maxX = -999999, minZ = 999999, maxZ = -999999;
                let hasPoints = false;
                
                if (window.acCachedTrack) {
                    window.acCachedTrack.forEach(p => { hasPoints = true; if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z; });
                } else {
                    Object.values(window.acMapPaths).forEach(path => {
                        path.forEach(p => { hasPoints = true; if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z; });
                    });
                }
                
                mapData.forEach(c => {
                    let flippedX = -c[1]; 
                    if (flippedX < minX) minX = flippedX; if (flippedX > maxX) maxX = flippedX;
                    if (c[2] < minZ) minZ = c[2]; if (c[2] > maxZ) maxZ = c[2];
                });
                
                if (maxX - minX < 50) { minX -= 150; maxX += 150; }
                if (maxZ - minZ < 50) { minZ -= 150; maxZ += 150; }
                
                let rangeX = maxX - minX; let rangeZ = maxZ - minZ;
                const scale = Math.min((canvas.width - 100) / rangeX, (canvas.height - 180) / rangeZ); 
                const offsetX = (canvas.width - (rangeX * scale)) / 2 - (minX * scale);
                const offsetY = (canvas.height - (rangeZ * scale)) / 2 - (minZ * scale) + 15;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
                const trackColorCached = isLightMode ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.4)";
                const trackColorHeatmap = isLightMode ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.12)";
                const hudLearningColor = isLightMode ? "#D20000" : "#FFEA00";

                ctx.font = "bold 11px 'Titillium Web', sans-serif";
                ctx.textAlign = "left";
                if (window.acCachedTrack) {
                    ctx.fillStyle = "#00E676"; 
                    ctx.fillText(acLang.ac_map_locked || "HARİTA KİLİTLENDİ", 25, 45); 
                } else {
                    ctx.fillStyle = hudLearningColor; // Temaya Göre Sarı/Kırmızı
                    ctx.fillText(acLang.ac_map_learning || "HARİTA ÖĞRENİLİYOR...", 25, 45); 
                }
                
                if (hasPoints) {
                    if (window.acCachedTrack) {
                        ctx.beginPath(); ctx.strokeStyle = trackColorCached; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.lineJoin = "round";
                        window.acCachedTrack.forEach((p, index) => {
                            let cx = (p.x * scale) + offsetX; let cy = canvas.height - ((p.z * scale) + offsetY); 
                            if (index === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
                        });
                        ctx.stroke();
                        let startP = window.acCachedTrack[0]; let sx = (startP.x * scale) + offsetX; let sy = canvas.height - ((startP.z * scale) + offsetY);
                        ctx.beginPath(); ctx.arc(sx, sy, 8, 0, 2 * Math.PI); ctx.fillStyle = "white"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "black"; ctx.stroke();
                    } else {
                        Object.values(window.acMapPaths).forEach(path => {
                            if (path.length > 1) {
                                ctx.beginPath(); ctx.strokeStyle = trackColorHeatmap; ctx.lineWidth = 10; ctx.lineCap = "round"; ctx.lineJoin = "round";
                                path.forEach((p, index) => {
                                    let cx = (p.x * scale) + offsetX; let cy = canvas.height - ((p.z * scale) + offsetY); 
                                    if (index === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
                                });
                                ctx.stroke();
                            }
                        });
                    }
                }
                
                let priorityMap = {}; 
                if (t.lb_data && t.lb_data.leaderboard) {
                    let playerPos = t.lb_data.player_pos || -1;
                    t.lb_data.leaderboard.forEach(carLB => {
                        let type = 'normal';
                        if (carLB.id === 0) type = 'player';
                        else if (carLB.pos <= 3) type = 'top3';
                        else if (playerPos !== -1 && (carLB.pos === playerPos - 1 || carLB.pos === playerPos + 1)) type = 'near';
                        if (type !== 'normal') priorityMap[carLB.id] = { pos: carLB.pos, type: type };
                    });
                }

                mapData.forEach(c => {
                    let id = c[0]; let cx = (-c[1] * scale) + offsetX; let cy = canvas.height - ((c[2] * scale) + offsetY); 
                    ctx.beginPath(); ctx.shadowBlur = 0; 
                    let sd = priorityMap[id];
                    if (sd) {
                        let bg, txt, r;
                        if (sd.type === 'player') { bg = "#E10600"; txt = "white"; r = 12; ctx.shadowBlur = 15; ctx.shadowColor = "#E10600"; }
                        else if (sd.type === 'top3') { bg = "#00FFFF"; txt = "black"; r = 10; }
                        else { bg = "#FFEA00"; txt = "black"; r = 10; }
                        ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fillStyle = bg; ctx.fill(); ctx.shadowBlur = 0;
                        ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.stroke();
                        ctx.fillStyle = txt; ctx.font = "bold 13px 'Titillium Web', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                        ctx.fillText(sd.pos, cx, cy + 1);
                    } else {
                        ctx.arc(cx, cy, 7, 0, 2 * Math.PI); ctx.fillStyle = "#00E676"; ctx.fill();
                        ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.stroke();
                    }
                });
            }
        }
    } catch (e) {
        console.error("[TELEMETRIA] Delphi'den gelen veri islenemedi: ", e);
    }
};


window.connectToACRoom = function() {
    const roomInput = document.getElementById('acRoomInput').value.trim().toUpperCase();
    const statusDiv = document.getElementById('acConnStatus');
    const langStr = document.documentElement.lang || 'tr';
    
    const shakeInput = () => {
        const inputEl = document.getElementById('acRoomInput');
        inputEl.style.transition = "transform 0.05s";
        inputEl.style.transform = "translateX(-5px)";
        setTimeout(() => inputEl.style.transform = "translateX(5px)", 50);
        setTimeout(() => inputEl.style.transform = "translateX(-5px)", 100);
        setTimeout(() => inputEl.style.transform = "translateX(0)", 150);
    };

    if(!roomInput) {
        statusDiv.innerText = langStr === 'tr' ? "Lütfen bir oda kodu girin!" : "Please enter a room code!";
        return;
    }

    const roomRegex = /^TLM-[A-Z0-9]{9}$/;
    if (!roomRegex.test(roomInput)) {
        statusDiv.innerText = langStr === 'tr' ? "Geçersiz Kod! (Örn: TLM-123456789)" : "Invalid Code! (e.g. TLM-123456789)";
        statusDiv.style.color = "#FF1744"; 
        shakeInput();
        return;
    }

    statusDiv.innerText = langStr === 'tr' ? "Oda aranıyor..." : "Checking room...";
    statusDiv.style.color = "var(--warning-color)";

    if (typeof ajaxRequest !== 'undefined') {
        ajaxRequest(MainForm.MainHTML, 'ConnectTelemetryRoom', ['roomCode=' + roomInput]);
    } else {
        console.warn("[MOCK] UniGUI bulunamadı, Delphi'ye bağlantı isteği gönderilmiş varsayılıyor: " + roomInput);
    }
};

window.disconnectAC = function() {
    // 1. BEKÇİ KÖPEĞİNİ VE ZAMANLAYICILARI DURDUR
    if (window.acWatchdogTimer) clearTimeout(window.acWatchdogTimer);
    
    window.acInitialFuelSet = false;
    window.acMaxFuel = 0;
    window.acIsGarageMode = false;

    // 2. DELPHI'YE "BAĞLANTIYI KOPAR" EMRİ VER (Yeni Mimari)
    if (typeof ajaxRequest !== 'undefined') {
        ajaxRequest(window.parent, 'DisconnectTelemetryRoom', []);
    }

    // 3. HARİTAYI SIFIRLA (Arka planda çizim yapmaya çalışmasın)
    if (window.resetAcMap) window.resetAcMap(false);

    // 4. ARAYÜZÜ KAPAT VE ANA MENÜYE DÖN
    const dash = document.getElementById('acDashboardScreen');
    if (dash) dash.classList.remove('active');
    
    const acScreen = document.getElementById('acRoomScreen');
    if (acScreen) acScreen.classList.remove('active');
    
    setTimeout(() => {
        // Ekranları gizle
        if (dash) dash.style.display = "none";
        if (acScreen) acScreen.style.display = "none";
        
        // Inputları ve statü yazılarını temizle
        const roomInput = document.getElementById('acRoomInput');
        if (roomInput) roomInput.value = "";
        
        const connStatus = document.getElementById('acConnStatus');
        if (connStatus) connStatus.innerText = "";

        const connText = document.getElementById('acConnText');
        if (connText) connText.innerText = "ROOM: WAITING...";
        
        // 5. ANA MENÜYÜ (F1/AC Seçim Ekranı) GERİ GETİR
        const homeWrapper = document.getElementById('homeScreenWrapper');
        if (homeWrapper) {
            homeWrapper.style.display = 'flex';
            setTimeout(() => {
                homeWrapper.style.transform = "translateX(0)";
                homeWrapper.style.opacity = "1";
            }, 50);
        }
    }, 600);
};