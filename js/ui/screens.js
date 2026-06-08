export function ekraniGoster(id) {
  document.querySelectorAll('.ekran').forEach(e => e.classList.add('gizli'));
  document.getElementById(id).classList.remove('gizli');
  const bandi = document.getElementById('duyuruBandi');
  const oyunBandi = document.getElementById('duyuruBandiOyun');
  if (bandi && id !== 'baslangicEkrani') bandi.classList.add('gizli');
  if (oyunBandi && id !== 'oyunEkrani') oyunBandi.classList.add('gizli');
}

export function yatayModKontrol() {
  const yatay = window.screen.width > window.screen.height;
  if (window._dokunmatik && yatay) {
    document.getElementById('yatayUyari').classList.remove('gizli');
  } else {
    document.getElementById('yatayUyari').classList.add('gizli');
  }
}

export function bilgisayarModunuAyarla() {
  const bilgisayarMi = !window._dokunmatik && window.innerWidth >= 1025;
  if (bilgisayarMi) {
    document.getElementById('bilgisayarCevapAlani').style.display = 'block';
    document.querySelector('.giris-klavye-alani').style.display = 'none';
  }
}

// Satır 6'yı değiştir:
import { canliIstatistikGuncelle } from './game/score-manager.js';
// screens.js importuna canliIstatistikGuncelle'yi kaldır
}
