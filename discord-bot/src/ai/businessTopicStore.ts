export type BusinessTopic = "PROJECT_ASSIGNMENT";

type TopicState = {
  topic: BusinessTopic;
  updatedAt: Date;
};

const topicStates = new Map<string, TopicState>();

const TOPIC_TTL_MS = 10 * 60 * 1000;

export function saveBusinessTopic(discordUserId: string, topic: BusinessTopic): void {
  topicStates.set(discordUserId, {
    topic,
    updatedAt: new Date()
  });
}

export function getBusinessTopic(discordUserId: string): BusinessTopic | undefined {
  const state = topicStates.get(discordUserId);

  if (!state) {
    return undefined;
  }

  if (Date.now() - state.updatedAt.getTime() > TOPIC_TTL_MS) {
    topicStates.delete(discordUserId);
    return undefined;
  }

  return state.topic;
}

export function clearBusinessTopic(discordUserId: string): void {
  topicStates.delete(discordUserId);
}