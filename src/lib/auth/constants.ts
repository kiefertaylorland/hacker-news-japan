/** Query flag the home page reads to show the "sign-in didn't complete" notice. */
export const AUTH_ERROR_PARAM = "auth_error";

/** Where failed sign-in attempts land. */
export const AUTH_ERROR_PATH = `/?${AUTH_ERROR_PARAM}=1`;
