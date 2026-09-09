import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { supabase } from '@/lib/supabaseClient';

export const GOOGLE_PLAY_PRODUCT_ID = 'maeztro_pro';
export const GOOGLE_PLAY_PLAN_IDS = ['monthly', 'annual'];

const isAndroid = () => Capacitor.getPlatform() === 'android';

const getPlanId = (product) => product.identifier || product.offerId;

const getSupportedProducts = (products = []) => products
  .filter((product) => product.planIdentifier === GOOGLE_PLAY_PRODUCT_ID)
  .filter((product) => GOOGLE_PLAY_PLAN_IDS.includes(getPlanId(product)));

export async function isGooglePlayBillingAvailable() {
  if (!isAndroid()) return false;
  const { isBillingSupported } = await NativePurchases.isBillingSupported();
  return isBillingSupported;
}

export async function getSubscriptionPlans() {
  if (!(await isGooglePlayBillingAvailable())) return [];
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: [GOOGLE_PLAY_PRODUCT_ID],
    productType: PURCHASE_TYPE.SUBS,
  });
  return getSupportedProducts(products);
}

async function verifyPurchase(transaction, planId) {
  if (!transaction.purchaseToken) throw new Error('A compra não retornou um token válido.');

  const { data, error } = await supabase.functions.invoke('google-play-verify', {
    body: {
      purchaseToken: transaction.purchaseToken,
      productId: transaction.productIdentifier || GOOGLE_PLAY_PRODUCT_ID,
      basePlanId: planId,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  await NativePurchases.acknowledgePurchase({ purchaseToken: transaction.purchaseToken });
  return data;
}

export async function purchaseSubscription(plan) {
  if (!isAndroid()) throw new Error('As compras estão disponíveis somente no aplicativo Android.');

  const planId = getPlanId(plan);
  if (!GOOGLE_PLAY_PLAN_IDS.includes(planId)) throw new Error('Plano de assinatura inválido.');

  const transaction = await NativePurchases.purchaseProduct({
    productIdentifier: plan.planIdentifier || GOOGLE_PLAY_PRODUCT_ID,
    planIdentifier: planId,
    offerToken: plan.offerToken,
    productType: PURCHASE_TYPE.SUBS,
    autoAcknowledgePurchases: false,
  });

  return verifyPurchase(transaction, planId);
}

export async function restoreSubscriptions() {
  if (!isAndroid()) return [];

  const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS });
  const supportedPurchases = purchases.filter((purchase) =>
    purchase.productIdentifier === GOOGLE_PLAY_PRODUCT_ID && purchase.purchaseToken
  );

  const results = [];
  for (const purchase of supportedPurchases) {
    results.push(await verifyPurchase(purchase));
  }
  return results;
}
