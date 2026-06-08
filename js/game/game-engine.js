import { oyunDurumu } from '../core/state.js';
import { HARFLER, HARF_DOSYA_ESLEME } from '../core/constants.js';
import { daireOlculeriniHesapla, daireOlustur, harfiAktifYap, aktifTopuIsaretle } from './question-manager.js';
import { oyunuBitir } from './score-manager.js';

function cevapKontrol(verilen, dogru, alternatifler) {
  const normaliz = (s) =>
    s.trim().toLowerCase()
     .replace(/i̇/g, "i").replace(/ı/g, "i").replace(/İ/g, "i").replace(/I/g, "i")
     .replace(/ğ/g, "g").replace(/Ğ/g, "g")
     .replace(/ü/g, "u").replace(/Ü/g, "u")
     .replace(/ş/g, "s").replace(/Ş/g, "s")
     .replace(/ö/g, "o").replace(/Ö/g, "o")
     .replace(/ç/g, "c").replace(/Ç/g, "c");

  const v = normaliz(verilen);
  const d = normaliz(dogru);

  if (v === d) return true;

  for (const alt of alternatifler) {
    if (v === normaliz(alt)) return true;
  }

  const ekler = ["lar","ler","lık", "lik", "luk", "lük", "lı", "li", "lu", "lü", "mak", "mek", "ma", "me","k","i","ca","cı","ci","cu","çı"];
  for (const ek of ekler) {
    if (d.endsWith(ek)) {
      const kok = d.slice(0, -ek.length);
      if (kok.length >= 3 && v === kok) return true;
    }
  }

  const ekCiftleri = [
    ["li", "lik"],
    ["lı", "lık"],
    ["lu", "luk"],
    ["lü", "lük"],
    ["me", "mek"],
    ["ma", "mak"]
  ];
  for (const [kisa, uzun] of ekCiftleri) {
    if (d.endsWith(kisa)) {
      const kok = d.slice(0, -kisa.length);
      if (kok.length >= 2 && v === kok + uzun) return true;
    }
    if (d.endsWith(uzun)) {
      const kok = d.slice(0, -uzun.length);
      if (kok.length >= 2 && v === kok + kisa) return true;
    }
  }
  return false;
}

export function cevapVer() {
  const bilgisayarMi = !window._dokunmatik && window.innerWidth >= 1025;
  const ham = bilgisayarMi
    ? document.getElementById('bilgisayarCevapGiris').value.trim()
    : document.getElementById('cevapGiris').value.trim();

  if (!ham) {
    pasCek();
    return;
  }

  const harf = oyunDurumu.mevcutHarf;
  const soruVerisi = oyunDurumu.secilenSorular[harf];
  const dogruCevap = soruVerisi ? soruVerisi.cevap : "";
  const alternatifler = soruVerisi ? soruVerisi.alternatifler || [] : [];

  const dogruMu = cevapKontrol(ham, dogruCevap, alternatifler);

  if (dogruMu) {
    oyunDurumu.harfDurumlari[harf] = "dogru";
    oyunDurumu.puan += 10;
    oyunDurumu.dogruSayisi++;
  } else {
    oyunDurumu.harfDurumlari[harf] = "yanlis";
    oyunDurumu.puan = Math.max(0, oyunDurumu.puan - 5);
    oyunDurumu.yanlisSayisi++;
  }

  if (oyunDurumu.pasModu || oyunDurumu.pasKuyrugu.includes(harf)) {
    oyunDurumu.pasSayisi = Math.max(0, oyunDurumu.pasSayisi - 1);
  }

  oyunDurumu.harfCevaplari[harf] = {
    verilen: ham,
    dogru: dogruCevap,
    soru: soruVerisi ? soruVerisi.soru : "",
    dogruMu,
  };

  import('./score-manager.js').then(m => m.canliIstatistikGuncelle()); // we need a better way
  sonrakiSoruya();
}

export function pasCek() {
  const harf = oyunDurumu.mevcutHarf;
  const soruVerisi = oyunDurumu.secilenSorular[harf];

  if (!oyunDurumu.pasModu) {
    oyunDurumu.harfDurumlari[harf] = "pas";
    if (!oyunDurumu.pasKuyrugu.includes(harf)) {
      oyunDurumu.pasKuyrugu.push(harf);
      oyunDurumu.pasSayisi++;
    }
    oyunDurumu.harfCevaplari[harf] = {
      verilen: "Pas",
      dogru: soruVerisi ? soruVerisi.cevap : "",
      soru: soruVerisi ? soruVerisi.soru : "",
      dogruMu: false,
    };
  }

  import('./score-manager.js').then(m => m.canliIstatistikGuncelle());
  cevapAlaniniTemizle();
  sonrakiSoruya();
}

function cevapAlaniniTemizle() {
  document.getElementById("cevapGiris").value = "";
  document.getElementById("bilgisayarCevapGiris").value = "";
}

export function sonrakiSoruya() {
  cevapAlaniniTemizle();
  if (oyunDurumu.pasModu) {
    oyunDurumu.pasIndeks++;
    while (
      oyunDurumu.pasIndeks < oyunDurumu.pasKuyrugu.length &&
      oyunDurumu.harfDurumlari[oyunDurumu.pasKuyrugu[oyunDurumu.pasIndeks]] !== "pas"
    ) {
      oyunDurumu.pasIndeks++;
    }
    if (oyunDurumu.pasIndeks >= oyunDurumu.pasKuyrugu.length) {
      const kalanPaslar = oyunDurumu.pasKuyrugu.filter(
        (h) => oyunDurumu.harfDurumlari[h] === "pas"
      );
      if (kalanPaslar.length === 0) {
        oyunuBitir();
        return;
      }
      oyunDurumu.pasIndeks = 0;
      while (
        oyunDurumu.pasIndeks < oyunDurumu.pasKuyrugu.length &&
        oyunDurumu.harfDurumlari[oyunDurumu.pasKuyrugu[oyunDurumu.pasIndeks]] !== "pas"
      ) {
        oyunDurumu.pasIndeks++;
      }
    }
    harfiAktifYap(oyunDurumu.pasIndeks);
  } else {
    oyunDurumu.mevcutHarfIndeks++;
    if (oyunDurumu.mevcutHarfIndeks >= HARFLER.length) {
      const kalanPaslar = oyunDurumu.pasKuyrugu.filter(
        (h) => oyunDurumu.harfDurumlari[h] === "pas"
      );
      if (kalanPaslar.length === 0) {
        oyunuBitir();
        return;
      }
      oyunDurumu.pasModu = true;
      oyunDurumu.pasIndeks = 0;
      harfiAktifYap(oyunDurumu.pasIndeks);
    } else {
      harfiAktifYap(oyunDurumu.mevcutHarfIndeks);
    }
  }
}
