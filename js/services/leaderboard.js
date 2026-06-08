import { ref, onValue, get, remove, set, push, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js";
import { veritabani } from './firebase.js'; // Assuming veritabani is exported from firebase.js

export function genelSkorTablosunuDinle() {
  const skorRef = ref(veritabani, 'skorlar');
  onValue(skorRef, (anlık) => {
    const veri = anlık.val();
    const liste = document.getElementById('genelSkorListe');
    liste.innerHTML = '';
    if (!veri) {
      liste.innerHTML = `<div style="text-align:center;color:var(--metin-soluk);padding:24px;font-size:14px;">Henüz skor yok. İlk sen ol!</div>`;
      return;
    }

    const skorDizisi = Object.entries(veri)
      .map(([k, v]) => ({ _key: k, ...v }))
      .sort((a, b) => b.puan - a.puan)
      .slice(0, 20);
    const madalyalar = ['🥇', '🥈', '🥉'];

    skorDizisi.forEach((skor, i) => {
      const d = skor.dogru || 0;
      const y = skor.yanlis || 0;
      const p = skor.pas || 0;
      const satir = document.createElement('div');
      satir.className = 'skor-satir';
      satir.innerHTML = `
        <div class="skor-satir-ust">
          <div class="skor-sira">${madalyalar[i] || i + 1}</div>
          <div class="skor-isim">${skor.isim} <span style="font-size:11px;color:var(--metin-soluk)">${new Date(skor.tarih).toLocaleDateString('tr-TR')}</span></div>
          <div style="display:flex;align-items:center;gap:6px;">
            <div class="skor-puan">${skor.puan} puan</div>
          </div>
        </div>
        <div class="skor-satir-alt">
          <span style="color:var(--dogru-renk);">✓ ${d}</span>
          <span style="color:var(--yanlis-renk);">✗ ${y}</span>
          <span style="color:var(--pas-renk);">~ ${p}</span>
        </div>
      `;

      satir.style.cursor = 'pointer';
      satir.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        if (skor.detay && skor.detay.length > 0) {
          import('./feedback.js').then(m => m.gecmisDetayGoster(skor, 0));
        } else {
          import('../ui/toast.js').then(m => m.toastGoster('Bu oyunun detayı yok.'));
        }
      });
      liste.appendChild(satir);
    });
  });
}

export function kisiselSkorTablosunuGuncelle() {
  const profil = import('./firebase.js').then(m => m.aktifProfiliGetir());
  // We need to await, but here is simplified
}
