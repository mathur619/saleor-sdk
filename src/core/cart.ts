import {
  AddItemResult,
  RemoveItemResult,
  SaleorClientMethodsProps,
  UpdateItemResult,
} from ".";

import { cartItemsVar } from "../apollo/client";
import { setLocalCheckoutInCache } from "../apollo/helpers";
import {
  ADD_CHECKOUT_LINE_MUTATION,
  CHECKOUT_VERIFY_FOR_WAREHOUSE,
  CREATE_CHECKOUT_MUTATION,
  REMOVE_CHECKOUT_LINE_MUTATION,
  UPDATE_CHECKOUT_LINE_MUTATION,
} from "../apollo/mutations";
import { storage } from "./storage";
import {
  AddCheckoutLineMutation,
  AddCheckoutLineMutationVariables,
  Checkout,
  CheckoutLineInput,
  CreateCheckoutMutation,
  CreateCheckoutMutationVariables,
  Maybe,
  RemoveCheckoutLineMutation,
  RemoveCheckoutLineMutationVariables,
  UpdateCheckoutLineMutation,
  UpdateCheckoutLineMutationVariables,
} from "../apollo/types";
import { GET_LOCAL_CHECKOUT } from "../apollo/queries";

export interface CartSDK {
  loaded?: boolean;

  items?: any;

  totalPrice?: any;

  subtotalPrice?: any;

  shippingPrice?: any;

  discount?: any;

  mrp?: any;

  netPrice?: any;

  itemDiscount?: any;

  offerDiscount?: any;

  prepaidDiscount?: any;

  cashbackDiscount?: any;

  cashbackRecieve?: any;

  addItem: (variantId: string, quantity: number) => AddItemResult;
  removeItem: (variantId: string) => RemoveItemResult;
  subtractItem?: (variantId: string, quantity: number) => {};
  updateItem: (
    variantId: string,
    quantity: number,
    prevQuantity: number,
    updatedLines?: Array<Maybe<CheckoutLineInput>> | Maybe<CheckoutLineInput>
  ) => UpdateItemResult;
  updateItemWithLines: (
    updatedLines: Array<Maybe<CheckoutLineInput>>
  ) => UpdateItemResult;
  clearCart?: () => UpdateItemResult;
  updateCartAccordingLocation: (warehouseId: string) => any;
}

export const cart = ({
  apolloClient: client,
}: SaleorClientMethodsProps): CartSDK => {
  let items = cartItemsVar();

  const clearCart: CartSDK["clearCart"] = async () => {
    const checkoutString = storage.getCheckout();

    const checkout =
      checkoutString && typeof checkoutString === "string"
        ? JSON.parse(checkoutString)
        : checkoutString;
    const alteredLines =
      checkout &&
      checkout?.lines?.map((line: any) => ({
        quantity: 0,
        variantId: line?.variant?.id,
      }));

    if (checkout && checkout?.token) {
      const res = await client.mutate<
        UpdateCheckoutLineMutation,
        UpdateCheckoutLineMutationVariables
      >({
        mutation: UPDATE_CHECKOUT_LINE_MUTATION,
        variables: {
          checkoutId: checkout?.id,
          lines: alteredLines,
        },
        update: async (_, { data }) => {
          if (data?.checkoutLinesUpdate?.checkout?.id) {
            storage.setCheckout(data?.checkoutLinesUpdate?.checkout);
          }
          await setLocalCheckoutInCache(
            client,
            data?.checkoutLinesUpdate?.checkout,
            true
          );
        },
      });
      return {
        data: res.data?.checkoutLinesUpdate?.checkout,
        errors: res.data?.checkoutLinesUpdate?.errors,
      };
    }

    return null;
  };

  const addItem: CartSDK["addItem"] = async (
    variantId: string,
    quantity: number
  ) => {
    client.writeQuery({
      query: GET_LOCAL_CHECKOUT,
      data: {
        checkoutLoading: true,
      },
    });

    const checkoutString = storage.getCheckout();
    const checkout =
      checkoutString && typeof checkoutString === "string"
        ? JSON.parse(checkoutString)
        : checkoutString;

    if (checkout && checkout?.token) {
      const res = await client.mutate<
        AddCheckoutLineMutation,
        AddCheckoutLineMutationVariables
      >({
        mutation: ADD_CHECKOUT_LINE_MUTATION,
        variables: {
          checkoutId: checkout?.id,
          lines: [{ quantity: quantity, variantId: variantId }],
        },
        update: async (_, { data }) => {
          if (data?.checkoutLinesAdd?.checkout?.id) {
            storage.setCheckout(data?.checkoutLinesAdd?.checkout);
          }
          await setLocalCheckoutInCache(
            client,
            data?.checkoutLinesAdd?.checkout,
            true
          );
        },
      });
      if (
        res.data?.checkoutLinesAdd?.errors &&
        res.data?.checkoutLinesAdd?.errors[0]?.code === "NOT_FOUND" &&
        res.data?.checkoutLinesAdd?.errors[0]?.field === "checkoutId" &&
        typeof window !== "undefined"
      ) {
        window.localStorage?.clear();
        window.location?.reload();
      }
      // if (
      //   res.data?.checkoutLinesAdd?.errors &&
      //   res.data?.checkoutLinesAdd?.errors[0]?.code ===
      //     "PRODUCT_NOT_PUBLISHED" &&
      //   typeof window !== "undefined"
      // ) {
      //   await clearCart();
      // }
      // if (
      //   res.data?.checkoutLinesAdd?.errors &&
      //   res.data?.checkoutLinesAdd?.errors[0]?.code ===
      //     "PRODUCT_UNAVAILABLE_FOR_PURCHASE" &&
      //   typeof window !== "undefined"
      // ) {
      //   await clearCart();
      // }
      if (
        res.data?.checkoutLinesAdd?.errors &&
        res.data?.checkoutLinesAdd?.errors[0]?.code === "GRAPHQL_ERROR" &&
        res.data?.checkoutLinesAdd?.errors[0]?.field === "variantId" &&
        typeof window !== "undefined"
      ) {
        window.localStorage?.clear();
        window.location?.reload();
      }
      const returnObject = {
        data: res.data?.checkoutLinesAdd?.checkout,
        errors: res.data?.checkoutLinesAdd?.errors,
      };
      return returnObject;
    } else {
      const res = await client.mutate<
        CreateCheckoutMutation,
        CreateCheckoutMutationVariables
      >({
        mutation: CREATE_CHECKOUT_MUTATION,
        variables: {
          checkoutInput: {
            lines: [{ quantity: quantity, variantId: variantId }],
            email: "dummy@dummy.com",
            shippingAddress: {
              city: "delhi",
              companyName: "dummy",
              country: "IN",
              countryArea: "Delhi",
              firstName: "dummy",
              lastName: "dummy",
              phone: "7894561230",
              postalCode: "110006",
              streetAddress1: "dummy",
              streetAddress2: "dummy",
            },
          },
        },
        update: (_, { data }) => {
          setLocalCheckoutInCache(client, data?.checkoutCreate?.checkout, true);
          if (data?.checkoutCreate?.checkout?.id) {
            storage.setCheckout(data?.checkoutCreate?.checkout);
          }
        },
      });
      const returnObject = {
        data: res.data?.checkoutCreate?.checkout,
        errors: res.data?.checkoutCreate?.errors,
      };
      return returnObject;
    }
  };

  const removeItem: CartSDK["removeItem"] = async (variantId: string) => {
    const checkoutString = storage.getCheckout();
    const checkout: Checkout | null =
      checkoutString && typeof checkoutString === "string"
        ? JSON.parse(checkoutString)
        : checkoutString;
    const lineToRemove =
      checkout && checkout?.lines?.find(line => line?.variant.id === variantId);
    const lineToRemoveId = lineToRemove?.id;

    if (checkout && checkout?.token) {
      const res = await client.mutate<
        RemoveCheckoutLineMutation,
        RemoveCheckoutLineMutationVariables
      >({
        mutation: REMOVE_CHECKOUT_LINE_MUTATION,
        variables: {
          checkoutId: checkout?.id,
          lineId: lineToRemoveId,
        },
        update: async (_, { data }) => {
          if (data?.checkoutLineDelete?.checkout?.id) {
            storage.setCheckout(data?.checkoutLineDelete?.checkout);
          }
          await setLocalCheckoutInCache(
            client,
            data?.checkoutLineDelete?.checkout,
            true
          );
        },
      });

      if (
        res.data?.checkoutLineDelete?.errors &&
        res.data?.checkoutLineDelete?.errors[0]?.code === "NOT_FOUND" &&
        res.data?.checkoutLineDelete?.errors[0]?.field === "checkoutId" &&
        typeof window !== "undefined"
      ) {
        window.localStorage?.clear();
        window.location?.reload();
      }
      if (
        res.data?.checkoutLineDelete?.errors &&
        res.data?.checkoutLineDelete?.errors[0]?.code ===
        "PRODUCT_NOT_PUBLISHED" &&
        typeof window !== "undefined"
      ) {
        await clearCart();
      }
      if (
        res.data?.checkoutLineDelete?.errors &&
        res.data?.checkoutLineDelete?.errors[0]?.code ===
        "PRODUCT_UNAVAILABLE_FOR_PURCHASE" &&
        typeof window !== "undefined"
      ) {
        await clearCart();
      }
      if (
        res.data?.checkoutLineDelete?.errors &&
        res.data?.checkoutLineDelete?.errors[0]?.code === "GRAPHQL_ERROR" &&
        res.data?.checkoutLineDelete?.errors[0]?.field === "variantId" &&
        typeof window !== "undefined"
      ) {
        window.localStorage?.clear();
        window.location?.reload();
      }

      return {
        data: res.data?.checkoutLineDelete?.checkout,
        errors: res.data?.checkoutLineDelete?.errors,
      };
    }
    return null;
  };

  const updateItem: CartSDK["updateItem"] = async (
    variantId: string,
    quantity: number,
    prevQuantity: number,
    updatedLines?: Array<Maybe<CheckoutLineInput>> | Maybe<CheckoutLineInput>
  ) => {
    const differenceQuantity = quantity - prevQuantity;
    if (differenceQuantity > 0) {
      const res = await addItem(variantId, differenceQuantity);
      return res;
    } else {
      const checkoutString = storage.getCheckout();

      const checkout =
        checkoutString && typeof checkoutString === "string"
          ? JSON.parse(checkoutString)
          : checkoutString;
      const alteredLines =
        checkout &&
        checkout?.lines
          .filter((line: any) => line.variant.id !== variantId)
          .map((line: any) => ({
            quantity: line.quantity,
            variantId: line.variant.id,
          }));

      alteredLines.push({ quantity: quantity, variantId: variantId });

      if (checkout && checkout?.token) {
        const res = await client.mutate<
          UpdateCheckoutLineMutation,
          UpdateCheckoutLineMutationVariables
        >({
          mutation: UPDATE_CHECKOUT_LINE_MUTATION,
          variables: {
            checkoutId: checkout?.id,
            lines: updatedLines || alteredLines,
          },
          update: async (_, { data }) => {
            if (data?.checkoutLinesUpdate?.checkout?.id) {
              storage.setCheckout(data?.checkoutLinesUpdate?.checkout);
            }
            await setLocalCheckoutInCache(
              client,
              data?.checkoutLinesUpdate?.checkout,
              true
            );
          },
        });
        return {
          data: res.data?.checkoutLinesUpdate?.checkout,
          errors: res.data?.checkoutLinesUpdate?.errors,
        };
      }
    }
    return null;
  };

  const updateItemWithLines: CartSDK["updateItemWithLines"] = async (
    updatedLines: Array<Maybe<CheckoutLineInput>>
  ) => {
    const checkoutString = storage.getCheckout();

    const checkout =
      checkoutString && typeof checkoutString === "string"
        ? JSON.parse(checkoutString)
        : checkoutString;

    if (checkout && checkout?.token) {
      const res = await client.mutate<
        UpdateCheckoutLineMutation,
        UpdateCheckoutLineMutationVariables
      >({
        mutation: UPDATE_CHECKOUT_LINE_MUTATION,
        variables: {
          checkoutId: checkout?.id,
          lines: updatedLines,
        },
        update: async (_, { data }) => {
          if (data?.checkoutLinesUpdate?.checkout?.id) {
            storage.setCheckout(data?.checkoutLinesUpdate?.checkout);
          }
          await setLocalCheckoutInCache(
            client,
            data?.checkoutLinesUpdate?.checkout,
            true
          );
        },
      });
      return {
        data: res.data?.checkoutLinesUpdate?.checkout,
        errors: res.data?.checkoutLinesUpdate?.errors,
      };
    } else {
      const res = await client.mutate<
        CreateCheckoutMutation,
        CreateCheckoutMutationVariables
      >({
        mutation: CREATE_CHECKOUT_MUTATION,
        variables: {
          checkoutInput: {
            lines: updatedLines || [],
            email: "dummy@dummy.com",
            shippingAddress: {
              city: "delhi",
              companyName: "dummy",
              country: "IN",
              countryArea: "Delhi",
              firstName: "dummy",
              lastName: "dummy",
              phone: "7894561230",
              postalCode: "110006",
              streetAddress1: "dummy",
              streetAddress2: "dummy",
            },
          },
        },
        update: (_, { data }) => {
          setLocalCheckoutInCache(client, data?.checkoutCreate?.checkout, true);
          if (data?.checkoutCreate?.checkout?.id) {
            storage.setCheckout(data?.checkoutCreate?.checkout);
          }
        },
      });
      const returnObject = {
        data: res.data?.checkoutCreate?.checkout,
        errors: res.data?.checkoutCreate?.errors,
      };
      return returnObject;
    }
  };

  const updateCartAccordingLocation: CartSDK["updateCartAccordingLocation"] = async (warehouseId: string) => {
    const checkoutString = storage.getCheckout();
    const checkout =
      checkoutString && typeof checkoutString === "string"
        ? JSON.parse(checkoutString)
        : checkoutString;
    if(checkout?.id && warehouseId){
      const res = await client.mutate<any, any>({
        mutation: CHECKOUT_VERIFY_FOR_WAREHOUSE,
        variables: {
          checkoutId: checkout?.id,
          warehouseId: warehouseId,
        },
        update: async (_, { data }) => {
          if (data?.checkoutVerifyForWarehouse?.checkout?.id) {
            storage.setCheckout(data?.checkoutVerifyForWarehouse?.checkout);
          }
          await setLocalCheckoutInCache(
            client,
            data?.checkoutVerifyForWarehouse?.checkout,
            true
          );
        },
      });
      return {
        data: res?.data?.checkoutVerifyForWarehouse?.checkout,
        errors: res?.data?.checkoutVerifyForWarehouse?.errors,
      }
    }
  };

  return {
    items,
    clearCart,
    addItem,
    removeItem,
    updateItem,
    updateItemWithLines,
    updateCartAccordingLocation,
  };
};