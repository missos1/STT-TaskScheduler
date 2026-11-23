const msg = document.getElementById('msg')

navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    stream.getTracks().forEach((t) => t.stop())
    msg.textContent = 'Đã cấp quyền micro. Bạn có thể đóng tab này.'
    setTimeout(() => window.close(), 1200)
  })
  .catch(() => {
    msg.textContent = 'Bạn đã từ chối quyền micro. Hãy bật lại trong cài đặt trang của Chrome.'
  })