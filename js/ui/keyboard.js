// maxEkranBoyutu is globally defined in app.js, we need to access it. We'll export a setter.
let maxEkranBoyutu = window.visualViewport ? window.visualViewport.height : window.innerHeight;

export function getMaxEkranBoyutu() { return maxEkranBoyutu; }
export function setMaxEkranBoyutu(val) { maxEkranBoyutu = val; }

export function klavyeDurumunuGuncelle() {
  const oyunEkrani = document.getElementById('oyunEkrani');
  if (window.visualViewport) {
    if (window.visualViewport.height > maxEkranBoyutu) {
      maxEkranBoyutu = window.visualViewport.height;
    }
    const isKeyboardOpen = (maxEkranBoyutu - window.visualViewport.height > 150);
    if (isKeyboardOpen) {
      oyunEkrani.classList.add('klavye-acik');
      oyunEkrani.style.height = window.visualViewport.height + 'px';
    } else {
      oyunEkrani.classList.remove('klavye-acik');
      oyunEkrani.style.height = '100dvh';
    }
  }
}
