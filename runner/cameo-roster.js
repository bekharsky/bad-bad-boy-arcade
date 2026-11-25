export const CAMEO_LOOKS = {
  purra: { name: 'Purra', skin: '#e8bca7', jacket: '#d73587', lapel: '#bd2d75', shirt: '#25212a', tie: '#25212a', trousers: '#32313a', scale: [.98, 1, 1] },
  orpo: { name: 'Orpo', skin: '#dfb59d', jacket: '#344356', lapel: '#29384a', shirt: '#f2eee4', tie: '#6691b4', trousers: '#303b4d', formal: true, scale: [1.03, 1, 1] },
  marin: { name: 'Marin', skin: '#f0c9b4', jacket: '#f1eee4', lapel: '#e1ddd4', shirt: '#333039', tie: '#333039', trousers: '#34333b', scale: [.94, 1, 1] },
  stubb: { name: 'Stubb', skin: '#e6b79c', jacket: '#304563', lapel: '#253a56', shirt: '#f4efe4', tie: '#8185b2', trousers: '#2d3b53', formal: true, scale: [.97, 1.05, 1] },
  macron: { name: 'Macron', skin: '#e3b69f', jacket: '#283348', lapel: '#333e51', shirt: '#f6f1e8', tie: '#303c54', trousers: '#262d3d', formal: true, scale: [.97, 1.01, 1] },
  merz: { name: 'Merz', skin: '#e6bdab', jacket: '#374b65', lapel: '#425773', shirt: '#f5f3eb', tie: '#5079a4', trousers: '#303b50', formal: true, scale: [.96, 1.065, 1] },
  lepen: { name: 'Le Pen', skin: '#e6bca1', jacket: '#273345', lapel: '#303a49', shirt: '#f6efe4', trousers: '#2f3440', scale: [1.02, 1, 1] },
};
export const CAMEO_KINDS = Object.freeze(Object.keys(CAMEO_LOOKS));
export const isCameo = kind => CAMEO_KINDS.includes(kind);
export const CAMEO_HEALTH = .9;
export const STUMBLE_DURATION = 1.65;

export const cameoGaitForDistance = (distance, running) => distance * (running ? .34 : .5);
