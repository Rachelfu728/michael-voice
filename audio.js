/**
 * audio.js
 * 核心音訊控制：麥克風音量可視化計、目標音量檢測、內建節拍器、成就提示音
 * 基於 Web Audio API，純本地即時運算，隱私完全安全
 */

class SpeechAudioManager {
  constructor() {
    this.audioCtx = null;
    this.micStream = null;
    this.analyser = null;
    this.dataArray = null;
    this.isListening = false;
    this.animFrameId = null;

    // 靈敏度與閾值 (0 ~ 100)
    this.sensitivity = 1.2; // 放大倍率
    this.targetThreshold = 45; // 進入綠色「達標宏亮」的門檻
    this.loudThreshold = 80;   // 超高音量門檻

    // 監聽回呼函數
    this.onVolumeUpdate = null;
    this.onTargetSustained = null;

    // 持續達標統計
    this.sustainedCounter = 0;
    this.isTargetActive = false;

    // 節拍器狀態
    this.metronomeInterval = null;
    this.bpm = 70;
    this.isMetronomeRunning = false;
    this.onMetronomeBeat = null;
  }

  // 初始化並獲取麥克風權限
  async initMic() {
    if (this.isListening) return true;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // 關閉過度降噪以準確捕捉患者輕微聲音
          autoGainControl: false   // 關閉自動增益以如實測量真實分貝
        },
        video: false
      });

      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.6; // 平滑平緩變換

      source.connect(this.analyser);
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.isListening = true;
      this._startVolumeLoop();
      return true;
    } catch (err) {
      console.warn("麥克風存取失敗或被拒絕：", err);
      this.isListening = false;
      return false;
    }
  }

  // 停止麥克風監聽
  stopMic() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    this.isListening = false;
    this.sustainedCounter = 0;
    if (this.onVolumeUpdate) {
      this.onVolumeUpdate({ volume: 0, status: 'idle', rawVolume: 0 });
    }
  }

  // 內部循環運算音量 RMS
  _startVolumeLoop() {
    const loop = () => {
      if (!this.isListening || !this.analyser) return;

      this.analyser.getByteTimeDomainData(this.dataArray);

      // 計算 RMS (Root Mean Square)
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const val = (this.dataArray[i] - 128) / 128; // 標準化至 -1 ~ 1
        sum += val * val;
      }
      const rms = Math.sqrt(sum / this.dataArray.length);

      // 轉換為 0 ~ 100 範圍的感知音量值
      let volume = Math.min(100, Math.round(rms * 100 * this.sensitivity * 2.8));

      // 狀態判定
      let status = 'low'; // 偏小聲 (黃)
      if (volume >= this.targetThreshold && volume < this.loudThreshold) {
        status = 'target'; // 達到目標宏亮區 (綠色)
      } else if (volume >= this.loudThreshold) {
        status = 'loud'; // 非常宏亮 (紫/藍)
      }

      // 檢測是否持續達標 (每秒約60幀，連續達標給予獎勵)
      if (status === 'target' || status === 'loud') {
        this.sustainedCounter++;
        if (this.sustainedCounter >= 40 && !this.isTargetActive) { // 約 0.6 秒以上
          this.isTargetActive = true;
          if (this.onTargetSustained) {
            this.onTargetSustained(volume);
          }
        }
      } else {
        this.sustainedCounter = Math.max(0, this.sustainedCounter - 2);
        if (this.sustainedCounter === 0) {
          this.isTargetActive = false;
        }
      }

      // 回呼更新 UI
      if (this.onVolumeUpdate) {
        this.onVolumeUpdate({
          volume,
          status,
          isSustained: this.isTargetActive,
          targetThreshold: this.targetThreshold
        });
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  // 設置靈敏度
  setSensitivity(val) {
    this.sensitivity = parseFloat(val);
  }

  // 設置目標分貝門檻
  setTargetThreshold(val) {
    this.targetThreshold = parseInt(val, 10);
  }

  // 播放愉悅的通關/達標激勵和弦音效
  playSuccessChime() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = this.audioCtx || new AudioContextClass();
      if (ctx.state === 'suspended') ctx.resume();

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (大和弦)
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = now + idx * 0.08;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.55);
      });
    } catch (e) {
      console.warn("無法播放音效", e);
    }
  }

  // 啟動節拍器 (適合 DDK 音節輪替與節奏跟讀)
  startMetronome(bpm = 70, onBeat = null) {
    this.stopMetronome();
    this.bpm = bpm;
    this.onMetronomeBeat = onBeat;
    this.isMetronomeRunning = true;

    const intervalMs = (60 / this.bpm) * 1000;
    let beatCount = 0;

    const tick = () => {
      this._playWoodblockClick(beatCount % 4 === 0);
      beatCount++;
      if (this.onMetronomeBeat) {
        this.onMetronomeBeat(beatCount);
      }
    };

    tick();
    this.metronomeInterval = setInterval(tick, intervalMs);
  }

  // 停止節拍器
  stopMetronome() {
    if (this.metronomeInterval) {
      clearInterval(this.metronomeInterval);
      this.metronomeInterval = null;
    }
    this.isMetronomeRunning = false;
  }

  // 播放木魚/節拍器敲擊聲
  _playWoodblockClick(isAccent = false) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = this.audioCtx || new AudioContextClass();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = isAccent ? 980 : 700;

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      // 靜默
    }
  }
}

// 實例化
window.speechAudio = new SpeechAudioManager();
