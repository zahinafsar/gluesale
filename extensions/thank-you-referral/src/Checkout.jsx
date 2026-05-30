import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [data, setData] = useState(/** @type {any} */ (null));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const orderId = shopify.orderConfirmation?.value?.order?.id;
        if (!orderId) return;

        const res = await fetch(
          `https://app.gluesale.com/api/thank-you-referral?orderId=${encodeURIComponent(orderId)}`,
        );
        if (!res.ok) return;

        const json = await res.json();
        if (!cancelled && json?.active) setData(json);
      } catch (error) {
        console.error('[gluesale] referral link fetch failed', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.shareUrl);
    } catch (error) {
      console.error('[gluesale] copy failed', error);
    }
  };

  return (
    <s-banner heading={`Refer a friend, get ${data.refererLabel}`} tone="info">
      <s-stack gap="base">
        <s-text>
          Loved your order? Share your link — friends get {data.refereeLabel} on their first order,
          and you get {data.refererLabel} when they buy.
        </s-text>
        <s-text type="emphasis">{data.shareUrl}</s-text>
        <s-button onClick={copyLink}>Copy referral link</s-button>
        {data.conditions?.length ? <s-text>{data.conditions.join(' · ')}</s-text> : null}
      </s-stack>
    </s-banner>
  );
}
