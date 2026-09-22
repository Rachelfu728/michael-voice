/**
 * app.js
 * 應用程式主邏輯與狀態控制器
 * 包含四大訓練模組切換、計時器、視覺動畫、資料持久化
 */

class ParkinsonSpeechApp {
  constructor() {
    this.currentTab = 'warmup'; // 'warmup' | 'oral' | 'syllables' | 'sentences'
    
    // 索引指標
    this.indices = {
      warmup: 0,
      oral: 0,
      syllables: 0,
      sentences: 0
    };

    // 句子分類過濾
    this.selectedSentenceCategory = '全部';
    this.customSentences = [];

    // 計時器與訓練狀態
    this.activeTimer = null;
    this.remainingSec = 0;
    this.oralSessionState = null; // { rep: 1, maxReps: 5, phase: 'hold'|'rest' }

    // 每日練習累計
    this.streakData = {
      date: new Date().toDateString(),
      count: 0
    };

    // DOM 元素快取
    this.dom = {};
  }

  init() {
    this._loadSavedData();
    this._cacheDom();
    this._bindEvents();
    this._setupAudioListeners();
    this._setupTTSListeners();
    this._renderStreak();
    this.switchTab('warmup');
  }

  // 讀取本地儲存數據
  _loadSavedData() {
    try {
      const savedStreak = localStorage.getItem('parkinson_speech_streak');
      if (savedStreak) {
        const parsed = JSON.parse(savedStreak);
        if (parsed.date === new Date().toDateString()) {
          this.streakData = parsed;
        } else {
          this.streakData = { date: new Date().toDateString(), count: 0 };
        }
      }

      const savedCustom = localStorage.getItem('parkinson_custom_sentences');
      if (savedCustom) {
        this.customSentences = JSON.parse(savedCustom);
      }
    } catch (e) {
      console.warn("讀取 localStorage 失敗", e);
    }
  }

  // 儲存數據
  _saveStreak() {
    try {
      this.streakData.count++;
      localStorage.setItem('parkinson_speech_streak', JSON.stringify(this.streakData));
      this._renderStreak();
    } catch (e) {}
  }

  _saveCustomSentences() {
    try {
      localStorage.setItem('parkinson_custom_sentences', JSON.stringify(this.customSentences));
    } catch (e) {}
  }

  _renderStreak() {
    if (this.dom.streakCount) {
      this.dom.streakCount.textContent = this.streakData.count;
    }
  }

  _cacheDom() {
    // 導航與標籤
    this.dom.navTabs = document.querySelectorAll('.nav-tab-btn');
    this.dom.tabPanels = document.querySelectorAll('.tab-content-panel');
    this.dom.streakCount = document.getElementById('streak-count-val');

    // 字體切換按鈕
    this.dom.fontBtns = document.querySelectorAll('.font-btn');

    // 頂部麥克風與音量計
    this.dom.micToggleBtn = document.getElementById('mic-toggle-btn');
    this.dom.micStatusLabel = document.getElementById('mic-status-label');
    this.dom.meterBarFill = document.getElementById('meter-bar-fill');
    this.dom.meterFeedback = document.getElementById('meter-feedback-text');

    // 慶祝提示層
    this.dom.celebrationOverlay = document.getElementById('celebration-overlay');
    this.dom.bannerTitle = document.getElementById('banner-title');
    this.dom.bannerDesc = document.getElementById('banner-desc');

    // 模組一：暖身開嗓
    this.dom.warmupCategory = document.getElementById('warmup-category');
    this.dom.warmupCounter = document.getElementById('warmup-counter');
    this.dom.warmupTitle = document.getElementById('warmup-title');
    this.dom.warmupInstruction = document.getElementById('warmup-instruction');
    this.dom.warmupTip = document.getElementById('warmup-tip');
    this.dom.warmupGiantText = document.getElementById('warmup-giant-text');
    this.dom.warmupTimerNum = document.getElementById('warmup-timer-num');
    this.dom.warmupTimerCircle = document.getElementById('warmup-timer-circle');
    this.dom.warmupStartBtn = document.getElementById('warmup-start-btn');
    this.dom.warmupDemoBtn = document.getElementById('warmup-demo-btn');
    this.dom.warmupPrevBtn = document.getElementById('warmup-prev-btn');
    this.dom.warmupNextBtn = document.getElementById('warmup-next-btn');

    // 模組二：口舌靈活操
    this.dom.oralCategory = document.getElementById('oral-category');
    this.dom.oralCounter = document.getElementById('oral-counter');
    this.dom.oralTitle = document.getElementById('oral-title');
    this.dom.oralInstruction = document.getElementById('oral-instruction');
    this.dom.oralTip = document.getElementById('oral-tip');
    this.dom.oralSvgWrap = document.getElementById('oral-svg-wrap');
    this.dom.oralMotionCaption = document.getElementById('oral-motion-caption');
    this.dom.oralTimerNum = document.getElementById('oral-timer-num');
    this.dom.oralTimerCircle = document.getElementById('oral-timer-circle');
    this.dom.oralRepsBadge = document.getElementById('oral-reps-badge');
    this.dom.oralStartBtn = document.getElementById('oral-start-btn');
    this.dom.oralPrevBtn = document.getElementById('oral-prev-btn');
    this.dom.oralNextBtn = document.getElementById('oral-next-btn');

    // 模組三：敏捷音節
    this.dom.sylCounter = document.getElementById('syl-counter');
    this.dom.sylTitle = document.getElementById('syl-title');
    this.dom.sylInstruction = document.getElementById('syl-instruction');
    this.dom.sylTip = document.getElementById('syl-tip');
    this.dom.sylGiantDisplay = document.getElementById('syl-giant-display');
    this.dom.sylTargetSpeed = document.getElementById('syl-target-speed');
    this.dom.sylDemoBtn = document.getElementById('syl-demo-btn');
    this.dom.sylMetroBtn = document.getElementById('syl-metro-btn');
    this.dom.sylMetroDot = document.getElementById('syl-metro-dot');
    this.dom.sylBpmChips = document.querySelectorAll('.bpm-chip');
    this.dom.sylPrevBtn = document.getElementById('syl-prev-btn');
    this.dom.sylNextBtn = document.getElementById('syl-next-btn');

    // 模組四：生活短句
    this.dom.senFilterTabs = document.getElementById('sen-filter-tabs');
    this.dom.senCounter = document.getElementById('sen-counter');
    this.dom.senCategory = document.getElementById('sen-category');
    this.dom.senTitle = document.getElementById('sen-title');
    this.dom.senTip = document.getElementById('sen-tip');
    this.dom.senChunksWrap = document.getElementById('sen-chunks-wrap');
    this.dom.senDemoBtn = document.getElementById('sen-demo-btn');
    this.dom.senPracticeBtn = document.getElementById('sen-practice-btn');
    this.dom.senAddCustomBtn = document.getElementById('sen-add-custom-btn');
    this.dom.senPrevBtn = document.getElementById('sen-prev-btn');
    this.dom.senNextBtn = document.getElementById('sen-next-btn');

    // 自訂句子彈窗
    this.dom.customModal = document.getElementById('custom-modal');
    this.dom.customForm = document.getElementById('custom-sentence-form');
    this.dom.customCloseBtn = document.getElementById('custom-close-btn');
    this.dom.customInputTitle = document.getElementById('custom-input-title');
    this.dom.customInputText = document.getElementById('custom-input-text');
    this.dom.customInputChunks = document.getElementById('custom-input-chunks');
  }

  _bindEvents() {
    // 頂部標籤切換
    this.dom.navTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.dataset.tab;
        this.switchTab(tabKey);
      });
    });

    // 字體大小切換
    this.dom.fontBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.fontBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const size = btn.dataset.size;
        document.body.classList.remove('font-large', 'font-xlarge');
        if (size === 'large') document.body.classList.add('font-large');
        if (size === 'xlarge') document.body.classList.add('font-xlarge');
      });
    });

    // 麥克風開關按鈕
    this.dom.micToggleBtn.addEventListener('click', async () => {
      if (window.speechAudio.isListening) {
        window.speechAudio.stopMic();
        this._updateMicUi(false);
      } else {
        const success = await window.speechAudio.initMic();
        if (success) {
          this._updateMicUi(true);
        } else {
          alert("請在瀏覽器彈窗中允許使用麥克風，以便即時檢測您的聲音音量！\n（我們完全在本地運算，不會上傳任何錄音）");
        }
      }
    });

    // 暖身開嗓導航與操作
    this.dom.warmupPrevBtn.addEventListener('click', () => this._navWarmup(-1));
    this.dom.warmupNextBtn.addEventListener('click', () => this._navWarmup(1));
    this.dom.warmupDemoBtn.addEventListener('click', () => {
      const item = EXERCISE_DATA.warmup[this.indices.warmup];
      window.speechCoach.speak(item.audioSample || item.title);
    });
    this.dom.warmupStartBtn.addEventListener('click', () => this._startWarmupSession());

    // 口舌操導航與操作
    this.dom.oralPrevBtn.addEventListener('click', () => this._navOral(-1));
    this.dom.oralNextBtn.addEventListener('click', () => this._navOral(1));
    this.dom.oralStartBtn.addEventListener('click', () => this._startOralSession());

    // 敏捷音節導航與操作
    this.dom.sylPrevBtn.addEventListener('click', () => this._navSyllable(-1));
    this.dom.sylNextBtn.addEventListener('click', () => this._navSyllable(1));
    this.dom.sylDemoBtn.addEventListener('click', () => {
      const item = EXERCISE_DATA.syllables[this.indices.syllables];
      window.speechCoach.speak(item.series.join("，"));
    });
    this.dom.sylMetroBtn.addEventListener('click', () => this._toggleMetronome());
    this.dom.sylBpmChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.dom.sylBpmChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const bpm = parseInt(chip.dataset.bpm, 10);
        if (window.speechAudio.isMetronomeRunning) {
          window.speechAudio.startMetronome(bpm, (beat) => this._onMetroBeat(beat));
        }
      });
    });

    // 生活短句導航與操作
    this.dom.senPrevBtn.addEventListener('click', () => this._navSentence(-1));
    this.dom.senNextBtn.addEventListener('click', () => this._navSentence(1));
    this.dom.senDemoBtn.addEventListener('click', () => this._playSentenceDemo());
    this.dom.senPracticeBtn.addEventListener('click', () => this._startSentencePractice());

    // 自訂句子彈窗
    this.dom.senAddCustomBtn.addEventListener('click', () => {
      this.dom.customModal.classList.add('show');
    });
    this.dom.customCloseBtn.addEventListener('click', () => {
      this.dom.customModal.classList.remove('show');
    });
    this.dom.customForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleAddCustomSentence();
    });
  }

  // 設置音訊回呼
  _setupAudioListeners() {
    window.speechAudio.onVolumeUpdate = ({ volume, status, isSustained }) => {
      if (!this.dom.meterBarFill) return;
      this.dom.meterBarFill.style.width = `${volume}%`;
      this.dom.meterBarFill.className = 'meter-bar-fill ' + status;

      if (status === 'target') {
        this.dom.meterFeedback.textContent = "🌟 太棒了！聲音洪亮！";
        this.dom.meterFeedback.className = "meter-feedback-text target";
      } else if (status === 'loud') {
        this.dom.meterFeedback.textContent = "🔥 充滿力量！非常棒！";
        this.dom.meterFeedback.className = "meter-feedback-text target";
      } else if (volume > 10) {
        this.dom.meterFeedback.textContent = "🔊 再大聲一點點唷！";
        this.dom.meterFeedback.className = "meter-feedback-text";
      } else {
        this.dom.meterFeedback.textContent = "請大聲發聲練習...";
        this.dom.meterFeedback.className = "meter-feedback-text";
      }

      // 如果當前在生活語句練習，且音量達標，高亮反饋
      if (this.currentTab === 'sentences' && status === 'target') {
        const activeChunk = document.querySelector('.sentence-chunk:hover');
        if (activeChunk) activeChunk.classList.add('active-chunk');
      }
    };

    window.speechAudio.onTargetSustained = () => {
      // 保持達標時的小提示
    };
  }

  _setupTTSListeners() {
    // 句子逐詞朗讀邊界監聽
    window.speechCoach.onEnd = () => {
      document.querySelectorAll('.sentence-chunk').forEach(c => c.classList.remove('active-chunk'));
    };
  }

  _updateMicUi(isRecording) {
    if (isRecording) {
      this.dom.micToggleBtn.classList.add('recording');
      this.dom.micToggleBtn.innerHTML = `<span>⏹ 關閉麥克風</span>`;
      this.dom.micStatusLabel.textContent = "監聽中";
    } else {
      this.dom.micToggleBtn.classList.remove('recording');
      this.dom.micToggleBtn.innerHTML = `<span>🎙️ 開啟音量反饋</span>`;
      this.dom.micStatusLabel.textContent = "已關閉";
      this.dom.meterBarFill.style.width = '0%';
      this.dom.meterFeedback.textContent = "點擊開啟麥克風反饋";
    }
  }

  // 切換模組標籤
  switchTab(tabKey) {
    this._clearAnyActiveSession();
    this.currentTab = tabKey;

    this.dom.navTabs.forEach(btn => {
      if (btn.dataset.tab === tabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.dom.tabPanels.forEach(panel => {
      if (panel.id === `tab-${tabKey}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // 渲染對應模組資料
    if (tabKey === 'warmup') this._renderWarmup();
    if (tabKey === 'oral') this._renderOral();
    if (tabKey === 'syllables') this._renderSyllables();
    if (tabKey === 'sentences') this._renderSentences();
  }

  _clearAnyActiveSession() {
    if (this.activeTimer) {
      clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
    if (window.speechAudio.isMetronomeRunning) {
      window.speechAudio.stopMetronome();
      if (this.dom.sylMetroBtn) {
        this.dom.sylMetroBtn.innerHTML = `<span>🎵 啟動木魚節拍器</span>`;
      }
    }
    window.speechCoach.stop();
  }

  // --------------------------------------------------------------------------
  // 模組一：暖身開嗓 (LSVT LOUD Sustained Phonation)
  // --------------------------------------------------------------------------
  _renderWarmup() {
    const list = EXERCISE_DATA.warmup;
    const idx = this.indices.warmup;
    const item = list[idx];

    this.dom.warmupCategory.textContent = item.category;
    this.dom.warmupCounter.textContent = `第 ${idx + 1} / ${list.length} 項`;
    this.dom.warmupTitle.textContent = item.title;
    this.dom.warmupInstruction.textContent = item.instruction;
    this.dom.warmupTip.innerHTML = `<strong>💡 訓練要點：</strong> ${item.tip}`;
    this.dom.warmupGiantText.textContent = item.audioSample;
    this.dom.warmupTimerNum.textContent = item.targetSec;
    this.dom.warmupTimerCircle.classList.remove('running');
    this.dom.warmupStartBtn.innerHTML = `<span>▶ 開始發長音（${item.targetSec}秒）</span>`;

    this.dom.warmupPrevBtn.disabled = idx === 0;
    this.dom.warmupNextBtn.disabled = idx === list.length - 1;
  }

  _navWarmup(dir) {
    this._clearAnyActiveSession();
    this.indices.warmup = Math.max(0, Math.min(EXERCISE_DATA.warmup.length - 1, this.indices.warmup + dir));
    this._renderWarmup();
  }

  async _startWarmupSession() {
    if (this.activeTimer) {
      this._clearAnyActiveSession();
      this._renderWarmup();
      return;
    }

    // 自動協助開啟麥克風
    if (!window.speechAudio.isListening) {
      await window.speechAudio.initMic();
      this._updateMicUi(true);
    }

    const item = EXERCISE_DATA.warmup[this.indices.warmup];
    this.remainingSec = item.targetSec;
    this.dom.warmupTimerCircle.classList.add('running');
    this.dom.warmupStartBtn.innerHTML = `<span>⏹ 提前結束</span>`;

    let sustainedQualitySeconds = 0;

    this.activeTimer = setInterval(() => {
      this.remainingSec--;
      this.dom.warmupTimerNum.textContent = this.remainingSec;

      // 檢查是否發聲宏亮
      if (this.dom.meterBarFill && this.dom.meterBarFill.classList.contains('target')) {
        sustainedQualitySeconds++;
      }

      if (this.remainingSec <= 0) {
        clearInterval(this.activeTimer);
        this.activeTimer = null;
        this.dom.warmupTimerCircle.classList.remove('running');
        this.dom.warmupStartBtn.innerHTML = `<span>▶ 再次練習</span>`;

        // 觸發成就與獎勵
        window.speechAudio.playSuccessChime();
        this._saveStreak();
        this._showCelebration(
          "太厲害了！發聲宏亮！",
          `您已成功維持大聲發音 ${item.targetSec} 秒！聲帶與氣息得到了極佳鍛鍊！`
        );
      }
    }, 1000);
  }

  // --------------------------------------------------------------------------
  // 模組二：口舌靈活操 (Oral-Motor Gym)
  // --------------------------------------------------------------------------
  _renderOral() {
    const list = EXERCISE_DATA.oralMotor;
    const idx = this.indices.oral;
    const item = list[idx];

    this.dom.oralCategory.textContent = item.category;
    this.dom.oralCounter.textContent = `第 ${idx + 1} / ${list.length} 項`;
    this.dom.oralTitle.textContent = item.title;
    this.dom.oralInstruction.textContent = item.instruction;
    this.dom.oralTip.innerHTML = `<strong>💡 復健重點：</strong> ${item.tip}`;
    this.dom.oralRepsBadge.textContent = `目標完成：${item.actionReps} 次`;
    this.dom.oralTimerNum.textContent = item.holdSeconds;
    this.dom.oralTimerCircle.classList.remove('running');
    this.dom.oralStartBtn.innerHTML = `<span>▶ 開始口舌操引導</span>`;

    // 渲染專屬視覺插圖
    this._renderOralSvg(item.visualType);

    this.dom.oralPrevBtn.disabled = idx === 0;
    this.dom.oralNextBtn.disabled = idx === list.length - 1;
  }

  _renderOralSvg(type) {
    let svgHtml = '';
    let caption = '';

    if (type === 'lips') {
      caption = "嘟起嘴巴 (3秒) ➔ 露齒大笑 (3秒)";
      svgHtml = `
        <svg viewBox="0 0 100 100" class="motion-svg">
          <circle cx="50" cy="50" r="44" fill="#fef3c7" stroke="#f59e0b" stroke-width="4"/>
          <!-- 雙眼微笑 -->
          <path d="M 28 40 Q 35 32 42 40" stroke="#78350f" stroke-width="4" fill="none" stroke-linecap="round"/>
          <path d="M 58 40 Q 65 32 72 40" stroke="#78350f" stroke-width="4" fill="none" stroke-linecap="round"/>
          <!-- 紅唇嘟起笑臉 -->
          <ellipse cx="50" cy="65" rx="18" ry="9" fill="#ef4444" />
          <line x1="38" y1="65" x2="62" y2="65" stroke="#ffffff" stroke-width="2"/>
        </svg>
      `;
    } else if (type === 'tongue-up') {
      caption = "嘴微張，舌尖向上用力頂上牙齦";
      svgHtml = `
        <svg viewBox="0 0 100 100" class="motion-svg">
          <circle cx="50" cy="50" r="44" fill="#e0f2fe" stroke="#0284c7" stroke-width="4"/>
          <!-- 上排牙齒 -->
          <rect x="36" y="38" width="28" height="8" rx="2" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
          <!-- 舌尖向上頂 -->
          <path d="M 40 75 C 40 50, 44 46, 50 44 C 56 46, 60 50, 60 75 Z" fill="#f43f5e"/>
          <path d="M 50 42 L 50 32" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow)"/>
        </svg>
      `;
    } else if (type === 'tongue-side') {
      caption = "舌尖在嘴內用力頂左右臉頰";
      svgHtml = `
        <svg viewBox="0 0 100 100" class="motion-svg">
          <circle cx="50" cy="50" r="44" fill="#fce7f3" stroke="#db2777" stroke-width="4"/>
          <!-- 左臉頰鼓起效果 -->
          <path d="M 20 40 Q 12 55 20 70" stroke="#db2777" stroke-width="5" fill="none"/>
          <!-- 舌頭向左抵 -->
          <path d="M 60 62 Q 35 60 22 55 Q 35 50 60 48 Z" fill="#f43f5e"/>
        </svg>
      `;
    } else if (type === 'tongue-out') {
      caption = "盡全力向前伸長舌頭";
      svgHtml = `
        <svg viewBox="0 0 100 100" class="motion-svg">
          <circle cx="50" cy="50" r="44" fill="#f3e8ff" stroke="#9333ea" stroke-width="4"/>
          <ellipse cx="50" cy="52" rx="22" ry="12" fill="#475569"/>
          <!-- 伸長的舌頭 -->
          <path d="M 40 54 C 40 75, 42 88, 50 90 C 58 88, 60 75, 60 54 Z" fill="#f43f5e"/>
          <line x1="50" y1="58" x2="50" y2="82" stroke="#be123c" stroke-width="2"/>
        </svg>
      `;
    } else if (type === 'tongue-click') {
      caption = "舌面貼上顎，向下清脆彈響「嗒！」";
      svgHtml = `
        <svg viewBox="0 0 100 100" class="motion-svg">
          <circle cx="50" cy="50" r="44" fill="#ecfdf5" stroke="#10b981" stroke-width="4"/>
          <!-- 音波聲線 -->
          <circle cx="50" cy="50" r="28" fill="none" stroke="#34d399" stroke-width="3" stroke-dasharray="6,4"/>
          <!-- 彈響星芒 -->
          <polygon points="50,30 55,42 68,45 57,54 61,68 50,60 39,68 43,54 32,45 45,42" fill="#fbbf24"/>
        </svg>
      `;
    } else {
      caption = "鼓起雙頰如含水，左右交替";
      svgHtml = `
        <svg viewBox="0 0 100 100" class="motion-svg">
          <!-- 圓圓鼓起的臉龐 -->
          <circle cx="50" cy="50" r="44" fill="#ffedd5" stroke="#ea580c" stroke-width="4"/>
          <circle cx="28" cy="55" r="14" fill="#fed7aa"/>
          <circle cx="72" cy="55" r="14" fill="#fed7aa"/>
          <line x1="42" y1="62" x2="58" y2="62" stroke="#9a3412" stroke-width="4" stroke-linecap="round"/>
        </svg>
      `;
    }

    this.dom.oralSvgWrap.innerHTML = svgHtml;
    this.dom.oralMotionCaption.textContent = caption;
  }

  _navOral(dir) {
    this._clearAnyActiveSession();
    this.indices.oral = Math.max(0, Math.min(EXERCISE_DATA.oralMotor.length - 1, this.indices.oral + dir));
    this._renderOral();
  }

  _startOralSession() {
    if (this.activeTimer) {
      this._clearAnyActiveSession();
      this._renderOral();
      return;
    }

    const item = EXERCISE_DATA.oralMotor[this.indices.oral];
    let currentRep = 1;
    let phase = 'hold'; // 'hold' (用力做) -> 'rest' (放鬆)
    let secLeft = item.holdSeconds;

    this.dom.oralStartBtn.innerHTML = `<span>⏹ 結束引導</span>`;
    this.dom.oralTimerCircle.classList.add('running');
    
    // 語音播報開始
    window.speechCoach.speak(`開始做：${item.title}，第一組，用力保持！`, { rate: 0.9 });

    const tick = () => {
      this.dom.oralTimerNum.textContent = secLeft;
      this.dom.oralRepsBadge.textContent = `第 ${currentRep} / ${item.actionReps} 次 (${phase === 'hold' ? '用力保持中' : '放鬆'})`;

      if (secLeft <= 0) {
        if (phase === 'hold') {
          // 切換為放鬆
          phase = 'rest';
          secLeft = 2; // 放鬆2秒
          this.dom.oralTimerCircle.style.borderColor = '#94a3b8';
          this.dom.oralMotionCaption.textContent = "很好！放鬆一下呼吸...";
        } else {
          // 完成一組
          currentRep++;
          if (currentRep > item.actionReps) {
            // 全部完成
            clearInterval(this.activeTimer);
            this.activeTimer = null;
            this.dom.oralTimerCircle.classList.remove('running');
            this.dom.oralStartBtn.innerHTML = `<span>▶ 再次練習</span>`;
            window.speechAudio.playSuccessChime();
            this._saveStreak();
            this._showCelebration("口舌操圓滿完成！", `您已順利完成 ${item.actionReps} 次 ${item.title}！口腔肌肉靈活度提升！`);
            return;
          }

          // 進入下一組 hold
          phase = 'hold';
          secLeft = item.holdSeconds;
          this.dom.oralTimerCircle.style.borderColor = '#22c55e';
          window.speechCoach.speak(`第 ${currentRep} 組，用力！`, { rate: 0.9 });
        }
      } else {
        secLeft--;
      }
    };

    tick();
    this.activeTimer = setInterval(tick, 1000);
  }

  // --------------------------------------------------------------------------
  // 模組三：敏捷音節衝刺 (DDK: Pa-Ta-Ka)
  // --------------------------------------------------------------------------
  _renderSyllables() {
    const list = EXERCISE_DATA.syllables;
    const idx = this.indices.syllables;
    const item = list[idx];

    this.dom.sylCounter.textContent = `第 ${idx + 1} / ${list.length} 組`;
    this.dom.sylTitle.textContent = item.title;
    this.dom.sylInstruction.textContent = item.focus;
    this.dom.sylTip.innerHTML = `<strong>💡 復健重點：</strong> ${item.tip}`;
    this.dom.sylTargetSpeed.textContent = item.targetSpeed;

    // 渲染大字卡
    this.dom.sylGiantDisplay.innerHTML = item.series
      .map(char => `<span class="syllable-char">${char}</span>`)
      .join(' ');

    this.dom.sylPrevBtn.disabled = idx === 0;
    this.dom.sylNextBtn.disabled = idx === list.length - 1;
  }

  _navSyllable(dir) {
    this._clearAnyActiveSession();
    this.indices.syllables = Math.max(0, Math.min(EXERCISE_DATA.syllables.length - 1, this.indices.syllables + dir));
    this._renderSyllables();
  }

  _toggleMetronome() {
    if (window.speechAudio.isMetronomeRunning) {
      window.speechAudio.stopMetronome();
      this.dom.sylMetroBtn.innerHTML = `<span>🎵 啟動木魚節拍器</span>`;
    } else {
      const activeChip = document.querySelector('.bpm-chip.active');
      const bpm = activeChip ? parseInt(activeChip.dataset.bpm, 10) : 70;
      window.speechAudio.startMetronome(bpm, (beat) => this._onMetroBeat(beat));
      this.dom.sylMetroBtn.innerHTML = `<span>⏹ 關閉節拍器</span>`;
    }
  }

  _onMetroBeat(beatCount) {
    if (this.dom.sylMetroDot) {
      this.dom.sylMetroDot.classList.add('beat');
      setTimeout(() => {
        this.dom.sylMetroDot.classList.remove('beat');
      }, 120);
    }

    // 輪流高亮當前音節
    const chars = this.dom.sylGiantDisplay.querySelectorAll('.syllable-char');
    if (chars.length > 0) {
      chars.forEach(c => c.style.color = '#15803d');
      const activeChar = chars[(beatCount - 1) % chars.length];
      if (activeChar) {
        activeChar.style.color = '#2563eb';
        activeChar.style.transform = 'scale(1.15)';
        setTimeout(() => {
          activeChar.style.transform = 'scale(1)';
        }, 200);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 模組四：生活實用語句 (Functional Phrases)
  // --------------------------------------------------------------------------
  _getAllSentences() {
    return [...EXERCISE_DATA.sentences, ...this.customSentences];
  }

  _getFilteredSentences() {
    const all = this._getAllSentences();
    if (this.selectedSentenceCategory === '全部') return all;
    return all.filter(s => s.category === this.selectedSentenceCategory);
  }

  _renderSentences() {
    const filtered = this._getFilteredSentences();
    if (filtered.length === 0) {
      this.indices.sentences = 0;
    } else if (this.indices.sentences >= filtered.length) {
      this.indices.sentences = filtered.length - 1;
    }

    const idx = this.indices.sentences;
    const item = filtered[idx];

    this._renderSentenceFilters();

    if (!item) {
      this.dom.senTitle.textContent = "尚無此分類句子";
      this.dom.senChunksWrap.innerHTML = "<p>點擊上方「新增自己的句子」來添加日常常用話語！</p>";
      return;
    }

    this.dom.senCounter.textContent = `第 ${idx + 1} / ${filtered.length} 句`;
    this.dom.senCategory.textContent = item.category;
    this.dom.senTitle.textContent = item.title;
    this.dom.senTip.innerHTML = `<strong>💡 說話技巧：</strong> ${item.tip}`;

    // 渲染分段塊
    this.dom.senChunksWrap.innerHTML = item.chunks.map((chunk, cIdx) => `
      <div class="sentence-chunk" data-chunk-idx="${cIdx}" onclick="speechCoach.speak('${chunk}')">
        ${chunk}
      </div>
      ${cIdx < item.chunks.length - 1 ? '<div class="chunk-divider">｜</div>' : ''}
    `).join('');

    this.dom.senPrevBtn.disabled = idx === 0;
    this.dom.senNextBtn.disabled = idx === filtered.length - 1;
  }

  _renderSentenceFilters() {
    const categories = ['全部', '趣味繞口令', '晨間日常生活', '身心需求表達', '社交與外出', '家屬自訂'];
    this.dom.senFilterTabs.innerHTML = categories.map(cat => `
      <button class="font-btn ${this.selectedSentenceCategory === cat ? 'active' : ''}" data-cat="${cat}">
        ${cat}
      </button>
    `).join('');

    this.dom.senFilterTabs.querySelectorAll('.font-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedSentenceCategory = btn.dataset.cat;
        this.indices.sentences = 0;
        this._renderSentences();
      });
    });
  }

  _navSentence(dir) {
    this._clearAnyActiveSession();
    const filtered = this._getFilteredSentences();
    this.indices.sentences = Math.max(0, Math.min(filtered.length - 1, this.indices.sentences + dir));
    this._renderSentences();
  }

  _playSentenceDemo() {
    const filtered = this._getFilteredSentences();
    const item = filtered[this.indices.sentences];
    if (!item) return;

    const chunks = item.chunks;
    const chunkEls = this.dom.senChunksWrap.querySelectorAll('.sentence-chunk');
    
    // 一次性將分段字詞連成帶有微停頓逗號的完整語句，保證手機點擊時可順暢完整發音
    chunkEls.forEach(el => el.classList.add('active-chunk'));
    const fullText = chunks.join("， ");

    window.speechCoach.speak(fullText, {
      rate: 0.75,
      onEnd: () => {
        chunkEls.forEach(el => el.classList.remove('active-chunk'));
      }
    });
  }

  async _startSentencePractice() {
    // 開啟麥克風
    if (!window.speechAudio.isListening) {
      await window.speechAudio.initMic();
      this._updateMicUi(true);
    }

    const filtered = this._getFilteredSentences();
    const item = filtered[this.indices.sentences];
    if (!item) return;

    this._showCelebration(
      "輪到您大聲說！",
      `請照著字卡：【${item.text}】大聲朗讀出來，觀察頂部音量條達到綠色！`
    );
    this._saveStreak();
  }

  _handleAddCustomSentence() {
    const title = this.dom.customInputTitle.value.trim();
    const text = this.dom.customInputText.value.trim();
    const chunksRaw = this.dom.customInputChunks.value.trim();

    if (!title || !text) {
      alert("請輸入標題與完整句子內容！");
      return;
    }

    const chunks = chunksRaw.split(/[,，| ]/).map(s => s.trim()).filter(Boolean);
    const newSentence = {
      id: 'custom-' + Date.now(),
      category: '家屬自訂',
      title: title,
      text: text,
      chunks: chunks.length > 0 ? chunks : [text],
      tip: "自信清晰地說出對您最重要的人事物！"
    };

    this.customSentences.push(newSentence);
    this._saveCustomSentences();

    this.dom.customForm.reset();
    this.dom.customModal.classList.remove('show');
    this.selectedSentenceCategory = '家屬自訂';
    this.indices.sentences = this.customSentences.length - 1;
    this._renderSentences();

    alert("成功新增自訂練習句子！");
  }

  // 彈出激勵與慶祝層
  _showCelebration(title, desc) {
    this.dom.bannerTitle.textContent = title;
    this.dom.bannerDesc.textContent = desc;
    this.dom.celebrationOverlay.classList.add('show');

    setTimeout(() => {
      this.dom.celebrationOverlay.classList.remove('show');
    }, 2800);
  }
}

// 頁面載入完成後初始化
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ParkinsonSpeechApp();
  window.app.init();
});
