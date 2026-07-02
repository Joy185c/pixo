// Always use the actual deployed origin so share links work on any domain (Netlify, Vercel, custom)
export const APP_URL = window.location.origin

export function getShareLink(token) {
  return `${APP_URL}/connect/${token}`
}
