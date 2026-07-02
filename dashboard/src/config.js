// App base URL — change in production to https://pixo.app
export const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

export function getShareLink(token) {
  return `${APP_URL}/connect/${token}`
}
