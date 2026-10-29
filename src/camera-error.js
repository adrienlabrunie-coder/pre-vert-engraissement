export function cameraErrorMessage(error, native = false) {
 const fallback = ' Vous pouvez aussi choisir une photo du code-barres ou saisir le numéro.';
 if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(error?.name)) {
  return (native
   ? 'Accès à la caméra refusé. Dans les paramètres Android, ouvrez Applications → Pré Vert Engraissement → Autorisations → Appareil photo, puis autorisez l’accès pendant l’utilisation. Vérifiez aussi que l’accès global à la caméra est activé.'
   : 'Accès à la caméra refusé. Autorisez la caméra dans les permissions de ce site et vérifiez les autorisations du navigateur dans les réglages du téléphone. Ouvrez l’application directement dans Chrome ou Safari via son adresse HTTPS.') + fallback;
 }
 if (['NotFoundError', 'DevicesNotFoundError'].includes(error?.name)) return 'Aucune caméra détectée sur cet appareil.' + fallback;
 if (['NotReadableError', 'TrackStartError', 'AbortError'].includes(error?.name)) return 'La caméra ne peut pas démarrer. Fermez les autres applications qui l’utilisent, puis réessayez.' + fallback;
 return 'Caméra indisponible. Vérifiez les autorisations de caméra et réessayez.' + fallback;
}
