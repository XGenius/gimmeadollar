window.GAD_CONFIG = {
  // Stripe Payment Link: $1 each, and people can pick how many.
  paymentLink: "https://buy.stripe.com/dRm7sL5vrbIL0SJdjLdEs01",
  // The "How many dollars?" pop-up the pay buttons open. Each package is its own
  // Stripe Payment Link; set packages to [] to skip the pop-up and go straight to paymentLink.
  packages: [
    { name: "The Classic", gets: "Gimme 1 dollar", price: "1", was: "Full price. No shame.",
      blurb: "The original. One dollar. You'll never even miss it.", cta: "Gimme $1",
      link: "https://buy.stripe.com/dRm7sL5vrbIL0SJdjLdEs01" },
    { name: "The Ten-Pack", gets: "Gimme 10 dollars", price: "9", was: "<s>$10</s> 10% off!",
      blurb: "You save a whole dollar. Which you could then gimme.", cta: "Gimme 10 for $9",
      link: "https://buy.stripe.com/28EfZhbTPbIL8lb93vdEs02" },
    { name: "The Benjamin", gets: "Gimme 100 dollars", price: "75", was: "<s>$100</s> only $75!",
      blurb: "25% off. I'm basically losing money on this one. I'm not, but it feels that way.", cta: "Gimme 100 for $75",
      ribbon: "Best value (for you, somehow)",
      link: "https://buy.stripe.com/14A3cvcXT8wz44V2F7dEs03" },
    { name: "Name Your Price", gets: "Gimme any amount", price: "?", was: "Minimum $1. Maximum: go nuts.",
      blurb: "As many dollars as you want. I won't stop you. I physically can't.", cta: "Gimme lotsa dollars",
      link: "https://buy.stripe.com/cNi8wPaPLeUX58ZcfHdEs04" }
  ],
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
