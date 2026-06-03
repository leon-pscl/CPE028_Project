const AUTH_IMAGES = [
  { src: '/images/auth-1.jpg', photographer: 'Tima Miroshnichenko' },
  { src: '/images/auth-2.jpg', photographer: 'Phong Thanh' },
  { src: '/images/auth-3.jpg', photographer: 'Elias Gamez' },
];

export function getRandomAuthImage(): { src: string; photographer: string } {
  const randomIndex = Math.floor(Math.random() * AUTH_IMAGES.length);
  return AUTH_IMAGES[randomIndex];
}