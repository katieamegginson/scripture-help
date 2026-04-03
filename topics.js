(function (globalScope, factory) {
  const exports = factory();

  globalScope.SCRIPTURE_TOPICS = exports.SCRIPTURE_TOPICS;
  globalScope.PROMPT_EXAMPLES = exports.PROMPT_EXAMPLES;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SCRIPTURE_TOPICS = [
    {
      id: "anxiety",
      label: "Anxiety and peace",
      keywords: ["anxious", "anxiety", "worry", "worried", "panic", "stress", "fear", "overwhelmed", "future"],
      summary:
        "These passages speak to God’s peace, presence, and invitation to hand over your burdens.",
      references: ["Philippians 4:6-7", "Matthew 6:25-34", "Isaiah 41:10", "1 Peter 5:7", "Psalm 94:19"],
    },
    {
      id: "grief",
      label: "Grief and loss",
      keywords: ["grief", "grieving", "loss", "sad", "sorrow", "mourning", "heartbroken", "death", "funeral"],
      summary:
        "These verses remind you that God stays close in sorrow and promises comfort to the brokenhearted.",
      references: ["Psalm 34:18", "Matthew 5:4", "John 14:1-3", "Revelation 21:4", "Lamentations 3:22-23"],
    },
    {
      id: "guidance",
      label: "Guidance and direction",
      keywords: ["guidance", "direction", "decision", "confused", "wisdom", "next step", "path", "discern", "choose"],
      summary:
        "These passages center on trusting God’s wisdom when the path ahead feels unclear.",
      references: ["Proverbs 3:5-6", "James 1:5", "Psalm 119:105", "Isaiah 30:21", "Psalm 32:8"],
    },
    {
      id: "identity",
      label: "Identity and worth",
      keywords: ["worth", "identity", "insecure", "ashamed", "not enough", "unworthy", "rejected", "alone"],
      summary:
        "These verses ground your identity in God’s love, care, and nearness.",
      references: ["Psalm 139:13-14", "Isaiah 43:1", "1 Peter 2:9", "Romans 8:38-39", "Zephaniah 3:17"],
    },
    {
      id: "forgiveness",
      label: "Forgiveness and mercy",
      keywords: ["forgive", "forgiveness", "guilt", "shame", "sin", "regret", "repent", "mercy"],
      summary:
        "These passages help when you need mercy from God or strength to extend forgiveness to someone else.",
      references: ["1 John 1:9", "Psalm 103:8-12", "Ephesians 4:31-32", "Colossians 3:13", "Micah 7:18-19"],
    },
    {
      id: "doubt",
      label: "Doubt and faith",
      keywords: ["doubt", "faith", "believe", "unbelief", "questions", "uncertain", "trust god", "struggling to believe"],
      summary:
        "These verses encourage honest faith, reminding you that God meets people in weakness and questions.",
      references: ["Mark 9:23-24", "Hebrews 11:1", "Jeremiah 29:13", "Romans 10:17", "John 20:27-29"],
    },
    {
      id: "purpose",
      label: "Purpose and calling",
      keywords: ["purpose", "calling", "meaning", "why", "plans", "hope", "future", "career"],
      summary:
        "These passages speak to hope, calling, and steady obedience even when the bigger picture is still forming.",
      references: ["Jeremiah 29:11", "Ephesians 2:10", "Romans 8:28", "Colossians 3:23-24", "Proverbs 16:9"],
    },
    {
      id: "loneliness",
      label: "Loneliness and companionship",
      keywords: ["lonely", "loneliness", "isolated", "abandoned", "friendless", "left out", "alone"],
      summary:
        "These verses remind you that God is near, attentive, and faithful when you feel unseen or isolated.",
      references: ["Deuteronomy 31:8", "Psalm 27:10", "John 14:18", "Hebrews 13:5", "Psalm 68:6"],
    },
    {
      id: "strength",
      label: "Strength and endurance",
      keywords: ["tired", "exhausted", "weak", "burned out", "persevere", "strength", "weary", "keep going"],
      summary:
        "These passages offer strength for weary hearts and endurance for long seasons.",
      references: ["Isaiah 40:29-31", "2 Corinthians 12:9-10", "Galatians 6:9", "Joshua 1:9", "Psalm 46:1"],
    },
    {
      id: "gratitude",
      label: "Gratitude and joy",
      keywords: ["thankful", "gratitude", "joy", "praise", "celebrate", "blessing", "content"],
      summary:
        "These passages help you turn gratitude into worship and steady joy.",
      references: ["1 Thessalonians 5:16-18", "Psalm 100:1-5", "Philippians 4:4", "James 1:17", "Colossians 3:15-17"],
    },
    {
      id: "temptation",
      label: "Temptation and self-control",
      keywords: ["temptation", "tempted", "addiction", "habit", "self-control", "lust", "anger", "escape"],
      summary:
        "These verses encourage resistance, self-control, and dependence on God when temptation feels close.",
      references: ["1 Corinthians 10:13", "James 4:7-8", "Galatians 5:22-23", "Psalm 119:9-11", "Matthew 26:41"],
    },
    {
      id: "relationships",
      label: "Relationships and reconciliation",
      keywords: ["relationship", "marriage", "family", "friend", "conflict", "reconcile", "communication", "hurt"],
      summary:
        "These passages offer wisdom for love, patience, and peacemaking in strained relationships.",
      references: ["1 Corinthians 13:4-7", "Romans 12:18", "Proverbs 15:1", "Ephesians 4:2-3", "Colossians 3:12-14"],
    },
  ];

  const PROMPT_EXAMPLES = [
    "I feel anxious about my future and I need peace.",
    "I’m grieving and I want comfort from God.",
    "I need wisdom for a decision and I don’t know what to do.",
    "I feel ashamed and I need to remember God’s mercy.",
    "I feel lonely and I want verses that remind me I’m not alone.",
    "I want Bible verses about purpose because I feel stuck.",
  ];

  return { SCRIPTURE_TOPICS, PROMPT_EXAMPLES };
});
