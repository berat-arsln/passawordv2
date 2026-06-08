import { toastGoster } from './toast.js';
import { profilSilOnay } from '../services/firebase.js';

export function modalAc(id) {
  if (id === 'skorModal') import('../services/leaderboard.js').then(m => m.kisiselSkorTablosunuGuncelle());
  if (id === 'ayarlarModal') import('../services/firebase.js').then(m => m.aktifProfilUiGuncelle());
  if (id === 'profilSecModal') {
    import('../services/firebase.js').then(m => m.profilleriFirebaseIleEslestir().then(() => m.profilListesiniGuncelle()));
  }
  if (id === 'geriBildirimModal') import('./feedback.js')?.then(m => m.altTurGuncelle('oneri'));
  if (id === 'gecmisModal') import('./feedback.js')?.then(m => m.gecmisModalGuncelle());
  if (id === 'adminModal') {
    document.getElementById('adminSifreEkrani').classList.remove('gizli');
    document.getElementById('adminIcerik').classList.add('gizli');
    document.getElementById('adminSifreGiris').value = '';
  }
  document.getElementById(id).classList.add('acik');
}

export function modalKapat(id) {
  document.getElementById(id).classList.remove('acik');
}

export function disaTiklaKapat(e, id) {
  if (e.target === document.getElementById(id)) modalKapat(id);
}

export function onayGoster(baslik, mesaj, onayCallback) {
  document.getElementById('onayBaslik').textContent = baslik;
  document.getElementById('onayMesaj').textContent = mesaj;
  document.getElementById('onayEvetButon').onclick = () => {
    onayCallback();
    onayKapat();
  };
  document.getElementById('onayDiyalog').classList.add('acik');
}

export function onayKapat() {
  document.getElementById('onayDiyalog').classList.remove('acik');
}
