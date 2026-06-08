export function toastGoster(mesaj, sure = 2500) {
  const toast = document.getElementById('toastBildirim');
  toast.textContent = mesaj;
  toast.classList.add('goster');
  setTimeout(() => toast.classList.remove('goster'), sure);
}
