import { auth } from "./auth";
import { user } from "./user";
import { CheckoutState, getCheckout, getState, State } from "./state";
import { createApolloClient } from "../apollo";
import { SaleorClient, SaleorClientOpts } from "./types";

import { createStorage } from "./storage";
import { DEVELOPMENT_MODE, WINDOW_EXISTS } from "../constants";
import { cart } from "./cart";
import { checkout } from "./checkout";

export const createSaleorClient = ({
  apiUrl,
  channel,
  opts = {},
}: SaleorClientOpts): SaleorClient => {
  let _channel = channel;
  const { autologin = true, fetchOpts } = opts;

  const setChannel = (channel: string): string => {
    _channel = channel;
    return _channel;
  };

  createStorage(autologin);
  const apolloClient = createApolloClient(apiUrl, autologin, fetchOpts);
  const coreInternals = { apolloClient, channel: _channel };
  const authSDK = auth(coreInternals);
  const userSDK = user(coreInternals);
  const cartSDK = cart(coreInternals);
  const checkoutSDK = checkout(coreInternals);
  const wishlistSDK = {};
  const walletSDK = {};
  if (autologin) {
    // const csrfToken = storage.getCSRFToken();
    // const authPluginId = storage.getAuthPluginId();
    // if (csrfToken && authPluginId) {
    //   authSDK.refreshExternalToken(true);
    // } else if (csrfToken) {
    //   authSDK.refreshToken(true);
    // }
  }

  const client = {
    auth: authSDK,
    user: userSDK,
    cart: cartSDK,
    checkout: checkoutSDK,
    wishlist: wishlistSDK,
    wallet: walletSDK,
    config: { channel: _channel, setChannel, autologin },
    _internal: { apolloClient },
    getState: (): State => getState(apolloClient),
    getCheckout: (): CheckoutState => getCheckout(apolloClient),
  };

  if (DEVELOPMENT_MODE && WINDOW_EXISTS) {
    (window as any).__SALEOR_CLIENT__ = client;
  }

  return client;
};
