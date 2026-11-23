class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.ratio = sampleRate / 16000 // sampleRate là tần số của AudioContext (thường 48000)
    this.buffer = []
    this.pos = 0
    this.CHUNK = 1600 // 100 ms ở 16 kHz
  }

  process(inputs) {
    const input = inputs[0][0]
    if (!input) return true

    // Hạ mẫu bằng cách lấy trung bình theo cửa sổ
    for (let i = 0; i < input.length; i++) {
      this.acc = (this.acc || 0) + input[i]
      this.cnt = (this.cnt || 0) + 1
      this.pos += 1
      if (this.pos >= this.ratio) {
        this.buffer.push(this.acc / this.cnt)
        this.acc = 0
        this.cnt = 0
        this.pos -= this.ratio
      }
    }

    while (this.buffer.length >= this.CHUNK) {
      const frame = this.buffer.splice(0, this.CHUNK)
      const pcm = new Int16Array(this.CHUNK)
      for (let i = 0; i < this.CHUNK; i++) {
        const s = Math.max(-1, Math.min(1, frame[i]))
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer])
    }
    return true
  }
}

registerProcessor('pcm-processor', PcmProcessor)