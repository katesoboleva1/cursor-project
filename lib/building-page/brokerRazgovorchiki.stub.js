/**
 * Broker-only UI stub — NOT rendered on investor Split Desk pages.
 *
 * Product: «Разговорчики» / broker conversation inbox feed
 * Entry:  https://b2b.refty.ai/inbox?tab=property
 *         (+ unit / permit / building / thread query params from investor invite)
 *
 * Source of the old investor-embedded feed: ./buildingLeadChat.js
 * (buildingLeadChatHtml — keep for a future broker desk, do not mount on
 *  public/building_*_b_split.html).
 *
 * Investor pages instead show: off-market request (./buildingRoomChat.js)
 * + swipe prefill + broker join invite link only as copyable URL for brokers.
 */
module.exports = {
  BROKER_INBOX_URL: 'https://b2b.refty.ai/inbox?tab=property',
  NOTE: 'Broker Razgovorchiki UI — separate product, not investor Split Desk',
};
