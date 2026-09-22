/**
 * tts.js
 * 語音朗讀合成器 (Text-to-Speech)
 * 專為手機 (iOS Safari / Android Chrome) 與電腦全面相容優化
 */

class SpeechCoachTTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.rate = 0.8; // 預設慢速 0.8，更利於口型與發音模仿
    this.pitch = 1.0;
    this.isPlaying = false;
    this.chineseVoice = null;

    this._initVoices();
  }

  _initVoices() {
    if (!this.synth) return;

    const findVoice = () => {
      try {
        const voices = this.synth.getVoices() || [];
        if (voices.length === 0) return;

        // 優先順序 1: 台灣繁體中文 (zh-TW, zh_TW)
        let v = voices.find(item => 
          item.lang === 'zh-TW' || 
          item.lang === 'zh_TW' || 
          (item.lang && item.lang.startsWith('zh') && (item.name.includes('Taiwan') || item.name.includes('國語') || item.name.includes('台灣') || item.name.includes('Mei-Jia') || item.name.includes('Yating')))
        );

        // 優先順序 2: 任何中文語音 (zh-HK, zh-CN, cmn)
        if (!v) {
          v = voices.find(item => item.lang && (item.lang.startsWith('zh') || item.lang.startsWith('cmn')));
        }

        // 絕對不要將英文或其他非中文語音賦值給 this.chineseVoice，否則手機會拒絕發音！
        if (v) {
          this.chineseVoice = v;
        }
      } catch (e) {
        console.warn("載入語音清單異常：", e);
      }
    };

    findVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  // 朗讀指定文本
  speak(text, options = {}) {
    if (!this.synth) {
      alert("您的手機瀏覽器不支援語音朗讀功能。");
      return;
    }

    // 解決 iOS / Android 暫停掛起問題
    try {
      if (this.synth.speaking || this.synth.pending) {
        this.synth.cancel();
      }
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(text);

    // 重新嘗試偵測一次中文語音（部分手機在用戶第一次點擊時才真正載入語音）
    if (!this.chineseVoice) {
      this._initVoices();
    }

    if (this.chineseVoice) {
      utterance.voice = this.chineseVoice;
      utterance.lang = this.chineseVoice.lang;
    } else {
      // 若手機未提供語音物件，直接指定中文語系代碼，讓 iOS/Android 系統底層調用默認中文
      utterance.lang = 'zh-TW';
    }

    utterance.rate = options.rate !== undefined ? options.rate : this.rate;
    utterance.pitch = options.pitch !== undefined ? options.pitch : this.pitch;

    // 關鍵修復：解決 iOS Safari 垃圾回收 bug (Garbage Collection Bug)
    // 在 iOS 上，如果 utterance 沒有被掛載到全局變數，會在發音前被系統記憶體回收導致無聲！
    window._mobileSpeechUtterance = utterance;

    utterance.onend = () => {
      this.isPlaying = false;
      window._mobileSpeechUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (err) => {
      console.warn("TTS 發音錯誤或被中斷：", err);
      this.isPlaying = false;
      window._mobileSpeechUtterance = null;
      if (options.onEnd) options.onEnd();
    };

    this.isPlaying = true;
    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn("synth.speak 失敗：", err);
    }
  }

  // 停止朗讀
  stop() {
    try {
      if (this.synth) {
        this.synth.cancel();
      }
    } catch (e) {}
    this.isPlaying = false;
    window._mobileSpeechUtterance = null;
  }

  // 設定語速
  setRate(val) {
    this.rate = Math.max(0.5, Math.min(1.5, parseFloat(val)));
  }
}

// 實例化
window.speechCoach = new SpeechCoachTTS();
