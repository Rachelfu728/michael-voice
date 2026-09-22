/**
 * tts.js
 * 語音朗讀合成器 (Text-to-Speech)
 * 專為長者與病友設計：字正腔圓、語速偏慢、清晰示範
 */

class SpeechCoachTTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this.rate = 0.8; // 預設慢速 0.8，更利於口型與發音模仿
    this.pitch = 1.0;
    this.isPlaying = false;
    this.currentUtterance = null;

    this.onWordBoundary = null;
    this.onEnd = null;

    this._initVoices();
  }

  _initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      this.voices = this.synth.getVoices();
      // 優先尋找中文語音 (zh-TW, zh-HK, zh-CN)
      const preferred = this.voices.find(v => 
        v.lang === 'zh-TW' || v.lang === 'zh_TW' || v.name.includes('Taiwan') || v.name.includes('Yating') || v.name.includes('Mei-Jia')
      ) || this.voices.find(v => v.lang.startsWith('zh'));

      if (preferred) {
        this.selectedVoice = preferred;
      } else if (this.voices.length > 0) {
        this.selectedVoice = this.voices[0];
      }
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  // 朗讀指定文本
  speak(text, options = {}) {
    if (!this.synth) {
      alert("您的瀏覽器暫不支援語音朗讀功能。");
      return;
    }

    this.stop(); // 停止先前的發音

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    
    // 設定中文語系
    utterance.lang = options.lang || (this.selectedVoice ? this.selectedVoice.lang : 'zh-TW');
    utterance.rate = options.rate !== undefined ? options.rate : this.rate;
    utterance.pitch = options.pitch !== undefined ? options.pitch : this.pitch;

    // 單詞/字音邊界高亮回呼
    utterance.onboundary = (event) => {
      if (this.onWordBoundary) {
        this.onWordBoundary(event.charIndex, event.charLength || 1);
      }
    };

    utterance.onend = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      if (this.onEnd) this.onEnd();
    };

    utterance.onerror = (err) => {
      console.warn("TTS 朗讀錯誤：", err);
      this.isPlaying = false;
      this.currentUtterance = null;
      if (this.onEnd) this.onEnd();
    };

    this.currentUtterance = utterance;
    this.isPlaying = true;
    this.synth.speak(utterance);
  }

  // 停止朗讀
  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this.currentUtterance = null;
  }

  // 設定語速
  setRate(val) {
    this.rate = Math.max(0.5, Math.min(1.5, parseFloat(val)));
  }
}

// 實例化
window.speechCoach = new SpeechCoachTTS();
