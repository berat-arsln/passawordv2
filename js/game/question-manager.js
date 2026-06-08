import { oyunDurumu } from '../core/state.js';
import { HARFLER, HARF_DOSYA_ESLEME } from '../core/constants.js';

export async function sorulariYukle() {
  document.getElementById('yuklemeMesaj').textContent = 'Sorular yükleniyor...';
  import('../ui/screens.js').then(m => m.ekraniGoster('yuklemEkrani'));

  const yuklemeSozleri = HARFLER.map(async (harf) => {
    const dosyaAdi = HARF_DOSYA_ESLEME[harf];
    try {
      const yanit = await fetch(`./questions/${dosyaAdi}_questions.json`);

console.log("DOSYA:", dosyaAdi, yanit.status);

if (!yanit.ok) throw new Error(`${harf} yüklenemedi`);
      const sorular = await yanit.json();
      const numaraliSorular = sorular.map((s, idx) => {
        s.id = s.id || idx + 1;
        return s;
      });
      return { harf, sorular: numaraliSorular };
    } catch (hata) {
      console.warn(`${harf} hatası:`, hata);
      return { harf, sorular: [] };
    }
  });

  const sonuclar = await Promise.all(yuklemeSozleri);
  sonuclar.forEach(({ harf, sorular }) => {
    oyunDurumu.yuklenenSorular[harf] = sorular;
  });
  return true;
}

export function sorulariSec() {
  oyunDurumu.secilenSorular = {};
  HARFLER.forEach((harf) => {
    const havuz = oyunDurumu.yuklenenSorular[harf] || [];
    if (havuz.length > 0) {
      const rastgeleIndeks = Math.floor(Math.random() * havuz.length);
      oyunDurumu.secilenSorular[harf] = havuz[rastgeleIndeks];
    } else {
      oyunDurumu.secilenSorular[harf] = null;
    }
  });
}

export function daireOlculeriniHesapla() {
  const vg = window.innerWidth;
  const vy = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const bilgisayarMi = !window._dokunmatik && vg >= 1025;
  const klavyeAcikMi = window.visualViewport && (window.screen.height - window.visualViewport.height > 150);

  let mevcut;
  if (bilgisayarMi) {
    const kullanilabilir = Math.min(vg * 0.85, vy - 320);
    mevcut = Math.max(300, Math.min(kullanilabilir, 750));
  } else {
    if (klavyeAcikMi) {
      const kullanilabilir = Math.min(vg * 0.95, vy - 95);
      mevcut = Math.max(150, Math.min(kullanilabilir, 450));
    } else {
      const kullanilabilir = Math.min(vg * 0.95, vy - 115);
      mevcut = Math.max(200, Math.min(kullanilabilir, 450));
    }
  }

  const topBoyutu = Math.round(mevcut / 12);
  return { konteynirBoyutu: mevcut, topBoyutu };
}

export function daireOlustur() {
  const konteyner = document.getElementById('daireKonteyneri');
  konteyner.querySelectorAll('.harf-topu').forEach(t => t.remove());

  const olculer = daireOlculeriniHesapla();
  const { konteynirBoyutu, topBoyutu } = olculer;

  konteyner.style.width = konteynirBoyutu + 'px';
  konteyner.style.height = konteynirBoyutu + 'px';

  const mx = konteynirBoyutu / 2;
  const my = konteynirBoyutu / 2;
  const yaricap = (konteynirBoyutu - topBoyutu * 1.3) / 2;
  const toplamHarf = HARFLER.length;

  HARFLER.forEach((harf, i) => {
    const aci = (2 * Math.PI * i) / toplamHarf - Math.PI / 2;
    const x = mx + yaricap * Math.cos(aci);
    const y = my + yaricap * Math.sin(aci);

    const top = document.createElement('div');
    top.className = 'harf-topu durum-' + oyunDurumu.harfDurumlari[harf];
    top.id = 'top-' + harf;
    top.style.width = topBoyutu + 'px';
    top.style.height = topBoyutu + 'px';
    top.style.left = x + 'px';
    top.style.top = y + 'px';
    top.style.fontSize = Math.round(topBoyutu * 0.36) + 'px';
    top.textContent = harf;

    konteyner.insertBefore(top, konteyner.querySelector('.merkez-gosterge'));
  });
}

export function harfiAktifYap(indeks, ilkMi = false) {
  const harf = oyunDurumu.pasModu
    ? oyunDurumu.pasKuyrugu[oyunDurumu.pasIndeks]
    : HARFLER[indeks];
  oyunDurumu.mevcutHarf = harf;
  oyunDurumu.mevcutHarfIndeks = indeks;

  const soruVerisi = oyunDurumu.secilenSorular[harf];
  document.getElementById('soruHarfi').textContent = harf;
  document.getElementById('soruMetni').innerHTML = `<span id="soruHarfi">${harf}</span>: ${soruVerisi ? soruVerisi.soru : '(Soru bulunamadı)'}`;

  if (!ilkMi) {
    setTimeout(() => aktifTopuIsaretle(harf, true), 30);
  } else {
    aktifTopuIsaretle(harf, false);
  }
}

export function aktifTopuIsaretle(harf, animasyonlu = false) {
  HARFLER.forEach((h) => {
    const top = document.getElementById('top-' + h);
    if (!top) return;
    top.className = `harf-topu durum-${oyunDurumu.harfDurumlari[h]}`;
  });
  const aktifTop = document.getElementById('top-' + harf);
  if (aktifTop) {
    if (animasyonlu) {
      aktifTop.className = 'harf-topu gecis-animasyon durum-aktif';
      setTimeout(() => {
        if (aktifTop.classList.contains('gecis-animasyon'))
          aktifTop.className = 'harf-topu durum-aktif';
      }, 370);
    } else {
      aktifTop.className = 'harf-topu durum-aktif';
    }
  }
}
