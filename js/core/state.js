import { HARFLER, OYUN_SURESI } from './constants.js';

export let oyunDurumu = {
  harfDurumlari: {},
  harfCevaplari: {},
  yuklenenSorular: {},
  secilenSorular: {},
  mevcutHarfIndeks: 0,
  mevcutHarf: 'A',
  kalanSure: OYUN_SURESI,
  zamanlayici: null,
  pasKuyrugu: [],
  pasModu: false,
  pasIndeks: 0,
  calisiyor: false,
  puan: 0,
  dogruSayisi: 0,
  yanlisSayisi: 0,
  pasSayisi: 0
};

export function resetState() {
  oyunDurumu.harfDurumlari = {};
  oyunDurumu.harfCevaplari = {};
  oyunDurumu.mevcutHarfIndeks = 0;
  oyunDurumu.mevcutHarf = HARFLER[0];
  oyunDurumu.kalanSure = OYUN_SURESI;
  oyunDurumu.pasKuyrugu = [];
  oyunDurumu.pasModu = false;
  oyunDurumu.pasIndeks = 0;
  oyunDurumu.calisiyor = true;
  oyunDurumu.puan = 0;
  oyunDurumu.dogruSayisi = 0;
  oyunDurumu.yanlisSayisi = 0;
  oyunDurumu.pasSayisi = 0;

  HARFLER.forEach(h => {
    oyunDurumu.harfDurumlari[h] = 'varsayilan';
  });
}
