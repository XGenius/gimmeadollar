// Everything the host says. Each line has a stable id so recorded
// voice clips (audio/<id>.mp3) can be matched back to their text.
window.GAD_SCRIPT = {
  // Played in order the first time through.
  intro: [
    ["i01", "Gimme a dollar."],
    ["i02", "Come on, just gimme a dollar."],
    ["i03", "That's not very much money. You'll never even miss it."],
    ["i04", "Here's the deal. You probably don't have any chance of becoming a millionaire."],
    ["i05", "But hey, if you gimme a dollar, and then you tell three people to gimme a dollar,"],
    ["i06", "and they tell three people, and they tell three people,"],
    ["i07", "well, soon enough, I'll have a million dollars!"],
    ["i08", "You can feel good about being a part of that, can't you?"],
    ["i09", "You'll feel good about that. I know you will."],
    ["i10", "Come on, gimme a dollar."],
    ["i11", "Look, you probably have a dollar in the cushions of your couch."],
    ["i12", "You probably have a dollar stuck to the bottom of your shoe."],
    ["i13", "It's nothing. You can't even buy a cup of coffee with it."],
    ["i14", "Gimme a dollar. It's barely enough to buy a pack of gum."],
    ["i15", "Seriously, you'll never miss it. You'll never even know you did it."],
    ["i16", "Just gimme a dollar. It'll be fun."],
    ["i17", "You don't even have any idea how much fun it'll be."],
    ["i18", "It's gonna be more fun than you've had for the whole rest of your day."],
    ["i19", "And it only costs you a dollar. And that's nothing."],
    ["i20", "Come on, gimme a dollar. Make my dreams come true."]
  ],
  // Shuffled forever after the intro. On and on and on.
  extra: [
    ["x01", "I'm not asking for two dollars. I'm asking for one. That's half of two."],
    ["x02", "You know what a dollar is? It's a hundred pennies. Nobody wants a hundred pennies. Gimme the dollar."],
    ["x03", "I'll wait. I've got all day. I've literally got nothing else going on."],
    ["x04", "Your friends are probably giving me a dollar right now. Probably. I don't know. Be the first!"],
    ["x05", "Think of it as a tip. For me. For being here. Asking you for a dollar."],
    ["x06", "I'm not gonna stop. You know I'm not gonna stop."],
    ["x07", "Somewhere out there, somebody gave me a dollar. And they're having a great day."],
    ["x08", "It's one dollar. You've lost more than that in a vending machine."],
    ["x09", "The button's right there. The big green one. Yeah. That one."],
    ["x10", "I can see you looking at the button. Go on. Push it."],
    ["x11", "You could leave. But you'd be thinking about me all day."],
    ["x12", "Imagine telling your grandkids you helped me become a millionaire. One dollar at a time."],
    ["x13", "I'm not saying it'll change your life. I'm saying it'll change mine. A little. By one dollar."],
    ["x14", "Gimme a dollar. Gimme a dollar. Gimme a dollar. Okay, I'll stop. No I won't. Gimme a dollar."],
    ["x15", "Don't have a dollar? Tell three friends. They have dollars."],
    ["x16", "Still here? That means you like me. People who like me gimme a dollar."],
    ["x17", "I take all kinds of dollars. Couch dollars. Shoe dollars. Birthday card dollars."],
    ["x18", "It's about the same as a pack of gum. But I'm way more fun than gum."],
    ["x19", "Come on. Gimme a dollar. Please? Pretty please? With a dollar on top?"],
    ["x20", "I'll be honest with you. I really just want a dollar."],
    ["x21", "Do you know how many dollars I have? Not enough. That's how many."],
    ["x22", "Every millionaire started with one dollar. Mine's gonna be yours."],
    ["x23", "But wait! There's more! Gimme a dollar and you also get the feeling of having given me a dollar!"],
    ["x24", "Operators are standing by. The operator is me. Gimme a dollar."],
    ["x25", "Call now! Actually, don't call. Just push the button."],
    ["x26", "This offer won't last forever. Okay, it will. But gimme a dollar anyway."]
  ],
  // The thank-you page, after someone actually pays.
  thanks: [
    ["t01", "You did it! You actually gave me a dollar!"],
    ["t02", "That makes you my favorite person. Don't tell the others."],
    ["t03", "Now here's the important part. Tell three friends."],
    ["t04", "Not two. Not four. Three. That's how the math works."],
    ["t05", "Send them the link. Tell them I need a dollar. They'll understand."],
    ["t06", "Only nine hundred ninety nine thousand, nine hundred ninety nine dollars to go!"],
    ["t07", "Want to gimme another dollar? I won't stop you. I would never stop you."]
  ],
  // Said when the pointer lands on the pay button.
  hover: [
    ["h01", "Yes! That one! Push that one!"],
    ["h02", "Ooh, you're so close!"],
    ["h03", "Do it! Do it! Do it!"]
  ]
};
