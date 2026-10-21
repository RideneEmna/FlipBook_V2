/**
 * Utilitaire pour extraire et formater les liens YouTube
 * Supporte : standard (watch?v=), raccourci (youtu.be/), embed (/embed/), shorts (/shorts/)
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // Regex linéaire sécurisée sans risque ReDoS (11 caractères alphanumériques / tirets)
  const regExp = /(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);

  if (match && match[1]) {
    const videoId = match[1];
    // autoplay=1 pour lancer la vidéo dès l'ouverture de la popup
    // rel=0 pour restreindre les suggestions
    // modestbranding=1 pour une interface vidéo épurée
    return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;
  }

  return null;
}
