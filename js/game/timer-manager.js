import { oyunDurumu } from '../core/state.js';
import { oyunuBitir } from './score-manager.js';

export function zamanlayiciBaslat() {
  if (oyunDurumu.zamanlayici) clearInterval(oyunDurumu.zamanlayici);
  oyunDurumu.zamanlayici = setInterval(() => {
    oyunDurumu.kalanSure--;
    sureyiGuncelle();
    if (oyunDurumu.kalanSure <= 0) oyunuBitir();
  }, 1000);
}

function sureyiGuncelle() {
  const dk = Math.floor(oyunDurumu.kalanSure / 60);
  const sn = oyunDurumu.kalanSure % 60;
  const el = document.getElementById('surGosterge');
  el.textContent = `${String(dk).padStart(2, '0')}:${String(sn).padStart(2, '0')}`;
  if (oyunDurumu.kalanSure <= 30) el.classList.add('kritik');
  else el.classList.remove('kritik');
}
