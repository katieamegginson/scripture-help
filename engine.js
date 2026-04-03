(function (globalScope, factory) {
  const exports = factory(
    globalScope.SCRIPTURE_TOPICS,
    globalScope.PROMPT_EXAMPLES,
    typeof require === "function" ? require("./topics") : null,
  );

  globalScope.ScriptureEngine = exports;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (browserTopics, browserPrompts, nodeTopics) {
  const SCRIPTURE_TOPICS =
    (nodeTopics && nodeTopics.SCRIPTURE_TOPICS) || browserTopics || [];
  const PROMPT_EXAMPLES =
    (nodeTopics && nodeTopics.PROMPT_EXAMPLES) || browserPrompts || [];
  const MAX_RESULTS = 6;

  function normalize(value) {
    return value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function scoreTopic(topic, normalizedPrompt) {
    return topic.keywords.reduce((score, keyword) => {
      return normalizedPrompt.includes(normalize(keyword)) ? score + 1 : score;
    }, 0);
  }

  function fallbackTopics(prompt) {
    const gentleDefaultIds = ["guidance", "anxiety", "strength"];

    return gentleDefaultIds
      .map((topicId) => SCRIPTURE_TOPICS.find((topic) => topic.id === topicId))
      .filter(Boolean)
      .map((topic, index) => ({
        ...topic,
        score: gentleDefaultIds.length - index,
        summary:
          topic.summary +
          ` This was suggested because the prompt "${prompt}" did not match one theme strongly.`,
      }));
  }

  function buildRecommendationSet(prompt) {
    const normalized = normalize(prompt);
    const topicScores = SCRIPTURE_TOPICS.map((topic) => ({
      ...topic,
      score: scoreTopic(topic, normalized),
    }))
      .filter((topic) => topic.score > 0)
      .sort((left, right) => right.score - left.score);

    const selectedTopics = topicScores.length
      ? topicScores.slice(0, 3)
      : fallbackTopics(prompt);
    const recommendations = [];
    const seen = new Set();

    selectedTopics.forEach((topic) => {
      topic.references.forEach((reference) => {
        if (seen.has(reference) || recommendations.length >= MAX_RESULTS) {
          return;
        }

        seen.add(reference);
        recommendations.push({
          id: `${topic.id}:${reference}`,
          reference,
          topicId: topic.id,
          topicLabel: topic.label,
          summary: topic.summary,
          prompt,
        });
      });
    });

    return {
      prompt,
      topics: selectedTopics.map(({ id, label, summary, score }) => ({
        id,
        label,
        summary,
        score,
      })),
      recommendations,
    };
  }

  return {
    SCRIPTURE_TOPICS,
    PROMPT_EXAMPLES,
    buildRecommendationSet,
    normalize,
  };
});
