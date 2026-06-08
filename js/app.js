import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getDatabase, ref, push, onValue, query, orderByChild, limitToLast, set, remove, get } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { HARFLER, HARF_DOSYA_ESLEME, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, OYUN_SURESI } from './core/constants.js';
import { oyunDurumu, resetState } from './core/state.js';
// DÜZELTME: canliIstatistikGuncelle screens.js'den değil score-manager.js'den alınıyor
import { yatayModKontrol, bilgisayarModunuAyarla, ekraniGoster } from './ui/screens.js';
import { canliIstatistikGuncelle } from './game/score-manager.js';
import { cevapVer, pasCek, sonrakiSoruya } from './game/game-engine.js';
import { daireOlustur, harfiAktifYap } from './game/question-manager.js';
import { sorulariYukle, sorulariSec } from './game/question-manager.js';
import { oyunuBitir } from './game/score-manager.js';
import { zamanlayiciBaslat } from './game/timer-manager.js';
import { modalAc, modalKapat, disaTiklaKapat, onayGoster, onayKapat } from './ui/modal.js';
import { toastGoster } from './ui/toast.js';
import { klavyeDurumunuGuncelle } from './ui/keyboard.js';
import { profilOlustur, profilListesiniGuncelle, yedekKoduOlustur, gecmiseKaydet, cihazIdGetir, profilleriGetir, aktifProfiliGetir, firebaseProfilGuncelle, migrasyonYap, profilleriFirebaseIleEslestir, tumProfillereSilmeDinleyicisiBaslat, bakimModuVeDuyuruKontrol, duyurulariGoster, profilSilOnay, yeniProfilEkle, kopyala, genelSifirlaBaslat, aktifProfilUiGuncelle, yedekKoduGoster, profilGeriYukle } from './services/firebase.js';
import { genelSkorTablosunuDinle } from './services/leaderboard.js';
import { hataBildir, gecmisHataBildir, gecmisDetayGoster, sonucFavoriToggle, gecmisSekmeGec, favoriToggle, favoriKaldir } from './services/feedback.js';

const firebaseYapılandırma = {
  apiKey: "AIzaSyBGELLtIOdSbNbBasEOjI53wTMcY9GlD6Y",
  authDomain: "passaword-3c769.firebaseapp.com",
  databaseURL: "https://passaword-3c769-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "passaword-3c769",
  storageBucket: "passaword-3c769.firebasestorage.app",
  messagingSenderId: "184241248120",
  appId: "1:184241248120:web:1e56d87fefd25b0971da8d"
};

const uygulama = initializeApp(firebaseYapılandırma);
const veritabani = getDatabase(uygulama);
const kimlikDogrulama = getAuth(uygulama);
signInAnonymously(kimlikDogrulama).catch(console.error);

window.addEventListener('DOMContentLoaded', () => {
  const aktifProfilSatir = document.getElementById('aktifProfilSatir');
  let uzunBasmaZamanlayi;
  aktifProfilSatir.addEventListener('touchstart', () => {
    uzunBasmaZamanlayi = setTimeout(() => {
      const profil = aktifProfiliGetir();
      if (profil) profilSilOnay(profil);
    }, 570);
  });
  aktifProfilSatir.addEventListener('touchend', () => clearTimeout(uzunBasmaZamanlayi));
  aktifProfilSatir.addEventListener('touchmove', () => clearTimeout(uzunBasmaZamanlayi));

  window._dokunmatik = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  bilgisayarModunuAyarla();
  yatayModKontrol();
  window.addEventListener('resize', yatayModKontrol);
  window.addEventListener('orientationchange', () => setTimeout(yatayModKontrol, 300));

  const aktifProfil = aktifProfiliGetir();
  if (aktifProfil) {
    ekraniGoster('baslangicEkrani');
    document.getElementById('profilOlusturKutu').style.display = 'none';
    const hazir = document.getElementById('hazirEkrani');
    hazir.style.display = 'flex';
    hazir.style.flexDirection = 'column';
    document.getElementById('hosgeldinIsim').textContent = aktifProfil.ad;
    aktifProfilUiGuncelle();
    tumProfillereSilmeDinleyicisiBaslat();
  } else {
    ekraniGoster('baslangicEkrani');
  }

  migrasyonYap().catch(console.warn);
  bakimModuVeDuyuruKontrol();
  genelSkorTablosunuDinle();

  let sonDokunma = 0;
  document.addEventListener('touchend', (e) => {
    const simdi = Date.now();
    if (simdi - sonDokunma < 1) e.preventDefault();
    sonDokunma = simdi;
  }, { passive: false });
});

window.oyunuBaslat = async function () {
  await sorulariYukle();
  sorulariSec();
  resetState();
  ekraniGoster('oyunEkrani');
  tumProfillereSilmeDinleyicisiBaslat();
  get(ref(veritabani, 'ayarlar/duyurular')).then(snap => duyurulariGoster(snap));
  canliIstatistikGuncelle();
  setTimeout(() => {
    klavyeDurumunuGuncelle();
    daireOlustur();
    harfiAktifYap(0, true);
    zamanlayiciBaslat();
  }, 100);
};

window.anaSayfayaGit = function () {
  clearInterval(oyunDurumu.zamanlayici);
  oyunDurumu.calisiyor = false;
  ekraniGoster('baslangicEkrani');
  const aktifProfil = aktifProfiliGetir();
  if (aktifProfil) {
    document.getElementById('profilOlusturKutu').style.display = 'none';
    const hazir = document.getElementById('hazirEkrani');
    hazir.style.display = 'flex';
    hazir.style.flexDirection = 'column';
    hazir.style.alignItems = 'center';
    hazir.style.gap = '16px';
    document.getElementById('hosgeldinIsim').textContent = aktifProfil.ad;
  }
};

// Klavye ve layout eventleri
let maxEkranBoyutu = window.visualViewport ? window.visualViewport.height : window.innerHeight;
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    maxEkranBoyutu = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    ekraniYenile();
  }, 300);
});

function ekraniYenile() {
  import('./game/question-manager.js').then(m => {
    if (!document.getElementById('oyunEkrani').classList.contains('gizli')) {
      m.daireOlustur();
    }
  });
}

if (window.visualViewport) {
  let klavyeZamanlayici;
  window.visualViewport.addEventListener('resize', () => {
    if (!document.getElementById('oyunEkrani').classList.contains('gizli')) {
      clearTimeout(klavyeZamanlayici);
      document.getElementById('oyunEkrani').style.height = window.visualViewport.height + 'px';
      window.scrollTo(0, 0);
      klavyeZamanlayici = setTimeout(() => {
        ekraniYenile();
        klavyeDurumunuGuncelle();
      }, 100);
    }
  });
  window.addEventListener('scroll', () => {
    if (document.getElementById('oyunEkrani').classList.contains('klavye-acik')) {
      window.scrollTo(0, 0);
    }
  });
}

window.addEventListener('resize', ekraniYenile);

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (document.getElementById('oyunEkrani').classList.contains('gizli')) return;
  if (document.querySelector('.modal-arkaplan.acik')) return;
  const bilgisayarMi = !window._dokunmatik && window.innerWidth >= 1025;
  if (bilgisayarMi) {
    if (e.key === 'Enter') { e.preventDefault(); cevapVer(); }
    if (e.key === ' ' && document.activeElement !== document.getElementById('bilgisayarCevapGiris')) {
      e.preventDefault(); pasCek();
    }
  } else {
    if (e.key === 'Enter') { e.preventDefault(); cevapVer(); return; }
  }
});

window.sekmeGec = function (sekme) {
  document.getElementById('sekmeGenel').classList.toggle('aktif', sekme === 'genel');
  document.getElementById('sekmeKisisel').classList.toggle('aktif', sekme === 'kisisel');
  document.getElementById('genelSkorListe').classList.toggle('gizli', sekme !== 'genel');
  document.getElementById('kisiselSkorListe').classList.toggle('gizli', sekme !== 'kisisel');
};

window.altTurGuncelle = function (kategori) {
  const grup = document.getElementById('altTurGrubu');
  grup.innerHTML = '';
  const secenekler = kategori === 'oneri'
    ? [['❓ Soru Önerisi', true], ['🎮 Oyunla İlgili Öneri', false]]
    : [['🐛 Soru Hatası', true], ['⚙️ Teknik Hata', false], ['🔤 Harf/Soru Uyumsuzluğu', false]];
  secenekler.forEach(([metin, secili]) => {
    const cip = document.createElement('div');
    cip.className = `secim-cipi${secili ? ' secili' : ''}`;
    cip.textContent = metin;
    cip.onclick = () => { cipSec(cip, 'altTurGrubu'); };
    grup.appendChild(cip);
  });
  const ilkSecili = grup.querySelector('.secim-cipi.secili');
  const soruOneriMi = ilkSecili && ilkSecili.textContent.includes('Soru');
  document.getElementById('alternatifGrup').style.display = soruOneriMi ? 'block' : 'none';
};

window.cipSec = function (el, grupId) {
  el.closest('.secim-grubu').querySelectorAll('.secim-cipi').forEach(c => c.classList.remove('secili'));
  el.classList.add('secili');
  if (grupId === 'altTurGrubu') {
    document.getElementById('alternatifGrup').style.display = el.textContent.includes('Soru') ? 'block' : 'none';
  }
};

window.geriBildirimGonder = async function () {
  const mesaj = document.getElementById('geriBildirimMesaj').value.trim();
  if (!mesaj) { toastGoster('Lütfen mesajınızı yazın!'); return; }
  const kategoriEl = document.querySelector('#kategoriGrubu .secim-cipi.secili');
  const altTurEl = document.querySelector('#altTurGrubu .secim-cipi.secili');
  const kategori = kategoriEl ? kategoriEl.textContent.trim() : 'Belirsiz';
  const altTur = altTurEl ? altTurEl.textContent.trim() : 'Belirsiz';
  const profil = aktifProfiliGetir();
  const profilAdi = profil ? profil.ad : 'Anonim';
  const cevap = document.getElementById('geriBildirimCevap').value.trim();
  const alternatif = document.getElementById('geriBildirimAlternatif').value.trim();
  try {
    await push(ref(veritabani, 'geribildirimler'), {
      profilAdi, kategori, altTur, mesaj,
      cevap: cevap || '', alternatifler: alternatif || '',
      tarih: new Date().toISOString()
    });
    toastGoster('Geri bildiriminiz gönderildi! Teşekkürler 🙏');
    document.getElementById('geriBildirimMesaj').value = '';
    modalKapat('geriBildirimModal');
  } catch (hata) { console.warn(hata); }
};

window.passaWordMenuAc = function() {
  const menu = document.getElementById('passaWordMenu');
  if (!menu) return;
  const acikMi = !menu.classList.contains('gizli');
  if (acikMi) {
    menu.classList.add('gizli');
  } else {
    menu.classList.remove('gizli');
    setTimeout(() => {
      document.addEventListener('click', function kapat(e) {
        if (!menu.contains(e.target)) {
          menu.classList.add('gizli');
          document.removeEventListener('click', kapat);
        }
      });
    }, 0);
  }
};

window.passaWordPanelSec = function(e, panel) {
  if (e && e.stopPropagation) e.stopPropagation();
  const menu = document.getElementById('passaWordMenu');
  if (menu) menu.classList.add('gizli');
  ['skor','oyuncu','ayarlar'].forEach(p => {
    const el = document.getElementById('pwNav' + p.charAt(0).toUpperCase() + p.slice(1));
    if (el) el.style.background = p === panel ? 'rgba(79,195,247,0.15)' : 'transparent';
  });
  if (panel === 'skor') modalAc('skorModal');
  else if (panel === 'oyuncu') modalAc('profilSecModal');
  else if (panel === 'ayarlar') modalAc('ayarlarModal');
};

function adminGirisKontrol() {
  const sifre = document.getElementById('adminSifreGiris')?.value;
  return sifre === 'pw2025admin';
}

window.adminGiris = function() {
  if (adminGirisKontrol()) {
    localStorage.setItem('pw_admin_giris', 'true');
    document.getElementById('adminSifreEkrani').classList.add('gizli');
    document.getElementById('adminIcerik').classList.remove('gizli');
    adminSoruYukle();
  } else {
    toastGoster('Yanlış şifre!');
  }
};

window.adminSoruYukle = async function() {
  const liste = document.getElementById('adminOneriListe');
  if (!liste) return;
  liste.innerHTML = '<div style="text-align:center;color:var(--metin-soluk);padding:24px;">Yükleniyor...</div>';
  try {
    const snap = await get(ref(veritabani, 'geribildirimler'));
    if (!snap.exists()) {
      liste.innerHTML = '<div style="text-align:center;color:var(--metin-soluk);padding:24px;">Bekleyen öneri yok.</div>';
      return;
    }
    liste.innerHTML = '';
    Object.entries(snap.val()).forEach(([key, veri]) => {
      const el = document.createElement('div');
      el.className = 'skor-satir';
      el.style.cssText = 'flex-direction:column;align-items:flex-start;gap:6px;padding:12px 16px;';
      el.innerHTML = `
        <div style="font-weight:700;color:#4fc3f7;">${veri.kategori} — ${veri.altTur}</div>
        <div style="font-size:13px;color:#fff;">${veri.mesaj}</div>
        ${veri.cevap ? `<div style="font-size:12px;color:#a5d6a7;">Cevap: ${veri.cevap}</div>` : ''}
        ${veri.alternatifler ? `<div style="font-size:12px;color:#a5d6a7;">Alternatif: ${veri.alternatifler}</div>` : ''}
        <div style="font-size:11px;color:var(--metin-soluk);">${veri.profilAdi} — ${new Date(veri.tarih).toLocaleDateString('tr-TR')}</div>
        <button onclick="adminOneriReddet('${key}')" style="background:rgba(255,65,65,0.2);border:1px solid rgba(255,65,65,0.4);color:#ff4141;border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;">Sil</button>
      `;
      liste.appendChild(el);
    });
  } catch(e) {
    liste.innerHTML = '<div style="text-align:center;color:#ff4141;padding:24px;">Yükleme hatası.</div>';
  }
};

window.adminOneriReddet = async function(key) {
  try {
    await remove(ref(veritabani, `geribildirimler/${key}`));
    toastGoster('Silindi');
    window.adminSoruYukle();
  } catch(e) { toastGoster('Hata!'); }
};

// Tüm window atamaları
window.profilOlustur = profilOlustur;
window.yeniProfilEkle = yeniProfilEkle;
window.cevapVer = cevapVer;
window.pasCek = pasCek;
window.erkenBitir = () => oyunuBitir(true);
window.modalAc = modalAc;
window.modalKapat = modalKapat;
window.disaTiklaKapat = disaTiklaKapat;
window.onayKapat = onayKapat;
window.toastGoster = toastGoster;
window.hataBildir = hataBildir;
window.gecmisHataBildir = gecmisHataBildir;
window.gecmisDetayGoster = gecmisDetayGoster;
window.sonucFavoriToggle = sonucFavoriToggle;
window.gecmisSekmeGec = gecmisSekmeGec;
window.favoriToggle = favoriToggle;
window.favoriKaldir = favoriKaldir;
window.profilleriFirebaseIleEslestir = profilleriFirebaseIleEslestir;
window.profilListesiniGuncelle = profilListesiniGuncelle;
window.yedekKoduOlustur = yedekKoduOlustur;
window.yedekKoduGoster = yedekKoduGoster;
window.profilGeriYukle = profilGeriYukle;
window.genelSifirlaBaslat = genelSifirlaBaslat;
window.kopyala = kopyala;
window.adminGirisKontrol = adminGirisKontrol;
