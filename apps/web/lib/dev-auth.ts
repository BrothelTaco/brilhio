export const DEV_AUTH_COOKIE = "brilhio_dev_auth";

export function isDevAuthEnabled() {
  return process.env.ALLOW_DEV_AUTH === "true";
}

export function getDevLoginCredentials() {
  return {
    email: process.env.BRILHIO_DEV_LOGIN_EMAIL ?? "test@gmail.com",
    password: process.env.BRILHIO_DEV_LOGIN_PASSWORD ?? "12345",
  };
}
