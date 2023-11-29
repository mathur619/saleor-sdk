import { auth } from "./auth";
import { user } from "./user";
import { CheckoutState, getCheckout, getState, getToken, State } from "./state";
import { createApolloClient } from "../apollo";
import { SaleorClient, SaleorClientOpts } from "./types";

import { createStorage, storage } from "./storage";
import { DEVELOPMENT_MODE, WINDOW_EXISTS } from "../constants";
import { cart } from "./cart";
import { checkout } from "./checkout";
import { utilityFunctions } from "./utils";

export const createSaleorClient = ({
  apiUrl,
  channel,
  opts = {},
  restApiUrl,
  wizzyConfig,
}: SaleorClientOpts): SaleorClient => {
  let _channel = channel;
  const { autologin = true, fetchOpts } = opts;

  const setChannel = (channel: string): string => {
    _channel = channel;
    return _channel;
  };

  createStorage(autologin);
  const apolloClient = createApolloClient(apiUrl, autologin, fetchOpts);
  const coreInternals = {
    apolloClient,
    channel: _channel,
    restApiUrl,
    wizzyConfig,
  };
  const authSDK = auth(coreInternals);
  const userSDK = user(coreInternals);
  const cartSDK = cart(coreInternals);
  const checkoutSDK = checkout(coreInternals);
  const utilityFunctionsSdk = utilityFunctions({ ...wizzyConfig });
  const wishlistSDK = {};
  const walletSDK = {};
  if (autologin) {
    const csrfToken = storage.getCSRFToken();
    const authPluginId = storage.getAuthPluginId();
    if (csrfToken && authPluginId) {
      authSDK.refreshExternalToken(true);
    } else if (csrfToken) {
      authSDK.refreshToken(true);
    }
  }

  const client = {
    auth: authSDK,
    user: userSDK,
    cart: cartSDK,
    checkout: checkoutSDK,
    wishlist: wishlistSDK,
    utilityFunctions: utilityFunctionsSdk,
    wallet: walletSDK,
    config: { channel: _channel, setChannel, autologin },
    _internal: { apolloClient },
    getState: (): State => getState(apolloClient),
    getToken: (): string | null => getToken(),
    getCheckout: (): CheckoutState => getCheckout(apolloClient),
  };

  if (DEVELOPMENT_MODE && WINDOW_EXISTS) {
    (window as any).__SALEOR_CLIENT__ = client;
  }

  // if (
  //   checkoutSDK &&
  //   checkoutSDK.createCheckout &&
  //   (!storage.getCheckout() || Object.keys(checkout).length === 0)
  // ) {
  //   checkoutSDK?.createCheckout();
  // }

  return client;
};
