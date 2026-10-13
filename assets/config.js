window.GAD_CONFIG = {
  // Stripe Payment Link for the $1 gift.
  paymentLink: "https://buy.stripe.com/6oU3cv2jf14758Z7ZrdEs00",
  // Host look: "shades" (D1G1T0L in sunglasses), "natural" (no bandana or sunglasses), "me" (camo bandana), or "generic".
  character: "me",
  // Split test: list looks here (for example ["me", "shades", "natural", "generic"]) and each
  // visitor gets one at random, kept on return visits. The look rides along to Stripe as
  // client_reference_id ("look-me") so payments can be counted per look. Empty = test off.
  lookTest: [],
  // How fast the host talks. 1 is the recording as-is.
  voiceSpeed: 1.3,
  // Start talking out loud on the first tap or key press anywhere on the page.
  soundOnByDefault: true,
  siteUrl: "https://gimmeadollar.net"
};
