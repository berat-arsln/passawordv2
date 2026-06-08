import { ref, push, get, set, remove } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
// DÜZELTME: veritabani export edilmiyordu, getDatabase ile alıyoruz
import { aktifProfiliGetir, profilleriGetir, profilleriKaydet } from '../services/firebase.js';

const veritabani = getDatabase();

export function hataBildir(harf, btn) {
  import('../services/firebase.js').then(({ aktifProfiliGetir }) => {
    const profil = aktifProfiliGetir();
    const profilAdi = profil ? profil.ad : 'Anonim';
    import('../game/score-manager.js').then(({ }) => {});
    // oyunDurumu'na doğrudan erişim
    import('../core/state.js').then(({ oyunDurumu }) => {
      const soruVerisi = oyunDurumu.secilenSorular[harf];
      const verilenCevap = oyunDurumu.harfCevaplari[harf]?.verilen || '—';
      push(ref(veritabani, 'geribildirimler'), {
        profilAdi,
        kategori: '⚠️ Şikayet',
        altTur: '🐛 Soru Hatası',
        mesaj: `Harf: ${harf} — Soru: ${soruVerisi?.soru || '?'} — Verilen: ${verilenCevap} — Doğru: ${soruVerisi?.cevap || '?'}`,
        tarih: new Date().toISOString()
      }).then(() => {
        import('../ui/toast.js').then(m => m.toastGoster('Hata bildirildi, teşekkürler!'));
        if (btn) { btn.disabled = true; btn.textContent = '✓ Bildirildi'; }
      }).catch(() => import('../ui/toast.js').then(m => m.toastGoster('Bağlantı hatası!')));
    });
  });
}

export function gecmisHataBildir(d, btn) {
  import('../services/firebase.js').then(({ aktifProfiliGetir }) => {
    const profil = aktifProfiliGetir();
    push(ref(veritabani, 'geribildirimler'), {
      profilAdi: profil ? profil.ad : 'Anonim',
      kategori: '⚠️ Şikayet',
      altTur: '🐛 Soru Hatası',
      mesaj: `Geçmişten — Harf: ${d.harf} — Soru: ${d.soru || '?'} — Verilen: ${d.verilenCevap || '—'} — Doğru: ${d.dogruCevap || '?'}`,
      tarih: new Date().toISOString()
    }).then(() => {
      import('../ui/toast.js').then(m => m.toastGoster('Hata bildirildi!'));
      if (btn) { btn.disabled = true; btn.textContent = '✓ Bildirildi'; }
    }).catch(() => import('../ui/toast.js').then(m => m.toastGoster('Bağlantı hatası!')));
  });
}

export function gecmisDetayGoster(oyun, indeks) {
  const modal = document.getElementById('gecmisDetayModal');
  const baslik = document.getElementById('gecmisDetayBaslik');
  const istatEl = document.getElementById('gecmisDetayIstat');
  const listeEl = document.getElementById('gecmisDetayListe');
  if (!modal || !listeEl) return;

  const tarih = oyun.tarih ? new Date(oyun.tarih).toLocaleDateString('tr-TR') : '—';
  if (baslik) baslik.textContent = `Oyun Detayı — ${tarih}`;
  if (istatEl) {
    istatEl.innerHTML = `
      <div class="istat-cipi dogru">✓ ${oyun.dogruSayisi || 0} Doğru</div>
      <div class="istat-cipi yanlis">✗ ${oyun.yanlisSayisi || 0} Yanlış</div>
      <div class="istat-cipi pas">~ ${oyun.pasSayisi || 0} Pas</div>
      <div class="istat-cipi bonus">⭐ ${oyun.puan || 0} Puan</div>
    `;
  }

  listeEl.innerHTML = '';
  (oyun.detay || []).forEach(d => {
    const sinif = d.durum === 'dogru' ? 's-dogru' : d.durum === 'yanlis' ? 's-yanlis' : 's-pas';
    const kalem = document.createElement('div');
    kalem.className = `sonuc-kalem ${sinif}`;
    kalem.innerHTML = `
      <div class="sonuc-harf">${d.harf}</div>
      <div class="sonuc-bilgi">
        <div class="sonuc-soru">${d.soru || ''}</div>
        <div class="sonuc-verilen-cevap">${d.verilenCevap === 'Pas' ? 'Pas geçildi' : (d.verilenCevap || '—')}</div>
        <div class="sonuc-dogru-cevap">✓ Doğru Cevap: ${d.dogruCevap || '?'}</div>
        <button class="hata-bildir-buton" onclick="gecmisHataBildir(${JSON.stringify(d)}, this)">⚠ Hata Bildir</button>
      </div>
    `;
    listeEl.appendChild(kalem);
  });

  import('../ui/modal.js').then(m => m.modalAc('gecmisDetayModal'));
}

export function gecmisSekmeGec(sekme) {
  document.getElementById('sekmeGecmis')?.classList.toggle('aktif', sekme === 'gecmis');
  document.getElementById('sekmeFavori')?.classList.toggle('aktif', sekme === 'favori');
  document.getElementById('gecmisListe')?.classList.toggle('gizli', sekme !== 'gecmis');
  document.getElementById('favoriListe')?.classList.toggle('gizli', sekme !== 'favori');
}

export function gecmisModalGuncelle() {
  const profil = aktifProfiliGetir();
  gecmisListesiniOlustur(profil);
  favoriListesiniOlustur(profil);
}

export function gecmisListesiniOlustur(profil) {
  const liste = document.getElementById('gecmisListe');
  if (!liste) return;
  liste.innerHTML = '';
  const gecmis = profil?.gecmis || [];
  if (gecmis.length === 0) {
    liste.innerHTML = `<div style="text-align:center;color:var(--metin-soluk);padding:24px;font-size:14px;">Henüz oyun geçmişi yok.</div>`;
    return;
  }
  gecmis.forEach((oyun, i) => {
    const tarih = oyun.tarih ? new Date(oyun.tarih).toLocaleDateString('tr-TR') : '—';
    const el = document.createElement('div');
    el.className = 'skor-satir';
    el.style.cursor = 'pointer';
    el.innerHTML = `
      <div class="skor-satir-ust">
        <div class="skor-sira">${i + 1}</div>
        <div class="skor-isim">${tarih}</div>
        <div class="skor-puan">${oyun.puan || 0} puan</div>
      </div>
      <div class="skor-satir-alt">
        <span style="color:var(--dogru-renk);">✓ ${oyun.dogruSayisi || 0}</span>
        <span style="color:var(--yanlis-renk);">✗ ${oyun.yanlisSayisi || 0}</span>
        <span style="color:var(--pas-renk);">~ ${oyun.pasSayisi || 0}</span>
      </div>
    `;
    el.addEventListener('click', () => gecmisDetayGoster(oyun, i));
    liste.appendChild(el);
  });
}

export function favoriListesiniOlustur(profil) {
  const liste = document.getElementById('favoriListe');
  if (!liste) return;
  liste.innerHTML = '';
  const favoriler = profil?.favoriler || [];
  if (favoriler.length === 0) {
    liste.innerHTML = `<div style="text-align:center;color:var(--metin-soluk);padding:24px;font-size:14px;">Henüz favori oyun yok.</div>`;
    return;
  }
  favoriler.forEach((oyun, i) => {
    const tarih = oyun.tarih ? new Date(oyun.tarih).toLocaleDateString('tr-TR') : '—';
    const el = document.createElement('div');
    el.className = 'skor-satir';
    el.style.cursor = 'pointer';
    el.innerHTML = `
      <div class="skor-satir-ust">
        <div class="skor-sira">🔖</div>
        <div class="skor-isim">${tarih}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="skor-puan">${oyun.puan || 0} puan</div>
          <button onclick="favoriKaldir(${i})" style="background:rgba(255,65,65,0.2);border:1px solid rgba(255,65,65,0.4);color:#ff4141;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;">Kaldır</button>
        </div>
      </div>
      <div class="skor-satir-alt">
        <span style="color:var(--dogru-renk);">✓ ${oyun.dogruSayisi || 0}</span>
        <span style="color:var(--yanlis-renk);">✗ ${oyun.yanlisSayisi || 0}</span>
        <span style="color:var(--pas-renk);">~ ${oyun.pasSayisi || 0}</span>
      </div>
    `;
    el.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      gecmisDetayGoster(oyun, i);
    });
    liste.appendChild(el);
  });
}

export function sonucFavoriButonGuncelle(favoriMi) {
  const ikon1 = document.getElementById('favoriButonIkon');
  const yazi1 = document.getElementById('favoriButonYazi');
  const ikon2 = document.getElementById('favoriButonIkon2');
  const yazi2 = document.getElementById('favoriButonYazi2');
  const metin = favoriMi ? 'Favorilerden Kaldır' : 'Favoriye Ekle';
  const ikon = favoriMi ? '🔖' : '☆';
  if (ikon1) ikon1.textContent = ikon;
  if (yazi1) yazi1.textContent = metin;
  if (ikon2) ikon2.textContent = ikon;
  if (yazi2) yazi2.textContent = metin;
}

export function sonucFavoriToggle() {
  import('../core/state.js').then(({ oyunDurumu }) => {
    const profil = aktifProfiliGetir();
    if (!profil) { import('../ui/toast.js').then(m => m.toastGoster('Profil bulunamadı!')); return; }
    const profiller = profilleriGetir();
    const indeks = profiller.findIndex(p => p.id === profil.id);
    if (indeks === -1) return;
    profiller[indeks].favoriler = profiller[indeks].favoriler || [];

    const oyunVerisi = {
      tarih: new Date().toISOString(),
      puan: oyunDurumu.puan,
      dogruSayisi: oyunDurumu.dogruSayisi,
      yanlisSayisi: oyunDurumu.yanlisSayisi,
      pasSayisi: oyunDurumu.pasSayisi,
      detay: Object.keys(oyunDurumu.harfCevaplari || {}).map(harf => ({
        harf,
        durum: oyunDurumu.harfDurumlari[harf] || 'pas',
        soru: oyunDurumu.secilenSorular[harf]?.soru || '',
        dogruCevap: oyunDurumu.secilenSorular[harf]?.cevap || '',
        verilenCevap: oyunDurumu.harfCevaplari[harf]?.verilen || '—'
      }))
    };

    // Zaten favorilerde mi kontrol et (aynı tarih)
    const mevcutIndeks = profiller[indeks].favoriler.findIndex(f => f.tarih === oyunVerisi.tarih);
    if (mevcutIndeks !== -1) {
      profiller[indeks].favoriler.splice(mevcutIndeks, 1);
      profilleriKaydet(profiller);
      sonucFavoriButonGuncelle(false);
      import('../ui/toast.js').then(m => m.toastGoster('Favorilerden kaldırıldı'));
    } else {
      profiller[indeks].favoriler.unshift(oyunVerisi);
      profilleriKaydet(profiller);
      sonucFavoriButonGuncelle(true);
      import('../ui/toast.js').then(m => m.toastGoster('Favorilere eklendi! 🔖'));
    }
    import('../services/firebase.js').then(m => m.firebaseProfilGuncelle(profiller[indeks]));
  });
}

export function favoriToggle(gecmisIndeks) {
  sonucFavoriToggle();
}

export function favoriKaldir(favIndeks) {
  const profil = aktifProfiliGetir();
  if (!profil) return;
  const profiller = profilleriGetir();
  const indeks = profiller.findIndex(p => p.id === profil.id);
  if (indeks === -1) return;
  profiller[indeks].favoriler = profiller[indeks].favoriler || [];
  profiller[indeks].favoriler.splice(favIndeks, 1);
  profilleriKaydet(profiller);
  import('../services/firebase.js').then(m => m.firebaseProfilGuncelle(profiller[indeks]));
  favoriListesiniOlustur(profilleriGetir().find(p => p.id === profil.id));
  import('../ui/toast.js').then(m => m.toastGoster('Favoriden kaldırıldı'));
}
