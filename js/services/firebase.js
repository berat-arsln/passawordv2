import { getDatabase, ref, push, onValue, query, orderByChild, limitToLast, set, remove, get } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const veritabani = getDatabase(); // assumes app already initialized
const kimlikDogrulama = getAuth();

export function cihazIdGetir() {
  let cihazId = localStorage.getItem('pw_cihaz_id');
  if (!cihazId) {
    cihazId = 'cihaz_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('pw_cihaz_id', cihazId);
  }
  return cihazId;
}

export function profilleriGetir() {
  return JSON.parse(localStorage.getItem('pw_profiller') || '[]');
}

export function profilleriKaydet(profiller) {
  localStorage.setItem('pw_profiller', JSON.stringify(profiller));
}

export function aktifProfiliGetir() {
  const aktifId = localStorage.getItem('pw_aktif_profil');
  const profiller = profilleriGetir();
  return profiller.find(p => p.id === aktifId) || profiller[0] || null;
}

export async function firebaseProfilGuncelle(profil) {
  if (!profil || !profil.yedekKod) return;
  try {
    await set(ref(veritabani, `yedekler/${profil.yedekKod}`), {
      id: profil.id,
      ad: profil.ad,
      skorlar: profil.skorlar || [],
      gecmis: profil.gecmis || [],
      favoriler: profil.favoriler || [],
      olusturulma: profil.olusturulma,
      tarih: new Date().toISOString()
    });
  } catch(e) {
    console.warn('Firebase profil güncellenemedi (offline?):', e);
  }
}

export async function migrasyonYap() {
  if (localStorage.getItem('pw_firebase_migrate_v1') === 'done') return;
  const profiller = profilleriGetir();
  if (profiller.length === 0) {
    localStorage.setItem('pw_firebase_migrate_v1', 'done');
    return;
  }
  for (const profil of profiller) {
    try {
      await yedekKoduOlustur(profil);
    } catch(e) {
      console.warn('Migrasyon hatası:', profil.ad, e);
    }
  }
  localStorage.setItem('pw_firebase_migrate_v1', 'done');
}

export async function profilleriFirebaseIleEslestir() {
  const profiller = profilleriGetir();
  if (profiller.length === 0) return;
  const kalanlar = [];
  for (const profil of profiller) {
    if (!profil.yedekKod) { kalanlar.push(profil); continue; }
    try {
      const snap = await get(ref(veritabani, `yedekler/${profil.yedekKod}`));
      if (snap.exists()) {
        kalanlar.push(profil);
      } else {
        toastGoster(`⚠️ "${profil.ad}" profili sunucuda bulunamadı, silindi.`);
      }
    } catch(e) {
      kalanlar.push(profil);
    }
  }
  if (kalanlar.length !== profiller.length) {
    profilleriKaydet(kalanlar);
    const aktifId = localStorage.getItem('pw_aktif_profil');
    const aktifHalaVar = kalanlar.some(p => p.id === aktifId);
    if (!aktifHalaVar) {
      if (kalanlar.length > 0) {
        localStorage.setItem('pw_aktif_profil', kalanlar[0].id);
      } else {
        localStorage.removeItem('pw_aktif_profil');
        ekraniGoster('baslangicEkrani');
        document.getElementById('hazirEkrani').style.display = 'none';
        document.getElementById('profilOlusturKutu').style.display = 'block';
      }
    }
    aktifProfilUiGuncelle();
    profilListesiniGuncelle();
  }
}

export let _profilSilmeListenerleri = {};

export function tumProfillereSilmeDinleyicisiBaslat() {
  Object.values(_profilSilmeListenerleri).forEach(unsub => unsub());
  _profilSilmeListenerleri = {};
  const profiller = profilleriGetir();
  profiller.forEach(profil => {
    if (!profil.yedekKod) return;
    get(ref(veritabani, `yedekler/${profil.yedekKod}`)).then(snap => {
      if (!snap.exists()) return;
      const profilRef = ref(veritabani, `yedekler/${profil.yedekKod}`);
      _profilSilmeListenerleri[profil.id] = onValue(profilRef, (s) => {
        if (!s.exists()) {
          const kalanlar = profilleriGetir().filter(p => p.id !== profil.id);
          profilleriKaydet(kalanlar);
          if (localStorage.getItem('pw_aktif_profil') === profil.id) {
            if (kalanlar.length > 0) {
              localStorage.setItem('pw_aktif_profil', kalanlar[0].id);
              toastGoster('⚠️ Aktif profil silindi.');
              setTimeout(() => { modalAc('profilSecModal'); profilListesiniGuncelle(); }, 500);
            } else {
              localStorage.removeItem('pw_aktif_profil');
              toastGoster('⚠️ Profilin silindi.');
              document.querySelectorAll('.modal-arkaplan.acik').forEach(m => m.classList.remove('acik'));
              ekraniGoster('baslangicEkrani');
              document.getElementById('hazirEkrani').style.display = 'none';
              document.getElementById('profilOlusturKutu').style.display = 'block';
            }
          } else {
            toastGoster(`⚠️ "${profil.ad}" profili silindi.`);
            profilListesiniGuncelle();
          }
          aktifProfilUiGuncelle();
          if (_profilSilmeListenerleri[profil.id]) {
            _profilSilmeListenerleri[profil.id]();
            delete _profilSilmeListenerleri[profil.id];
          }
        }
      });
    }).catch(() => {});
  });
}

export function aktifProfilSilmeDinleyicisiBaslat(profilId, yedekKod) {
  tumProfillereSilmeDinleyicisiBaslat();
}

export function gecmiseKaydet(oyunVerisi) {
  const profil = aktifProfiliGetir();
  if (!profil) return;
  const profiller = profilleriGetir();
  const indeks = profiller.findIndex(p => p.id === profil.id);
  if (indeks === -1) return;
  profiller[indeks].gecmis = profiller[indeks].gecmis || [];
  profiller[indeks].gecmis.unshift(oyunVerisi);
  profiller[indeks].gecmis = profiller[indeks].gecmis.slice(0, 20);
  profilleriKaydet(profiller);
  firebaseProfilGuncelle(profiller[indeks]);
}

export async function yedekKoduOlustur(profil) {
  if (profil.yedekKod) {
    await set(ref(veritabani, `yedekler/${profil.yedekKod}`), {
      id: profil.id,
      ad: profil.ad,
      skorlar: profil.skorlar || [],
      gecmis: profil.gecmis || [],
      favoriler: profil.favoriler || [],
      olusturulma: profil.olusturulma,
      tarih: new Date().toISOString()
    });
    return profil.yedekKod;
  }

  const karakterler = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let kod = 'PW-';
  for (let i = 0; i < 5; i++) {
    kod += karakterler[Math.floor(Math.random() * karakterler.length)];
  }

  await set(ref(veritabani, `yedekler/${kod}`), {
    id: profil.id,
    ad: profil.ad,
    skorlar: profil.skorlar || [],
    gecmis: profil.gecmis || [],
    favoriler: profil.favoriler || [],
    olusturulma: profil.olusturulma,
    tarih: new Date().toISOString()
  });

  const profiller = profilleriGetir();
  const indeks = profiller.findIndex(p => p.id === profil.id);
  if (indeks !== -1) {
    profiller[indeks].yedekKod = kod;
    profilleriKaydet(profiller);
  }
  return kod;
}

export function profilOlustur() {
  const isim = document.getElementById('profilIsimGiris').value.trim();
  if (!isim) {
    toastGoster('Lütfen bir isim girin!');
    return;
  }
  const yeniProfil = {
    id: 'profil_' + Date.now(),
    ad: isim,
    skorlar: [],
    olusturulma: new Date().toISOString()
  };
  const profiller = profilleriGetir();
  profiller.push(yeniProfil);
  profilleriKaydet(profiller);
  localStorage.setItem('pw_aktif_profil', yeniProfil.id);
  document.getElementById('profilOlusturKutu').style.display = 'none';
  const hazir = document.getElementById('hazirEkrani');
  hazir.style.display = 'flex';
  hazir.style.flexDirection = 'column';
  hazir.style.alignItems = 'center';
  hazir.style.gap = '16px';
  document.getElementById('hosgeldinIsim').textContent = isim;
  document.getElementById('aktifProfilAdi').textContent = isim;
  yedekKoduOlustur(yeniProfil).then(() => {
    localStorage.setItem('pw_aktif_profil', yeniProfil.id);
    aktifProfilUiGuncelle();
    document.getElementById('hosgeldinIsim').textContent = ad;
    document.getElementById('profilOlusturKutu').style.display = 'none';
    hazir.style.display = 'flex';
    hazir.style.flexDirection = 'column';
    hazir.style.alignItems = 'center';
    hazir.style.gap = '16px';
    modalKapat('profilEkleModal');
    modalKapat('ayarlarModal');
    const tazeProfiller = profilleriGetir();
    const tazeProfil = tazeProfiller.find(p => p.id === yeniProfil.id);
    if (tazeProfil && tazeProfil.yedekKod) {
      aktifProfilSilmeDinleyicisiBaslat(tazeProfil.id, tazeProfil.yedekKod);
    }
    profilListesiniGuncelle();
  }).catch(console.error);
}

export function yeniProfilEkle() {
  const ad = document.getElementById('yeniProfilAdi').value.trim();
  if (!ad) { toastGoster('Lütfen profil adı girin!'); return; }
  const yeniProfil = { id: 'profil_' + Date.now(), ad, skorlar: [], olusturulma: new Date().toISOString() };
  const profiller = profilleriGetir();
  profiller.push(yeniProfil);
  profilleriKaydet(profiller);
  localStorage.setItem('pw_aktif_profil', yeniProfil.id);
  document.getElementById('yeniProfilAdi').value = '';

  aktifProfilUiGuncelle();
  document.getElementById('hosgeldinIsim').textContent = ad;
  document.getElementById('profilOlusturKutu').style.display = 'none';
  const hazir = document.getElementById('hazirEkrani');
  hazir.style.display = 'flex';
  hazir.style.flexDirection = 'column';
  hazir.style.alignItems = 'center';
  hazir.style.gap = '16px';
  modalKapat('profilEkleModal');
  modalKapat('ayarlarModal');
  toastGoster(`"${ad}" oluşturuldu!`);

  yedekKoduOlustur(yeniProfil).then(() => {
    aktifProfilUiGuncelle();
    const tazeProfiller = profilleriGetir();
    const tazeProfil = tazeProfiller.find(p => p.id === yeniProfil.id);
    if (tazeProfil && tazeProfil.yedekKod) {
      aktifProfilSilmeDinleyicisiBaslat(tazeProfil.id, tazeProfil.yedekKod);
    }
    profilListesiniGuncelle();
  }).catch(console.error);
}

export function profilListesiniGuncelle() {
  const profiller = profilleriGetir();
  const aktifProfil = aktifProfiliGetir();
  const liste = document.getElementById('profilListesi');
  liste.innerHTML = '';
  if (profiller.length === 0) {
    liste.innerHTML = `<div style="text-align:center;color:var(--metin-soluk);padding:24px;font-size:14px;">Kayıtlı profil yok.</div>`;
    return;
  }

  profiller.forEach((profil) => {
    const satir = document.createElement('div');
    satir.className = `profil-satir${profil.id === aktifProfil?.id ? ' aktif-profil' : ''}`;
    const enIyiSkor = profil.skorlar?.length > 0 ? Math.max(...profil.skorlar.map(s => s.puan)) : 0;
    satir.innerHTML = `<div class="profil-adi">${profil.ad}${profil.yedekKod ? `<span style="font-size:10px;color:var(--metin-soluk);font-weight:600;margin-left:6px;letter-spacing:1px;">${profil.yedekKod}</span>` : ''}</div><div class="profil-skor">${enIyiSkor > 0 ? enIyiSkor + ' puan' : 'Yeni'}</div>${profil.id === aktifProfil?.id ? '<span class="rozet-aktif">AKTİF</span>' : ''}`;

    satir.addEventListener('click', () => {
      localStorage.setItem('pw_aktif_profil', profil.id);
      document.getElementById('aktifProfilAdi').textContent = profil.ad;
      document.getElementById('hosgeldinIsim').textContent = profil.ad;
      profilListesiniGuncelle();
      toastGoster(`"${profil.ad}" seçildi`);
      document.getElementById('hosgeldinIsim').textContent = profil.ad;
      document.getElementById('profilOlusturKutu').style.display = 'none';
      const hazir = document.getElementById('hazirEkrani');
      hazir.style.display = 'flex';
      hazir.style.flexDirection = 'column';
      hazir.style.alignItems = 'center';
      hazir.style.gap = '16px';
      aktifProfilUiGuncelle();
      aktifProfilSilmeDinleyicisiBaslat(profil.id, profil.yedekKod);
    });

    let uzunBasmaZamanlayi;
    satir.addEventListener('touchstart', () => {
      uzunBasmaZamanlayi = setTimeout(() => {
        profilSilOnay(profil);
      }, 570);
    });
    satir.addEventListener('touchend', () => clearTimeout(uzunBasmaZamanlayi));
    satir.addEventListener('touchmove', () => clearTimeout(uzunBasmaZamanlayi));
    satir.addEventListener('mousedown', () => {
      uzunBasmaZamanlayi = setTimeout(() => {
        profilSilOnay(profil);
      }, 570);
    });
    satir.addEventListener('mouseup', () => clearTimeout(uzunBasmaZamanlayi));
    satir.addEventListener('mouseleave', () => clearTimeout(uzunBasmaZamanlayi));
    liste.appendChild(satir);
  });
}

export function profilSilOnay(profil) {
  onayGoster(
    'Profili Sil',
    `"${profil.ad}" profilini silmek istediğine emin misin? Yedekleme kodu da silinecek; bu profili kullanan diğer cihazlar senkronizasyonunu kaybeder.`,
    async () => {
      if (profil.yedekKod) {
        try {
          await remove(ref(veritabani, `yedekler/${profil.yedekKod}`));
        } catch(e) { console.warn('Firebase silme hatası:', e); }
      }

      const profiller = profilleriGetir().filter(p => p.id !== profil.id);
      profilleriKaydet(profiller);

      const aktif = aktifProfiliGetir();
      if (!aktif || aktif.id === profil.id) {
        if (profiller.length > 0) {
          localStorage.setItem('pw_aktif_profil', profiller[0].id);
        } else {
          localStorage.removeItem('pw_aktif_profil');
        }
      }

      profilListesiniGuncelle();
      toastGoster(`"${profil.ad}" silindi`);

      const kalanProfiller = profilleriGetir();
      if (kalanProfiller.length === 0) {
        modalKapat('profilSecModal');
        modalKapat('ayarlarModal');
        ekraniGoster('baslangicEkrani');
        document.getElementById('hazirEkrani').style.display = 'none';
        document.getElementById('profilOlusturKutu').style.display = 'block';
      } else {
        const yeniAktif = aktifProfiliGetir();
        if (yeniAktif) {
          document.getElementById('aktifProfilAdi').textContent = yeniAktif.ad;
          document.getElementById('hosgeldinIsim').textContent = yeniAktif.ad;
        }
      }
    }
  );
}

export async function yedekKoduGoster() {
  const profil = aktifProfiliGetir();
  if (!profil) return;
  const gosterge = document.getElementById('yedekKodGosterge');
  gosterge.textContent = 'Oluşturuluyor...';
  modalAc('yedekKodModal');
  const kod = await yedekKoduOlustur(profil);
  gosterge.textContent = kod;
}

export async function profilGeriYukle() {
  const kod = document.getElementById('yedekKodGiris').value.trim();
  if (!kod) { toastGoster('Lütfen kod girin!'); return; }

  if (kod === '/pwadmin') {
    document.getElementById('yedekKodGiris').value = '';
    modalKapat('profilYukleModal');
    modalAc('adminModal');
    return;
  }
  if (kod === '/genelsifirla') {
    document.getElementById('yedekKodGiris').value = '';
    modalKapat('profilYukleModal');
    genelSifirlaBaslat();
    return;
  }

  toastGoster('Aranıyor...');
  try {
    const snap = await get(ref(veritabani, `yedekler/${kod}`));
    if (!snap.exists()) { toastGoster('Kod bulunamadı!'); return; }
    const veri = snap.val();
    const profiller = profilleriGetir();
    const mevcutIndeks = profiller.findIndex(p => p.id === veri.id);
    const tamVeri = {
      id: veri.id,
      ad: veri.ad,
      skorlar: veri.skorlar || [],
      gecmis: veri.gecmis || [],
      favoriler: veri.favoriler || [],
      olusturulma: veri.olusturulma,
      yedekKod: kod
    };
    if (mevcutIndeks !== -1)
      profiller[mevcutIndeks] = { ...profiller[mevcutIndeks], ...tamVeri };
    else profiller.push(tamVeri);
    profilleriKaydet(profiller);
    localStorage.setItem('pw_aktif_profil', veri.id);
    document.getElementById('yedekKodGiris').value = '';
    modalKapat('profilYukleModal');
    toastGoster(`"${veri.ad}" yüklendi!`);
  } catch (hata) {
    toastGoster('Bağlantı hatası!');
  }
}

export function genelSifirlaBaslat() {
  window._sifirlaModunda = true;
  document.getElementById('adminSifreEkrani').classList.remove('gizli');
  document.getElementById('adminIcerik').classList.add('gizli');
  document.getElementById('adminSifreGiris').value = '';
  modalAc('adminModal');
}

export function kopyala(elVeyaId) {
  const el = typeof elVeyaId === 'string' ? document.getElementById(elVeyaId) : elVeyaId;
  navigator.clipboard.writeText(el.textContent.trim()).then(() => toastGoster('Kopyalandı! 📋')).catch(() => toastGoster('Kopyalanamadı'));
}

export async function bakimModuVeDuyuruKontrol() {
  try {
    onValue(ref(veritabani, 'ayarlar/bakimModu'), (snap) => {
      const bakimAktif = snap.exists() && snap.val() === true;
      const adminGiris = localStorage.getItem('pw_admin_giris') === 'true';
      if (bakimAktif && !adminGiris) {
        ekraniGoster('bakimEkrani');
      } else {
        const mevcut = document.querySelector('.ekran:not(.gizli)');
        if (mevcut && mevcut.id === 'bakimEkrani') {
          const aktifProfil = aktifProfiliGetir();
          ekraniGoster('baslangicEkrani');
          if (aktifProfil) {
            document.getElementById('profilOlusturKutu').style.display = 'none';
            const hazir = document.getElementById('hazirEkrani');
            hazir.style.display = 'flex';
            hazir.style.flexDirection = 'column';
            document.getElementById('hosgeldinIsim').textContent = aktifProfil.ad;
            aktifProfilUiGuncelle();
          }
        }
      }
    });

    onValue(ref(veritabani, 'ayarlar/duyurular'), (snap) => {
      duyurulariGoster(snap);
    });
  } catch(e) {
    console.warn('Bakım/duyuru kontrolü hatası:', e);
  }
}

export function duyurulariGoster(snap) {
  const anasayfaBandi = document.getElementById('duyuruBandi');
  const anasayfaMetni = document.getElementById('duyuruMetni');
  const oyunBandi = document.getElementById('duyuruBandiOyun');
  const oyunMetni = document.getElementById('duyuruMetniOyun');

  if (!snap || !snap.exists()) {
    if (anasayfaBandi) anasayfaBandi.classList.add('gizli');
    if (oyunBandi) oyunBandi.classList.add('gizli');
    return;
  }

  const veri = snap.val();
  const simdiki = Date.now();
  const aktifDuyurular = Object.entries(veri)
    .map(([key, d]) => ({ key, ...d }))
    .filter(d => {
      if (!d.metin) return false;
      const gorulmeKey = 'pw_duyuru_' + d.key;
      const gorulme = JSON.parse(localStorage.getItem(gorulmeKey) || '{"sayi":0,"ilk":0}');
      if (d.sureDakika > 0 && gorulme.ilk > 0) {
        const gecenDakika = (simdiki - gorulme.ilk) / 60000;
        if (gecenDakika >= d.sureDakika) return false;
      }
      if (d.maksGorunum > 0 && gorulme.sayi >= d.maksGorunum) return false;
      return true;
    })
    .sort((a, b) => (b.olusturulma || 0) - (a.olusturulma || 0));

  if (aktifDuyurular.length === 0) {
    if (anasayfaBandi) anasayfaBandi.classList.add('gizli');
    if (oyunBandi) oyunBandi.classList.add('gizli');
    return;
  }

  const metinler = aktifDuyurular.map(d => d.metin).join(' • ');

  aktifDuyurular.forEach(d => {
    const gorulmeKey = 'pw_duyuru_' + d.key;
    const gorulme = JSON.parse(localStorage.getItem(gorulmeKey) || '{"sayi":0,"ilk":0}');
    localStorage.setItem(gorulmeKey, JSON.stringify({
      sayi: gorulme.sayi + 1,
      ilk: gorulme.ilk || simdiki
    }));
  });

  if (anasayfaBandi && anasayfaMetni) {
    anasayfaMetni.textContent = metinler;
    anasayfaBandi.classList.remove('gizli');
  }
  if (oyunBandi && oyunMetni) {
    oyunMetni.textContent = metinler;
    oyunBandi.classList.remove('gizli');
  }

  const sonucBandi = document.getElementById('duyuruBandiSonuc');
  const sonucMetni = document.getElementById('duyuruMetniSonuc');
  if (sonucBandi && sonucMetni) {
    sonucMetni.textContent = metinler;
    sonucBandi.classList.remove('gizli');
  }
}

export function aktifProfilUiGuncelle() {
  const profil = aktifProfiliGetir();
  const adiEl = document.getElementById('aktifProfilAdi');
  const altEl = document.getElementById('aktifProfilAlt');
  if (!profil) {
    if (adiEl) adiEl.textContent = '—';
    if (altEl) altEl.innerHTML = 'Henüz profil yok';
    return;
  }
  if (adiEl) adiEl.textContent = profil.ad;
  if (altEl) {
    altEl.innerHTML = profil.yedekKod
      ? `Şu an aktif profil • Silmek için basılı tut<br><span style="font-size:10px;color:#4fc3f7;letter-spacing:1px;">${profil.yedekKod}</span>`
      : `Şu an aktif profil • Silmek için basılı tut`;
  }
}
