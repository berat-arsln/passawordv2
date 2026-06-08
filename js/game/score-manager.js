import { oyunDurumu } from '../core/state.js';
import { HARFLER } from '../core/constants.js';
import { gecmiseKaydet } from '../services/firebase.js';
import { skorkaydet } from './services/firebase.js'; // This import is circular; we'll handle in implementation

// We'll use import { set } from firebase-database to update scores

export function oyunuBitir(erkenBitirildi = false) {
  clearInterval(oyunDurumu.zamanlayici);
  oyunDurumu.calisiyor = false;
  let sureBonus = 0;
  if (!erkenBitirildi) {
    sureBonus = Math.max(0, Math.floor(oyunDurumu.kalanSure / 10));
    oyunDurumu.puan += sureBonus;
  }

  let komboBonus = 0;
  if (oyunDurumu.dogruSayisi >= 15) {
    komboBonus = oyunDurumu.dogruSayisi;
    oyunDurumu.puan += komboBonus;
  }

  gecmiseKaydet({
    tarih: new Date().toISOString(),
    puan: oyunDurumu.puan,
    dogruSayisi: oyunDurumu.dogruSayisi,
    yanlisSayisi: oyunDurumu.yanlisSayisi,
    pasSayisi: oyunDurumu.pasSayisi,
    detay: HARFLER.map(harf => ({
      harf,
      durum: oyunDurumu.harfDurumlari[harf] || 'pas',
      soru: oyunDurumu.secilenSorular[harf]?.soru || '',
      dogruCevap: oyunDurumu.secilenSorular[harf]?.cevap || '',
      verilenCevap: oyunDurumu.harfCevaplari[harf]?.verilen || '—'
    }))
  });

  skorkaydet(
    oyunDurumu.puan,
    oyunDurumu.dogruSayisi,
    oyunDurumu.yanlisSayisi,
    oyunDurumu.pasSayisi,
    HARFLER.map(harf => ({
      harf,
      durum: oyunDurumu.harfDurumlari[harf] || 'pas',
      soru: oyunDurumu.secilenSorular[harf]?.soru || '',
      dogruCevap: oyunDurumu.secilenSorular[harf]?.cevap || '',
      verilenCevap: oyunDurumu.harfCevaplari[harf]?.verilen || '—'
    }))
  );
  sonucEkraniniOlustur(sureBonus, komboBonus);
  import('../ui/screens.js').then(m => m.ekraniGoster('sonucEkrani'));
}

function sonucEkraniniOlustur(sureBonus, komboBonus) {
  const liste = document.getElementById('sonucListe');
  liste.innerHTML = '';

  HARFLER.forEach((harf) => {
    const durum = oyunDurumu.harfDurumlari[harf];
    const veri = oyunDurumu.harfCevaplari[harf] || {
      verilen: '—',
      dogru: oyunDurumu.secilenSorular[harf]?.cevap || '?',
      soru: oyunDurumu.secilenSorular[harf]?.soru || ''
    };
    const sinif = durum === 'dogru' ? 's-dogru' : durum === 'yanlis' ? 's-yanlis' : 's-pas';

    const kalem = document.createElement('div');
    kalem.className = `sonuc-kalem ${sinif}`;
    kalem.innerHTML = `
      <div class="sonuc-harf">${harf}</div>
      <div class="sonuc-bilgi">
        <div class="sonuc-soru">${veri.soru}</div>
        <div class="sonuc-verilen-cevap">${veri.verilen === 'Pas' ? 'Pas geçildi' : veri.verilen}</div>
        <div class="sonuc-dogru-cevap">✓ Doğru Cevap: ${veri.dogru}</div>
        <button class="hata-bildir-buton" onclick="hataBildir('${harf}', this)">⚠ Hata Bildir</button>
      </div>
    `;
    liste.appendChild(kalem);
  });

  document.getElementById('finalPuan').textContent = oyunDurumu.puan;
  document.getElementById('istatDogru').textContent = `✓ ${oyunDurumu.dogruSayisi} Doğru`;
  document.getElementById('istatYanlis').textContent = `✗ ${oyunDurumu.yanlisSayisi} Yanlış`;
  document.getElementById('istatPas').textContent = `~ ${oyunDurumu.pasSayisi} Pas`;
  document.getElementById('istatBonus').textContent = `⏱ +${sureBonus} Bonus`;

  const komboCipi = document.getElementById('istatKombo');
  if (komboBonus > 0) {
    komboCipi.textContent = `🔥 +${komboBonus} Kombo`;
    komboCipi.classList.remove('gizli');
  } else {
    komboCipi.classList.add('gizli');
  }

  const profil = import('../services/firebase.js').then(m => m.aktifProfiliGetir());
  // This is simplified; we need to properly handle favorite button update.
}

export function canliIstatistikGuncelle() {
  document.getElementById('canliPuan').textContent = oyunDurumu.puan;
  document.getElementById('canliDogru').textContent = oyunDurumu.dogruSayisi;
  document.getElementById('canliYanlis').textContent = oyunDurumu.yanlisSayisi;
  document.getElementById('canliPas').textContent = oyunDurumu.pasSayisi;
}
