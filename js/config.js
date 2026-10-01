/* ============================================================
   KONFIGURASI FRONTEND — satu-satunya file yang WAJIB diedit
   ============================================================
   GAS_URL : URL Web App Apps Script yang berakhiran /exec
             (Deploy → New deployment → Web app → Execute as: Me, Access: Anyone)
   ============================================================ */
window.VMS_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxBBCZOvWXLlMsiunQqBHT1z3No1BilOKrrlenEEqnFgz4dP_JsYoTyfspDfjznhPWr/exec',
  APP_NAME: 'VMS Procurement',
  RS_SINGKAT: 'RSUD HAMBA',
  POLL_MS: 45000,          // cek versi data server tiap 45 detik (ringan)
  REQUEST_TIMEOUT: 60000   // batas waktu request (ms)
};
